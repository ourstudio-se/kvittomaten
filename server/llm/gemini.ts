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
  valuta?: string
  belopp_sek?: string
  kategori?: string
  syfte?: string
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
        "Totalbelopp i originalvaluta som det står på kvittot, t.ex. '45.50 CHF' eller '1 240 SEK'. Lämna tom sträng om totalen inte är läsbar.",
    },
    valuta: {
      type: Type.STRING,
      description:
        "Valutakoden (ISO 4217) som kvittot är i, t.ex. 'SEK', 'EUR', 'USD', 'CHF', 'NOK', 'DKK', 'GBP'. Identifiera från valutasymboler (kr, €, $, £, Fr.), landskontext eller explicit text på kvittot. Lämna tom sträng om det inte går att avgöra.",
    },
    belopp_sek: {
      type: Type.STRING,
      description:
        "Om valutan INTE är SEK: konvertera totalbeloppet till SEK med ungefärlig aktuell växelkurs och ange resultatet som t.ex. '485 SEK'. Om valutan redan är SEK: samma som belopp-fältet. Lämna tom sträng om du inte kan beräkna.",
    },
    kategori: {
      type: Type.STRING,
      description: `Endast om du kan avgöra med hög säkerhet, välj exakt en av: ${RECEIPT_CATEGORIES.join(", ")}. Annars tom sträng.`,
    },
    syfte: {
      type: Type.STRING,
      description:
        "Kort syfte (max 80 tecken) om det går att härleda från kvittot, annars tom sträng.",
    },
    deltagare: {
      type: Type.STRING,
      description:
        "Eventuella deltagare som anges på kvittot. Sällan på kvitton – lämna tom sträng om okänt.",
    },
  },
  required: [
    "leverantor",
    "datum",
    "belopp",
    "valuta",
    "belopp_sek",
    "kategori",
    "syfte",
    "deltagare",
  ],
  propertyOrdering: [
    "leverantor",
    "datum",
    "belopp",
    "valuta",
    "belopp_sek",
    "kategori",
    "syfte",
    "deltagare",
  ],
}

const EXTRACTION_SYSTEM_INSTRUCTION = `Du extraherar strukturerad data från kvitton. Returnera ENDAST fält du kan läsa direkt från bilden. Hitta inte på värden. Om ett fält är otydligt eller saknas, returnera en tom sträng för det fältet.

Regler:
- Datum måste vara i YYYY-MM-DD.
- Belopp ska vara totalsumman i originalvaluta som den står på kvittot.
- Identifiera valutan från symboler (kr/SEK, €/EUR, $/USD, £/GBP, Fr./CHF, NOK, DKK), landskontext eller språk på kvittot.
- Om valutan inte är SEK, använd Google Search för att slå upp aktuell växelkurs och konvertera beloppet till SEK. Ange det konverterade beloppet i belopp_sek.
- Om valutan redan är SEK, sätt belopp_sek till samma värde som belopp.`

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
  if (isNonEmptyString(r.valuta)) out.valuta = r.valuta.trim().toUpperCase()
  if (isNonEmptyString(r.belopp_sek)) out.belopp_sek = r.belopp_sek.trim()
  if (
    isNonEmptyString(r.kategori) &&
    (RECEIPT_CATEGORIES as readonly string[]).includes(r.kategori.trim())
  ) {
    out.kategori = r.kategori.trim()
  }
  if (isNonEmptyString(r.syfte)) out.syfte = r.syfte.trim().slice(0, 200)
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
      tools: [{ googleSearch: {} }],
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
