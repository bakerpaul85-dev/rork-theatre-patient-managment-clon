import Foundation
import MessageUI
import UIKit

// Port of utils/resendEmail.ts: identical email subjects, bodies and recipients.

enum EmailBuilder {
    static let hospitalOverride = HospitalOverride()

    static func medicalAidRecipients(custom: [String]? = nil) -> [String] {
        custom ?? ["paul@intouchmedtech.co.za", "jenny@centaurimedical.co.za", "kevin@centaurimedical.co.za"]
    }

    static func coidaRecipients(custom: [String]? = nil) -> [String] {
        custom ?? ["paul@intouchmedtech.co.za", "nokuthula@debttec.co.za", "allan@medimarketing100.co.za"]
    }

    static func screeningTimeMedAid(_ raw: String) -> String {
        let t = raw.trimmingCharacters(in: .whitespaces)
        if t.isEmpty { return "N/A" }
        if t.contains(":") { return t }
        guard let seconds = Int(t) else { return t }
        return "\(seconds / 60):\(String(format: "%02d", seconds % 60))"
    }

    static func fluoroscopySeconds(_ raw: String) -> String {
        let t = raw.trimmingCharacters(in: .whitespaces)
        if t.isEmpty { return "N/A" }
        if t.contains(":") {
            let parts = t.split(separator: ":")
            let minutes = Int(parts.first ?? "0") ?? 0
            let seconds = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
            return String(minutes * 60 + seconds)
        }
        return t
    }

    static func locationLine(_ form: PatientForm) -> String {
        let base = "Location: \(form.radiographerSignatureLocation)"
        if let lat = form.submissionLatitude, let lon = form.submissionLongitude {
            return "\(base) — https://maps.google.com/?q=\(lat),\(lon)\n"
        }
        return "\(base)\n"
    }

    static func buildMedicalAidEmail(_ form: PatientForm, customRecipients: [String]? = nil) -> (subject: String, body: String, recipients: [String]) {
        let patient = form.patientName
        let subject = "Medical Aid Form - \(patient)"
        var body = "Medical Aid Form Submission\n\n"
        body += "Patient: \(patient)\n"
        body += "ID Number: \(form.idNumber)\n"
        body += "Date of Birth: \(form.dateOfBirth)\n"
        body += "Gender: \(form.gender.isEmpty ? "N/A" : form.gender)\n"
        body += "Contact: \(form.contactNumber)\n"
        body += "Home Phone: \(form.homePhone.isEmpty ? "N/A" : form.homePhone)\n"
        body += "Work Phone: \(form.workPhone.isEmpty ? "N/A" : form.workPhone)\n"
        body += "Email: \(form.email)\n"
        body += "Patient Address: \(form.patientAddress.isEmpty ? "N/A" : form.patientAddress)\n\n"
        body += "Hospital/Service Provider: \(hospitalOverride.displayName(for: form.radiographerEmail, captured: form.hospitalServiceProvider))\n"
        body += "Admission Date: \(form.admissionDate.isEmpty ? "N/A" : form.admissionDate)\n"
        body += "Admission Time: \(form.admissionTime.isEmpty ? "N/A" : form.admissionTime)\n"
        body += "Referring Doctor: \(form.referringDoctor)\n"
        body += "Doctor Practice Number: \(form.doctorPracticeNumber)\n"
        body += "Authorization Code: \(form.authorizationCode.isEmpty ? "N/A" : form.authorizationCode)\n\n"
        body += "Main Member: \(form.mainMemberTitle.rawValue) \(form.mainMemberFirstName) \(form.mainMemberLastName)\n"
        body += "Main Member ID: \(form.mainMemberIdNumber)\n"
        body += "Medical Aid: \(form.medicalAidName)\n"
        body += "Medical Aid Plan: \(form.medicalAidPlan)\n"
        body += "Membership Number: \(form.membershipNumber)\n"
        body += "Dependant Code: \(form.dependantCode)\n\n"
        body += "Procedure: \(form.procedure.joined(separator: ", "))\n"
        body += "ICD10 Code: \(form.icd10Code)\n"
        body += "Number of Sessions: \(form.numberOfSessions)\n\n"
        body += "C-Arm Owned by Hospital: \(form.cArmOwnedByHospital)\n"
        body += "Contrast Usage: \(form.contrastUsage)\n"
        if !form.contrastName.isEmpty { body += "Contrast Name: \(form.contrastName)\n" }
        if !form.contrastAmount.isEmpty { body += "Contrast Amount: \(form.contrastAmount)\n" }
        body += "Time C Arm In: \(form.timeCArmTakenIn)\n"
        body += "Time C Arm Out: \(form.timeCArmTakenOut)\n"
        body += "Screening Time: \(screeningTimeMedAid(form.screeningTimeText))\n"
        if !form.reasonForTimeDiscrepancy.isEmpty {
            body += "Reason for Time Discrepancy: \(form.reasonForTimeDiscrepancy)\n"
        }
        body += "\nRadiographer: \(form.radiographerName)\n"
        body += "Signed: \(form.radiographerSignatureTimestamp.isEmpty ? "N/A" : AppTimestamp.format(form.radiographerSignatureTimestamp))\n"
        body += locationLine(form)
        body += "\nOriginally submitted: \(AppTimestamp.format(form.updatedAt))\n"
        body += "Submitted by: \(form.submittedBy.isEmpty ? "N/A" : form.submittedBy)\n"

        var recipients = medicalAidRecipients(custom: customRecipients)
        recipients += hospitalOverride.adminCopyRecipients(for: form.radiographerEmail.isEmpty ? form.submittedBy : form.radiographerEmail)
        return (subject, body, Array(Set(recipients)))
    }

    static func buildCOIDAEmail(_ form: PatientForm, customRecipients: [String]? = nil) -> (subject: String, body: String, recipients: [String]) {
        let patient = form.patientName
        let subject = "COIDA Form - \(patient)"

        let radiographerRecord = Radiographers.find(byEmail: form.radiographerEmail)
            ?? Radiographers.list.first { $0.name.lowercased() == form.radiographerName.lowercased() }

        var body = "COIDA Form Submission\n\n"
        body += "Patient: \(patient)\n"
        body += "ID Number: \(form.idNumber)\n"
        body += "Date of Birth: \(form.dateOfBirth)\n"
        body += "Gender: \(form.gender.isEmpty ? "N/A" : form.gender)\n"
        body += "Contact: \(form.contactNumber)\n"
        body += "Home Phone: \(form.homePhone.isEmpty ? "N/A" : form.homePhone)\n"
        body += "Work Phone: \(form.workPhone.isEmpty ? "N/A" : form.workPhone)\n"
        body += "Email: \(form.email)\n"
        body += "Patient Address: \(form.patientAddress.isEmpty ? "N/A" : form.patientAddress)\n\n"
        body += "Admission Date: \(form.admissionDate.isEmpty ? "N/A" : form.admissionDate)\n"
        body += "Admission Time: \(form.admissionTime.isEmpty ? "N/A" : form.admissionTime)\n"
        body += "Hospital Name: \(hospitalOverride.displayName(for: form.radiographerEmail, captured: form.hospitalName))\n\n"
        body += "COIDA Number: \(form.coidaMemberNumber)\n"
        body += "IOD Claim Number: \(form.patientIodClaimNumber)\n"
        body += "Employer: \(form.employerName)\n"
        body += "Employer Contact: \(form.employerContact)\n"
        body += "Date of Incident: \(form.dateOfIncident)\n\n"
        body += "ICD10 Code: \(form.icd10Code.isEmpty ? "N/A" : form.icd10Code)\n"
        body += "Procedures: \(form.procedure.joined(separator: ", "))\n"
        body += "Date of Procedure: \(form.dateOfProcedure)\n"
        body += "Fixed Installation: \(form.fixedInstallation.isEmpty ? "N/A" : form.fixedInstallation)\n\n"
        body += "Time In Theatre: \(form.timeInTheatre)\n"
        body += "Time Out Theatre: \(form.timeOutTheatre)\n"
        body += "Screening Time: \(fluoroscopySeconds(form.fluoroscopyTime)) (seconds)\n"
        if !form.reasonForTimeDiscrepancy.isEmpty {
            body += "Reason for Time Discrepancy: \(form.reasonForTimeDiscrepancy)\n"
        }
        body += "\nRadiographer: \(form.radiographerName)\n"
        body += "Billing Practice: \(radiographerRecord?.prefix ?? radiographerRecord?.name ?? "N/A")\n"
        body += "Signed: \(form.radiographerSignatureTimestamp.isEmpty ? "N/A" : AppTimestamp.format(form.radiographerSignatureTimestamp))\n"
        body += locationLine(form)
        body += "\nOriginally submitted: \(AppTimestamp.format(form.updatedAt))\n"
        body += "Submitted by: \(form.submittedBy.isEmpty ? "N/A" : form.submittedBy)\n"

        var recipients = coidaRecipients(custom: customRecipients)
        recipients += hospitalOverride.adminCopyRecipients(for: form.radiographerEmail.isEmpty ? form.submittedBy : form.radiographerEmail)
        return (subject, body, Array(Set(recipients)))
    }

    static func buildEmail(for form: PatientForm, customRecipients: [String]? = nil) -> (subject: String, body: String, recipients: [String]) {
        form.formType == .coida ? buildCOIDAEmail(form, customRecipients: customRecipients) : buildMedicalAidEmail(form, customRecipients: customRecipients)
    }
}

// MARK: - Mail composer wrapper

struct MailAttachment {
    let data: Data
    let mimeType: String
    let fileName: String
}

final class MailComposer: NSObject, MFMailComposeViewControllerDelegate {
    static let shared = MailComposer()

    var isAvailable: Bool { MFMailComposeViewController.canSendMail() }

    func present(from viewController: UIViewController, subject: String, body: String, recipients: [String], attachments: [MailAttachment]) {
        let picker = MFMailComposeViewController()
        picker.mailComposeDelegate = self
        picker.setSubject(subject)
        picker.setMessageBody(body, isHTML: false)
        picker.setToRecipients(recipients)
        for attachment in attachments {
            picker.addAttachmentData(attachment.data, mimeType: attachment.mimeType, fileName: attachment.fileName)
        }
        viewController.present(picker, animated: true)
    }

    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        controller.dismiss(animated: true)
    }
}
