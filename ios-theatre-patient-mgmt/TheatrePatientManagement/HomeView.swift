import SwiftUI

// Port of app/(tabs)/index.tsx — home with form option cards over the photo background.

struct HomeView: View {
    @ObservedObject private var auth = AuthStore.shared
    @ObservedObject private var forms = FormsStore.shared
    let openForm: (FormType) -> Void
    let openWorklist: () -> Void
    let openForms: () -> Void

    var body: some View {
        ZStack {
            AsyncImage(url: AppConstants.homeBackgroundImage) { image in
                image.resizable().scaledToFill().ignoresSafeArea()
            } placeholder: {
                AppConstants.background.ignoresSafeArea()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Welcome back,")
                            .font(.system(size: 16))
                            .foregroundStyle(AppConstants.textSecondary)
                        Text(auth.user?.name ?? "User")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(AppConstants.primary)
                        Text("Select a form type to begin")
                            .font(.system(size: 16))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                    .padding(.bottom, 16)

                    if !forms.drafts.isEmpty {
                        Button(action: openForms) {
                            HStack(spacing: 12) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundStyle(Color(hex: "#FF9500"))
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("\(forms.drafts.count) \(forms.drafts.count == 1 ? "Draft" : "Drafts") Waiting")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(Color(hex: "#FF9500"))
                                    Text("You have incomplete \(forms.drafts.count == 1 ? "form" : "forms") to complete. Tap to view.")
                                        .font(.system(size: 14))
                                        .foregroundStyle(Color(hex: "#8B6F00"))
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(16)
                            .background(Color(hex: "#FFF3E0"))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#FFE0B2"), lineWidth: 1))
                            .cornerRadius(12)
                        }
                    }

                    ForEach(formOptions, id: \.title) { option in
                        Button {
                            option.action()
                        } label: {
                            HStack(spacing: 16) {
                                Image(systemName: option.icon)
                                    .font(.system(size: 28))
                                    .foregroundStyle(Color(hex: option.colorHex))
                                    .frame(width: 64, height: 64)
                                    .background(Color(hex: option.colorHex).opacity(0.08))
                                    .cornerRadius(16)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(option.title)
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundStyle(Color(hex: "#333333"))
                                    Text(option.description)
                                        .font(.system(size: 14))
                                        .foregroundStyle(AppConstants.textSecondary)
                                        .multilineTextAlignment(.leading)
                                }
                                Spacer()
                            }
                            .padding(20)
                            .background(Color.white.opacity(0.97))
                            .cornerRadius(16)
                            .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
                        }
                    }
                }
                .padding(24)
            }
        }
    }

    private struct FormOption {
        let title: String
        let description: String
        let icon: String
        let colorHex: String
        let action: () -> Void
    }

    private var formOptions: [FormOption] {
        [
            FormOption(title: "Medical Aid Form", description: "Patient registration with medical aid coverage", icon: "doc.text.fill", colorHex: "#0066CC") { openForm(.medicalAid) },
            FormOption(title: "COIDA Form", description: "Compensation for Occupational Injuries and Diseases", icon: "clipboard.fill", colorHex: "#00A3A3") { openForm(.coida) },
            FormOption(title: "Worklist", description: "View daily patient diary and schedule", icon: "checklist", colorHex: "#7C3AED") { openWorklist() },
        ]
    }
}
