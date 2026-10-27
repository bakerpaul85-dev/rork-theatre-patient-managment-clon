import Foundation
import SwiftUI

// MARK: - Case Status

enum CaseStatus: String, Codable, CaseIterable {
    case caseLoaded = "case_loaded"
    case caseStarted = "case_started"
    case caseEnded = "case_ended"
    case incompleteInfo = "incomplete_info"
    case completeInfo = "complete_info"
    case billed = "billed"
}

struct CaseStatusConfig {
    let status: CaseStatus
    let label: String
    let shortLabel: String
    let color: Color
    let bgColor: Color
    let order: Int

    static let all: [CaseStatusConfig] = [
        CaseStatusConfig(status: .caseLoaded, label: "Case Loaded", shortLabel: "Loaded", color: Color(hex: "#6366F1"), bgColor: Color(hex: "#EEF2FF"), order: 0),
        CaseStatusConfig(status: .caseStarted, label: "Case Started", shortLabel: "Started", color: Color(hex: "#0EA5E9"), bgColor: Color(hex: "#E0F2FE"), order: 1),
        CaseStatusConfig(status: .caseEnded, label: "Case Ended", shortLabel: "Ended", color: Color(hex: "#F59E0B"), bgColor: Color(hex: "#FEF3C7"), order: 2),
        CaseStatusConfig(status: .incompleteInfo, label: "Incomplete Information", shortLabel: "Incomplete", color: Color(hex: "#EF4444"), bgColor: Color(hex: "#FEE2E2"), order: 3),
        CaseStatusConfig(status: .completeInfo, label: "Complete Information", shortLabel: "Complete", color: Color(hex: "#10B981"), bgColor: Color(hex: "#D1FAE5"), order: 4),
        CaseStatusConfig(status: .billed, label: "Billed", shortLabel: "Billed", color: Color(hex: "#059669"), bgColor: Color(hex: "#ECFDF5"), order: 5),
    ]

    static func config(for status: CaseStatus?) -> CaseStatusConfig {
        all.first { $0.status == (status ?? .caseLoaded) } ?? all[0]
    }
}

// MARK: - Form Model

enum FormType: String, Codable {
    case medicalAid = "medical-aid"
    case coida
}

enum PatientTitle: String, Codable, CaseIterable {
    case mr = "Mr", mrs = "Mrs", miss = "Miss", ms = "Ms", dr = "Dr", prof = "Prof"
}

struct PhotoMetadata: Codable {
    var timestamp: String
    var latitude: Double?
    var longitude: Double?
}

struct PhotoItem: Codable {
    var fileName: String
    var metadata: PhotoMetadata?
}

struct CaseStatusEvent: Codable {
    var status: CaseStatus
    var timestamp: String
    var updatedBy: String?
}

struct PatientForm: Codable, Identifiable {
    var id: String = UUID().uuidString
    var formType: FormType
    var submittedBy: String = ""
    var radiographerEmail: String = ""

    // Photos: file names in the form's photo folder (nil = not captured)
    var hospitalStickerPhoto: PhotoItem?
    var timeInTheatrePhoto: PhotoItem?
    var timeOutTheatrePhoto: PhotoItem?
    var referralLetterPages: [PhotoItem] = []
    var referralLetterPDF: String? // generated PDF file name

    // Hospital info
    var date: String = ""
    var hospitalName: String = ""

    // Patient information
    var patientTitle: PatientTitle = .mr
    var patientFirstName: String = ""
    var patientLastName: String = ""
    var idNumber: String = ""
    var dateOfBirth: String = ""
    var contactNumber: String = ""
    var email: String = ""
    var gender: String = ""
    var patientAddress: String = ""
    var homePhone: String = ""
    var workPhone: String = ""

    // Hospital / facility
    var hospitalServiceProvider: String = ""
    var ward: String = ""
    var bed: String = ""
    var admissionDate: String = ""
    var admissionTime: String = ""
    var caseNumber: String = ""
    var referringDoctor: String = ""
    var doctorPracticeNumber: String = ""
    var authorizationCode: String = ""

    // Medical aid
    var mainMemberTitle: PatientTitle = .mr
    var mainMemberFirstName: String = ""
    var mainMemberLastName: String = ""
    var mainMemberIdNumber: String = ""
    var medicalAidName: String = ""
    var medicalAidPlan: String = ""
    var membershipNumber: String = ""
    var dependantCode: String = ""

    // Procedure
    var procedure: [String] = []
    var icd10Code: String = ""
    var fixedInstallation: String = ""
    var dap: String = ""
    var screeningTimeText: String = ""
    var reasonForTimeDiscrepancy: String = ""
    var numberOfSessions: String = ""
    var cArmOwnedByHospital: String = ""
    var contrastUsage: String = ""
    var contrastName: String = ""
    var contrastAmount: String = ""
    var timeCArmTakenIn: String = ""
    var timeCArmTakenOut: String = ""

    // COIDA specifics
    var coidaMemberNumber: String = ""
    var patientIodClaimNumber: String = ""
    var employerName: String = ""
    var employerContact: String = ""
    var dateOfIncident: String = ""
    var dateOfProcedure: String = ""
    var timeInTheatre: String = ""
    var timeOutTheatre: String = ""
    var fluoroscopyTime: String = ""
    var cArmImages: [PhotoItem] = []
    var employerReportPhotos: [PhotoItem] = []
    var firstMedicalReportPhoto: PhotoItem?
    var patientIdPhoto: PhotoItem?

    // Signature
    var radiographerName: String = ""
    var radiographerSignatureTimestamp: String = ""
    var radiographerSignatureLocation: String = ""
    var submissionLatitude: Double?
    var submissionLongitude: Double?
    var patientConsentGiven: Bool = false
    var patientConsentTimestamp: String = ""

    // Lifecycle
    var status: String = "draft" // draft | submitted
    var caseStatus: CaseStatus = .caseLoaded
    var caseStatusHistory: [CaseStatusEvent] = []
    var createdAt: String = AppTimestamp.now()
    var updatedAt: String = AppTimestamp.now()

    var patientName: String {
        "\(patientTitle.rawValue) \(patientFirstName) \(patientLastName)".trimmingCharacters(in: .whitespaces)
    }

    var isDraft: Bool { status == "draft" }
}

// MARK: - Constants (ported from the Expo app)

enum AppConstants {
    static let primary = Color(hex: "#0066CC")
    static let primaryHex = "#0066CC"
    static let primaryLight = Color(hex: "#E7F3FF")
    static let danger = Color(hex: "#DC3545")
    static let teal = Color(hex: "#00A3A3")
    static let purple = Color(hex: "#7C3AED")
    static let background = Color(hex: "#F8F9FA")
    static let cardBackground = Color.white
    static let border = Color(hex: "#E1E4E8")
    static let textPrimary = Color(hex: "#212529")
    static let textSecondary = Color(hex: "#6C757D")
    static let textTertiary = Color(hex: "#ADB5BD")

    static let homeBackgroundImage = URL(string: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070")!
    static let loginBackgroundImage = URL(string: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-16%20at%2015.22.50-JyB1hDLPIW4YW19VGV6OPbJHt1Uo3V.png")!

    static let adminEmails = ["paul@btstech.co.za", "allan@medimarketing100.co.za", "kgmoropane@winnysolutions.co.za"]

    static let titles = PatientTitle.allCases.map { $0.rawValue }

    static let genders = ["Male", "Female", "Other"]

    static let medicalAidNames: [String] = [
        "1 Doctor Health", "AACMED", "AECI MEDICAL AID", "AFFINITY", "AFRICAN MEDICAL ASSISTANCE", "AFRICAN UNITY LIFE",
        "AFROCENTRIC PRIVATE HEALTH INS", "AGILITY HEALTH", "AGS HEALTH", "Allianz Worlwide care", "ANGLO AMERICAN",
        "ANGLO VAAL", "ASTERIO MEDICAL INSURANCE", "Ayob and Associates Attorneys", "BANKMED", "BARLOWORLD MEDICAL SCHEME",
        "BESTMED MEDICAL SCHEME", "BMW EMPLOYEES MED AID", "BOMAID", "BONCAP", "BONITAS MEDICAL FUND", "BP SA MEDICAL AID",
        "BUILDING INDUSTRY MEDICAL AID", "BUPA Medical Aid", "CANCELLED", "CAPE MEDICAL PLAN", "CARECROSS", "CGMS",
        "Charles Mkize Attorneys", "CHARTERED ACCOUNTANTS", "COID (USED TO BE WCA)", "COID PRIVATE (USED TO BE WCA)",
        "COMMED", "COMPCARE MED AID", "CREDIT BALANCES", "Day 1 Health", "DE BEERS", "DISCHEM", "DISCOVERY HEALTH",
        "DOMESTICARE", "DR chuma Occupational", "Duplicate accounts", "EDCON MEDICAL AID", "ELIXI MEDICAL INSURANCE",
        "Emoaymed Cash", "ENABLEMED", "ENGEN", "Essential Employee Benefits", "ESSENTIAL MED", "ESTATE LATE",
        "FEDHEALTH MEDICAL SCHEME", "FISHING INDUSTRY MEDICAL SCHEM", "FOSCHINI GROUP", "FURNITURE WORKERS",
        "GEMS BERRYL", "GEMS EMERALD", "GEMS ONYX", "GEMS RUBY", "GEMS SAPHIRYE", "GEMS Tanzanite", "GENESIS",
        "GENRIC MEDICAL INSURANCE", "George Memorial Private Patien", "GET SAVVI", "GETMED", "GLENCORE (WAS XSTRATA)",
        "GOLDEN ARROW EMPLOYEES MEDICAL", "GOOD HOPE", "GOVERNMENT EMPLOYEES", "GRINTEK ELECTRONICS",
        "HARMONY HEALTH SERVICES", "HEALTH SQUARED", "HEALTH4ME", "HENNER", "HORIZON MEDICAL AID", "HOSMED",
        "IMPALA MEDICAL SERVICES", "IMPERIALMED", "INGWE", "Janilite PTY LTD", "JOHANNESBURG CHAMBER OF COMME",
        "KEY CARE", "KEYHEALTH", "KHOZA ATTORNEYS", "LA Attorneys", "LA HEALTH", "LIBCARE", "LIBERTY BLUE",
        "LIBERTY HEALTH MEDICAL SCHEME", "MAKOTI MEDICAL PLAN", "MALCOR MEDICAL SCHEME", "MAMOTH HEALTH PLAN",
        "MASSMART Health plan", "MB MED", "MEDICAL AID RATES", "MEDICALL HEALTH", "MEDIHELP", "MEDIMED", "MEDIPLUS",
        "MEDIPOS", "MEDSHIELD", "MEDSHIELD ACCESS", "METROPOLITAN HEALTH", "METROPOLITAN HEALTH LESOTHO", "MIDMED",
        "Military Chest", "Mimed Occ Health", "MMED", "Mngqibisa attorney", "MOH Mozambique", "MOMENTUM AFRICA",
        "MOMENTUM HEALTH", "MOTO HEALTH CARE", "MOXS OCC HEALTH", "MOXS Occupational", "MOXS Private Patients",
        "Msitshana Inc", "MZ Attorneys", "NAMIBIA HEALTH PLAN", "NAMIBIA IND MEDICAL AID", "NAMPAK GROUP",
        "NASPERS MEDICAL FUND", "National Health Care", "NBCRFLI WELLNESS HEALTH PLAN", "Ndlebe Msuthu inc Attorneys",
        "NEDGROUP MEDICAL SCHEME", "NETCARE", "NETCARE PLUS", "NT Attorneys", "NUFAWSA SICK BENEFIT SOCIETY",
        "Occ Health", "OLD MUTUAL STAFF", "ONE", "One Plan Medical Insurance", "OPMED (NATIONAL INTELLIGENCE)",
        "P G BISON MEDICAL AID", "P G GROUP MEDICAL AID", "PAID BY MEMBER", "PAN AFRICAN MANAGED CARE (Pty)", "PARMED",
        "PICK 'N PAY", "PLATINUM HEALTH", "POLMED", "PRIMECURE", "PROFMED", "PULAMED", "PURE HEALTH", "QUANTUM",
        "RADMED PRIVATE", "RAF ROAD ACCIDENT FUND", "RAND MUTUAL ASSURANCE", "RAND WATER BOARD", "REMEDI",
        "RESOLUTION HEALTH", "RETAIL MEAT SICK BENEFITS", "RETAIL MEDICAL SCHEME", "RFMCF",
        "RHODES UNIVERSITY MEDICAL SCHE", "ROSHMED HOSPITAL SCHEME", "S A BREWERIES MED AID", "SABC/SAUK MEDICAL AID",
        "SAMWU", "SANLAM PRIMARY HEALTHCARE", "SAPPI", "SASOLMED", "SEDMED", "SELFMED", "SISONKE HEALTH",
        "SIZWE  HOSMED MEDICAL FUND", "South African National Defense", "SPECTRAMED", "STRATUM BENEFITS",
        "SUREMED HEALTH", "SWAZIMED", "test cases", "TFG MEDICAL AID", "THEBE MED", "TOPMED", "TRANSMED",
        "TRANSMED STATE PLUS", "Transnet", "TSOGO SUN GROUP", "TYMEHEALTH", "Umvuzo Health", "Unity Health",
        "UNIVERSAL HEALTH", "UNIVERSAL HEALTH AND ACCIDENT", "UNIVERSAL WORKPLACE HEALTH PLA",
        "UNIVERSITY OF KWAZULU NATAL ME", "UNIVERSITY OF WITWATERSRAND", "WATCH TOWER", "Waypoint Healthcare Program",
        "WCA", "WESTMART", "WITBANK COALFIELDS", "WOOLTRU HEALTHCARE",
    ]

    static let procedures: [(code: String, name: String)] = [
        ("00140", "X-ray fluoroscopy any region"),
        ("00150", "X-ray C-Arm (equipment fee only) per half hour"),
        ("00155", "X-ray C-arm fluoroscopy in theatre per half hour"),
        ("01040", "Radiographer attendance in theatre, per half hour"),
        ("51110", "X-ray cervical spine, one or two views"),
        ("52100", "X-ray thoracic spine, one or two views"),
        ("53110", "X-ray lumbar spine, one or two views"),
        ("54100", "X-ray Sacrum & Coccyx"),
        ("55100", "X-ray Pelvis"),
        ("56100", "X-ray left hip"),
        ("56110", "X-ray right hip"),
        ("61100", "X-ray left clavicle"),
        ("61105", "X-ray right clavicle"),
        ("61130", "X-ray left shoulder"),
        ("61135", "X-ray right shoulder"),
        ("62100", "X-ray left humerus"),
        ("62105", "X-ray right humerus"),
        ("63100", "X-ray left elbow"),
        ("63105", "X-ray right elbow"),
        ("64100", "X-ray left forearm"),
        ("64105", "X-ray right forearm"),
        ("65100", "X-ray left hand"),
        ("65105", "X-ray right hand"),
        ("65130", "X-ray left wrist"),
        ("65135", "X-ray right wrist"),
        ("71100", "X-ray left femur"),
        ("71105", "X-ray right femur"),
        ("72100", "X-ray left knee one or two views"),
        ("72105", "X-ray right knee one or two views"),
        ("73100", "X-ray left lower leg"),
        ("73105", "X-ray right lower leg"),
        ("74100", "X-ray left ankle"),
        ("74105", "X-ray right ankle"),
        ("74120", "X-ray left foot"),
        ("74125", "X-ray right foot"),
        ("30150", "X-ray of Ribs"),
    ]

    static let procedureDisplayNames = procedures.map { "\($0.code) - \($0.name)" }
}

// MARK: - Radiographers

struct Radiographer: Identifiable, Codable {
    var name: String
    var prefix: String
    var status: String
    var email: String

    var id: String { email.isEmpty ? name : email }
}

enum Radiographers {
    static let list: [Radiographer] = [
        Radiographer(name: "Abaqulusi Hospital", prefix: "RADDEXA", status: "Active", email: "reception.vryheid@raddex.co.za"),
        Radiographer(name: "Anelisa Moyo", prefix: "MOY", status: "Active", email: "moyoanelisa@gmail.com"),
        Radiographer(name: "Ashley Mbokota", prefix: "MBO", status: "Active", email: "mbokotaashley@gmail.com"),
        Radiographer(name: "Ashton Govender", prefix: "GOV", status: "New", email: "ashtongovender991027@gmail.com"),
        Radiographer(name: "Carina Van Der Merwe", prefix: "CAR", status: "Active", email: "info3@medadmin.co.za"),
        Radiographer(name: "Caunter Penny", prefix: "CAU", status: "Active", email: ""),
        Radiographer(name: "Confrey Molomo", prefix: "CON", status: "Active", email: "confreymolomo@gmail.com"),
        Radiographer(name: "Dr CW Gilfillan", prefix: "GIL", status: "Active", email: "xray@gilfil.co.za"),
        Radiographer(name: "DR Gizelle Badenhorst", prefix: "BX", status: "Active", email: "badenhorstxstrale@gmail.com"),
        Radiographer(name: "Emmanuel Mimed", prefix: "MIMED", status: "Active", email: "xray@mimed.co.za"),
        Radiographer(name: "Emoyamed Jeffrey", prefix: "JEFF", status: "Active", email: "kasheefa@centaurimedical.co.za"),
        Radiographer(name: "Goddard Ashlie Pretorious", prefix: "ASH", status: "Active", email: "cardiopay@gmail.com"),
        Radiographer(name: "Goiwakae Terrence", prefix: "GOI", status: "Active", email: "terrenceg83@gmail.com"),
        Radiographer(name: "Innocent Maemu", prefix: "MAEMU", status: "New", email: ""),
        Radiographer(name: "Kaloo Bilal", prefix: "BIL", status: "Active", email: "bkaloorad@gmail.com"),
        Radiographer(name: "Khan Nasreen", prefix: "NASK", status: "Active", email: "mobilemedicalsolutions@gmail.com"),
        Radiographer(name: "Kgaugelo Moropane (WinnySolutions)", prefix: "WS", status: "Active", email: "kgmoropane@winnysolutions.co.za"),
        Radiographer(name: "Khodani Mavhusha", prefix: "KHO", status: "Active", email: "cody.mavhusha@gmail.com"),
        Radiographer(name: "Krista Joubert", prefix: "JOUB", status: "Active", email: "info3@medadmin.co.za"),
        Radiographer(name: "Kudzi Mpho", prefix: "KUD", status: "Active", email: ""),
        Radiographer(name: "Kwinana Thulani", prefix: "THU", status: "Active", email: "thulanikwinana@gmail.com"),
        Radiographer(name: "Leon Radiographers", prefix: "LEO", status: "Active", email: "leon.radxrays@gmail.com"),
        Radiographer(name: "Leslie Daniso", prefix: "DAN", status: "Active", email: "danisol@vodamail.co.za"),
        Radiographer(name: "Marlise Coetzee", prefix: "MAR", status: "Active", email: "info3@medadmin.co.za"),
        Radiographer(name: "Melusi Hlophe", prefix: "HLO", status: "New", email: "rainbowotr1@gmail.com"),
        Radiographer(name: "Mokhera Kwetsa", prefix: "KWE", status: "Active", email: "kwetsamokhera@gmail.com"),
        Radiographer(name: "Morkel Desiree", prefix: "DES", status: "Active", email: "info3@medadmin.co.za"),
        Radiographer(name: "Morck Lindsay", prefix: "LIN", status: "Active", email: "lindsay@xraymorck.co.za"),
        Radiographer(name: "Naimah Patel", prefix: "NP", status: "Active", email: "naimahp@hotmail.com"),
        Radiographer(name: "Nureki Rams", prefix: "RAM", status: "Active", email: "nrhamis@gmail.com"),
        Radiographer(name: "Palesa Khateane", prefix: "PAL", status: "Active", email: "palesakhateane@gmail.com"),
        Radiographer(name: "Patson Machila", prefix: "PAT", status: "Active", email: "machona.machila@gmail.com"),
        Radiographer(name: "Ramnath Natasha", prefix: "NAT", status: "Active", email: "keeranr@mweb.co.za"),
        Radiographer(name: "Ravele Thifhelimbilu Brenda", prefix: "BRE", status: "Active", email: "thifhelimbilu.ravele@gmail.com"),
        Radiographer(name: "RH Piet Retief Private Hospital", prefix: "RADDEX", status: "Active", email: "reception.prph@raddex.co.za"),
        Radiographer(name: "Roentes", prefix: "ROE", status: "Active", email: "roentes@mweb.co.za"),
        Radiographer(name: "Roux S", prefix: "ROUX/SHANI", status: "Active", email: "garsha.roux@gmail.com"),
        Radiographer(name: "Sarice Robberts", prefix: "ROB", status: "Active", email: "info@acceptabill.co.za"),
        Radiographer(name: "Sipho Nxumalo", prefix: "SIPH", status: "Active", email: "janayg@inyosiots.co.za"),
        Radiographer(name: "Southdale Medical Centre", prefix: "SOU", status: "Active", email: "radiologysouthdalemedicalc@gmail.com"),
        Radiographer(name: "Sunshine Hospital", prefix: "SUN", status: "Inactive", email: ""),
        Radiographer(name: "Thabang Moshoati", prefix: "TMG", status: "Active", email: "tgmoshoati@gmail.com"),
        Radiographer(name: "Thomas Makete (Sikilikiti X-ray imaging)", prefix: "MAK", status: "Active", email: "sikixrays@gmail.com"),
        Radiographer(name: "Tshililo Chere", prefix: "CHE", status: "Active", email: "tshililochere@gmail.com"),
        Radiographer(name: "Van Jaarsveldt Carol", prefix: "CVJ", status: "Active", email: "wcaadmin@vjrad.co.za"),
        Radiographer(name: "Viljoen Roelien", prefix: "MOXS", status: "Active", email: "heidelberg@moxs.co.za"),
        Radiographer(name: "Vuyani Atoni", prefix: "ATONI", status: "Active", email: "atoni8861@gmail.com"),
        Radiographer(name: "Wilken Johan", prefix: "WILJ", status: "Active", email: "accounts@theatrexray.co.za"),
        Radiographer(name: "William Ntlele", prefix: "LIAM", status: "Active", email: "wntlele@gmail.com"),
        Radiographer(name: "Young Shelly Cadle", prefix: "SHELL", status: "Active", email: "shellcadle@gmail.com"),
        Radiographer(name: "Kevin Hogg", prefix: "HOG", status: "Active", email: "kevin@centaurimedical.co.za"),
        Radiographer(name: "Paul Baker", prefix: "BAK", status: "Active", email: "paul@btstech.co.za"),
        Radiographer(name: "Allan Westoby", prefix: "WES", status: "Active", email: "allan@medimarketing100.co.za"),
        Radiographer(name: "Zoutpansberg X-ray imaging", prefix: "JEFF", status: "Active", email: "caitlin@centaurimedical.co.za"),
    ]

    static func find(byEmail email: String) -> Radiographer? {
        list.first { $0.email.lowercased() == email.lowercased().trimmingCharacters(in: .whitespaces) }
    }
}

// MARK: - Hospital override (KG Moropane → Winny Solutions)

struct HospitalOverride {
    static let hospitalName = "Winny Solutions"
    private let kgEmails: Set<String> = ["kgmoropane@winnysolutions.co.za", "siphiwesmall79@gmail.com"]

    func displayName(for userEmail: String?, captured: String?) -> String {
        guard let email = userEmail?.lowercased(), kgEmails.contains(email) else {
            return (captured?.isEmpty == false) ? captured! : "N/A"
        }
        return HospitalOverride.hospitalName
    }

    func adminCopyRecipients(for userEmail: String?) -> [String] {
        guard let email = userEmail?.lowercased(), kgEmails.contains(email) else { return [] }
        return ["kgmoropane@winnysolutions.co.za"]
    }
}

// MARK: - Helpers

extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgb: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&rgb)
        self.init(
            .sRGB,
            red: Double((rgb >> 16) & 0xFF) / 255.0,
            green: Double((rgb >> 8) & 0xFF) / 255.0,
            blue: Double(rgb & 0xFF) / 255.0,
            opacity: 1
        )
    }
}

enum AppTimestamp {
    private static let formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func now() -> String {
        formatter.string(from: Date())
    }

    static func format(_ iso: String) -> String {
        guard let date = formatter.date(from: iso) else { return iso }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

/// South African ID number → date of birth (YYMMDD + gender digit), mirroring the Expo logic.
func dateOfBirthFromSAID(_ id: String) -> String {
    let digits = id.filter { $0.isNumber }
    guard digits.count >= 10 else { return "" }
    let yy = String(digits.prefix(2))
    let mm = String(digits.dropFirst(2).prefix(2))
    let dd = String(digits.dropFirst(4).prefix(2))
    guard let month = Int(mm), (1...12).contains(month), let day = Int(dd), (1...31).contains(day) else { return "" }
    return "\(dd)/\(mm)/\(yy)"
}

func genderFromSAID(_ id: String) -> String {
    let digits = id.filter { $0.isNumber }
    guard digits.count >= 11, let genderDigit = Int(String(digits[digits.index(digits.startIndex, offsetBy: 6)])) else { return "" }
    return genderDigit >= 5 ? "Male" : "Female"
}

extension String {
    var digits: String { filter { $0.isNumber } }
}
