import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai"

const MODEL = "gemini-3-flash-preview"

const RECEIPT_CATEGORIES = [
  "Förbrukningsmaterial",
  "Förbrukningsinventarie",
  "Dataprogram/licens",
  "Representation, intern",
  "Representation, extern",
  "Parkering",
  "Tåg/flyg/buss",
  "Hotell",
  "Friskvård",
  "Övrigt",
] as const

export type ExtractedReceipt = {
  leverantor?: string
  datum?: string
  belopp?: string
  kategori?: string
  deltagare?: string
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in .env (server-side only)."
    )
  }
  return key
}

function getClient() {
  return new GoogleGenAI({ apiKey: getApiKey() })
}

const RECEIPT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    leverantor: {
      type: Type.STRING,
      description:
        "Leverantörens/butikens namn exakt som det står på kvittot. Lämna tom sträng om det inte går att läsa.",
    },
    datum: {
      type: Type.STRING,
      description:
        "Inköpsdatum i formatet YYYY-MM-DD. Lämna tom sträng om datum inte syns tydligt.",
    },
    belopp: {
      type: Type.STRING,
      description:
        "Totalbelopp inkl. valuta, t.ex. '1 240 SEK'. Lämna tom sträng om totalen inte är läsbar.",
    },
    kategori: {
      type: Type.STRING,
      description: `Endast om du kan avgöra med hög säkerhet, välj exakt en av: ${RECEIPT_CATEGORIES.join(", ")}. Annars tom sträng.`,
    },
    deltagare: {
      type: Type.STRING,
      description:
        "Eventuella deltagare som anges på kvittot. Sällan på kvitton – lämna tom sträng om okänt.",
    },
  },
  required: ["leverantor", "datum", "belopp", "kategori", "deltagare"],
  propertyOrdering: [
    "leverantor",
    "datum",
    "belopp",
    "kategori",
    "deltagare",
  ],
}

const EXTRACTION_SYSTEM_INSTRUCTION = `Du extraherar strukturerad data från svenska kvitton. Returnera ENDAST fält du kan läsa direkt från bilden. Hitta inte på värden. Om ett fält är otydligt eller saknas, returnera en tom sträng för det fältet. Datum måste vara i YYYY-MM-DD. Belopp ska vara totalsumman inklusive valuta (oftast SEK).`

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function looksLikeIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
}

function validateExtracted(raw: unknown): ExtractedReceipt {
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const out: ExtractedReceipt = {}

  if (isNonEmptyString(r.leverantor)) out.leverantor = r.leverantor.trim()
  if (isNonEmptyString(r.datum) && looksLikeIsoDate(r.datum)) {
    out.datum = r.datum.trim()
  }
  if (isNonEmptyString(r.belopp)) out.belopp = r.belopp.trim()
  if (
    isNonEmptyString(r.kategori) &&
    (RECEIPT_CATEGORIES as readonly string[]).includes(r.kategori.trim())
  ) {
    out.kategori = r.kategori.trim()
  }
  if (isNonEmptyString(r.deltagare)) out.deltagare = r.deltagare.trim()

  return out
}

export async function extractReceiptFields({
  data,
  mimeType,
}: {
  data: string
  mimeType: string
}): Promise<ExtractedReceipt> {
  const ai = getClient()

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data, mimeType } },
          {
            text: "Extrahera fälten från detta kvitto enligt schemat. Lämna tomma strängar för fält du inte kan läsa.",
          },
        ],
      },
    ],
    config: {
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: "application/json",
      responseSchema: RECEIPT_SCHEMA,
    },
  })

  const text = response.text
  if (!text) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {}
  }

  return validateExtracted(parsed)
}

// --- Free-text intent interpretation ---

const EDIT_FIELDS = [
  "leverantor",
  "datum",
  "belopp",
  "kategori",
  "deltagare",
] as const
type EditField = (typeof EDIT_FIELDS)[number]

export type IntentAction =
  | { action: "set_field"; field: EditField; value: string }
  | { action: "ask_field"; field: EditField }
  | { action: "generate_pdf" }
  | { action: "add_receipt" }
  | { action: "cancel" }
  | { action: "off_topic" }

const INTENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      description:
        "set_field, ask_field, generate_pdf, add_receipt, cancel eller off_topic",
    },
    field: {
      type: Type.STRING,
      description:
        "leverantor, datum, belopp, kategori eller deltagare. Tom sträng om irrelevant.",
    },
    value: {
      type: Type.STRING,
      description:
        "Nytt värde för fältet (bara för set_field). Tom sträng annars.",
    },
  },
  required: ["action", "field", "value"],
  propertyOrdering: ["action", "field", "value"],
}

const INTENT_SYSTEM_INSTRUCTION = `Du tolkar användarens fritext i en kvittohanterings-app. Du får nuvarande tillstånd och meddelande. Välj EN action:

- "set_field": användaren anger nytt värde för ett fält i kvittot som redigeras (t.ex. "ändra deltagare till Anna", "1080 SEK", "2026-03-24").
- "ask_field": användaren säger att ett fält är fel men ger inget nytt värde (t.ex. "deltagaren är fel").
- "generate_pdf": användaren vill skapa/exportera/skicka PDF-sammanställning av redan sparade kvitton (t.ex. "generera pdf", "skicka filerna").
- "add_receipt": användaren vill lägga till/registrera ett nytt kvitto (t.ex. "lägg till kvitto", "ladda upp ett till").
- "cancel": användaren vill avbryta eller börja om från början (t.ex. "avbryt", "fel kvitto", "glöm det", "göra om", "starta om", "börja om", "nollställ").
- "off_topic": meddelandet handlar inte om något av ovanstående.

Tolkningsregler:
- "cancel"-nyckelord (göra om, börja om, starta om, avbryt) tar ALLTID företräde, även om de står tillsammans med annan text.
- Om expectingField är angivet och meddelandet är ett rimligt värde för det fältet → set_field(expectingField, värdet). Normalisera (datum → YYYY-MM-DD, kategori → exakt matchning, belopp → t.ex. "1 080 SEK").
- Om expectingField är angivet MEN meddelandet tydligt rör ett annat fält ("ändra datumet till …") → set_field för det andra fältet istället.
- generate_pdf är bara giltigt om savedCount > 0.
- set_field och ask_field är bara giltigt om ett kvitto är under redigering.
- Vid set_field måste kategori vara EXAKT en av: ${RECEIPT_CATEGORIES.join(", ")}. Datum måste vara YYYY-MM-DD och rimligt giltigt. Belopp måste innehålla en siffra.

För set_field returnera fält + normaliserat värde. För ask_field returnera fält. Annars lämna field/value tomma. Hitta inte på värden.`

export async function interpretIntent({
  extracted,
  savedCount,
  expectingField,
  message,
}: {
  extracted: ExtractedReceipt
  savedCount: number
  expectingField?: string
  message: string
}): Promise<IntentAction> {
  const ai = getClient()

  const inFlight = Object.values(extracted).some((v) => v != null)

  const prompt = `Tillstånd:
- Kvitto under redigering: ${inFlight ? "ja" : "nej"}
- Nuvarande fält: ${JSON.stringify(extracted)}
- Antal sparade kvitton (kan exporteras till PDF): ${savedCount}
- expectingField (fält som just nu efterfrågas, om något): ${expectingField ?? "—"}

Användarens meddelande: "${message}"`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: INTENT_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: "application/json",
      responseSchema: INTENT_SCHEMA,
    },
  })

  const text = response.text
  if (!text) return { action: "off_topic" }

  let parsed: { action?: string; field?: string; value?: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    return { action: "off_topic" }
  }

  const action = parsed.action
  const field = parsed.field?.trim() ?? ""
  const value = parsed.value?.trim() ?? ""
  const isKnownField = (EDIT_FIELDS as readonly string[]).includes(field)

  if (action === "set_field" && inFlight && isKnownField && value) {
    if (field === "kategori" && !(RECEIPT_CATEGORIES as readonly string[]).includes(value)) {
      return { action: "ask_field", field: field as EditField }
    }
    if (field === "datum" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { action: "ask_field", field: field as EditField }
    }
    if (field === "belopp" && !/\d/.test(value)) {
      return { action: "ask_field", field: field as EditField }
    }
    return { action: "set_field", field: field as EditField, value }
  }
  if (action === "ask_field" && inFlight && isKnownField) {
    return { action: "ask_field", field: field as EditField }
  }
  if (action === "generate_pdf" && savedCount > 0) {
    return { action: "generate_pdf" }
  }
  if (action === "add_receipt") {
    return { action: "add_receipt" }
  }
  if (action === "cancel" && inFlight) {
    return { action: "cancel" }
  }
  return { action: "off_topic" }
}

const CHAT_SYSTEM_INSTRUCTION = `Du är en assistent som hjälper anställda att registrera utlägg och kvitton på svenska. Du svarar kortfattat och vänligt.

Om användaren ber om hjälp med något som inte rör utlägg, kvittohantering, kategorier, deltagare eller PDF-export: avböj artigt på en mening och dela en kort, intressant och korrekt fakta om MODO Hockey eller staden Örnsköldsvik (gärna om kända spelare som vuxit upp där). Avsluta inte med uppföljningsfrågor i de fallen.

Hitta aldrig på fakta. Om du är osäker, säg det.`

// Gemini API doesn't allow googleSearch and googleMaps in the same request;
// route on prompt content instead.
const MAPS_INTENT = /\b(karta|kartan|adress|adressen|närmast|nära mig|i närheten|hitta\s+\w+|var ligger|vägen?\s+till|kör|åka|restaurang|hotell|parkering|station|stationen|map|maps|nearby|directions|address)\b/i

function pickGroundingTool(prompt: string) {
  return MAPS_INTENT.test(prompt) ? { googleMaps: {} } : { googleSearch: {} }
}

export async function* streamExpenseChat({
  prompt,
}: {
  prompt: string
}): AsyncGenerator<string> {
  const ai = getClient()

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      tools: [pickGroundingTool(prompt)],
    },
  })

  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}
