import SwiftUI

// Port of app/(tabs)/forms.tsx — drafts/submitted lists with case status sheet.

struct FormsListView: View {
    @ObservedObject private var forms = FormsStore.shared
    @ObservedObject private var auth = AuthStore.shared
    @State private var activeTab: Tab = .drafts
    @State private var statusSheetForm: PatientForm?
    @State private var deleteTarget: PatientForm?
    @State private var formToOpen: PatientForm?
    @State private var deletionDone = false

    enum Tab { case drafts, submitted }

    var body: some View {
        VStack(spacing: 0) {
            tabBar
            if filteredForms.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(filteredForms) { form in
                            FormCard(
                                form: form,
                                onOpen: { formToOpen = form },
                                onDelete: { deleteTarget = form },
                                onStatusTap: { statusSheetForm = form }
                            )
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(AppConstants.background)
        .navigationDestination(isPresented: Binding(get: { formToOpen != nil }, set: { if !$0 { formToOpen = nil } })) {
            if let form = formToOpen {
                FormEditorScreen(form: form)
            }
        }
        .sheet(item: $statusSheetForm) { form in
            CaseStatusSheet(form: form)
        }
        .alert("Delete Draft", isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } })) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let form = deleteTarget {
                    forms.deleteForm(form)
                    deletionDone = true
                }
            }
        } message: {
            if let form = deleteTarget {
                Text("Are you sure you want to delete the draft for \(form.patientName.isEmpty ? "Unnamed Patient" : form.patientName)? This action cannot be undone.")
            }
        }
    }

    private var filteredForms: [PatientForm] {
        activeTab == .drafts ? forms.drafts : forms.submittedForms
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            tabButton("Drafts (\(forms.drafts.count))", tab: .drafts)
            tabButton("Submitted (\(forms.submittedForms.count))", tab: .submitted)
        }
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(AppConstants.border).frame(height: 1) }
    }

    private func tabButton(_ label: String, tab: Tab) -> some View {
        Button {
            activeTab = tab
        } label: {
            VStack(spacing: 6) {
                Text(label)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(activeTab == tab ? AppConstants.primary : AppConstants.textSecondary)
                Rectangle()
                    .fill(activeTab == tab ? AppConstants.primary : .clear)
                    .frame(height: 2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: activeTab == .drafts ? "clock" : "checkmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color(hex: "#CCCCCC"))
            Text(activeTab == .drafts ? "No Draft Forms" : "No Submitted Forms")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Color(hex: "#333333"))
            Text(activeTab == .drafts ? "Start a new form and save it as a draft to continue later" : "Completed forms will appear here")
                .font(.system(size: 16))
                .foregroundStyle(AppConstants.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(32)
    }
}

// MARK: - Form card

struct FormCard: View {
    let form: PatientForm
    let onOpen: () -> Void
    let onDelete: () -> Void
    let onStatusTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                HStack(spacing: 12) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppConstants.primary)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(form.patientName.isEmpty ? "Unnamed Patient" : form.patientName)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Color(hex: "#333333"))
                        Text(AppTimestamp.format(form.updatedAt))
                            .font(.system(size: 14))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                }
                Spacer()
                if form.isDraft {
                    Label("Draft", systemImage: "clock")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: "#FF9500"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(hex: "#FFF3E0"))
                        .cornerRadius(12)
                } else {
                    Label("Submitted", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AppConstants.teal)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(hex: "#E7F9F9"))
                        .cornerRadius(12)
                }
            }

            Button(action: onStatusTap) {
                let config = CaseStatusConfig.config(for: form.caseStatus)
                HStack {
                    Text(config.shortLabel)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(config.color)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(config.bgColor)
                        .cornerRadius(10)
                    Spacer()
                    HStack(spacing: 4) {
                        Text("Update status")
                            .font(.system(size: 11))
                            .foregroundStyle(Color(hex: "#9CA3AF"))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11))
                            .foregroundStyle(Color(hex: "#9CA3AF"))
                    }
                }
                .padding(10)
                .background(config.bgColor.opacity(0.7))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(config.color.opacity(0.19), lineWidth: 1))
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 6) {
                if !form.idNumber.isEmpty { Text("ID: \(form.idNumber)") }
                if !form.procedure.isEmpty { Text("Procedure: \(form.procedure.joined(separator: ", "))").lineLimit(2) }
                if !form.medicalAidName.isEmpty { Text("Medical Aid: \(form.medicalAidName)") }
            }
            .font(.system(size: 14))
            .foregroundStyle(AppConstants.textSecondary)

            HStack(spacing: 8) {
                if form.isDraft {
                    Button(action: onOpen) {
                        Text("Continue")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(AppConstants.primary)
                            .cornerRadius(8)
                    }
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .foregroundStyle(AppConstants.danger)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.white)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppConstants.danger, lineWidth: 1))
                            .cornerRadius(8)
                    }
                } else {
                    Button(action: onOpen) {
                        Text("View")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(AppConstants.teal)
                            .cornerRadius(8)
                    }
                    Button(action: onOpen) {
                        HStack(spacing: 6) {
                            Image(systemName: "envelope")
                            Text("Resend Email")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppConstants.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppConstants.primary, lineWidth: 1))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Case status sheet (port of CaseTracker + the status modal)

struct CaseStatusSheet: View {
    let form: PatientForm
    @ObservedObject private var forms = FormsStore.shared
    @ObservedObject private var auth = AuthStore.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(form.patientName.isEmpty ? "Unnamed Patient" : form.patientName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: "#374151"))

                    // Tracker: horizontal chain of statuses
                    HStack(alignment: .top, spacing: 0) {
                        ForEach(Array(CaseStatusConfig.all.enumerated()), id: \.element.status) { index, config in
                            let reached = config.order <= (CaseStatusConfig.config(for: form.caseStatus).order)
                            VStack(spacing: 6) {
                                Circle()
                                    .fill(reached ? config.color : Color(hex: "#E5E7EB"))
                                    .frame(width: 18, height: 18)
                                Text(config.shortLabel)
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(reached ? config.color : Color(hex: "#9CA3AF"))
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.vertical, 8)

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(CaseStatusConfig.all, id: \.status) { config in
                            Button {
                                forms.updateCaseStatus(form, status: config.status, updatedBy: auth.user?.name)
                                dismiss()
                            } label: {
                                HStack {
                                    Text(config.label)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(config.color)
                                    Spacer()
                                    if form.caseStatus == config.status {
                                        Image(systemName: "checkmark").foregroundStyle(config.color)
                                    }
                                }
                                .padding(12)
                                .background(config.bgColor)
                                .cornerRadius(10)
                            }
                        }
                    }

                    if !form.caseStatusHistory.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("STATUS HISTORY")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color(hex: "#9CA3AF"))
                            ForEach(Array(form.caseStatusHistory.suffix(6).reversed().enumerated()), id: \.offset) { _, event in
                                let config = CaseStatusConfig.config(for: event.status)
                                HStack(alignment: .top, spacing: 10) {
                                    Circle().fill(config.color).frame(width: 8, height: 8).padding(.top, 4)
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(config.label)
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(config.color)
                                        Text("\(AppTimestamp.format(event.timestamp))\(event.updatedBy.map { " by \($0)" } ?? "")")
                                            .font(.system(size: 11))
                                            .foregroundStyle(Color(hex: "#9CA3AF"))
                                    }
                                }
                            }
                        }
                        .padding(.top, 12)
                        .overlay(alignment: .top) { Rectangle().fill(Color(hex: "#F3F4F6")).frame(height: 1) }
                    }
                }
                .padding(24)
            }
            .navigationTitle("Update Case Status")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .presentationDetents([.large, .medium])
    }
}
