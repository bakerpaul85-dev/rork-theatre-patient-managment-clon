import Foundation
import UIKit
import Combine

// Port of FormsContext + photoStorage: forms persisted as JSON files, photos
// as JPEG files on disk (Documents/photos/<formId>/<slot>.jpg).

@MainActor
final class FormsStore: ObservableObject {
    static let shared = FormsStore()

    @Published private(set) var forms: [PatientForm] = []
    @Published var isLoading = false

    private let formsDirectory: URL
    private let photosDirectory: URL

    private init() {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        formsDirectory = base.appendingPathComponent("forms", isDirectory: true)
        photosDirectory = base.appendingPathComponent("photos", isDirectory: true)
        try? FileManager.default.createDirectory(at: formsDirectory, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: photosDirectory, withIntermediateDirectories: true)
        loadForms()
    }

    // MARK: - Queries

    var drafts: [PatientForm] { forms.filter { $0.isDraft } }
    var submittedForms: [PatientForm] { forms.filter { !$0.isDraft } }

    func form(id: String) -> PatientForm? {
        forms.first { $0.id == id }
    }

    // MARK: - Persistence

    private func loadForms() {
        guard let files = try? FileManager.default.contentsOfDirectory(at: formsDirectory, includingPropertiesForKeys: nil) else { return }
        let decoder = JSONDecoder()
        forms = files.filter { $0.pathExtension == "json" }.compactMap { url in
            try? decoder.decode(PatientForm.self, from: Data(contentsOf: url))
        }.sorted { $0.updatedAt > $1.updatedAt }
    }

    private func persist(_ form: PatientForm) {
        let url = formsDirectory.appendingPathComponent("\(form.id).json")
        if let data = try? JSONEncoder().encode(form) {
            try? data.write(to: url, options: .atomic)
        }
    }

    // MARK: - Mutations

    func saveDraft(_ form: PatientForm) {
        var updated = form
        updated.updatedAt = AppTimestamp.now()
        upsert(updated)
    }

    func submitForm(_ form: PatientForm) {
        var updated = form
        updated.status = "submitted"
        updated.updatedAt = AppTimestamp.now()
        if updated.caseStatusHistory.isEmpty {
            updated.caseStatusHistory = [CaseStatusEvent(status: .caseLoaded, timestamp: AppTimestamp.now(), updatedBy: updated.submittedBy)]
        }
        upsert(updated)
    }

    func deleteForm(_ form: PatientForm) {
        forms.removeAll { $0.id == form.id }
        try? FileManager.default.removeItem(at: formsDirectory.appendingPathComponent("\(form.id).json"))
        try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(form.id, isDirectory: true))
    }

    func updateCaseStatus(_ form: PatientForm, status: CaseStatus, updatedBy: String?) {
        var updated = form
        updated.caseStatus = status
        updated.caseStatusHistory.append(CaseStatusEvent(status: status, timestamp: AppTimestamp.now(), updatedBy: updatedBy))
        updated.updatedAt = AppTimestamp.now()
        upsert(updated)
    }

    private func upsert(_ form: PatientForm) {
        if let index = forms.firstIndex(where: { $0.id == form.id }) {
            forms[index] = form
        } else {
            forms.insert(form, at: 0)
        }
        persist(form)
    }

    // MARK: - Photo storage

    func savePhoto(_ image: UIImage, formId: String, slot: String) -> PhotoItem? {
        let folder = photosDirectory.appendingPathComponent(formId, isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let fileName = "\(slot).jpg"
        let url = folder.appendingPathComponent(fileName)
        guard let data = image.jpegData(compressionQuality: 0.85) else { return nil }
        do {
            try data.write(to: url, options: .atomic)
            return PhotoItem(fileName: fileName, metadata: nil)
        } catch {
            return nil
        }
    }

    func attachMetadata(_ metadata: PhotoMetadata, to photo: inout PhotoItem) {
        photo.metadata = metadata
    }

    func loadPhoto(from item: PhotoItem?, formId: String) -> UIImage? {
        guard let item else { return nil }
        let url = photosDirectory.appendingPathComponent(formId, isDirectory: true).appendingPathComponent(item.fileName)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }

    func photoURL(_ item: PhotoItem?, formId: String) -> URL? {
        guard let item else { return nil }
        let url = photosDirectory.appendingPathComponent(formId, isDirectory: true).appendingPathComponent(item.fileName)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func loadPhotoBase64(from item: PhotoItem?, formId: String) -> String? {
        guard let url = photoURL(item, formId: formId),
              let data = try? Data(contentsOf: url) else { return nil }
        return data.base64EncodedString()
    }

    /// Saves a rendered PDF for the referral letter; returns the file name.
    func savePDF(_ data: Data, formId: String, slot: String) -> String {
        let folder = photosDirectory.appendingPathComponent(formId, isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let fileName = "\(slot).pdf"
        try? data.write(to: folder.appendingPathComponent(fileName), options: .atomic)
        return fileName
    }

    func pdfURL(_ fileName: String?, formId: String) -> URL? {
        guard let fileName else { return nil }
        let url = photosDirectory.appendingPathComponent(formId, isDirectory: true).appendingPathComponent(fileName)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// All photo files for the form with the email attachment names used by the Expo app.
    func emailAttachments(for form: PatientForm) -> [(url: URL, filename: String)] {
        var result: [(URL, String)] = []
        func add(_ item: PhotoItem?, _ name: String) {
            if let url = photoURL(item, formId: form.id) { result.append((url, name)) }
        }
        add(form.hospitalStickerPhoto, "hospital_sticker.jpg")
        add(form.timeInTheatrePhoto, "clock_in_theatre.jpg")
        add(form.timeOutTheatrePhoto, "clock_out_theatre.jpg")
        if form.formType == .coida {
            for (index, item) in form.cArmImages.enumerated() {
                add(item, "c_arm_image_\(index + 1).jpg")
            }
            for (index, item) in form.employerReportPhotos.enumerated() {
                add(item, "employer_report_\(index + 1).jpg")
            }
            add(form.firstMedicalReportPhoto, "first_medical_report.jpg")
            add(form.patientIdPhoto, "patient_id.jpg")
        }
        for (index, item) in form.referralLetterPages.enumerated() {
            add(item, "referral_letter_\(index + 1).jpg")
        }
        if let pdf = pdfURL(form.referralLetterPDF, formId: form.id) {
            result.append((pdf, "referral_letter.pdf"))
        }
        return result
    }
}
