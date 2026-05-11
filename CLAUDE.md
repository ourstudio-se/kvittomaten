@AGENTS.md

# Kvittomaten

AI-driven kvittohantering för svensk bokföring. Användaren fotar ett kvitto, appen extraherar data via Gemini och ställer kompletterande frågor.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** med OKLCH-färger + **shadcn/ui** (base-nova style)
- **Google Gemini 2.5 Flash** via `@google/generative-ai` för AI-analys
- **Node.js 25.9.0**

## Projektstruktur

```
app/                    # Next.js App Router
  api/chat/route.ts     # POST /api/chat — streamar Gemini-svar
  layout.tsx            # Root layout (lang="sv")
  page.tsx              # Renderar ChatPanel
  globals.css           # Tema (light/dark), OKLCH-variabler
components/
  chat/ChatPanel.tsx    # Huvudsaklig chatt-UI med streaming
  ui/                   # shadcn/ui-komponenter (button, card, textarea)
server/
  llm/gemini.ts         # Gemini-klient, async generator för streaming
lib/
  utils.ts              # cn() helper (clsx + tailwind-merge)
test-receipts/          # Testbilder på kvitton
```

## Miljövariabler

- `GEMINI_API_KEY` — Google AI API-nyckel (server-side, sätts i `.env.local`)

## Kommandon

- `npm run dev` — starta dev-server
- `npm run build` — bygga för produktion
- `npm run lint` — kör ESLint

## Domänkontext: Svensk kvittoredovisning

Kvittodata som behöver extraheras:
- Datum, säljare/butik, org.nummer
- Varor/rader, totalbelopp
- Moms uppdelat per sats (25%, 12%, 6%)
- Betalningsmetod

Användaren behöver komplettera med:
- Syfte (avgör bokföringskonto och avdragsrätt)
- Om representation: deltagare, antal, syfte
- Privat/företag vid blandköp
- Projekt/kostnadsställe

Regler att beakta:
- Kvitton under 4 000 kr: förenklat kassakvitto räcker
- Kvitton över 4 000 kr: kräver köparens namn/adress
- Representation: ingen momsavdrag på mat sedan 2017
- Inventarier vs förbrukning: gräns vid halva prisbasbeloppet
- Kvitton ska sparas i 7 år
