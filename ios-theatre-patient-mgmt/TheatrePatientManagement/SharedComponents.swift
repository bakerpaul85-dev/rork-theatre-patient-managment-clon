import SwiftUI
import Combine
import AVFoundation
import CoreLocation
import Photos

// Shared UI primitives ported from components/FormFields.tsx + DocumentScanner.tsx

// MARK: - Section card

struct SectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(AppConstants.textPrimary)
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Field wrapper

struct Field<Content: View>: View {
    let label: String
    var required = false
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppConstants.textPrimary)
                if required {
                    Text("*").foregroundStyle(AppConstants.danger)
                }
            }
            content
        }
    }
}

// MARK: - Text input

struct AppTextField: View {
    var placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var secure = false
    var disabled = false
    var maxLength: Int?
    var numericOnly = false
    var uppercase = false

    var body: some View {
        Group {
            if secure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboard)
            }
        }
        .padding(14)
        .background(Color.white)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppConstants.border, lineWidth: 1))
        .cornerRadius(12)
        .autocorrectionDisabled()
        .textInputAutocapitalization(uppercase ? .characters : .never)
        .disabled(disabled)
        .opacity(disabled ? 0.6 : 1)
        .onChange(of: text) { newValue in
            var value = newValue
            if numericOnly { value = value.filter { $0.isNumber } }
            if uppercase { value = value.uppercased() }
            if let maxLength, value.count > maxLength { value = String(value.prefix(maxLength)) }
            if value != newValue { text = value }
        }
    }
}

// MARK: - Option picker (bottom sheet, mirrors PickerField)

struct OptionPickerField: View {
    let label: String
    @Binding var value: String
    let options: [String]
    var required = false
    @State private var open = false
    @State private var query = ""

    var body: some View {
        Field(label: label, required: required) {
            Button {
                open = true
            } label: {
                HStack {
                    Text(value.isEmpty ? "Select \(label.lowercased())..." : value)
                        .foregroundStyle(value.isEmpty ? AppConstants.textTertiary : AppConstants.textPrimary)
                        .lineLimit(1)
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
        .sheet(isPresented: $open) {
            OptionSheet(title: label, value: $value, options: options)
        }
    }
}

// MARK: - Searchable picker (mirrors SearchPickerField)

struct SearchPickerField: View {
    let label: String
    @Binding var value: String
    let options: [String]
    var required = false
    @State private var open = false

    var body: some View {
        Field(label: label, required: required) {
            Button {
                open = true
            } label: {
                HStack {
                    Text(value.isEmpty ? "Search \(label.lowercased())..." : value)
                        .foregroundStyle(value.isEmpty ? AppConstants.textTertiary : AppConstants.textPrimary)
                        .lineLimit(1)
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
        .sheet(isPresented: $open) {
            OptionSheet(title: label, value: $value, options: options, searchable: true)
        }
    }
}

struct OptionSheet: View {
    let title: String
    @Binding var value: String
    let options: [String]
    var searchable = false
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    var filtered: [String] {
        query.isEmpty ? options : options.filter { $0.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack {
            List {
                if searchable {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("Search...", text: $query)
                    }
                    .listRowBackground(Color.clear)
                }
                ForEach(filtered, id: \.self) { option in
                    Button {
                        value = option
                        dismiss()
                    } label: {
                        HStack {
                            Text(option)
                                .foregroundStyle(option == value ? AppConstants.primary : .primary)
                            Spacer()
                            if option == value {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(AppConstants.primary)
                            }
                        }
                    }
                }
            }
            .navigationTitle(title)
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

// MARK: - Segmented pill row (title picker, gender, Yes/No)

struct PillRow: View {
    let options: [String]
    @Binding var value: String

    var body: some View {
        FlowLayoutChips(options: options, selected: value) { value = $0 }
    }
}

struct FlowLayoutChips: View {
    let options: [String]
    let selected: String
    let onSelect: (String) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    Button {
                        onSelect(option)
                    } label: {
                        Text(option)
                            .font(.system(size: 14, weight: .semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(selected == option ? AppConstants.primary : Color(hex: "#F1F3F5"))
                            .foregroundStyle(selected == option ? .white : AppConstants.textPrimary)
                            .cornerRadius(10)
                    }
                }
            }
        }
    }
}

// MARK: - Title picker row

struct TitlePicker: View {
    @Binding var value: PatientTitle

    var body: some View {
        FlowLayoutChips(options: AppConstants.titles, selected: value.rawValue) {
            if let parsed = PatientTitle(rawValue: $0) { value = parsed }
        }
    }
}

// MARK: - Photo capture button + preview (mirrors photoField)

struct PhotoCaptureField: View {
    let title: String
    let aiDisclosure: String?
    let image: UIImage?
    var gpsMetadata: PhotoMetadata?
    var extracting = false
    var extractedCount = 0
    var captureLabel = "Take Photo"
    let onCapture: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppConstants.textPrimary)
                Text("*").foregroundStyle(AppConstants.danger)
            }
            if let aiDisclosure {
                Text(aiDisclosure)
                    .font(.system(size: 12))
                    .foregroundStyle(AppConstants.textSecondary)
            }
            if let image {
                ZStack(alignment: .bottom) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 260)
                        .frame(maxWidth: .infinity)
                        .cornerRadius(12)
                    VStack(spacing: 6) {
                        if let gps = gpsMetadata, let lat = gps.latitude, let lon = gps.longitude {
                            Label(String(format: "%.6f, %.6f", lat, lon), systemImage: "mappin.and.ellipse")
                                .font(.system(size: 11))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(hex: "#28A745").opacity(0.9))
                                .cornerRadius(8)
                        }
                        if extracting {
                            HStack(spacing: 8) {
                                ProgressView().tint(.white)
                                Text("Extracting data with AI...")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.white)
                            }
                            .padding(8)
                            .background(Color.black.opacity(0.65))
                            .cornerRadius(8)
                        } else if extractedCount > 0 {
                            Label("\(extractedCount) fields auto-filled", systemImage: "sparkles")
                                .font(.system(size: 12))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Color(hex: "#0066CC").opacity(0.9))
                                .cornerRadius(8)
                        }
                        Button("Retake", action: onCapture)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(8)
                            .padding(.bottom, 8)
                    }
                }
            } else {
                Button(action: onCapture) {
                    VStack(spacing: 8) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(AppConstants.primary)
                        Text(captureLabel)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppConstants.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 28)
                    .background(AppConstants.primaryLight)
                    .cornerRadius(12)
                }
                if extracting {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Extracting data with AI...")
                            .font(.system(size: 12))
                            .foregroundStyle(AppConstants.textSecondary)
                    }
                }
            }
        }
    }
}

// MARK: - Camera capture (AVCapturePhotoOutput, includes .external for the cloud simulator)

struct CameraCaptureView: View {
    let onPhoto: (UIImage, PhotoMetadata) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var permissionDenied = false
    @State private var noDevice = false
    @State private var capturedImage: UIImage?
    @State private var metadata: PhotoMetadata?
    @StateObject private var camera = CameraController()
    @StateObject private var locator = LocationGrabber()

    var body: some View {
        NavigationStack {
            Group {
                if permissionDenied {
                    deniedState
                } else if noDevice {
                    noDeviceState
                } else if let image = capturedImage {
                    confirmView(image)
                } else {
                    CameraPreview(controller: camera)
                        .ignoresSafeArea()
                        .overlay(alignment: .bottom) {
                            Button {
                                capture()
                            } label: {
                                Circle()
                                    .strokeBorder(.white, lineWidth: 5)
                                    .frame(width: 76, height: 76)
                            }
                            .padding(.bottom, 36)
                        }
                        .overlay(alignment: .top) {
                            if let text = camera.status {
                                Text(text)
                                    .font(.system(size: 12))
                                    .foregroundStyle(.white)
                                    .padding(8)
                                    .background(.black.opacity(0.6))
                                    .cornerRadius(8)
                            }
                        }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(.white)
                }
            }
            .onAppear {
                camera.start { error in
                    switch error {
                    case .denied: permissionDenied = true
                    case .noDevice: noDevice = true
                    case .none: break
                    }
                }
                locator.requestLocation()
            }
        }
        .preferredColorScheme(.dark)
    }

    private var deniedState: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.badge.ellipsis").font(.system(size: 48)).foregroundStyle(.secondary)
            Text("Camera Access Denied").font(.headline)
            Text("Camera permission is required to take photos. Enable it in Settings.")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(32)
    }

    private var noDeviceState: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.on.rectangle").font(.system(size: 48)).foregroundStyle(.secondary)
            Text("No Camera Available").font(.headline)
            Text("No camera device was found on this device.")
                .font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(32)
    }

    private func confirmView(_ image: UIImage) -> some View {
        VStack(spacing: 16) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 480)
                .cornerRadius(12)
                .padding(.horizontal, 16)
            if let meta = metadata, let lat = meta.latitude, let lon = meta.longitude {
                Label(String(format: "%.6f, %.6f", lat, lon), systemImage: "mappin.and.ellipse")
                    .font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 16) {
                Button("Retake") {
                    capturedImage = nil
                    metadata = nil
                    camera.start { _ in }
                }
                .buttonStyle(.bordered)
                Button("Use Photo") {
                    var meta = metadata ?? PhotoMetadata(timestamp: AppTimestamp.now(), latitude: nil, longitude: nil)
                    meta.latitude = meta.latitude ?? locator.latitude
                    meta.longitude = meta.longitude ?? locator.longitude
                    onPhoto(image, meta)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    private func capture() {
        camera.capturePhoto { image in
            guard let image else { return }
            var meta = PhotoMetadata(timestamp: AppTimestamp.now(), latitude: nil, longitude: nil)
            meta.latitude = locator.latitude
            meta.longitude = locator.longitude
            metadata = meta
            capturedImage = image
        }
    }
}

// MARK: - Camera controller

final class CameraController: NSObject, AVCapturePhotoCaptureDelegate, ObservableObject {
    let objectWillChange = ObservableObjectPublisher()
    @Published var status: String?

    let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let queue = DispatchQueue(label: "camera.session")
    private var configured = false
    private var captureHandler: ((UIImage?) -> Void)?

    func start(completion: @escaping (CameraSetupError?) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureAndRun(completion)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    granted ? self.configureAndRun(completion) : completion(.denied)
                }
            }
        default:
            completion(.denied)
        }
    }

    private func configureAndRun(_ completion: @escaping (CameraSetupError?) -> Void) {
        queue.async {
            if self.configured {
                if !self.session.isRunning {
                    self.session.startRunning()
                }
                DispatchQueue.main.async { completion(nil) }
                return
            }
            // Include .external so the cloud simulator's webcam is discovered (iOS 17+).
            let discovery = AVCaptureDevice.DiscoverySession(
                deviceTypes: [.builtInWideAngleCamera, .external],
                mediaType: .video,
                position: .back
            )
            guard let device = discovery.devices.first else {
                DispatchQueue.main.async { completion(.noDevice) }
                return
            }
            do {
                self.session.beginConfiguration()
                self.session.sessionPreset = .photo
                let input = try AVCaptureDeviceInput(device: device)
                if self.session.canAddInput(input) { self.session.addInput(input) }
                if self.session.canAddOutput(self.output) { self.session.addOutput(self.output) }
                self.session.commitConfiguration()
                self.configured = true
                self.session.startRunning()
                DispatchQueue.main.async { completion(nil) }
            } catch {
                DispatchQueue.main.async { completion(.noDevice) }
            }
        }
    }

    func capturePhoto(_ handler: @escaping (UIImage?) -> Void) {
        captureHandler = handler
        queue.async {
            let settings = AVCapturePhotoSettings()
            self.output.capturePhoto(with: settings, delegate: self)
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let image = photo.fileDataRepresentation().flatMap(UIImage.init)
        DispatchQueue.main.async { self.captureHandler?(image) }
    }

    deinit {
        // Session teardown happens automatically on release.
    }
}

enum CameraSetupError {
    case denied, noDevice
}

struct CameraPreview: UIViewRepresentable {
    let controller: CameraController

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.videoPreviewLayer.session = controller.session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var videoPreviewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}

// MARK: - One-shot location

final class LocationGrabber: NSObject, ObservableObject, CLLocationManagerDelegate {
    let objectWillChange = ObservableObjectPublisher()
    @Published var latitude: Double?
    @Published var longitude: Double?

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestLocation() {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        latitude = location.coordinate.latitude
        longitude = location.coordinate.longitude
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }
}
