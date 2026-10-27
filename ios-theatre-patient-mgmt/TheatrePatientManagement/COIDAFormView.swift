import SwiftUI

// COIDA form — section-by-section port of expo/app/(tabs)/coida.tsx:
// Hospital Sticker, Theatre Clock (Time In / Time Out photos + times),
// Patient Information, Theatre Information (COIDA number, ICD10, procedures,
// date of procedure, C-Arm images), Documents (Employer's Report, First
// Medical Report, Patient ID, Referral Letter → PDF), Radiographer Signature.

struct COIDAFormView: View {
    @ObservedObject var model: FormEditorModel
    @Binding var cameraSlot: CameraSlot?
    @Binding var showPrivacyNotice: Bool

    private var readOnly: Bool { !model.form.isDraft }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                hospitalStickerSection
                theatreClockSection
                patientInformationSection
                theatreInformationSection
                documentsSection
                signatureSection
            }
            .padding(16)
        }
    }

    // MARK: 1. Hospital Sticker

    private var hospitalStickerSection: some View {
        SectionCard(title: "Hospital Sticker") {
            PhotoCaptureField(
                title: "Photo of Hospital Sticker",
                aiDisclosure: "AI will read the sticker to auto-fill patient details.",
                image: model.stickerImage,
                gpsMetadata: model.form.hospitalStickerPhoto?.metadata,
                extracting: model.extractingSticker,
                extractedCount: model.stickerExtractedCount,
                captureLabel: model.stickerImage == nil ? "Take Photo" : "Retake Photo"
            ) {
                cameraSlot = CameraSlot(id: "hospitalSticker")
            }
            .disabled(readOnly)
        }
    }

    // MARK: 2. Theatre Clock

    private var theatreClockSection: some View {
        SectionCard(title: "Theatre Clock") {
            PhotoCaptureField(
                title: "Photo of Theatre Clock — Time In",
                aiDisclosure: "AI reads the clock time from the photo.",
                image: model.clockInImage,
                gpsMetadata: model.form.timeInTheatrePhoto?.metadata,
                extracting: model.extractingClockIn,
                captureLabel: "Take Time In Photo"
            ) {
                cameraSlot = CameraSlot(id: "timeInTheatre")
            }
            .disabled(readOnly)

            Field(label: "Time In Theatre", required: true) {
                AppTextField(placeholder: "e.g. 14H30", text: $model.form.timeInTheatre, disabled: readOnly, maxLength: 5)
            }

            PhotoCaptureField(
                title: "Photo of Theatre Clock — Time Out",
                aiDisclosure: "AI reads the clock time from the photo.",
                image: model.clockOutImage,
                gpsMetadata: model.form.timeOutTheatrePhoto?.metadata,
                extracting: model.extractingClockOut,
                captureLabel: "Take Time Out Photo"
            ) {
                cameraSlot = CameraSlot(id: "timeOutTheatre")
            }
            .disabled(readOnly)

            Field(label: "Time Out Theatre", required: true) {
                AppTextField(placeholder: "e.g. 15H10", text: $model.form.timeOutTheatre, disabled: readOnly, maxLength: 5)
            }
        }
    }

    // MARK: 3. Patient Information

    private var patientInformationSection: some View {
        SectionCard(title: "Patient Information") {
            Field(label: "Title") { TitlePicker(value: $model.form.patientTitle).disabled(readOnly) }

            Field(label: "First Name", required: true) {
                AppTextField(placeholder: "First Name", text: $model.form.patientFirstName, disabled: readOnly, uppercase: true)
            }
            Field(label: "Last Name", required: true) {
                AppTextField(placeholder: "Last Name", text: $model.form.patientLastName, disabled: readOnly, uppercase: true)
            }
            Field(label: "ID Number", required: true) {
                AppTextField(placeholder: "13-digit ID number", text: $model.form.idNumber, keyboard: .numberPad, disabled: readOnly, maxLength: 13, numericOnly: true)
            }
            .onChange(of: model.form.idNumber) { newValue in
                if !readOnly {
                    model.form.dateOfBirth = dateOfBirthFromSAID(newValue)
                    model.form.gender = genderFromSAID(newValue)
                }
            }

            if !model.form.dateOfBirth.isEmpty {
                Field(label: "Date of Birth (auto from ID)") {
                    Text(model.form.dateOfBirth)
                        .font(.system(size: 15))
                        .foregroundStyle(AppConstants.textSecondary)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(hex: "#F8F9FA"))
                        .cornerRadius(12)
                }
            }
        }
    }

    // MARK: 4. Theatre Information

    private var theatreInformationSection: some View {
        SectionCard(title: "Theatre Information") {
            Field(label: "COIDA Number", required: true) {
                AppTextField(placeholder: "COIDA Number", text: $model.form.coidaMemberNumber, disabled: readOnly, uppercase: true)
            }
            Field(label: "ICD10 Code") {
                AppTextField(placeholder: "ICD10 Code", text: $model.form.icd10Code, disabled: readOnly)
            }
            MultiPickerField(label: "Procedures", selected: $model.form.procedure, options: AppConstants.procedureDisplayNames, required: true)
                .disabled(readOnly)
                .opacity(readOnly ? 0.6 : 1)
            Field(label: "Date of Procedure", required: true) {
                AppTextField(placeholder: "DD/MM/YYYY", text: $model.form.dateOfProcedure, disabled: readOnly, maxLength: 10)
            }
            Field(label: "C-Arm Owned by Hospital") {
                PillRow(options: ["Yes", "No"], value: $model.form.cArmOwnedByHospital).disabled(readOnly)
            }
            Field(label: "Screening Time (min:sec)") {
                AppTextField(placeholder: "e.g. 02:45", text: $model.form.screeningTimeText, keyboard: .numbersAndPunctuation, disabled: readOnly, maxLength: 7)
            }

            PhotoCaptureField(
                title: model.cArmPreviews.isEmpty ? "C-Arm Image" : "Add Another C-Arm Image",
                aiDisclosure: nil,
                image: nil,
                captureLabel: "Take C-Arm Photo"
            ) {
                cameraSlot = CameraSlot(id: "cArm")
            }
            .disabled(readOnly)

            ForEach(model.cArmPreviews.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    Image(uiImage: model.cArmPreviews[index])
                        .resizable()
                        .scaledToFit()
                        .frame(height: 90)
                        .cornerRadius(8)
                    Text("C-Arm Image \(index + 1)")
                        .font(.system(size: 14, weight: .semibold))
                    Spacer()
                    if !readOnly {
                        Button {
                            model.removeCARmImage(at: index)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(AppConstants.danger)
                        }
                    }
                }
            }
        }
    }

    // MARK: 5. Documents

    private var documentsSection: some View {
        SectionCard(title: "Documents") {
            // Employer's Report (multi-page)
            PhotoCaptureField(
                title: model.employerImages.isEmpty ? "Employer's Report" : "Add Another Employer's Report Page",
                aiDisclosure: "AI extracts employer details from the report.",
                image: nil,
                extracting: model.extractingEmployer,
                captureLabel: "Take Photo"
            ) {
                cameraSlot = CameraSlot(id: "employerReport")
            }
            .disabled(readOnly)

            if model.employerExtractedCount > 0 {
                Label("\(model.employerExtractedCount) fields auto-filled", systemImage: "sparkles")
                    .font(.system(size: 12))
                    .foregroundStyle(AppConstants.primary)
            }

            ForEach(model.employerImages.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    Image(uiImage: model.employerImages[index])
                        .resizable()
                        .scaledToFit()
                        .frame(height: 90)
                        .cornerRadius(8)
                    Text("Page \(index + 1)")
                        .font(.system(size: 14, weight: .semibold))
                    Spacer()
                    if !readOnly {
                        Button {
                            model.removeEmployerPage(at: index)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(AppConstants.danger)
                        }
                    }
                }
            }

            PhotoCaptureField(
                title: "First Medical Report",
                aiDisclosure: nil,
                image: model.firstMedicalImage,
                gpsMetadata: model.form.firstMedicalReportPhoto?.metadata,
                captureLabel: "Take Photo"
            ) {
                cameraSlot = CameraSlot(id: "firstMedical")
            }
            .disabled(readOnly)

            PhotoCaptureField(
                title: "Patient ID",
                aiDisclosure: nil,
                image: model.patientIdImage,
                gpsMetadata: model.form.patientIdPhoto?.metadata,
                captureLabel: "Take Photo"
            ) {
                cameraSlot = CameraSlot(id: "patientId")
            }
            .disabled(readOnly)

            if !readOnly {
                PhotoCaptureField(
                    title: model.referralPageImages.isEmpty ? "Referral Letter" : "Add Another Referral Letter Page",
                    aiDisclosure: "Each page is scanned and combined into a single PDF for submission.",
                    image: nil,
                    extracting: model.extractingReferral,
                    captureLabel: "Take Photo of Page"
                ) {
                    cameraSlot = CameraSlot(id: "referralPage")
                }
            }

            ForEach(model.referralPageImages.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    Image(uiImage: model.referralPageImages[index])
                        .resizable()
                        .scaledToFit()
                        .frame(height: 90)
                        .cornerRadius(8)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Page \(index + 1)")
                            .font(.system(size: 14, weight: .semibold))
                        Text(model.form.referralLetterPDF != nil ? "Included in referral_letter.pdf" : "")
                            .font(.system(size: 12))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                    Spacer()
                    if !readOnly {
                        Button {
                            model.removeReferralPage(at: index)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(AppConstants.danger)
                        }
                    }
                }
            }
        }
    }

    // MARK: 6. Radiographer Signature

    private var signatureSection: some View {
        SectionCard(title: "Radiographer Signature") {
            Field(label: "Name & Surname of Radiographer", required: true) {
                AppTextField(placeholder: "Name & Surname", text: $model.form.radiographerName, disabled: readOnly, uppercase: true)
            }

            if readOnly {
                if !model.form.radiographerSignatureTimestamp.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Signed \(AppTimestamp.format(model.form.radiographerSignatureTimestamp))", systemImage: "checkmark.seal.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: "#28A745"))
                        if let lat = model.form.submissionLatitude, let lon = model.form.submissionLongitude {
                            Label(String(format: "%.6f, %.6f", lat, lon), systemImage: "mappin.and.ellipse")
                                .font(.system(size: 12))
                                .foregroundStyle(AppConstants.textSecondary)
                        }
                    }
                    .padding(12)
                    .background(Color(hex: "#D1FAE5"))
                    .cornerRadius(12)
                }
            } else {
                Button {
                    showPrivacyNotice = true
                } label: {
                    Label("Read the Privacy Notice (POPIA)", systemImage: "lock.shield")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AppConstants.primary)
                }
                Text("By submitting this form you confirm the patient has given consent to capture and share their information, and agree that the signature time and location are recorded as an audit trail.")
                    .font(.system(size: 12))
                    .foregroundStyle(AppConstants.textSecondary)
            }
        }
    }
}
