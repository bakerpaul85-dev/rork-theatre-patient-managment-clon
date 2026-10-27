import Foundation
import UIKit

// Port of utils/pdfConverter.ts: renders scanned JPEG pages into a single
// A4 PDF entirely on-device (no filesystem round-trips, matching the pure-JS
// builder used on Android after the cache/Print read failures).

enum PDFRenderer {
    static let a4 = CGSize(width: 595.28, height: 841.89)
    private static let margin: CGFloat = 12

    /// Renders the given page images as an A4 PDF, one page per image, centered.
    static func pdfData(from images: [UIImage]) -> Data? {
        guard !images.isEmpty else { return nil }
        let bounds = CGRect(origin: .zero, size: a4)
        let renderer = UIGraphicsPDFRenderer(bounds: bounds)
        return renderer.pdfData { context in
            for image in images {
                context.beginPage()
                guard image.size.width > 0, image.size.height > 0 else { continue }
                let scale = min((a4.width - margin * 2) / image.size.width, (a4.height - margin * 2) / image.size.height)
                let drawSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                let origin = CGPoint(x: (a4.width - drawSize.width) / 2, y: (a4.height - drawSize.height) / 2)
                image.draw(in: CGRect(origin: origin, size: drawSize))
            }
        }
    }
}
