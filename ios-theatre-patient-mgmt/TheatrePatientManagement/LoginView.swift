import SwiftUI

// Port of app/login.tsx — login / signup / reset on the photographic background.

enum LoginMode {
    case login, signup, reset
}

struct LoginView: View {
    @ObservedObject private var auth = AuthStore.shared
    @State private var mode: LoginMode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var customName = ""
    @State private var customPrefix = ""
    @State private var isLoading = false
    @State private var alertTitle = ""
    @State private var alertMessage = ""
    @State private var showAlert = false
    @State private var succeeded = false

    private var isSignUp: Bool { mode == .signup }
    private var isReset: Bool { mode == .reset }
    private var matchedRadiographer: Radiographer? {
        email.trimmingCharacters(in: .whitespaces).isEmpty ? nil : Radiographers.find(byEmail: email)
    }

    var body: some View {
        ZStack {
            AsyncImage(url: AppConstants.loginBackgroundImage) { image in
                image.resizable().scaledToFill().ignoresSafeArea()
            } placeholder: {
                AppConstants.background.ignoresSafeArea()
            }

            ScrollView {
                VStack {
                    card
                        .padding(.horizontal, 16)
                        .padding(.vertical, 20)
                }
                .frame(minHeight: UIScreen.main.bounds.height)
            }
        }
        .alert(alertTitle, isPresented: $showAlert) {
            Button("OK") {
                if succeeded {
                    if mode == .reset {
                        mode = .login
                        password = ""
                        confirmPassword = ""
                    }
                    succeeded = false
                }
            }
        }
    }

    private var card: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "cross.case.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(AppConstants.primary)
                    .padding(.bottom, 8)
                Text("Theatre Patient Management")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(AppConstants.primary)
                    .multilineTextAlignment(.center)
                Text(isReset ? "Reset Your Password" : "Patient Registration System")
                    .font(.system(size: 16))
                    .foregroundStyle(AppConstants.textSecondary)
            }
            .padding(.bottom, 16)

            VStack(alignment: .leading, spacing: 8) {
                Text("Email Address").font(.system(size: 14, weight: .semibold))
                HStack {
                    Image(systemName: "envelope").foregroundStyle(.gray).font(.system(size: 14))
                    TextField("Enter your email address", text: $email)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                .padding(14)
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                .cornerRadius(12)
            }

            if isSignUp, !email.trimmingCharacters(in: .whitespaces).isEmpty {
                matchBadge
            }

            if isSignUp, matchedRadiographer == nil {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Full Name").font(.system(size: 14, weight: .semibold))
                    TextField("Enter your full name", text: $customName)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.words)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Prefix Code").font(.system(size: 14, weight: .semibold))
                    TextField("Enter your prefix code (e.g. SMI)", text: $customPrefix)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }
            }

            if !isReset {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Password").font(.system(size: 14, weight: .semibold))
                    SecureField("Enter your password", text: $password)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                }
            }

            if isSignUp {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Confirm Password").font(.system(size: 14, weight: .semibold))
                    SecureField("Confirm your password", text: $confirmPassword)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                }
            }

            if isReset {
                VStack(alignment: .leading, spacing: 8) {
                    Text("New Password").font(.system(size: 14, weight: .semibold))
                    SecureField("Enter new password", text: $password)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Confirm New Password").font(.system(size: 14, weight: .semibold))
                    SecureField("Confirm new password", text: $confirmPassword)
                        .padding(14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
                        .cornerRadius(12)
                }
            }

            Button(action: submit) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(isReset ? "Reset Password" : (isSignUp ? "Sign Up" : "Sign In"))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(16)
            .background(AppConstants.primary)
            .cornerRadius(12)
            .disabled(isLoading)

            if !isReset {
                Button {
                    mode = .reset
                    password = ""
                    confirmPassword = ""
                } label: {
                    Label("Forgot Password?", systemImage: "key")
                        .font(.system(size: 13))
                        .foregroundStyle(.gray)
                }
            }

            if isReset {
                Button {
                    mode = .login
                    email = ""
                    password = ""
                    confirmPassword = ""
                } label: {
                    Label("Back to Sign In", systemImage: "arrow.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppConstants.primary)
                }
            } else {
                HStack(spacing: 8) {
                    Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                        .font(.system(size: 14))
                        .foregroundStyle(AppConstants.textSecondary)
                    Button(isSignUp ? "Sign In" : "Sign Up") {
                        mode = isSignUp ? .login : .signup
                        email = ""
                        password = ""
                        confirmPassword = ""
                        customName = ""
                        customPrefix = ""
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppConstants.primary)
                }
            }
        }
        .padding(24)
        .background(Color.white.opacity(0.95))
        .cornerRadius(24)
    }

    @ViewBuilder
    private var matchBadge: some View {
        HStack(spacing: 10) {
            if let match = matchedRadiographer {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Color(hex: "#28A745"))
                VStack(alignment: .leading, spacing: 2) {
                    Text(match.name).font(.system(size: 15, weight: .bold)).foregroundStyle(Color(hex: "#2E7D32"))
                    Text("Prefix: \(match.prefix)").font(.system(size: 13)).foregroundStyle(Color(hex: "#388E3C"))
                    Text("Status: \(match.status)").font(.system(size: 12)).foregroundStyle(.gray)
                }
            } else {
                Image(systemName: "person.badge.plus").foregroundStyle(AppConstants.primary)
                Text("New user — please fill in your details below")
                    .font(.system(size: 14)).foregroundStyle(AppConstants.primary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(matchedRadiographer != nil ? Color(hex: "#E8F5E9") : Color(hex: "#E3F2FD"))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(matchedRadiographer != nil ? Color(hex: "#A5D6A7") : Color(hex: "#90CAF9"), lineWidth: 1))
        .cornerRadius(10)
    }

    private func submit() {
        switch mode {
        case .login: handleLogin()
        case .signup: handleSignUp()
        case .reset: handleReset()
        }
    }

    private func handleLogin() {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty, !password.isEmpty else {
            showAlert(title: "Error", message: "Please enter both email and password")
            return
        }
        isLoading = true
        if auth.login(email: email, password: password) {
            isLoading = false
        } else {
            isLoading = false
            showAlert(title: "Error", message: "Invalid credentials. Please try again.")
        }
    }

    private func handleSignUp() {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty else {
            showAlert(title: "Error", message: "Please enter your email address")
            return
        }
        if let match = matchedRadiographer, match.status == "Inactive" {
            showAlert(title: "Account Inactive", message: "This radiographer account is currently inactive. Please contact administration.")
            return
        }
        if matchedRadiographer == nil {
            guard !customName.trimmingCharacters(in: .whitespaces).isEmpty else {
                showAlert(title: "Error", message: "Please enter your full name")
                return
            }
            guard !customPrefix.trimmingCharacters(in: .whitespaces).isEmpty else {
                showAlert(title: "Error", message: "Please enter a prefix code")
                return
            }
        }
        guard !password.isEmpty else {
            showAlert(title: "Error", message: "Please enter a password")
            return
        }
        guard password == confirmPassword else {
            showAlert(title: "Error", message: "Passwords do not match")
            return
        }
        guard password.count >= 6 else {
            showAlert(title: "Error", message: "Password must be at least 6 characters")
            return
        }
        isLoading = true
        let prefix = matchedRadiographer?.prefix ?? customPrefix.trimmingCharacters(in: .whitespaces).uppercased()
        let name = matchedRadiographer?.name ?? customName.trimmingCharacters(in: .whitespaces)
        if auth.signUp(username: prefix, password: password, name: name, email: email) {
            isLoading = false
            succeeded = true
            showAlert(title: "Success", message: "Account created!\n\nName: \(name)\nPrefix: \(prefix)\nEmail: \(email.lowercased())")
        } else {
            isLoading = false
            showAlert(title: "Error", message: "This email or prefix is already registered. Please sign in instead.")
        }
    }

    private func handleReset() {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty else {
            showAlert(title: "Error", message: "Please enter your email address")
            return
        }
        guard matchedRadiographer != nil else {
            showAlert(title: "Email Not Found", message: "This email is not registered in our system.")
            return
        }
        guard !password.isEmpty else {
            showAlert(title: "Error", message: "Please enter a new password")
            return
        }
        guard password.count >= 6 else {
            showAlert(title: "Error", message: "Password must be at least 6 characters")
            return
        }
        guard password == confirmPassword else {
            showAlert(title: "Error", message: "Passwords do not match")
            return
        }
        isLoading = true
        if auth.resetPassword(email: email, newPassword: password) {
            succeeded = true
            showAlert(title: "Password Reset", message: "Your password has been reset successfully. Please sign in with your new password.")
        } else {
            showAlert(title: "Error", message: "No account found for this email. Please sign up first.")
        }
        isLoading = false
    }

    private func showAlert(title: String, message: String) {
        alertTitle = title
        alertMessage = message
        showAlert = true
    }
}
