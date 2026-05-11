export type CollectedReceipt = {
  id: string
  fields: { label: string; value: string }[]
}

export type ScanField = {
  label: string
  status: "pending" | "found" | "missing"
  value?: string
}

export type GeneratingStep = {
  label: string
  status: "pending" | "done"
}

export type ExpenseMessage =
  | { id: string; role: "user" | "assistant"; type: "text"; body: string }
  | { id: string; role: "assistant"; type: "scanning"; fields: ScanField[] }
  | { id: string; role: "assistant"; type: "quick-reply"; body: string; options: string[] }
  | { id: string; role: "assistant"; type: "category-picker"; body: string; suggested: string; categories: string[] }
  | { id: string; role: "assistant"; type: "participant-input"; body: string }
  | { id: string; role: "assistant"; type: "summary"; fields: { label: string; value: string }[] }
  | { id: string; role: "assistant"; type: "generating"; steps: GeneratingStep[] }
  | { id: string; role: "assistant"; type: "download"; filename: string; blobUrl: string }

export const INITIAL_SCAN_FIELDS: ScanField[] = [
  { label: "Leverantör", status: "pending" },
  { label: "Datum", status: "pending" },
  { label: "Belopp", status: "pending" },
  { label: "Kategori", status: "pending" },
  { label: "Syfte", status: "pending" },
  { label: "Deltagare", status: "pending" },
]

export const SCANNED_FIELDS: ScanField[] = [
  { label: "Leverantör", status: "found", value: "Restaurant Kronborg" },
  { label: "Datum", status: "found", value: "2026-05-03" },
  { label: "Belopp", status: "found", value: "1 240 SEK" },
  { label: "Kategori", status: "missing" },
  { label: "Syfte", status: "missing" },
  { label: "Deltagare", status: "missing" },
]

export const EMPLOYEES = [
  "Anna Svensson",
  "Björn Lindqvist",
  "Camilla Ek",
  "David Persson",
  "Emma Karlsson",
  "Fredrik Nilsson",
  "Gunilla Berg",
  "Hans Johansson",
  "Ida Larsson",
  "Johan Eriksson",
]

export const CATEGORIES = [
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
]
