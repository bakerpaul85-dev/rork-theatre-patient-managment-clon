import SwiftUI
import Combine
import MessageUI

// Shared form-editor core: an ObservableObject holding the live form, the
// loaded photo previews and the OCR indicator state. The Medical Aid and COIDA
// form views observe this model; the shell handles draft save and the submit
// email flow (MailComposer-only, mirroring the Expo app decision).

final class FormEditorModel: ObservableObject {
    let objectWillChange = ObservableObjectPublisher()
    @Published var form: PatientForm
    @Published var alertTitle = ""
    @Published var alertMessage = ""
    @Published var showAlert = false

    // Photo previews per slot
    @Published var stickerImage: UIImage?
    @Published var clockInImage: UIImage?
    @Published var clockOutImage: UIImage?
    @Published var referralPageImages: [UIImage] = []
    @Published var employerImages: [UIImage] = []
    @Published var firstMedicalImage: UIImage?
    @Published var patientIdImage: UIImage?
    @Published var cArmPreviews: [UIImage] = []

    // OCR indicators
    @Published var extractingSticker = false
    @Published var stickerExtractedCount = 0
    @Published var extractingClockIn = false
    @Published var extractingClockOut = false
    @Published var extractingReferral = false
    @Published var referralExtractedCount = 0
    @Published var extractingEmployer = false
    @Published var employerExtractedCount = 0

    private let store = FormsStore.shared

    init(form: PatientForm) {
        self.form = form
        reloadPhotos()
    }

    func reloadPhotos() {
        stickerImage = store.loadPhoto(from: form.hospitalStickerPhoto, formId: form.id)
        clockInImage = store.loadPhoto(from: form.timeInTheatrePhoto, formId: form.id)
        clockOutImage = store.loadPhoto(from: form.timeOutTheatrePhoto, formId: form.id)
        referralPageImages = form.referralLetterPages.compactMap { store.loadPhoto(from: $0, formId: form.id) }
        employerImages = form.employerReportPhotos.compactMap { store.loadPhoto(from: $0, formId: form.id) }
        firstMedicalImage = store.loadPhoto(from: form.firstMedicalReportPhoto, formId: form.id)
        patientIdImage = store.loadPhoto(from: form.patientIdPhoto, formId: form.id)
        cArmPreviews = form.cArmImages.compactMap { store.loadPhoto(from: $0, formId: form.id) }
    }

    // MARK: - Photo + OCR handling

    func handlePhoto(image: UIImage, metadata: PhotoMetadata, slot: String) {
        guard var item = store.savePhoto(image, formId: form.id, slot: slot) else { return }
        store.attachMetadata(metadata, to: &item)

        switch slot {
        case "hospitalSticker":
            form.hospitalStickerPhoto = item
            stickerImage = image
            runOCR(slot: .sticker, image: image, extracting: Binding(get: { self.extractingSticker }, set: { self.extractingSticker = $0 })) { count in
                self.stickerExtractedCount = count
            }
        case "timeInTheatre":
            form.timeInTheatrePhoto = item
            clockInImage = image
            runClockOCR(image: image, slot: "timeInTheatre", extracting: Binding(get: { self.extractingClockIn }, set: { self.extractingClockIn = $0 }))
        case "timeOutTheatre":
            form.timeOutTheatrePhoto = item
            clockOutImage = image
            runClockOCR(image: image, slot: "timeOutTheatre", extracting: Binding(get: { self.extractingClockOut }, set: { self.extractingClockOut = $0 }))
        case "referralPage":
            form.referralLetterPages.append(item)
            referralPageImages.append(image)
            rebuildReferralPDF()
            runOCR(slot: .referral, image: image, extracting: Binding(get: { self.extractingReferral }, set: { self.extractingReferral = $0 })) { count in
                self.referralExtractedCount = count
            }
        case "employerReport":
            form.employerReportPhotos.append(item)
            employerImages.append(image)
            runOCR(slot: .referral, image: image, extracting: Binding(get: { self.extractingEmployer }, set: { self.extractingEmployer = $0 })) { count in
                self.employerExtractedCount = count
            }
        case "firstMedical":
            form.firstMedicalReportPhoto = item
            firstMedicalImage = image
        case "patientId":
            form.patientIdPhoto = item
            patientIdImage = image
        case "cArm":
            form.cArmImages.append(item)
            cArmPreviews.append(image)
        default:
            break
        }
        saveDraft()
    }

    func removeReferralPage(at index: Int) {
        guard index < form.referralLetterPages.count else { return }
        form.referralLetterPages.remove(at: index)
        referralPageImages.remove(at: index)
        rebuildReferralPDF()
        saveDraft()
    }

    func removeEmployerPage(at index: Int) {
        guard index < form.employerReportPhotos.count else { return }
        form.employerReportPhotos.remove(at: index)
        employerImages.remove(at: index)
        saveDraft()
    }

    func removeCARmImage(at index: Int) {
        guard index < form.cArmImages.count else { return }
        form.cArmImages.remove(at: index)
        cArmPreviews.remove(at: index)
        saveDraft()
    }

    private func rebuildReferralPDF() {
        if referralPageImages.isEmpty {
            form.referralLetterPDF = nil
        } else if let pdfData = PDFRenderer.pdfData(from: referralPageImages) {
            form.referralLetterPDF = store.savePDF(pdfData, formId: form.id, slot: "referral_letter")
        }
    }

    private func runOCR(slot: OCRSlot, image: UIImage, extracting: Binding<Bool>, onDone: @escaping (Int) -> Void) {
        extracting.wrappedValue = true
        Task { [weak self] in
            do {
                let extracted = try await StickerOCR.extract(from: image, slot: slot)
                guard let self else { return }
                StickerOCR.apply(extracted, to: &self.form)
                onDone(extracted.count)
                self.saveDraft()
            } catch {
                guard let self else { return }
                self.alertTitle = "AI Extraction Failed"
                self.alertMessage = error.localizedDescription
                self.showAlert = true
            }
            switch slot {
            case .sticker: self?.extractingSticker = false
            case .referral: self?.extractingReferral = false
            default: break
            }
        }
    }

    private func runClockOCR(image: UIImage, slot: String, extracting: Binding<Bool>) {
        extracting.wrappedValue = true
        Task { [weak self] in
            defer {
                self?.extractingClockIn = false
                self?.extractingClockOut = false
            }
            guard let self else { return }
            do {
                let extracted = try await StickerOCR.extract(from: image, slot: .clock)
                if let time = extracted.values["time"] {
                    // Format clock times as 14H30 (format used across the app)
                    let digits = time.filter { $0.isNumber }
                    let formatted = digits.count == 4 ? "\(digits.prefix(2))H\(digits.suffix(2))" : time
                    if slot == "timeInTheatre" && self.form.timeInTheatre.isEmpty {
                        self.form.timeInTheatre = formatted
                    } else if slot == "timeOutTheatre" && self.form.timeOutTheatre.isEmpty {
                        self.form.timeOutTheatre = formatted
                    }
                    self.saveDraft()
                }
            } catch {
                // Clock OCR is a convenience; stay silent like the Expo app.
            }
        }
    }

    func saveDraft() {
        form.updatedAt = AppTimestamp.now()
        store.saveDraft(form)
    }

    // MARK: - Submit (MailComposer-only)

    func buildMailRequest() -> FormEditorScreen.MailRequest? {
        if let error = validate() {
            alertTitle = "Missing Information"
            alertMessage = error
            showAlert = true
            return nil
        }
        form.radiographerSignatureTimestamp = AppTimestamp.now()
        let email = EmailBuilder.buildEmail(for: form)
        let attachments = store.emailAttachments(for: form).map {
            MailAttachment(
                data: (try? Data(contentsOf: $0.url)) ?? Data(),
                mimeType: $0.filename.hasSuffix(".pdf") ? "application/pdf" : "image/jpeg",
                fileName: $0.filename
            )
        }
        return FormEditorScreen.MailRequest(subject: email.subject, body: email.body, recipients: email.recipients, attachments: attachments)
    }

    func markSubmitted() {
        form.patientConsentGiven = true
        form.patientConsentTimestamp = AppTimestamp.now()
        store.submitForm(form)
        alertTitle = "Form Saved"
        alertMessage = "\(form.formType == .coida ? "COIDA" : "Medical Aid") form was saved. You can resend the email from your forms list."
        showAlert = true
    }

    private func validate() -> String? {
        if form.patientFirstName.isEmpty || form.patientLastName.isEmpty { return "Please enter the patient's first and last name." }
        if form.idNumber.isEmpty { return "Please enter the patient's ID number." }
        if form.radiographerName.isEmpty { return "Please enter the name and surname of the radiographer." }
        if form.formType == .coida {
            if form.coidaMemberNumber.isEmpty { return "Please enter the COIDA number." }
            if form.procedure.isEmpty { return "Please select at least one procedure." }
        } else {
            if form.hospitalServiceProvider.isEmpty { return "Please enter the hospital / service provider." }
            if form.referringDoctor.isEmpty { return "Please enter the referring doctor." }
            if form.mainMemberFirstName.isEmpty || form.mainMemberLastName.isEmpty { return "Please enter the main member's names." }
            if form.mainMemberIdNumber.isEmpty { return "Please enter the main member ID number." }
            if form.medicalAidName.isEmpty { return "Please select the medical aid." }
            if form.membershipNumber.isEmpty { return "Please enter the membership number." }
            if form.numberOfSessions.isEmpty { return "Please enter the number of sessions." }
            if form.cArmOwnedByHospital.isEmpty { return "Please indicate whether the C-Arm is owned by the hospital." }
            if form.contrastUsage.isEmpty { return "Please indicate the contrast usage." }
        }
        return nil
    }
}

// MARK: - Editor shell

struct FormEditorScreen: View {
    @StateObject private var model: FormEditorModel
    @State private var cameraSlot: CameraSlot?
    @State private var mailRequest: MailRequest?
    @State private var showPrivacyNotice = false

    struct MailRequest: Identifiable {
        let id = UUID()
        let subject: String
        let body: String
        let recipients: [String]
        let attachments: [MailAttachment]
    }

    init(form: PatientForm) {
        _model = StateObject(wrappedValue: FormEditorModel(form: form))
    }

    var body: some View {
        Group {
            if model.form.formType == .coida {
                COIDAFormView(model: model, cameraSlot: $cameraSlot, showPrivacyNotice: $showPrivacyNotice)
            } else {
                MedicalAidFormView(model: model, cameraSlot: $cameraSlot, showPrivacyNotice: $showPrivacyNotice)
            }
        }
        .navigationTitle(model.form.formType == .coida ? "COIDA Form" : "Medical Aid Form")
        .navigationBarTitleDisplayMode(.inline)
        .background(AppConstants.background.ignoresSafeArea())
        .toolbar {
            ToolbarItemGroup(placement: .bottomBar) {
                if model.form.isDraft {
                    Button {
                        model.saveDraft()
                        model.alertTitle = "Draft Saved"
                        model.alertMessage = "You can continue this form later from My Forms."
                        model.showAlert = true
                    } label: {
                        Text("Save Draft")
                            .font(.system(size: 16, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(Color(hex: "#F1F3F5"))
                            .cornerRadius(10)
                    }
                    Button {
                        if let request = model.buildMailRequest() {
                            mailRequest = request
                        }
                    } label: {
                        Text("Submit")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(AppConstants.primary)
                            .cornerRadius(10)
                    }
                } else {
                    Text("Submitted ✓")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppConstants.teal)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .sheet(item: $cameraSlot) { slot in
            CameraCaptureView { image, metadata in
                model.handlePhoto(image: image, metadata: metadata, slot: slot.id)
            }
            .onDisappear { model.reloadPhotos() }
        }
        .sheet(item: $mailRequest) { request in
            MailComposerSheet(request: request, onComplete: { model.markSubmitted() })
        }
        .sheet(isPresented: $showPrivacyNotice) {
            PrivacyNoticeSheet()
        }
        .alert(model.alertTitle, isPresented: $model.showAlert) {
            Button("OK") {}
        } message: {
            Text(model.alertMessage)
        }
    }
}

struct CameraSlot: Identifiable, Equatable {
    let id: String
}

// MARK: - Mail composer sheet

struct MailComposerSheet: UIViewControllerRepresentable {
    let request: FormEditorScreen.MailRequest
    let onComplete: () -> Void

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let picker = MFMailComposeViewController()
        picker.mailComposeDelegate = context.coordinator
        picker.setSubject(request.subject)
        picker.setMessageBody(request.body, isHTML: false)
        picker.setToRecipients(request.recipients)
        for attachment in request.attachments {
            picker.addAttachmentData(attachment.data, mimeType: attachment.mimeType, fileName: attachment.fileName)
        }
        return picker
    }

    func updateUIViewController(_ uiViewController: MFMailComposeViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onComplete: onComplete) }

    final class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        let onComplete: () -> Void
        init(onComplete: @escaping () -> Void) { self.onComplete = onComplete }

        func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
            controller.dismiss(animated: true)
            onComplete()
        }
    }
}

// MARK: - Multi-select picker sheet (COIDA procedures, multiple employer docs)

struct MultiOptionSheet: View {
    let title: String
    @Binding var selected: [String]
    let options: [String]
    var searchable = false
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    var filtered: [String] {
        query.isEmpty ? options : options.filter { $0.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack {
            List {
                if searchable {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("Search...", text: $query)
                    }
                    .listRowBackground(Color.clear)
                }
                ForEach(filtered, id: \.self) { option in
                    Button {
                        if let index = selected.firstIndex(of: option) {
                            selected.remove(at: index)
                        } else {
                            selected.append(option)
                        }
                    } label: {
                        HStack {
                            Text(option)
                                .foregroundStyle(selected.contains(option) ? AppConstants.primary : .primary)
                            Spacer()
                            if selected.contains(option) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(AppConstants.primary)
                            }
                        }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
    }
}

// MARK: - Privacy notice (port of components/PrivacyNotice.tsx)

struct PrivacyNoticeSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Privacy Notice").font(.system(size: 22, weight: .bold))
                    Text("""
                    This app collects patient information for the purpose of theatre patient registration, medical aid claims and COIDA reporting.

                    • Photos and details are stored on this device and shared only with the recipients of the submitted forms.
                    • Photos are analysed by an automated AI service to pre-fill form fields. Data is transmitted over an encrypted connection and is not retained by the AI provider for training.
                    • Your location and the time of signing are recorded with your signature as an audit trail (POPIA compliance).
                    • Consent is obtained from the patient before their information is captured and shared.
                    """)
                    .font(.system(size: 15))
                    .foregroundStyle(AppConstants.textPrimary)
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
