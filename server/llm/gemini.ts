import { GoogleGenAI, ThinkingLevel } from "@google/genai"

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
  const ai = new GoogleGenAI({ apiKey: getApiKey() })

  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MEDIUM,
      },
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
    },
  })

  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}
