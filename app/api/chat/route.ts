import { streamGeminiText } from "@/server/llm/gemini"

export const runtime = "nodejs"

type ChatRequest = {
  message?: unknown
}

export async function POST(req: Request) {
  let body: ChatRequest
  try {
    body = (await req.json()) as ChatRequest
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 })
  }
  if (message.length > 8000) {
    return Response.json({ error: "Message is too long." }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamGeminiText({ prompt: message })) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (err) {
        controller.error(err)
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

