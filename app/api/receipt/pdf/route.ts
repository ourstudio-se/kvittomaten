import { generateVerifikationPdf } from "@/server/pdf/generate-verifikation"
import type { CollectedReceipt } from "@/lib/mock-expense-chat"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let receipts: CollectedReceipt[]
  let imageBuffer: Buffer | undefined
  let imageMimeType: string | undefined

  const contentType = req.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()

    const receiptsRaw = formData.get("receipts")
    if (typeof receiptsRaw !== "string") {
      return Response.json({ error: "Missing receipts field." }, { status: 400 })
    }

    try {
      receipts = JSON.parse(receiptsRaw) as CollectedReceipt[]
    } catch {
      return Response.json({ error: "Invalid receipts JSON." }, { status: 400 })
    }

    const imageFile = formData.get("image")
    console.log("[pdf] image field:", imageFile ? `${imageFile.constructor.name}, size=${(imageFile as File).size}, type=${(imageFile as File).type}` : "null")
    if (imageFile instanceof File && imageFile.size > 0) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      imageMimeType = imageFile.type
      console.log("[pdf] image buffer:", imageBuffer.length, "bytes, mime:", imageMimeType)
    }
  } else {
    try {
      const body = await req.json()
      receipts = body.receipts as CollectedReceipt[]
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 })
    }
  }

  if (!Array.isArray(receipts) || receipts.length === 0) {
    return Response.json({ error: "At least one receipt is required." }, { status: 400 })
  }

  const pdfBuffer = await generateVerifikationPdf(receipts, imageBuffer, imageMimeType)

  const filename = receipts.length === 1
    ? "verifikation.pdf"
    : `verifikation-${receipts.length}-kvitton.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
