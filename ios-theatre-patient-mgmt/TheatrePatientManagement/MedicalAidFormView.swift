import SwiftUI

// Medical Aid form — section-by-section port of expo/app/(tabs)/medical-aid.tsx
// with the exact labels: Hospital Sticker, Theatre Clock (Clock In / Clock Out
// + C-Arm times), Referral Letter, Hospital Information, Patient Information,
// Hospital / Facility, Medical Aid Information, Procedure Information,
// Radiographer Signature.

struct MedicalAidFormView: View {
    @ObservedObject var model: FormEditorModel
    @Binding var cameraSlot: CameraSlot?
    @Binding var showPrivacyNotice: Bool

    private var readOnly: Bool { !model.form.isDraft }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                hospitalStickerSection
                theatreClockSection
                referralLetterSection
                hospitalInformationSection
                patientInformationSection
                hospitalFacilitySection
                medicalAidSection
                procedureSection
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
                aiDisclosure: "AI will read the sticker to auto-fill patient and medical aid details.",
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
                title: "Photo of Theatre Clock — Clock In",
                aiDisclosure: "AI reads the clock time from the photo.",
                image: model.clockInImage,
                gpsMetadata: model.form.timeInTheatrePhoto?.metadata,
                extracting: model.extractingClockIn,
                captureLabel: "Take Clock In Photo"
            ) {
                cameraSlot = CameraSlot(id: "timeInTheatre")
            }
            .disabled(readOnly)

            Field(label: "Time C Arm Taken In", required: true) {
                AppTextField(placeholder: "e.g. 14H30", text: $model.form.timeCArmTakenIn, disabled: readOnly)
            }

            PhotoCaptureField(
                title: "Photo of Theatre Clock — Clock Out",
                aiDisclosure: "AI reads the clock time from the photo.",
                image: model.clockOutImage,
                gpsMetadata: model.form.timeOutTheatrePhoto?.metadata,
                extracting: model.extractingClockOut,
                captureLabel: "Take Clock Out Photo"
            ) {
                cameraSlot = CameraSlot(id: "timeOutTheatre")
            }
            .disabled(readOnly)

            Field(label: "Time C Arm Taken Out", required: true) {
                AppTextField(placeholder: "e.g. 15H10", text: $model.form.timeCArmTakenOut, disabled: readOnly)
            }
        }
    }

    // MARK: 3. Referral Letter

    private var referralLetterSection: some View {
        SectionCard(title: "Referral Letter") {
            if !readOnly {
                PhotoCaptureField(
                    title: model.referralPageImages.isEmpty ? "Scan Referral Letter" : "Add Another Page",
                    aiDisclosure: "Each page is scanned, analysed by AI, and combined into a single PDF for submission.",
                    image: nil,
                    extracting: model.extractingReferral,
                    captureLabel: "Take Photo of Page"
                ) {
                    cameraSlot = CameraSlot(id: "referralPage")
                }
            }

            if model.referralExtractedCount > 0 {
                Label("\(model.referralExtractedCount) fields auto-filled from referral letter", systemImage: "sparkles")
                    .font(.system(size: 12))
                    .foregroundStyle(AppConstants.primary)
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

            if model.referralPageImages.isEmpty {
                Text("Take a photo of the patient's referral letter. Multiple pages are combined into one PDF.")
                    .font(.system(size: 13))
                    .foregroundStyle(AppConstants.textSecondary)
            }
        }
    }

    // MARK: 4. Hospital Information

    private var hospitalInformationSection: some View {
        SectionCard(title: "Hospital Information") {
            Field(label: "Date", required: true) {
                AppTextField(placeholder: "DD/MM/YYYY", text: $model.form.date, keyboard: .numbersAndPunctuation, disabled: readOnly, maxLength: 10)
            }
        }
    }

    // MARK: 5. Patient Information

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

            Field(label: "Contact Number") {
                AppTextField(placeholder: "Contact Number", text: $model.form.contactNumber, keyboard: .phonePad, disabled: readOnly, maxLength: 12, numericOnly: true)
            }
            Field(label: "Email") {
                AppTextField(placeholder: "Email", text: $model.form.email, keyboard: .emailAddress, disabled: readOnly)
            }
            Field(label: "Gender") {
                PillRow(options: AppConstants.genders, value: $model.form.gender).disabled(readOnly)
            }
            Field(label: "Address") {
                AppTextField(placeholder: "Street Address", text: $model.form.patientAddress, disabled: readOnly)
            }
            Field(label: "Home Phone") {
                AppTextField(placeholder: "Home Phone", text: $model.form.homePhone, keyboard: .phonePad, disabled: readOnly, maxLength: 12, numericOnly: true)
            }
            Field(label: "Work Phone") {
                AppTextField(placeholder: "Work Phone", text: $model.form.workPhone, keyboard: .phonePad, disabled: readOnly, maxLength: 12, numericOnly: true)
            }
        }
    }

    // MARK: 6. Hospital / Facility

    private var hospitalFacilitySection: some View {
        SectionCard(title: "Hospital / Facility") {
            Field(label: "Hospital / Service Provider", required: true) {
                AppTextField(placeholder: "Hospital / Service Provider", text: $model.form.hospitalServiceProvider, disabled: readOnly, uppercase: true)
            }
            Field(label: "Ward") {
                AppTextField(placeholder: "Ward", text: $model.form.ward, disabled: readOnly)
            }
            Field(label: "Bed") {
                AppTextField(placeholder: "Bed", text: $model.form.bed, disabled: readOnly)
            }
            Field(label: "Admission Date") {
                AppTextField(placeholder: "DD/MM/YYYY", text: $model.form.admissionDate, disabled: readOnly, maxLength: 10)
            }
            Field(label: "Admission Time") {
                AppTextField(placeholder: "e.g. 09H30", text: $model.form.admissionTime, disabled: readOnly, maxLength: 5)
            }
            Field(label: "Case Number") {
                AppTextField(placeholder: "Case Number", text: $model.form.caseNumber, disabled: readOnly)
            }
            Field(label: "Referring Doctor", required: true) {
                AppTextField(placeholder: "Referring Doctor", text: $model.form.referringDoctor, disabled: readOnly, uppercase: true)
            }
            Field(label: "Doctor Practice Number") {
                AppTextField(placeholder: "Practice Number", text: $model.form.doctorPracticeNumber, disabled: readOnly)
            }
        }
    }

    // MARK: 7. Medical Aid Information

    private var medicalAidSection: some View {
        SectionCard(title: "Medical Aid Information") {
            Field(label: "Main Member Title") { TitlePicker(value: $model.form.mainMemberTitle).disabled(readOnly) }
            Field(label: "Main Member First Name", required: true) {
                AppTextField(placeholder: "First Name", text: $model.form.mainMemberFirstName, disabled: readOnly, uppercase: true)
            }
            Field(label: "Main Member Last Name", required: true) {
                AppTextField(placeholder: "Last Name", text: $model.form.mainMemberLastName, disabled: readOnly, uppercase: true)
            }
            Field(label: "Main Member ID Number", required: true) {
                AppTextField(placeholder: "13-digit ID number", text: $model.form.mainMemberIdNumber, keyboard: .numberPad, disabled: readOnly, maxLength: 13, numericOnly: true)
            }
            SearchPickerField(label: "Medical Aid Name", value: $model.form.medicalAidName, options: AppConstants.medicalAidNames, required: true)
                .disabled(readOnly)
                .opacity(readOnly ? 0.6 : 1)
            Field(label: "Medical Aid Plan") {
                AppTextField(placeholder: "Plan / Option", text: $model.form.medicalAidPlan, disabled: readOnly, uppercase: true)
            }
            Field(label: "Membership Number", required: true) {
                AppTextField(placeholder: "Membership Number", text: $model.form.membershipNumber, disabled: readOnly, uppercase: true)
            }
            Field(label: "Dependant Code") {
                AppTextField(placeholder: "Dependant Code", text: $model.form.dependantCode, disabled: readOnly, uppercase: true)
            }
        }
    }

    // MARK: 8. Procedure Information

    private var procedureSection: some View {
        SectionCard(title: "Procedure Information") {
            MultiPickerField(label: "Procedure", selected: $model.form.procedure, options: AppConstants.procedureDisplayNames, required: true)
                .disabled(readOnly)
                .opacity(readOnly ? 0.6 : 1)

            Field(label: "ICD10 Code") {
                AppTextField(placeholder: "ICD10 Code", text: $model.form.icd10Code, disabled: readOnly)
            }
            Field(label: "Authorization Code") {
                AppTextField(placeholder: "Authorization Code", text: $model.form.authorizationCode, disabled: readOnly, uppercase: true)
            }
            Field(label: "Screening Time (min:sec)") {
                AppTextField(placeholder: "e.g. 02:45", text: $model.form.screeningTimeText, keyboard: .numbersAndPunctuation, disabled: readOnly, maxLength: 7)
            }
            Field(label: "Number of Sessions", required: true) {
                AppTextField(placeholder: "Number of Sessions", text: $model.form.numberOfSessions, keyboard: .numberPad, disabled: readOnly, maxLength: 3, numericOnly: true)
            }
            Field(label: "C-Arm Owned by Hospital", required: true) {
                PillRow(options: ["Yes", "No"], value: $model.form.cArmOwnedByHospital).disabled(readOnly)
            }
            Field(label: "Contrast Usage", required: true) {
                PillRow(options: ["Yes", "No"], value: $model.form.contrastUsage).disabled(readOnly)
            }
            if model.form.contrastUsage == "Yes" {
                Field(label: "Name of Contrast") {
                    AppTextField(placeholder: "Name of Contrast", text: $model.form.contrastName, disabled: readOnly)
                }
                Field(label: "Amount Used") {
                    AppTextField(placeholder: "Amount Used", text: $model.form.contrastAmount, disabled: readOnly)
                }
            }
            if !model.form.timeCArmTakenIn.isEmpty && !model.form.timeCArmTakenOut.isEmpty {
                Field(label: "Reason for Time Discrepancy (if screening time does not match theatre clock times)") {
                    AppTextField(placeholder: "Reason", text: $model.form.reasonForTimeDiscrepancy, disabled: readOnly)
                }
            }
        }
    }

    // MARK: 9. Radiographer Signature

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

// MARK: - Multi-select picker field

struct MultiPickerField: View {
    let label: String
    @Binding var selected: [String]
    let options: [String]
    var required = false
    @State private var open = false

    var body: some View {
        Field(label: label, required: required) {
            Button {
                open = true
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(selected.isEmpty ? "Select \(label.lowercased())..." : "\(selected.count) selected")
                            .foregroundStyle(selected.isEmpty ? AppConstants.textTertiary : AppConstants.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                    if !selected.isEmpty {
                        Text(selected.joined(separator: ", "))
                            .font(.system(size: 12))
                            .foregroundStyle(AppConstants.textSecondary)
                            .lineLimit(2)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                .cornerRadius(12)
            }
        }
        .sheet(isPresented: $open) {
            MultiOptionSheet(title: label, selected: $selected, options: options, searchable: true)
        }
    }
}
