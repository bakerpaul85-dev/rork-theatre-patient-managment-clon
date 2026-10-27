import SwiftUI

// Worklist — simplified port of expo/app/(tabs)/worklist.tsx: a daily patient
// diary driven by the radiographer's submitted forms, grouped by date with
// case-status summaries and a day filter.

struct WorklistView: View {
    @State private var forms: [PatientForm] = []
    @State private var selectedDate = Date()
    @State private var showDatePicker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                dateCard
                if dayForms.isEmpty {
                    emptyState
                } else {
                    summaryCard
                    ForEach(dayForms) { form in
                        WorklistRow(form: form)
                    }
                }
            }
            .padding(16)
        }
        .background(AppConstants.background.ignoresSafeArea())
        .onAppear(perform: load)
    }

    private func load() {
        forms = FormsStore.shared.submittedForms
    }

    private var dayForms: [PatientForm] {
        let target = Self.dayKey(selectedDate)
        return forms
            .filter { Self.dayKey(from: $0.createdAt) == target || Self.dayKey(from: $0.updatedAt) == target }
            .sorted { $0.createdAt > $1.createdAt }
    }

    private static func dayKey(_ date: Date) -> String {
        date.formatted(.dateTime.year().month(.twoDigits).day())
    }

    private static func dayKey(from iso: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: iso) else { return "" }
        return dayKey(date)
    }

    private var dateCard: some View {
        SectionCard(title: "Worklist Diary") {
            Button {
                showDatePicker = true
            } label: {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundStyle(AppConstants.primary)
                    Text(selectedDate.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(AppConstants.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AppConstants.textSecondary)
                }
                .padding(14)
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                .cornerRadius(12)
            }
        }
        .sheet(isPresented: $showDatePicker) {
            DatePickerSheet(date: $selectedDate)
        }
    }

    private var summaryCard: some View {
        SectionCard(title: "Day Summary") {
            HStack(spacing: 12) {
                summaryTile(count: dayForms.count, label: "Cases", color: AppConstants.primary)
                summaryTile(count: dayForms.filter { $0.formType == .medicalAid }.count, label: "Medical Aid", color: AppConstants.teal)
                summaryTile(count: dayForms.filter { $0.formType == .coida }.count, label: "COIDA", color: AppConstants.purple)
            }
        }
    }

    private func summaryTile(count: Int, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(AppConstants.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(color.opacity(0.08))
        .cornerRadius(12)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 44))
                .foregroundStyle(AppConstants.textTertiary)
            Text("No cases for this day")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(AppConstants.textSecondary)
            Text("Submitted forms appear here on the day they were captured.")
                .font(.system(size: 13))
                .foregroundStyle(AppConstants.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .background(Color.white)
        .cornerRadius(16)
    }
}

struct DatePickerSheet: View {
    @Binding var date: Date
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            DatePicker("Select a day", selection: $date, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding()
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
        }
        .presentationDetents([.medium])
    }
}

struct WorklistRow: View {
    let form: PatientForm
    private var config: CaseStatusConfig { CaseStatusConfig.config(for: form.caseStatus) }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(form.patientName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(AppConstants.textPrimary)
                Spacer()
                Text(form.formType == .coida ? "COIDA" : "Medical Aid")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(form.formType == .coida ? AppConstants.purple : AppConstants.teal)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((form.formType == .coida ? AppConstants.purple : AppConstants.teal).opacity(0.1))
                    .cornerRadius(8)
            }
            Text("ID: \(form.idNumber.isEmpty ? "—" : form.idNumber)  •  \(form.hospitalServiceProvider.isEmpty ? (form.hospitalName.isEmpty ? "—" : form.hospitalName) : form.hospitalServiceProvider)")
                .font(.system(size: 13))
                .foregroundStyle(AppConstants.textSecondary)
            HStack {
                Text(config.label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(config.color)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(config.bgColor)
                    .cornerRadius(8)
                Spacer()
                Text(AppTimestamp.format(form.createdAt))
                    .font(.system(size: 12))
                    .foregroundStyle(AppConstants.textTertiary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}
