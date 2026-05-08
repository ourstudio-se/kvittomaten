import { GoogleGenerativeAI } from "@google/generative-ai"

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in .env (server-side only)."
    )
  }
  return key
}

export async function* streamGeminiText({
  prompt,
}: {
  prompt: string
  model?: string
}): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(getApiKey())
  const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const result = await geminiModel.generateContentStream(prompt)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

