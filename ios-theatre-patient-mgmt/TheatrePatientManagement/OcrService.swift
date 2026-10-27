import Foundation
import UIKit

// Port of utils/stickerOCR.ts: AI vision OCR via the Rork Toolkit proxy.
// Reads the same env values (injected into Config.swift at build time).

enum OCRSlot {
    case sticker        // hospital sticker → full demographics
    case clock          // theatre clock → HHMM time
    case referral       // referral letter → COIDA/employer/procedures
    case medicalReferral // medical aid referral letter → referral fields
}

struct OCRExtractedFields {
    var values: [String: String] = [:]
    var lists: [String: [String]] = [:]

    var count: Int { values.count + lists.count }
}

enum OCRError: LocalizedError {
    case notConfigured
    case imageProcessing
    case http(Int)
    case emptyResponse
    case parsing

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "AI extraction is not configured on this device."
        case .imageProcessing:
            return "Failed to process the image for OCR."
        case .http(let status) where status == 402:
            return "AI extraction is temporarily unavailable. Please fill in the fields manually and try again later."
        case .http(let status) where status == 401:
            return "AI features are currently unavailable. Please restart the app."
        case .http(let status):
            return "AI extraction failed (HTTP \(status)). Please fill in the fields manually."
        case .emptyResponse:
            return "No OCR data was returned. Please fill in the fields manually."
        case .parsing:
            return "Could not read the AI response. Please fill in the fields manually."
        }
    }
}

enum StickerOCR {
    static let model = "openai/gpt-4o-mini"
    private static let maxBase64Bytes = 2_800_000

    // Exact prompts from utils/stickerOCR.ts
    static let stickerPrompt = """
    You are a medical document OCR specialist. Examine this hospital sticker / patient label photo and extract ALL visible information.

    Return ONLY a JSON object (no markdown, no explanation) with these fields. Leave a field empty string "" if not visible on the sticker:

    {
      "patientTitle": "Mr|Mrs|Miss|Ms|Dr|Prof",
      "patientFirstName": "",
      "patientLastName": "",
      "idNumber": "",
      "dateOfBirth": "DD/MM/YYYY",
      "contactNumber": "",
      "email": "",
      "gender": "Male|Female|Other",
      "patientAddress": "",
      "homePhone": "",
      "workPhone": "",
      "ward": "",
      "bed": "",
      "admissionDate": "DDMMYYYY",
      "admissionTime": "HHMM",
      "caseNumber": "",
      "authorizationCode": "",
      "medicalAidName": "",
      "medicalAidPlan": "",
      "membershipNumber": "",
      "dependantCode": "",
      "mainMemberTitle": "Mr|Mrs|Miss|Ms|Dr|Prof",
      "mainMemberFirstName": "",
      "mainMemberLastName": "",
      "mainMemberIdNumber": "",
      "referringDoctor": "",
      "doctorPracticeNumber": "",
      "hospitalServiceProvider": "",
      "dap": "",
      "fixedInstallation": "Yes|No",
      "hospitalName": ""
    }

    Rules:
    - South African ID numbers: extract exactly as shown (13 digits).
    - Dates: convert to DD/MM/YYYY for dateOfBirth, DDMMYYYY for admissionDate.
    - Times: convert to HHMM (24h) for admissionTime.
    - Phone numbers: extract the digits after the label. The label "WK" or "Work" means the patient's work number → put in workPhone. The label "HM" or "Home" or "H" means the patient's home/mobile number → put in homePhone. If the sticker has only one phone number with no label, put it in contactNumber.
    - If a field is a label on the sticker with no value, leave it empty.
    - If the main member is the same as the patient, still fill in main member fields.
    - hospitalName: the name of the hospital printed on the sticker or letterhead.
    - Return ONLY the JSON, no other text.
    """

    static let clockPrompt = """
    You are a medical document OCR specialist. Look at this photo of a wall clock or clock display and read the time shown.
    Return ONLY a JSON object with a single field "time" in 24-hour HHMM format (for example "14H30" should be "1430"). If no clock face is visible, return {"time": ""}.
    Return ONLY the JSON, no other text.
    """

    static let referralPrompt = """
    You are a medical document OCR specialist. Examine this referral letter from a doctor and extract the information.

    Return ONLY a JSON object (no markdown, no explanation) with these fields (empty string "" if not present):
    {
      "patientFirstName": "", "patientLastName": "", "idNumber": "",
      "coidaMemberNumber": "", "patientIodClaimNumber": "",
      "employerName": "", "employerContact": "",
      "dateOfIncident": "DD/MM/YYYY", "dateOfProcedure": "DD/MM/YYYY",
      "icd10Code": "",
      "procedures": ["code - name"],
      "hospitalName": "", "admissionDate": "DDMMYYYY", "admissionTime": "HHMM"
    }
    Rules:
    - procedures: list ALL procedure codes mentioned (e.g. "00155 - X-ray C-arm fluoroscopy in theatre per half hour"). Multi-code letters list every code, split on whitespace or commas.
    - icd10Code: the ICD-10 diagnosis code(s). If multiple codes are present, uppercase them and join with ", ".
    - Times: convert to HHMM (24h).
    - Return ONLY the JSON, no other text.
    """

    static func prompt(for slot: OCRSlot) -> String {
        switch slot {
        case .sticker: return stickerPrompt
        case .clock: return clockPrompt
        case .referral, .medicalReferral: return referralPrompt
        }
    }

    // MARK: - Image resizing ladder (mirrors resizeForUpload)

    static func resizeForUpload(_ image: UIImage) -> String? {
        let steps: [(width: CGFloat, quality: CGFloat)] = [
            (1280, 0.82), (1024, 0.78), (832, 0.74), (640, 0.70),
        ]
        for step in steps {
            if let base64 = render(image, width: step.width, quality: step.quality),
               let data = Data(base64Encoded: base64), data.count <= maxBase64Bytes {
                return base64
            }
        }
        return render(image, width: 512, quality: 0.65)
    }

    private static func render(_ image: UIImage, width: CGFloat, quality: CGFloat) -> String? {
        let ratio = width / max(image.size.width, 1)
        let size = CGSize(width: width, height: image.size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: size)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return resized.jpegData(compressionQuality: quality)?.base64EncodedString()
    }

    // MARK: - Request

    static func extract(from image: UIImage, slot: OCRSlot) async throws -> OCRExtractedFields {
        let toolkitURL = Config.EXPO_PUBLIC_TOOLKIT_URL
        let secretKey = Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
        guard !toolkitURL.isEmpty else { throw OCRError.notConfigured }
        guard let base64 = resizeForUpload(image) else { throw OCRError.imageProcessing }

        var request = URLRequest(url: URL(string: "\(toolkitURL)/v2/vercel/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !secretKey.isEmpty {
            request.setValue("Bearer \(secretKey)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 90

        let body: [String: Any] = [
            "model": model,
            "messages": [
                ["role": "system", "content": "You are a medical document OCR specialist. You extract structured data from medical documents and photos. You return only valid JSON, no markdown or explanations."],
                ["role": "user", "content": [
                    ["type": "text", "text": prompt(for: slot)],
                    ["type": "image_url", "image_url": ["url": "data:image/jpeg;base64,\(base64)"]],
                ]],
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw OCRError.http(http.statusCode)
        }

        struct Completion: Decodable {
            struct Choice: Decodable {
                struct Message: Decodable { let content: String }
                let message: Message
            }
            let choices: [Choice]
        }
        guard let completion = try? JSONDecoder().decode(Completion.self, from: data),
              let content = completion.choices.first?.message.content, !content.isEmpty else {
            throw OCRError.emptyResponse
        }

        // Extract the JSON object from the content (handle markdown fences).
        guard let jsonStart = content.firstIndex(of: "{"),
              let jsonEnd = content.lastIndex(of: "}"),
              let jsonData = content[jsonStart...jsonEnd].data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            throw OCRError.parsing
        }

        var result = OCRExtractedFields()
        for (key, value) in parsed {
            if let list = value as? [Any] {
                let items = list.compactMap { ($0 as? String)?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                if !items.isEmpty { result.lists[key] = items }
            } else if let string = value as? String {
                let trimmed = string.trimmingCharacters(in: .whitespaces)
                if !trimmed.isEmpty { result.values[key] = trimmed }
            } else if let number = value as? NSNumber {
                result.values[key] = number.stringValue
            }
        }
        return result
    }

    /// Applies extracted fields to a form (mirrors normalizeStickerData + referral handling).
    static func apply(_ extracted: OCRExtractedFields, to form: inout PatientForm) {
        let map: [String: WritableKeyPath<PatientForm, String>] = [
            "patientFirstName": \.patientFirstName,
            "patientLastName": \.patientLastName,
            "idNumber": \.idNumber,
            "dateOfBirth": \.dateOfBirth,
            "contactNumber": \.contactNumber,
            "email": \.email,
            "gender": \.gender,
            "patientAddress": \.patientAddress,
            "homePhone": \.homePhone,
            "workPhone": \.workPhone,
            "ward": \.ward,
            "bed": \.bed,
            "admissionDate": \.admissionDate,
            "admissionTime": \.admissionTime,
            "caseNumber": \.caseNumber,
            "authorizationCode": \.authorizationCode,
            "medicalAidName": \.medicalAidName,
            "medicalAidPlan": \.medicalAidPlan,
            "membershipNumber": \.membershipNumber,
            "dependantCode": \.dependantCode,
            "mainMemberFirstName": \.mainMemberFirstName,
            "mainMemberLastName": \.mainMemberLastName,
            "mainMemberIdNumber": \.mainMemberIdNumber,
            "referringDoctor": \.referringDoctor,
            "doctorPracticeNumber": \.doctorPracticeNumber,
            "hospitalServiceProvider": \.hospitalServiceProvider,
            "dap": \.dap,
            "fixedInstallation": \.fixedInstallation,
            "hospitalName": \.hospitalName,
            "coidaMemberNumber": \.coidaMemberNumber,
            "patientIodClaimNumber": \.patientIodClaimNumber,
            "employerName": \.employerName,
            "employerContact": \.employerContact,
            "dateOfIncident": \.dateOfIncident,
            "dateOfProcedure": \.dateOfProcedure,
            "icd10Code": \.icd10Code,
        ]
        var filled = 0
        for (key, path) in map {
            guard let value = extracted.values[key] else { continue }
            if form[keyPath: path].isEmpty {
                form[keyPath: path] = value
                filled += 1
            }
        }
        let titleKeyPaths: [(String, WritableKeyPath<PatientForm, PatientTitle>)] = [
            ("patientTitle", \.patientTitle),
            ("mainMemberTitle", \.mainMemberTitle),
        ]
        for (title, keyPath) in titleKeyPaths {
            if let raw = extracted.values[title], let parsed = PatientTitle(rawValue: raw), form[keyPath: keyPath] == .mr {
                form[keyPath: keyPath] = parsed
                filled += 1
            }
        }
        if let procedures = extracted.lists["procedures"], !procedures.isEmpty, form.procedure.isEmpty {
            form.procedure = procedures
            filled += 1
        }
    }
}

