import PDFDocument from "pdfkit"
import sharp from "sharp"
import type { CollectedReceipt } from "@/lib/mock-expense-chat"

const PAGE_MARGIN = 50
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN * 2

type ImageAttachment = { buffer: Buffer; mimeType: string }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

function formatSEK(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " SEK"
}

function drawHorizontalLine(doc: PDFKit.PDFDocument, y: number) {
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(A4_WIDTH - PAGE_MARGIN, y)
    .strokeColor("#c0c0c0")
    .lineWidth(0.5)
    .stroke()
}

async function toPdfImage(img: ImageAttachment): Promise<Buffer | null> {
  if (!img.mimeType.startsWith("image/")) return null
  const needsConversion =
    img.mimeType !== "image/jpeg" && img.mimeType !== "image/png"
  return needsConversion
    ? await sharp(img.buffer).jpeg({ quality: 90 }).toBuffer()
    : img.buffer
}

function getReceiptAmount(receipt: CollectedReceipt): number {
  // Prefer "Belopp (SEK)" for foreign currency receipts, fall back to "Belopp"
  const sekField = receipt.fields.find((f) => f.label === "Belopp (SEK)")
  if (sekField) return parseAmount(sekField.value)
  const beloppField = receipt.fields.find((f) => f.label === "Belopp")
  if (beloppField) return parseAmount(beloppField.value)
  return 0
}

export async function generateVerifikationPdf(
  receipts: CollectedReceipt[],
  images: ImageAttachment[] = [],
): Promise<Buffer> {
  // Convert all images to PDF-compatible format
  const pdfImages: Buffer[] = []
  for (const img of images) {
    const converted = await toPdfImage(img)
    if (converted) pdfImages.push(converted)
  }

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: "Kvittosammanställning",
        Author: "Kvittomaten",
        Creator: "Kvittomaten",
      },
    })

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // --- Header ---
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Kvittosammanställning", PAGE_MARGIN, PAGE_MARGIN)

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Datum: ${today()}`, PAGE_MARGIN, PAGE_MARGIN, {
        align: "right",
        width: CONTENT_WIDTH,
      })

    let y = PAGE_MARGIN + 40
    drawHorizontalLine(doc, y)
    y += 15

    // --- Per receipt ---
    receipts.forEach((receipt, index) => {
      if (y > A4_HEIGHT - 150) {
        doc.addPage()
        y = PAGE_MARGIN
      }

      if (receipts.length > 1) {
        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .text(`Kvitto ${index + 1}`, PAGE_MARGIN, y)
        y += 22
      }

      const LABEL_WIDTH = 110
      const VALUE_X = PAGE_MARGIN + LABEL_WIDTH + 10
      const VALUE_WIDTH = CONTENT_WIDTH - LABEL_WIDTH - 10

      for (const field of receipt.fields) {
        if (y > A4_HEIGHT - 80) {
          doc.addPage()
          y = PAGE_MARGIN
        }

        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`${field.label}:`, PAGE_MARGIN, y, { width: LABEL_WIDTH })

        const valueHeight = doc.heightOfString(field.value, { width: VALUE_WIDTH })
        doc
          .font("Helvetica")
          .text(field.value, VALUE_X, y, { width: VALUE_WIDTH })

        y += Math.max(16, valueHeight + 4)
      }

      y += 10
      drawHorizontalLine(doc, y)
      y += 15
    })

    // --- Summary ---
    if (y > A4_HEIGHT - 120) {
      doc.addPage()
      y = PAGE_MARGIN
    }

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Sammanfattning", PAGE_MARGIN, y)
    y += 22

    const totalAmount = receipts.reduce((sum, r) => sum + getReceiptAmount(r), 0)

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Antal kvitton: ${receipts.length}`, PAGE_MARGIN, y)
    y += 16

    doc.text(`Totalbelopp: ${formatSEK(totalAmount)}`, PAGE_MARGIN, y)
    y += 16

    doc.text("Valuta: SEK", PAGE_MARGIN, y)
    y += 25

    drawHorizontalLine(doc, y)

    // --- Image attachment pages ---
    pdfImages.forEach((imgBuf, i) => {
      doc.addPage()

      const label = pdfImages.length === 1
        ? "Bilaga: Originalkvitto"
        : `Bilaga ${i + 1}: Originalkvitto`

      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(label, PAGE_MARGIN, PAGE_MARGIN)

      const imageY = PAGE_MARGIN + 30
      const maxWidth = CONTENT_WIDTH
      const maxHeight = A4_HEIGHT - imageY - PAGE_MARGIN

      doc.image(imgBuf, PAGE_MARGIN, imageY, {
        fit: [maxWidth, maxHeight],
        align: "center",
        valign: "center",
      })
    })

    doc.end()
  })
}
