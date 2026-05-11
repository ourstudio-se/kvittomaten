import { streamExpenseChat } from "@/server/llm/gemini"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const prompt =
    body && typeof body === "object" && "prompt" in body
      ? (body as { prompt: unknown }).prompt
      : null

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "Missing 'prompt' string" }, { status: 400 })
  }
  if (prompt.length > 4000) {
    return Response.json({ error: "Prompt too long" }, { status: 413 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamExpenseChat({ prompt })) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        console.error("chat stream failed", err)
        controller.enqueue(
          encoder.encode("\n[Något gick fel hos assistenten.]")
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
