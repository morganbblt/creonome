import AVFoundation
import CoreGraphics
import CoreText
import Foundation

let width = 540
let height = 960
let framesPerSecond = 24
let durationSeconds = 8

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: swift scripts/generate-demo-video.swift <output.mp4>\n", stderr)
  exit(64)
}

let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.removeItem(at: outputURL)

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 900_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264MainAutoLevel,
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
  ]
)

guard writer.canAdd(input) else {
  fputs("The video input could not be added.\n", stderr)
  exit(1)
}
writer.add(input)
guard writer.startWriting() else {
  fputs("The video writer could not start: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
  exit(1)
}
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()
let totalFrames = durationSeconds * framesPerSecond

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> CGColor {
  CGColor(colorSpace: colorSpace, components: [red, green, blue, alpha])!
}

func drawText(
  _ text: String,
  at point: CGPoint,
  size: CGFloat,
  weight: CGFloat,
  color: CGColor,
  in context: CGContext
) {
  let font = CTFontCreateWithName("Helvetica Neue" as CFString, size, nil)
  let attributes: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): font,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
    NSAttributedString.Key(kCTStrokeWidthAttributeName as String): weight,
  ]
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attributes))
  context.textPosition = point
  CTLineDraw(line, context)
}

func drawFrame(_ frame: Int, into pixelBuffer: CVPixelBuffer) {
  CVPixelBufferLockBaseAddress(pixelBuffer, [])
  defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

  guard
    let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer),
    let context = CGContext(
      data: baseAddress,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    )
  else { return }

  let progress = CGFloat(frame) / CGFloat(totalFrames)
  let pulse = (sin(progress * .pi * 10) + 1) / 2
  let sweep = progress * CGFloat(width + 320) - 160

  let gradient = CGGradient(
    colorsSpace: colorSpace,
    colors: [color(0.025, 0.03, 0.035), color(0.075, 0.09, 0.11)] as CFArray,
    locations: [0, 1]
  )!
  context.drawLinearGradient(
    gradient,
    start: CGPoint(x: 0, y: 0),
    end: CGPoint(x: width, y: height),
    options: []
  )

  context.setFillColor(color(0.64, 0.84, 0.77, 0.12 + pulse * 0.08))
  context.fillEllipse(in: CGRect(x: sweep - 170, y: 390, width: 340, height: 340))
  context.setFillColor(color(0.78, 0.84, 0.42, 0.1))
  context.fillEllipse(in: CGRect(x: CGFloat(width) - sweep - 120, y: 90, width: 260, height: 260))

  context.setStrokeColor(color(0.82, 0.94, 0.87, 0.72))
  context.setLineWidth(3)
  let waveform = CGMutablePath()
  waveform.move(to: CGPoint(x: 42, y: 445))
  for index in 0...114 {
    let x = 42 + CGFloat(index) * 4
    let wave = sin(CGFloat(index) * 0.46 + progress * .pi * 18)
    let envelope = 12 + 46 * abs(sin(CGFloat(index) * 0.095 + progress * .pi * 2))
    waveform.addLine(to: CGPoint(x: x, y: 445 + wave * envelope))
  }
  context.addPath(waveform)
  context.strokePath()

  context.setStrokeColor(color(1, 1, 1, 0.18))
  context.setLineWidth(1)
  context.stroke(CGRect(x: 36, y: 34, width: width - 72, height: height - 68))
  context.move(to: CGPoint(x: 36, y: 520))
  context.addLine(to: CGPoint(x: width - 36, y: 520))
  context.strokePath()

  drawText("CREONOME", at: CGPoint(x: 42, y: 878), size: 24, weight: -2, color: color(0.96, 0.97, 0.96), in: context)
  drawText("WAREHOUSE TAPES", at: CGPoint(x: 42, y: 785), size: 44, weight: -1.5, color: color(0.96, 0.97, 0.96), in: context)
  drawText("THE RECORD EVERYONE SKIPPED", at: CGPoint(x: 42, y: 742), size: 16, weight: 0, color: color(0.68, 0.75, 0.77), in: context)

  let chapter = progress < 0.34 ? "01  FIND THE SIGNAL" : progress < 0.68 ? "02  ISOLATE THE DETAIL" : "03  MAKE THE FLIP"
  drawText(chapter, at: CGPoint(x: 42, y: 560), size: 15, weight: -1, color: color(0.78, 0.9, 0.84), in: context)
  drawText("0:17", at: CGPoint(x: 42, y: 330), size: 116, weight: -2.5, color: color(0.95, 0.96, 0.94, 0.92), in: context)
  drawText("ORIGINAL → FLIP", at: CGPoint(x: 46, y: 286), size: 18, weight: -1, color: color(0.69, 0.75, 0.77), in: context)

  let progressWidth = CGFloat(width - 84) * progress
  context.setFillColor(color(1, 1, 1, 0.13))
  context.fill(CGRect(x: 42, y: 82, width: width - 84, height: 3))
  context.setFillColor(color(0.78, 0.9, 0.84, 0.95))
  context.fill(CGRect(x: 42, y: 82, width: progressWidth, height: 3))
  drawText("VERTICAL MVP PREVIEW", at: CGPoint(x: 42, y: 50), size: 12, weight: 0, color: color(0.57, 0.63, 0.66), in: context)
}

for frame in 0..<totalFrames {
  while !input.isReadyForMoreMediaData {
    Thread.sleep(forTimeInterval: 0.002)
  }
  guard let pool = adaptor.pixelBufferPool else {
    fputs("The pixel buffer pool is unavailable.\n", stderr)
    exit(1)
  }
  var buffer: CVPixelBuffer?
  guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer) == kCVReturnSuccess,
        let pixelBuffer = buffer else {
    fputs("A video frame could not be allocated.\n", stderr)
    exit(1)
  }
  drawFrame(frame, into: pixelBuffer)
  let time = CMTime(value: CMTimeValue(frame), timescale: CMTimeScale(framesPerSecond))
  guard adaptor.append(pixelBuffer, withPresentationTime: time) else {
    fputs("A video frame could not be appended: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
    exit(1)
  }
}

input.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else {
  fputs("The video could not be finalized: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
  exit(1)
}

print("Generated \(outputURL.path)")
