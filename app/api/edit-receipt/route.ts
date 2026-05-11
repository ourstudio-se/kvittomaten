import {
  interpretIntent,
  type ExtractedReceipt,
} from "@/server/llm/gemini"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }

  const { extracted, message, savedCount, expectingField } = body as Record<string, unknown>

  if (typeof message !== "string" || message.trim().length === 0) {
    return Response.json({ error: "Missing 'message'" }, { status: 400 })
  }
  if (message.length > 2000) {
    return Response.json({ error: "Message too long" }, { status: 413 })
  }
  if (!extracted || typeof extracted !== "object") {
    return Response.json(
      { error: "Missing 'extracted' state" },
      { status: 400 }
    )
  }

  try {
    const action = await interpretIntent({
      extracted: extracted as ExtractedReceipt,
      savedCount: typeof savedCount === "number" ? savedCount : 0,
      expectingField:
        typeof expectingField === "string" ? expectingField : undefined,
      message,
    })
    return Response.json(action)
  } catch (err) {
    console.error("edit-receipt failed", err)
    return Response.json({ action: "off_topic" })
  }
}
