// Renders one emoji glyph from the system Apple Color Emoji font to a PNG,
// cropped to the glyph's alpha bounding box and centered on a square canvas
// (the OG card draws these with width == height, so a non-square source would
// distort). Usage: swift scripts/render-emoji.swift "🔥" /path/out.png
// The font's largest bitmap strike is 160 px, so size 160 yields the sharpest
// artwork available — emoji-datasource packages top out at 64 px.
import AppKit

let emoji = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]
let fontSize: CGFloat = 160

let font = NSFont(name: "Apple Color Emoji", size: fontSize) ?? .systemFont(ofSize: fontSize)
let attr = NSAttributedString(string: emoji, attributes: [.font: font])
let bounds = attr.boundingRect(
  with: NSSize(width: 2000, height: 2000),
  options: [.usesLineFragmentOrigin]
)
let width = Int(ceil(bounds.width))
let height = Int(ceil(bounds.height))

func makeRep(_ w: Int, _ h: Int) -> NSBitmapImageRep? {
  NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
  )
}

func fail(_ message: String) -> Never {
  FileHandle.standardError.write("\(message)\n".data(using: .utf8)!)
  exit(1)
}

guard width > 0, height > 0, let drawn = makeRep(width, height) else {
  fail("cannot create bitmap for \(emoji)")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: drawn)
attr.draw(
  with: NSRect(x: -bounds.origin.x, y: -bounds.origin.y, width: bounds.width, height: bounds.height),
  options: [.usesLineFragmentOrigin]
)
NSGraphicsContext.restoreGraphicsState()

// Alpha bounding box of the actually painted pixels.
var minX = width
var minY = height
var maxX = -1
var maxY = -1
for y in 0..<height {
  for x in 0..<width where (drawn.colorAt(x: x, y: y)?.alphaComponent ?? 0) > 0.01 {
    minX = min(minX, x)
    minY = min(minY, y)
    maxX = max(maxX, x)
    maxY = max(maxY, y)
  }
}
guard maxX >= minX, maxY >= minY else { fail("empty render for \(emoji)") }

let cropW = maxX - minX + 1
let cropH = maxY - minY + 1
let side = max(cropW, cropH)
guard let square = makeRep(side, side) else { fail("cannot create square bitmap for \(emoji)") }

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: square)
// colorAt is top-left based while drawing is bottom-left; flip the source Y.
let srcRect = NSRect(x: minX, y: height - maxY - 1, width: cropW, height: cropH)
let dstRect = NSRect(x: (side - cropW) / 2, y: (side - cropH) / 2, width: cropW, height: cropH)
NSImage(size: NSSize(width: width, height: height), flipped: false) { rect in
  drawn.draw(in: rect)
  return true
}.draw(in: dstRect, from: srcRect, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

guard let png = square.representation(using: .png, properties: [:]) else {
  fail("cannot encode PNG for \(emoji)")
}
try! png.write(to: URL(fileURLWithPath: outPath))
