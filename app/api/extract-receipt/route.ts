import { extractReceiptFields } from "@/server/llm/gemini"

const MAX_BYTES = 12 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
])

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: "Empty file" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large" }, { status: 413 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 415 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const data = buffer.toString("base64")

  try {
    const fields = await extractReceiptFields({ data, mimeType: file.type })
    return Response.json({ fields })
  } catch (err) {
    console.error("extract-receipt failed", err)
    return Response.json({ error: "Extraction failed" }, { status: 502 })
  }
}
