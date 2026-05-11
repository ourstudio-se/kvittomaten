"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUp, Camera, FileText, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingNav } from "@/components/ui/floating-nav"
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought"
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container"
import { DownloadCard } from "@/components/ui/download-card"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { ScrollButton } from "@/components/ui/scroll-button"
import { ScanningCard } from "@/components/ui/scanning-card"
import { SummaryCard } from "@/components/ui/summary-card"
import {
  CATEGORIES,
  EMPLOYEES,
  INITIAL_SCAN_FIELDS,
  type CollectedReceipt,
  type ExpenseMessage,
  type GeneratingStep,
  type ScanField,
} from "@/lib/mock-expense-chat"

type LineItem = { beskrivning: string; belopp: string }

type ExtractedReceipt = {
  leverantor?: string
  datum?: string
  belopp?: string
  valuta?: string
  belopp_sek?: string
  kategori?: string
  deltagare?: string
  rader?: LineItem[]
}

const SCAN_FIELD_KEYS: { label: string; key: keyof ExtractedReceipt }[] = [
  { label: "Leverantör", key: "leverantor" },
  { label: "Datum", key: "datum" },
  { label: "Belopp", key: "belopp" },
  { label: "Kategori", key: "kategori" },
  { label: "Deltagare", key: "deltagare" },
]

function uid() {
  return Math.random().toString(36).slice(2)
}

function isImageFile(file: File) {
  return file.type.startsWith("image/")
}

const SUPPORTED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
])

function isSupportedReceiptFile(file: File): boolean {
  return SUPPORTED_MIME.has(file.type)
}

const UNSUPPORTED_FILE_BODY =
  "Den filtypen stöds inte. Ladda upp en bild (PNG, JPEG, WebP eller HEIC) eller en PDF."

const COMMAND_PREFIX = /^(kan vi|kan du|byt|ändra|ångra|avbryt|fel|glöm|nytt|starta|gör|ny|skapa|generera|exportera|skicka|nollställ|börja|stäng)\b/i

function shouldRouteToIntent(
  value: string,
  field: keyof ExtractedReceipt
): boolean {
  const t = value.trim()
  if (!t) return false
  if (t.includes("?")) return true
  if (t.length > 60) return true
  if (COMMAND_PREFIX.test(t)) return true
  if (field === "datum" && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) return true
  if (field === "belopp" && !/\d/.test(t)) return true
  return false
}

const INTRO_MESSAGE_BODY =
  "Hej! Lägg till eller fotografera ditt kvitto här i chatten så hjälper jag dig att generera en korrekt pdf."

function makeIntroMessages(): ExpenseMessage[] {
  return [
    {
      id: "intro",
      role: "assistant",
      type: "text",
      body: INTRO_MESSAGE_BODY,
    },
  ]
}

const GENERATION_STEPS: GeneratingStep[] = [
  { label: "Sammanställer uppgifter", status: "pending" },
  { label: "Formaterar kvittodokument", status: "pending" },
  { label: "Genererar PDF", status: "pending" },
]

export function ExpenseChatShell() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ExpenseMessage[]>(() => makeIntroMessages())
  const [participants, setParticipants] = useState("")
  const [participantMessageId, setParticipantMessageId] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<((value: string) => void) | null>(null)
  const [chipMode, setChipMode] = useState(false)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [generatingSteps, setGeneratingSteps] = useState<GeneratingStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const [collectedReceipts, setCollectedReceipts] = useState<CollectedReceipt[]>([])
  const collectedReceiptsRef = useRef<CollectedReceipt[]>([])
  const receiptImagesRef = useRef<File[]>([])
  // Image for the receipt currently being scanned/edited — only committed
  // to receiptImagesRef when the user accepts the summary.
  const pendingReceiptImageRef = useRef<File | null>(null)

  const extractedRef = useRef<ExtractedReceipt>({})
  const expectedFieldRef = useRef<keyof ExtractedReceipt | null>(null)
  const includedRaderRef = useRef<LineItem[] | null>(null)
  const kategoriConfirmedRef = useRef(false)
  const deltagareSkippedRef = useRef(false)
  const [deltagareOptional, setDeltagareOptional] = useState(false)

  const [hasCamera, setHasCamera] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => setHasCamera(devices.some((d) => d.kind === "videoinput")))
      .catch(() => setHasCamera(false))
  }, [])

  const addMessage = useCallback((msg: ExpenseMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const updateTextMessage = useCallback((id: string, body: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.type === "text" ? { ...m, body } : m))
    )
  }, [])

  const clearAttachment = useCallback(() => {
    setAttachedFile(null)
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }, [attachedPreviewUrl])

  const handleNewChat = useCallback(() => {
    setMessages(makeIntroMessages())
    setParticipants("")
    setParticipantMessageId(null)
    clearAttachment()
    setSuggestions([])
    setPendingAction(null)
    setChipMode(false)
    setSelectedChips([])
    setGeneratingSteps([])
    setPrompt("")
    collectedReceiptsRef.current = []
    setCollectedReceipts([])
    extractedRef.current = {}
    expectedFieldRef.current = null
    includedRaderRef.current = null
    kategoriConfirmedRef.current = false
    deltagareSkippedRef.current = false
    setDeltagareOptional(false)
    receiptImagesRef.current = []
    pendingReceiptImageRef.current = null
    setIsProcessing(false)
  }, [clearAttachment])

  const [activeChipIndex, setActiveChipIndex] = useState(-1)

  const showSuggestions = useCallback((opts: string[], action: (value: string) => void) => {
    setSuggestions(opts)
    setPendingAction(() => action)
    setActiveChipIndex(-1)
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setPendingAction(null)
    setChipMode(false)
    setSelectedChips([])
    setActiveChipIndex(-1)
  }, [])

  // --- Summary ---

  const buildScanSnapshot = useCallback((): ScanField[] => {
    return SCAN_FIELD_KEYS.map((entry) => {
      const raw = extractedRef.current[entry.key]
      const value = typeof raw === "string" ? raw : undefined
      return value
        ? { label: entry.label, status: "found", value }
        : { label: entry.label, status: "missing" }
    })
  }, [])

  const pushProgressCard = useCallback(() => {
    addMessage({
      id: uid(),
      role: "assistant",
      type: "scanning",
      fields: buildScanSnapshot(),
    })
  }, [addMessage, buildScanSnapshot])

  const showSummary = useCallback(() => {
    const e = extractedRef.current
    const category = e.kategori ?? "Övrigt"

    const fields: { label: string; value: string }[] = []
    if (e.leverantor) fields.push({ label: "Leverantör", value: e.leverantor })
    if (e.datum) fields.push({ label: "Datum", value: e.datum })

    const currency = e.valuta || "SEK"
    const isForeign = currency !== "SEK"
    if (isForeign && e.belopp) {
      fields.push({ label: "Originalbelopp", value: e.belopp })
      if (e.belopp_sek) fields.push({ label: "Belopp (SEK)", value: e.belopp_sek })
    } else if (e.belopp) {
      fields.push({ label: "Belopp", value: e.belopp })
    }

    fields.push({ label: "Kategori", value: category })
    if (e.deltagare) fields.push({ label: "Deltagare", value: e.deltagare })

    let exchangeRate: number | undefined
    if (isForeign && e.belopp && e.belopp_sek) {
      const origNum =
        parseFloat(e.belopp.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0
      const sekNum =
        parseFloat(e.belopp_sek.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0
      if (origNum > 0) exchangeRate = sekNum / origNum
    }

    addMessage({
      id: uid(),
      role: "assistant",
      type: "summary",
      fields,
      lineItems: e.rader,
      currency,
      exchangeRate,
    })
  }, [addMessage])

  // --- Step engine: walk through missing fields one at a time ---

  const runStepEngine = useCallback(() => {
    const acceptAnswer = (
      key: keyof ExtractedReceipt,
      displayValue: string,
      storedValue: string
    ) => {
      expectedFieldRef.current = null
      addMessage({ id: uid(), role: "user", type: "text", body: displayValue })
      clearSuggestions()
      extractedRef.current = { ...extractedRef.current, [key]: storedValue }
      pushProgressCard()
      setTimeout(next, 400)
    }

    const promptText = (key: keyof ExtractedReceipt, body: string) => {
      expectedFieldRef.current = key
      addMessage({ id: uid(), role: "assistant", type: "text", body })
      showSuggestions([], (value) => acceptAnswer(key, value, value))
    }

    const promptKategori = () => {
      expectedFieldRef.current = "kategori"
      const suggested = extractedRef.current.kategori
      const body = suggested
        ? `Jag antar att det är **${suggested}**. Stämmer det, eller vill du välja en annan kategori?`
        : "Vilken kategori passar utlägget? Välj från listan eller skriv eget."
      addMessage({ id: uid(), role: "assistant", type: "text", body })
      const options =
        suggested && CATEGORIES.includes(suggested)
          ? [suggested, ...CATEGORIES.filter((c) => c !== suggested)]
          : CATEGORIES
      showSuggestions(options, (raw) => {
        const chosen = CATEGORIES.includes(raw) ? raw : `Övrigt – ${raw}`
        kategoriConfirmedRef.current = true
        // Representation kräver alltid att deltagare anges — rensa eventuellt
        // AI-extraherat värde så deltagare-prompten alltid kör.
        if (chosen.startsWith("Representation")) {
          extractedRef.current = { ...extractedRef.current, deltagare: undefined }
          deltagareSkippedRef.current = false
        }
        acceptAnswer("kategori", chosen, chosen)
      })
    }

    const promptDeltagare = () => {
      expectedFieldRef.current = "deltagare"
      const category = extractedRef.current.kategori
      const isRepresentation =
        category === "Representation, intern" || category === "Representation, extern"
      setDeltagareOptional(!isRepresentation)
      if (category === "Representation, extern") {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body: "Ange externa deltagare (namn och företag):",
        })
        showSuggestions([], (value) => acceptAnswer("deltagare", value, value))
        return
      }
      const body =
        category === "Representation, intern"
          ? "Vilka interna deltagare var med? Välj ur listan."
          : "Vilka var med på utlägget? Välj ur listan, skriv egna namn — eller hoppa över om det inte är relevant."
      addMessage({ id: uid(), role: "assistant", type: "text", body })
      setChipMode(true)
      setSelectedChips([])
      showSuggestions(EMPLOYEES, () => {})
      setPendingAction(() => (value: string) => acceptAnswer("deltagare", value, value))
    }

    function next() {
      const e = extractedRef.current
      for (const entry of SCAN_FIELD_KEYS) {
        if (entry.key === "kategori") {
          if (e.kategori && kategoriConfirmedRef.current) continue
          promptKategori()
          return
        }
        if (entry.key === "deltagare" && deltagareSkippedRef.current) continue
        if (e[entry.key]) continue

        switch (entry.key) {
          case "leverantor":
            promptText("leverantor", "Vad är leverantörens namn?")
            return
          case "datum":
            promptText("datum", "Vilket datum gjordes inköpet? (YYYY-MM-DD)")
            return
          case "belopp":
            promptText("belopp", "Vad är totalbeloppet (inkl. valuta)?")
            return
          case "deltagare":
            promptDeltagare()
            return
        }
      }

      showSummary()
    }

    next()
  }, [addMessage, clearSuggestions, showSuggestions, pushProgressCard, showSummary])

  // --- Scan flow ---

  const animateScanFields = useCallback(
    (scanMessageId: string, extracted: ExtractedReceipt, onDone: () => void) => {
      SCAN_FIELD_KEYS.forEach((entry, i) => {
        setTimeout(() => {
          const raw = extracted[entry.key]
          const value = typeof raw === "string" ? raw : undefined
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== scanMessageId || m.type !== "scanning") return m
              const updated = m.fields.map((f) =>
                f.label === entry.label
                  ? value
                    ? { label: entry.label, status: "found" as const, value }
                    : { label: entry.label, status: "missing" as const }
                  : f
              )
              return { ...m, fields: updated }
            })
          )
        }, 300 + i * 250)
      })
      setTimeout(onDone, 300 + SCAN_FIELD_KEYS.length * 250 + 300)
    },
    []
  )

  const startScanFlow = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      const scanId = uid()
      const initialFields = INITIAL_SCAN_FIELDS.map((f) => ({ ...f }))

      addMessage({ id: uid(), role: "user", type: "text", body: `Laddar upp: ${file.name}` })
      addMessage({ id: scanId, role: "assistant", type: "scanning", fields: initialFields })

      let extracted: ExtractedReceipt = {}
      let errorBody: string | null = null
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/extract-receipt", { method: "POST", body: form })
        if (!res.ok) {
          if (res.status === 415) {
            errorBody = UNSUPPORTED_FILE_BODY
          } else if (res.status === 413) {
            errorBody = "Filen är för stor (max 12 MB). Försök med en mindre fil."
          } else {
            errorBody =
              "Jag kunde inte läsa kvittot. Försök ladda upp en tydligare bild."
          }
          throw new Error(`status ${res.status}`)
        }
        const json = (await res.json()) as { fields?: ExtractedReceipt }
        extracted = json.fields ?? {}
      } catch (err) {
        console.error("extract-receipt error", err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === scanId && m.type === "scanning"
              ? { ...m, fields: m.fields.map((f) => ({ ...f, status: "missing" as const })) }
              : m
          )
        )
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body:
            errorBody ??
            "Jag kunde inte läsa kvittot. Försök ladda upp en tydligare bild.",
        })
        pendingReceiptImageRef.current = null
        setIsProcessing(false)
        return
      }

      extractedRef.current = extracted
      includedRaderRef.current = extracted.rader ?? null
      kategoriConfirmedRef.current = false
      deltagareSkippedRef.current = false

      animateScanFields(scanId, extracted, runStepEngine)
    },
    [addMessage, animateScanFields, runStepEngine]
  )

  // --- File input ---

  const acceptFile = useCallback(
    (file: File) => {
      if (!isSupportedReceiptFile(file)) {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body: UNSUPPORTED_FILE_BODY,
        })
        return
      }
      setAttachedFile(file)
      setAttachedPreviewUrl(isImageFile(file) ? URL.createObjectURL(file) : null)
    },
    [addMessage]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      acceptFile(file)
    },
    [acceptFile]
  )

  // --- Drag and drop ---

  const [isDragging, setIsDragging] = useState(false)
  const dragDepthRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)
      if (isProcessing) return
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      acceptFile(file)
    },
    [acceptFile, isProcessing]
  )

  // --- Paste ---

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isProcessing) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind !== "file") continue
        const file = item.getAsFile()
        if (!file) continue
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") continue
        e.preventDefault()
        acceptFile(file)
        return
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [acceptFile, isProcessing])

  // --- Free-text chat ---

  const streamFreeTextReply = useCallback(
    async (userPrompt: string) => {
      const replyId = uid()
      addMessage({ id: replyId, role: "assistant", type: "text", body: "" })

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userPrompt }),
        })
        if (!res.ok || !res.body) throw new Error(`status ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          updateTextMessage(replyId, acc)
        }
        acc += decoder.decode()
        if (acc) updateTextMessage(replyId, acc)
      } catch (err) {
        console.error("chat stream error", err)
        updateTextMessage(replyId, "Något gick fel hos assistenten. Försök igen.")
      }
    },
    [addMessage, updateTextMessage]
  )

  // --- Free-text intent (Gemini parses what the user wants) ---

  type EditableField = "leverantor" | "datum" | "belopp" | "kategori" | "deltagare"

  type IntentAction =
    | { action: "set_field"; field: EditableField; value: string }
    | { action: "ask_field"; field: EditableField }
    | { action: "generate_pdf" }
    | { action: "add_receipt" }
    | { action: "cancel" }
    | { action: "off_topic" }

  const cancelCurrentFlow = useCallback(
    (note = "Avbrutet. Du kan ladda upp ett nytt kvitto.") => {
      extractedRef.current = {}
      expectedFieldRef.current = null
      includedRaderRef.current = null
      pendingReceiptImageRef.current = null
      kategoriConfirmedRef.current = false
      deltagareSkippedRef.current = false
      setDeltagareOptional(false)
      clearSuggestions()
      clearAttachment()
      setIsProcessing(false)
      addMessage({ id: uid(), role: "assistant", type: "text", body: note })
    },
    [addMessage, clearSuggestions, clearAttachment]
  )

  const handleGeneratePdf = useCallback(() => {
    const receipts = collectedReceiptsRef.current
    if (receipts.length === 0) return

    const gid = uid()
    const initialSteps = GENERATION_STEPS.map((s) => ({ ...s }))
    setGeneratingSteps(initialSteps)

    setTimeout(() => {
      addMessage({ id: gid, role: "assistant", type: "generating", steps: initialSteps })
    }, 100)

    initialSteps.forEach((_, i) => {
      setTimeout(() => {
        setGeneratingSteps((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s))
        )
      }, 800 + i * 900)
    })

    const totalDelay = 800 + initialSteps.length * 900 + 400
    setTimeout(async () => {
      try {
        const formData = new FormData()
        formData.append("receipts", JSON.stringify(receipts))
        for (const img of receiptImagesRef.current) {
          formData.append("images", img)
        }

        const res = await fetch("/api/receipt/pdf", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          throw new Error(`PDF generation failed (${res.status})`)
        }

        const blob = await res.blob()
        const count = receipts.length
        const filename = count === 1 ? "verifikation.pdf" : `verifikation-${count}-kvitton.pdf`

        addMessage({
          id: uid(),
          role: "assistant",
          type: "download",
          filename,
          blobUrl: URL.createObjectURL(blob),
        })
      } catch (err) {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body: `Kunde inte generera PDF: ${err instanceof Error ? err.message : "Okänt fel"}`,
        })
      }

      collectedReceiptsRef.current = []
      setCollectedReceipts([])
      receiptImagesRef.current = []
      pendingReceiptImageRef.current = null
    }, totalDelay)
  }, [addMessage])

  const handleIntent = useCallback(
    async (message: string, opts?: { expectingField?: keyof ExtractedReceipt }) => {
      addMessage({ id: uid(), role: "user", type: "text", body: message })

      let actions: IntentAction[] = [{ action: "off_topic" }]
      try {
        const res = await fetch("/api/edit-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extracted: extractedRef.current,
            savedCount: collectedReceiptsRef.current.length,
            expectingField: opts?.expectingField ?? null,
            message,
          }),
        })
        if (res.ok) {
          const json = (await res.json()) as { actions?: IntentAction[] }
          if (Array.isArray(json.actions) && json.actions.length > 0) {
            actions = json.actions
          }
        }
      } catch (err) {
        console.error("intent error", err)
      }

      // Cancel always wins.
      if (actions.some((a) => a.action === "cancel")) {
        cancelCurrentFlow()
        return
      }

      // Apply every set_field (multi-field edits in one message).
      const setFields = actions.filter(
        (a): a is Extract<IntentAction, { action: "set_field" }> =>
          a.action === "set_field"
      )
      if (setFields.length > 0) {
        const updates: Partial<ExtractedReceipt> = {}
        for (const a of setFields) {
          updates[a.field] = a.value
          if (a.field === "kategori") kategoriConfirmedRef.current = true
        }
        extractedRef.current = { ...extractedRef.current, ...updates }
        setMessages((prev) => prev.filter((m) => m.type !== "summary"))
        pushProgressCard()
        setTimeout(runStepEngine, 300)
        return
      }

      // Single-action fallbacks below.
      const askField = actions.find(
        (a): a is Extract<IntentAction, { action: "ask_field" }> =>
          a.action === "ask_field"
      )
      if (askField) {
        extractedRef.current = {
          ...extractedRef.current,
          [askField.field]: undefined,
        }
        setMessages((prev) => prev.filter((m) => m.type !== "summary"))
        setTimeout(runStepEngine, 100)
        return
      }

      if (actions.some((a) => a.action === "generate_pdf")) {
        handleGeneratePdf()
        return
      }

      if (actions.some((a) => a.action === "add_receipt")) {
        fileInputRef.current?.click()
        return
      }

      // off_topic → fall back to the general chat assistant
      await streamFreeTextReply(message)
    },
    [
      addMessage,
      pushProgressCard,
      runStepEngine,
      streamFreeTextReply,
      cancelCurrentFlow,
      handleGeneratePdf,
    ]
  )

  // --- Send ---

  const addChip = useCallback((name: string) => {
    setSelectedChips((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setPrompt("")
  }, [])

  const removeChip = useCallback((name: string) => {
    setSelectedChips((prev) => prev.filter((c) => c !== name))
  }, [])

  const filteredSuggestions = useMemo(() => {
    const q = prompt.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q))
  }, [suggestions, prompt])

  const selectableIndices = useMemo(
    () =>
      chipMode
        ? filteredSuggestions
            .map((s, i) => (selectedChips.includes(s) ? -1 : i))
            .filter((i) => i !== -1)
        : filteredSuggestions.map((_, i) => i),
    [chipMode, filteredSuggestions, selectedChips]
  )

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value)
    setActiveChipIndex(value.trim().length > 0 ? 0 : -1)
  }, [])

  const safeActiveChipIndex =
    activeChipIndex < 0 || selectableIndices.length === 0
      ? -1
      : selectableIndices.includes(activeChipIndex)
        ? activeChipIndex
        : selectableIndices.find((i) => i > activeChipIndex) ??
          selectableIndices[selectableIndices.length - 1]

  const activeChipSuggestion =
    chipMode && safeActiveChipIndex >= 0
      ? filteredSuggestions[safeActiveChipIndex]
      : null

  const handleChipKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!chipMode || selectableIndices.length === 0) return
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault()
        setActiveChipIndex((curr) => {
          const pos = selectableIndices.indexOf(curr)
          if (pos === -1) return selectableIndices[0]
          return selectableIndices[(pos + 1) % selectableIndices.length]
        })
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault()
        setActiveChipIndex((curr) => {
          const pos = selectableIndices.indexOf(curr)
          if (pos === -1) return selectableIndices[selectableIndices.length - 1]
          return selectableIndices[
            (pos - 1 + selectableIndices.length) % selectableIndices.length
          ]
        })
      }
    },
    [chipMode, selectableIndices]
  )

  const handlePromptSubmit = useCallback(() => {
    const value = prompt.trim()

    if (chipMode) {
      const userIntent = value.length > 0 || safeActiveChipIndex >= 0
      if (userIntent && activeChipSuggestion) {
        addChip(activeChipSuggestion)
        const remaining = selectableIndices.filter(
          (i) => i !== safeActiveChipIndex
        )
        const next =
          remaining.find((i) => i > safeActiveChipIndex) ??
          remaining[0] ??
          -1
        setActiveChipIndex(next)
        return
      }
      if (selectedChips.length === 0) return
      const joined = selectedChips.join(", ")
      pendingAction?.(joined)
      return
    }

    if (pendingAction && value) {
      // Escape hatch: cancel the in-flight prompt even though pendingAction
      // would otherwise swallow the input.
      if (/^(avbryt|ångra|fel kvitto|glöm det|börja om)\.?$/i.test(value)) {
        setPrompt("")
        addMessage({ id: uid(), role: "user", type: "text", body: value })
        cancelCurrentFlow()
        return
      }
      // If the message looks like a command (or fails the field's format
      // check), route it through the intent handler instead of letting
      // pendingAction blindly accept it as the field value.
      const expected = expectedFieldRef.current
      if (expected && shouldRouteToIntent(value, expected)) {
        setPrompt("")
        void handleIntent(value, { expectingField: expected })
        return
      }
      pendingAction(value)
      setPrompt("")
      return
    }

    if (attachedFile) {
      const file = attachedFile
      pendingReceiptImageRef.current = new File([file], file.name, {
        type: file.type,
      })
      setPrompt("")
      clearAttachment()
      void startScanFlow(file)
      return
    }

    if (value) {
      setPrompt("")
      const hasReceiptInProgress =
        Object.values(extractedRef.current).some((v) => v != null)
      const hasSavedReceipts = collectedReceiptsRef.current.length > 0
      if (hasReceiptInProgress || hasSavedReceipts) {
        void handleIntent(value)
        return
      }
      addMessage({ id: uid(), role: "user", type: "text", body: value })
      void streamFreeTextReply(value)
    }
  }, [
    prompt,
    chipMode,
    selectedChips,
    pendingAction,
    attachedFile,
    startScanFlow,
    clearAttachment,
    addMessage,
    streamFreeTextReply,
    handleIntent,
    cancelCurrentFlow,
    activeChipSuggestion,
    addChip,
    safeActiveChipIndex,
    selectableIndices,
  ])

  // --- Edit / Submit ---

  const handleEditField = useCallback(
    (label: string) => {
      setMessages((prev) => prev.filter((m) => m.type !== "summary"))
      const keyByLabel = SCAN_FIELD_KEYS.find((e) => e.label === label)?.key
      if (keyByLabel) {
        extractedRef.current = { ...extractedRef.current, [keyByLabel]: undefined }
        if (keyByLabel === "kategori") {
          kategoriConfirmedRef.current = false
        }
        if (keyByLabel === "deltagare") {
          deltagareSkippedRef.current = false
        }
      }
      setTimeout(runStepEngine, 100)
    },
    [runStepEngine]
  )

  const handleLineItemsChange = useCallback((included: LineItem[]) => {
    includedRaderRef.current = included
  }, [])

  const handleDeleteReceipt = useCallback((id: string) => {
    const idx = collectedReceiptsRef.current.findIndex((r) => r.id === id)
    if (idx < 0) return
    collectedReceiptsRef.current = collectedReceiptsRef.current.filter(
      (_, i) => i !== idx
    )
    receiptImagesRef.current = receiptImagesRef.current.filter(
      (_, i) => i !== idx
    )
    setCollectedReceipts(collectedReceiptsRef.current)
  }, [])

  const handleSkipDeltagare = useCallback(() => {
    deltagareSkippedRef.current = true
    expectedFieldRef.current = null
    addMessage({ id: uid(), role: "user", type: "text", body: "Inga deltagare" })
    clearSuggestions()
    pushProgressCard()
    setTimeout(runStepEngine, 300)
  }, [addMessage, clearSuggestions, pushProgressCard, runStepEngine])

  const handleSubmit = useCallback(
    (summaryFields: { label: string; value: string }[]) => {
      setIsProcessing(false)
      setMessages((prev) => prev.filter((m) => m.type !== "summary"))

      // Append included rader to the collected fields
      const finalFields = [...summaryFields]
      if (includedRaderRef.current && includedRaderRef.current.length > 0) {
        const raderText = includedRaderRef.current
          .map((r) => `${r.beskrivning}: ${r.belopp}`)
          .join("\n")
        finalFields.push({ label: "Inkluderade rader", value: raderText })
      }

      const newReceipt: CollectedReceipt = { id: uid(), fields: finalFields }
      const updated = [...collectedReceiptsRef.current, newReceipt]
      collectedReceiptsRef.current = updated
      setCollectedReceipts(updated)

      // Commit the pending receipt image alongside the accepted receipt so
      // both arrays stay in lockstep for PDF generation.
      if (pendingReceiptImageRef.current) {
        receiptImagesRef.current = [
          ...receiptImagesRef.current,
          pendingReceiptImageRef.current,
        ]
        pendingReceiptImageRef.current = null
      }

      extractedRef.current = {}
      includedRaderRef.current = null
      kategoriConfirmedRef.current = false
      deltagareSkippedRef.current = false
      setDeltagareOptional(false)

      setTimeout(() => {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body:
            updated.length === 1
              ? "Kvittot är sparat. Vill du lägga till fler kvitton?"
              : `${updated.length} kvitton är sparade. Vill du lägga till fler?`,
        })
        showSuggestions(["Lägg till kvitto", "Generera PDF"], (value) => {
          clearSuggestions()
          if (value === "Generera PDF") {
            handleGeneratePdf()
          } else {
            fileInputRef.current?.click()
          }
        })
      }, 100)
    },
    [addMessage, showSuggestions, clearSuggestions, handleGeneratePdf]
  )

  // --- Render ---

  const canSend = !!attachedFile || !!prompt.trim()

  return (
    <main
      className="grain min-h-dvh overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <FloatingNav
        onNewChat={handleNewChat}
        receipts={collectedReceipts}
        onGeneratePdf={handleGeneratePdf}
        onDeleteReceipt={handleDeleteReceipt}
      />
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-card/90 px-8 py-6 text-center shadow-lg">
            <Paperclip className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-base font-medium text-foreground">Släpp filen för att ladda upp</p>
            <p className="mt-1 text-sm text-muted-foreground">Vi tar emot bilder och PDF-kvitton</p>
          </div>
        </div>
      )}
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/12 to-transparent" />

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <ChatContainerRoot className="h-full w-full">
              <ChatContainerContent className="mx-auto w-full max-w-[800px] space-y-between-cards px-screen-edge pt-10 pb-44 lg:px-8 lg:pb-32">
                  {messages.map((message) => {
                    if (message.type === "text") {
                      return (
                        <Message
                          key={message.id}
                          className={message.role === "user" ? "justify-end" : ""}
                        >
                          {message.role === "assistant" && (
                            <MessageAvatar
                              src="/WesterAI.png"
                              alt="AI"
                              fallback="AI"
                              className="mt-1 h-8 w-8 border border-border/70 bg-secondary text-secondary-foreground"
                            />
                          )}
                          <div className={message.role === "user" ? "items-end text-right" : ""}>
                            <MessageContent
                              markdown
                              className={
                                message.role === "assistant"
                                  ? "border border-border/80 bg-card/92 p-2 text-sm leading-7 backdrop-blur-sm"
                                  : "border border-primary/40 bg-primary p-2 text-sm leading-7 text-primary-foreground"
                              }
                            >
                              {message.body}
                            </MessageContent>
                          </div>
                        </Message>
                      )
                    }

                    if (message.type === "scanning") {
                      return (
                        <Message key={message.id}>
                          <MessageAvatar
                            src="/WesterAI.png"
                            alt="AI"
                            fallback="AI"
                            className="mt-1 h-8 w-8 border border-border/70 bg-secondary text-secondary-foreground"
                          />
                          <div className="flex-1 py-1">
                            <ScanningCard fields={message.fields} />
                          </div>
                        </Message>
                      )
                    }

                    if (message.type === "summary") {
                      return (
                        <Message key={message.id}>
                          <MessageAvatar
                            src="/WesterAI.png"
                            alt="AI"
                            fallback="AI"
                            className="mt-1 h-8 w-8 border border-border/70 bg-secondary text-secondary-foreground"
                          />
                          <div className="flex-1">
                            <p className="mb-3 text-sm text-muted-foreground">
                              Här är en sammanfattning av utlägget. Stämmer allt?
                            </p>
                            <SummaryCard
                              fields={message.fields}
                              flowFields={["Kategori", "Deltagare"]}
                              lineItems={message.lineItems}
                              currency={message.currency ?? "SEK"}
                              exchangeRate={message.exchangeRate}
                              onSubmit={handleSubmit}
                              onEditField={handleEditField}
                              onLineItemsChange={handleLineItemsChange}
                            />
                          </div>
                        </Message>
                      )
                    }

                    if (message.type === "generating") {
                      return (
                        <Message key={message.id}>
                          <MessageAvatar
                            src="/WesterAI.png"
                            alt="AI"
                            fallback="AI"
                            className="mt-1 h-8 w-8 border border-border/70 bg-secondary text-secondary-foreground"
                          />
                          <div className="flex-1 py-1">
                            <ChainOfThought>
                              {generatingSteps.map((step) => (
                                <ChainOfThoughtStep key={step.label}>
                                  <ChainOfThoughtTrigger
                                    leftIcon={
                                      step.status === "done" ? (
                                        <span className="text-primary">✓</span>
                                      ) : (
                                        <span className="inline-block size-2 animate-pulse rounded-full bg-muted-foreground" />
                                      )
                                    }
                                    swapIconOnHover={false}
                                  >
                                    {step.label}
                                  </ChainOfThoughtTrigger>
                                </ChainOfThoughtStep>
                              ))}
                            </ChainOfThought>
                          </div>
                        </Message>
                      )
                    }

                    if (message.type === "download") {
                      return (
                        <Message key={message.id}>
                          <MessageAvatar
                            src="/WesterAI.png"
                            alt="AI"
                            fallback="AI"
                            className="mt-1 h-8 w-8 border border-border/70 bg-secondary text-secondary-foreground"
                          />
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">PDF:en är klar.</p>
                            <DownloadCard filename={message.filename} blobUrl={message.blobUrl} />
                          </div>
                        </Message>
                      )
                    }

                    return null
                  })}

                  {suggestions.length > 0 && <div aria-hidden className="h-[65vh]" />}
                  <ChatContainerScrollAnchor />
                </ChatContainerContent>
                <div className="pointer-events-none fixed inset-x-0 bottom-44 z-10 flex justify-end px-screen-edge lg:px-8">
                  <ScrollButton className="pointer-events-auto" />
                </div>
            </ChatContainerRoot>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/92 to-transparent" />

          <footer className="fixed inset-x-0 bottom-0 px-screen-edge pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8">
            <div className="mx-auto max-w-[800px]">
              {suggestions.length > 0 && (
                <div className="relative mb-2">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -left-[100vw] -right-[100vw] -top-24 -bottom-2 bg-gradient-to-t from-background via-background/90 to-transparent"
                  />
                  <div className="relative flex flex-wrap gap-2 px-1 py-1">
                    {filteredSuggestions.map((s, idx) => {
                      const isSelected = chipMode && selectedChips.includes(s)
                      const isActive =
                        chipMode && !isSelected && idx === safeActiveChipIndex
                      return (
                        <PromptSuggestion
                          key={s}
                          size="sm"
                          highlight={chipMode ? undefined : prompt}
                          disabled={isSelected}
                          className={
                            isSelected
                              ? "border-dashed text-muted-foreground opacity-50"
                              : isActive
                                ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/40"
                                : undefined
                          }
                          onClick={() => {
                            if (chipMode) {
                              addChip(s)
                            } else {
                              pendingAction?.(s)
                              setPrompt("")
                              clearSuggestions()
                            }
                          }}
                        >
                          {s}
                        </PromptSuggestion>
                      )
                    })}
                  </div>
                </div>
              )}

              <PromptInput
                value={prompt}
                onValueChange={handlePromptChange}
                onSubmit={handlePromptSubmit}
                className="rounded-md border-border/80 bg-background/70 px-4 py-3 shadow-none backdrop-blur-xl"
              >
                {chipMode && deltagareOptional && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={handleSkipDeltagare}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      Hoppa över deltagare
                    </button>
                  </div>
                )}

                {chipMode && selectedChips.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selectedChips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                      >
                        {chip}
                        <button
                          onClick={() => removeChip(chip)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Ta bort ${chip}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    {selectedChips.length >= 5 && (
                      <button
                        type="button"
                        onClick={() => setSelectedChips([])}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <X className="size-3" />
                        Rensa deltagare
                      </button>
                    )}
                  </div>
                )}

                {attachedFile && (
                  <div className="mb-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 pr-2">
                      {attachedPreviewUrl ? (
                        <img
                          src={attachedPreviewUrl}
                          alt={attachedFile.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="max-w-[180px] truncate text-sm text-foreground">
                        {attachedFile.name}
                      </span>
                      <button
                        onClick={clearAttachment}
                        className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Ta bort fil"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <PromptInputTextarea
                  onKeyDown={handleChipKeyDown}
                  placeholder={
                    chipMode
                      ? "Filtrera anställda…"
                      : pendingAction
                      ? "Välj ett alternativ ovan eller skriv ett eget svar…"
                      : "Beskriv vad som ska granskas eller ladda upp ett underlag…"
                  }
                  className="max-w-3xl flex-1 text-base leading-7 text-foreground placeholder:text-muted-foreground"
                />

                <div className="mt-2 flex flex-row items-center justify-between gap-4">
                  <PromptInputActions>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="rounded-full"
                      aria-label="Ladda upp fil"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="rounded-full"
                      aria-label="Ta bild"
                      disabled={!hasCamera || isProcessing}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="size-4" />
                    </Button>
                  </PromptInputActions>
                  <Button
                    className="size-10 rounded-full p-0"
                    aria-label="Skicka"
                    disabled={chipMode ? selectedChips.length === 0 : (!canSend && !pendingAction)}
                    onClick={handlePromptSubmit}
                  >
                    <ArrowUp className="size-5" />
                  </Button>
                </div>
              </PromptInput>
            </div>
          </footer>
        </section>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </main>
  )
}
