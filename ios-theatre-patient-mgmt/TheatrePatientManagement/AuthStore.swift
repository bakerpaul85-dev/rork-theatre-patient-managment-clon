import Foundation
import Combine

// Port of the Expo AuthContext: users stored in UserDefaults, seeded admin +
// linked accounts, local session persistence. Same accounts, same behaviour.

struct StoredUser: Codable, Identifiable {
    var username: String
    var password: String
    var name: String
    var email: String

    var id: String { username }
}

struct SessionUser: Codable, Identifiable {
    var username: String
    var name: String
    var email: String

    var id: String { username }
    var isAdmin: Bool { AppConstants.adminEmails.contains(email.lowercased()) }
}

@MainActor
final class AuthStore: ObservableObject {
    static let shared = AuthStore()

    private let usersKey = "theatre_users_v1"
    private let sessionKey = "theatre_session_v1"

    @Published var user: SessionUser?
    @Published var isLoading = true

    private let seededAccounts: [StoredUser] = [
        StoredUser(username: "ADMIN_PAUL", password: "Admin@2024", name: "Paul (Admin)", email: "paul@btstech.co.za"),
        StoredUser(username: "ADMIN_ALLAN", password: "Admin@2024", name: "Allan (Admin)", email: "allan@medimarketing100.co.za"),
        StoredUser(username: "ADMIN_KG", password: "Admin@2024", name: "KG Moropane (Admin)", email: "kgmoropane@winnysolutions.co.za"),
        StoredUser(username: "KG_MOROPANE", password: "Moropane@2024", name: "KG Moropane", email: "siphiwesmall79@gmail.com"),
    ]

    private init() {
        seedAccounts()
        if let data = UserDefaults.standard.data(forKey: sessionKey),
           let saved = try? JSONDecoder().decode(SessionUser.self, from: data),
           users.contains(where: { $0.username == saved.username }) {
            user = saved
        }
        isLoading = false
    }

    private(set) var users: [StoredUser] = []

    private func seedAccounts() {
        var current = loadUsers()
        for seeded in seededAccounts where !current.contains(where: { $0.email.lowercased() == seeded.email.lowercased() }) {
            current.append(seeded)
        }
        users = current
        saveUsers(current)
    }

    private func loadUsers() -> [StoredUser] {
        guard let data = UserDefaults.standard.data(forKey: usersKey),
              let decoded = try? JSONDecoder().decode([StoredUser].self, from: data) else { return [] }
        return decoded
    }

    private func saveUsers(_ value: [StoredUser]) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: usersKey)
        }
    }

    func login(email: String, password: String) -> Bool {
        let normalized = email.lowercased().trimmingCharacters(in: .whitespaces)
        guard let stored = users.first(where: { $0.email.lowercased() == normalized && $0.password == password }) else {
            return false
        }
        let session = SessionUser(username: stored.username, name: stored.name, email: stored.email)
        user = session
        persistSession(session)
        return true
    }

    func signUp(username: String, password: String, name: String, email: String) -> Bool {
        let normalized = email.lowercased().trimmingCharacters(in: .whitespaces)
        guard !users.contains(where: { $0.email.lowercased() == normalized || $0.username == username }) else {
            return false
        }
        users.append(StoredUser(username: username, password: password, name: name, email: normalized))
        saveUsers(users)
        let session = SessionUser(username: username, name: name, email: normalized)
        user = session
        persistSession(session)
        return true
    }

    func resetPassword(email: String, newPassword: String) -> Bool {
        let normalized = email.lowercased().trimmingCharacters(in: .whitespaces)
        guard let index = users.firstIndex(where: { $0.email.lowercased() == normalized }) else { return false }
        users[index].password = newPassword
        saveUsers(users)
        return true
    }

    func deleteUser(username: String) {
        users.removeAll { $0.username == username }
        saveUsers(users)
    }

    func clearAllUsers() {
        users = []
        saveUsers(users)
    }

    func logout() {
        user = nil
        UserDefaults.standard.removeObject(forKey: sessionKey)
    }

    private func persistSession(_ session: SessionUser) {
        if let data = try? JSONEncoder().encode(session) {
            UserDefaults.standard.set(data, forKey: sessionKey)
        }
    }
}
