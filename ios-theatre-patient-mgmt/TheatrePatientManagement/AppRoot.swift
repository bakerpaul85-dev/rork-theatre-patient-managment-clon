import SwiftUI

// Root: auth gating + tab layout, port of app/_layout.tsx + (tabs)/_layout.tsx.
// Tabs: Home / My Forms / Worklist / Portal (admins only).

struct AppRoot: View {
    @ObservedObject private var auth = AuthStore.shared
    @State private var selectedTab: Tab = .home
    @State private var pendingForm: PatientForm?
    @State private var showLogoutAlert = false

    enum Tab { case home, forms, worklist, portal }

    var body: some View {
        Group {
            if auth.isLoading {
                AppConstants.background
            } else if auth.user == nil {
                LoginView()
            } else {
                tabs
            }
        }
        .animation(.easeInOut(duration: 0.15), value: auth.user == nil)
    }

    private var tabs: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView(
                    openForm: { type in pendingForm = buildForm(type: type) },
                    openWorklist: { selectedTab = .worklist },
                    openForms: { selectedTab = .forms }
                )
                .navigationDestination(isPresented: Binding(get: { pendingForm != nil }, set: { if !$0 { pendingForm = nil } })) {
                    if let form = pendingForm {
                        FormEditorScreen(form: form)
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showLogoutAlert = true
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundStyle(AppConstants.textSecondary)
                        }
                    }
                }
                .alert("Log Out", isPresented: $showLogoutAlert) {
                    Button("Cancel", role: .cancel) {}
                    Button("Log Out", role: .destructive) { auth.logout() }
                } message: {
                    Text("Are you sure you want to log out?")
                }
            }
            .tabItem { Label("Home", systemImage: "house.fill") }
            .tag(Tab.home)

            NavigationStack {
                FormsListView()
            }
            .tabItem { Label("My Forms", systemImage: "folder.fill") }
            .tag(Tab.forms)

            NavigationStack {
                WorklistView()
            }
            .tabItem { Label("Worklist", systemImage: "calendar.badge.clock") }
            .tag(Tab.worklist)

            if auth.user?.isAdmin == true {
                NavigationStack {
                    AdminView()
                }
                .tabItem { Label("Portal", systemImage: "chart.bar.fill") }
                .tag(Tab.portal)
            }
        }
        .tint(AppConstants.primary)
    }

    private func buildForm(type: FormType) -> PatientForm {
        var form = PatientForm(formType: type)
        form.submittedBy = auth.user?.name ?? ""
        form.radiographerEmail = auth.user?.email ?? ""
        form.hospitalName = HospitalOverride().displayName(for: auth.user?.email, captured: "")
        return form
    }
}
