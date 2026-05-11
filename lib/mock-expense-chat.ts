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
  { label: "Deltagare", status: "pending" },
]

export const SCANNED_FIELDS: ScanField[] = [
  { label: "Leverantör", status: "found", value: "Restaurant Kronborg" },
  { label: "Datum", status: "found", value: "2026-05-03" },
  { label: "Belopp", status: "found", value: "1 240 SEK" },
  { label: "Kategori", status: "missing" },
  { label: "Deltagare", status: "missing" },
]

export const EMPLOYEES = [
  "Alexander Erlandsson",
  "Alexandra Angin",
  "Anders Gustafsson",
  "Anton Wernvik",
  "Björn Vikström",
  "Carl Pihl",
  "Daniel Nelvig",
  "Elin Runbert",
  "Elin Sandahl",
  "Elin Wattström",
  "Erik Andersson",
  "Hampus Elinder",
  "Hanna Andersson",
  "Jens Heise",
  "Joel Hilmersson",
  "John Andersson",
  "Jonatan Granqvist",
  "Ludvig Jernqvist",
  "Marcus Wassén",
  "Maria Söderborg",
  "Marina Bergrahm (Yudanov)",
  "Martin Bergqlin",
  "Martin Wester",
  "Max Bolotin",
  "Moa Stenmark",
  "Oscar Blomqvist",
  "Oscar Hamrén",
  "Patrik Franzén Dennis",
  "Peter Johansson",
  "Ralf Krakowski",
  "Rasmus Bernestål",
  "Rikard Olsson",
  "Robert Frederiksen",
  "Roberth Ericsson",
  "Sharan Sabi",
  "Simon Hamberg",
  "Tobias Lund",
  "Viktor Hellqvist",
  "Younes Slibi",
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
