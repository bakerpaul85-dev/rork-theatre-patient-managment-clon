import SwiftUI

// Port of app/(tabs)/admin.tsx — user management for admins.

struct AdminView: View {
    @ObservedObject private var auth = AuthStore.shared
    @ObservedObject private var forms = FormsStore.shared
    @State private var expandedUsers: Set<String> = []
    @State private var deleteTarget: StoredUser?
    @State private var confirmClearAll = false

    var body: some View {
        VStack(spacing: 0) {
            header
            if auth.users.isEmpty {
                emptyState
            } else {
                List {
                    ForEach(auth.users) { user in
                        userCard(user)
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                }
                .listStyle(.plain)
                footer
            }
        }
        .background(AppConstants.background)
        .alert("Delete User", isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } })) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let target = deleteTarget { auth.deleteUser(username: target.username) }
            }
        } message: {
            if let target = deleteTarget {
                Text("Are you sure you want to delete user \"\(target.username)\"?")
            }
        }
        .alert("Clear All Users", isPresented: $confirmClearAll) {
            Button("Cancel", role: .cancel) {}
            Button("Delete All", role: .destructive) { auth.clearAllUsers() }
        } message: {
            Text("Are you sure you want to delete ALL users? This action cannot be undone.")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(AppConstants.primary)
                Text("User Management")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppConstants.textPrimary)
            }
            Text("Total Registered Users: \(auth.users.count)")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppConstants.primary)
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppConstants.primaryLight)
                .cornerRadius(8)
        }
        .padding(20)
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(AppConstants.border).frame(height: 1) }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "person.2")
                .font(.system(size: 56))
                .foregroundStyle(Color(hex: "#CED4DA"))
            Text("No Users Yet")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Color(hex: "#495057"))
            Text("No users have signed up yet. They will appear here once they register.")
                .font(.system(size: 14))
                .foregroundStyle(AppConstants.textSecondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(40)
    }

    private func userCard(_ user: StoredUser) -> some View {
        let isExpanded = expandedUsers.contains(user.username)
        let userForms = forms.submittedForms.filter { $0.submittedBy == user.username }

        return VStack(alignment: .leading, spacing: 0) {
            Button {
                if isExpanded { expandedUsers.remove(user.username) } else { expandedUsers.insert(user.username) }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "person.badge.shield.checkmark.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppConstants.primary)
                        .frame(width: 48, height: 48)
                        .background(AppConstants.primaryLight)
                        .cornerRadius(24)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(user.name).font(.system(size: 18, weight: .semibold)).foregroundStyle(AppConstants.textPrimary)
                        Text("@\(user.username)").font(.system(size: 14)).foregroundStyle(AppConstants.textSecondary)
                        Text(user.email).font(.system(size: 12)).foregroundStyle(AppConstants.primary)
                        Text("Password: \(user.password)")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(Color(hex: "#ADB5BD"))
                        HStack(spacing: 4) {
                            Image(systemName: "doc.text").font(.system(size: 11)).foregroundStyle(AppConstants.textSecondary)
                            Text("\(userForms.count) submitted form\(userForms.count != 1 ? "s" : "")")
                                .font(.system(size: 12)).foregroundStyle(AppConstants.textSecondary)
                        }
                    }
                    Spacer()
                    VStack(spacing: 8) {
                        Button {
                            deleteTarget = user
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(Color(hex: "#FF3B30"))
                                .frame(width: 40, height: 40)
                                .background(Color(hex: "#FFE5E5"))
                                .cornerRadius(20)
                        }
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 14))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                }
                .foregroundStyle(.primary)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Submitted Forms")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(hex: "#495057"))
                    if userForms.isEmpty {
                        Text("No submitted forms yet")
                            .font(.system(size: 14).italic())
                            .foregroundStyle(AppConstants.textSecondary)
                    } else {
                        ForEach(userForms) { form in
                            HStack(spacing: 12) {
                                Image(systemName: "doc.text")
                                    .font(.system(size: 13))
                                    .foregroundStyle(AppConstants.primary)
                                    .frame(width: 32, height: 32)
                                    .background(AppConstants.primaryLight)
                                    .cornerRadius(16)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(displayName(form))
                                        .font(.system(size: 14, weight: .semibold))
                                    Text(form.formType == .coida ? "COIDA" : "Medical Aid")
                                        .font(.system(size: 12)).foregroundStyle(AppConstants.textSecondary)
                                    Text(AppTimestamp.format(form.updatedAt))
                                        .font(.system(size: 11)).foregroundStyle(Color(hex: "#ADB5BD"))
                                    if !form.submittedBy.isEmpty {
                                        Text("Submitted by: @\(form.submittedBy)")
                                            .font(.system(size: 10).italic()).foregroundStyle(AppConstants.textSecondary)
                                    }
                                }
                            }
                            .padding(12)
                            .background(Color.white)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppConstants.border, lineWidth: 1))
                            .cornerRadius(8)
                        }
                    }
                }
                .padding(16)
                .background(AppConstants.background)
            }
        }
        .background(Color.white)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private var footer: some View {
        VStack(spacing: 12) {
            Button {
                confirmClearAll = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "trash")
                    Text("Clear All Users")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(14)
                .background(Color(hex: "#FF3B30"))
                .cornerRadius(12)
            }
        }
        .padding(20)
        .background(Color.white)
        .overlay(alignment: .top) { Rectangle().fill(AppConstants.border).frame(height: 1) }
    }
}

private func displayName(_ form: PatientForm) -> String {
    if !form.patientName.isEmpty { return form.patientName }
    return "\(form.patientFirstName) \(form.patientLastName)"
}
