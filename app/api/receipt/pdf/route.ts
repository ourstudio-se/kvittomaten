import { generateVerifikationPdf } from "@/server/pdf/generate-verifikation"
import type { CollectedReceipt } from "@/lib/mock-expense-chat"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let receipts: CollectedReceipt[]
  const imageBuffers: { buffer: Buffer; mimeType: string }[] = []

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

    for (const entry of formData.getAll("images")) {
      if (entry instanceof File && entry.size > 0) {
        imageBuffers.push({
          buffer: Buffer.from(await entry.arrayBuffer()),
          mimeType: entry.type,
        })
      }
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

  const pdfBuffer = await generateVerifikationPdf(receipts, imageBuffers)

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
