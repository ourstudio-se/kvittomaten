"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  SCANNED_FIELDS,
  type CollectedReceipt,
  type ExpenseMessage,
  type GeneratingStep,
  type ScanField,
} from "@/lib/mock-expense-chat"

const MODO_FACTS = [
  "MODO Hockey grundades 1921 och är en av Sveriges äldsta hockeyklubbar.",
  "Örnsköldsvik har producerat fler NHL-spelare per capita än nästan någon annan stad i världen.",
  "Peter Forsberg, en av NHL:s genom tiderna bästa spelare, är uppvuxen i Örnsköldsvik och spelade för MODO.",
  "Henrik och Daniel Sedin, tvillinglegenderna från Vancouver Canucks, kommer från Örnsköldsvik och fostrades i MODO.",
  "MODO har vunnit SM-guld tre gånger: 1979, 1995 och 2007.",
  "Klubbens smeknamn är 'Laget från norr' och hemmaarena heter Fjällräven Center.",
  "Victor Hedman, backen i Tampa Bay Lightning, är en annan Örnsköldsvikare som gått MODO-skolan.",
  "Eric Lindros, en av 90-talets mest dominanta spelare, spelade en säsong för MODO 2000–01.",
  "Markus Naslund, som var captain i Vancouver Canucks i sju säsonger, kom också från MODO.",
  "Örnsköldsvik kallas ibland 'Hockeybyn' på grund av alla världsstjärnor staden producerat.",
]

function uid() {
  return Math.random().toString(36).slice(2)
}

function isImageFile(file: File) {
  return file.type.startsWith("image/")
}

const GENERATION_STEPS: GeneratingStep[] = [
  { label: "Sammanställer uppgifter", status: "pending" },
  { label: "Formaterar kvittodokument", status: "pending" },
  { label: "Genererar PDF", status: "pending" },
]

export function ExpenseChatShell() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ExpenseMessage[]>([])
  const [scanFields, setScanFields] = useState<ScanField[]>([])
  const [participants, setParticipants] = useState("")
  const [participantMessageId, setParticipantMessageId] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<((value: string) => void) | null>(null)
  const [chipMode, setChipMode] = useState(false)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [generatingSteps, setGeneratingSteps] = useState<GeneratingStep[]>([])

  const [collectedReceipts, setCollectedReceipts] = useState<CollectedReceipt[]>([])
  const collectedReceiptsRef = useRef<CollectedReceipt[]>([])

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

  const clearAttachment = useCallback(() => {
    setAttachedFile(null)
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }, [attachedPreviewUrl])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setScanFields([])
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
  }, [clearAttachment])

  const showSuggestions = useCallback((opts: string[], action: (value: string) => void) => {
    setSuggestions(opts)
    setPendingAction(() => action)
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setPendingAction(null)
    setChipMode(false)
    setSelectedChips([])
  }, [])

  // --- Category handling ---

  const showSummary = useCallback(
    (category: string, participantValue: string) => {
      addMessage({
        id: uid(),
        role: "assistant",
        type: "summary",
        fields: [
          { label: "Leverantör", value: "Restaurant Kronborg" },
          { label: "Datum", value: "2026-05-03" },
          { label: "Belopp", value: "1 240 SEK" },
          { label: "Kategori", value: category },
          ...(participantValue !== "–" ? [{ label: "Deltagare", value: participantValue }] : []),
        ],
      })
    },
    [addMessage]
  )

  const handleParticipantInput = useCallback(
    (participantValue: string, category: string) => {
      addMessage({ id: uid(), role: "user", type: "text", body: participantValue })
      clearSuggestions()
      setTimeout(() => showSummary(category, participantValue), 400)
    },
    [addMessage, clearSuggestions, showSummary]
  )

  const handleCategoryInput = useCallback(
    (rawInput: string) => {
      const isKnown = CATEGORIES.includes(rawInput)
      const category = isKnown ? rawInput : "Övrigt"
      const label = isKnown ? rawInput : `Övrigt – ${rawInput}`

      addMessage({ id: uid(), role: "user", type: "text", body: label })
      clearSuggestions()

      const isIntern = category === "Representation, intern"
      const isExtern = category === "Representation, extern"

      setTimeout(() => {
        if (isIntern) {
          addMessage({
            id: uid(),
            role: "assistant",
            type: "text",
            body: "Vilka interna deltagare var med? Välj ur listan.",
          })
          setChipMode(true)
          setSelectedChips([])
          showSuggestions(EMPLOYEES, () => {})
          setPendingAction(() => (value: string) => handleParticipantInput(value, label))
        } else if (isExtern) {
          addMessage({
            id: uid(),
            role: "assistant",
            type: "text",
            body: "Ange externa deltagare (namn och företag):",
          })
          showSuggestions([], (value) => handleParticipantInput(value, label))
        } else if (category === "Övrigt") {
          addMessage({
            id: uid(),
            role: "assistant",
            type: "text",
            body: "Beskriv kort vad utlägget avser:",
          })
          showSuggestions([], (value) => {
            addMessage({ id: uid(), role: "user", type: "text", body: value })
            clearSuggestions()
            setTimeout(() => showSummary(`Övrigt – ${value}`, "–"), 400)
          })
        } else {
          showSummary(label, "–")
        }
      }, 400)
    },
    [addMessage, clearSuggestions, showSummary, showSuggestions, handleParticipantInput]
  )

  // --- Scan flow ---

  const startScanFlow = useCallback(
    (file: File) => {
      const scanId = uid()
      const initialFields = INITIAL_SCAN_FIELDS.map((f) => ({ ...f }))
      setScanFields(initialFields)

      addMessage({ id: uid(), role: "user", type: "text", body: `Laddar upp: ${file.name}` })
      addMessage({ id: scanId, role: "assistant", type: "scanning", fields: initialFields })

      SCANNED_FIELDS.forEach((field, i) => {
        setTimeout(() => {
          setScanFields((prev) =>
            prev.map((f) => (f.label === field.label ? { ...field } : f))
          )
        }, 600 + i * 500)
      })

      const totalDelay = 600 + SCANNED_FIELDS.length * 500 + 600
      setTimeout(() => {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body: "Jag kunde inte identifiera kategori. Välj den som stämmer bäst:",
        })
        showSuggestions(CATEGORIES, handleCategoryInput)
      }, totalDelay)
    },
    [addMessage, showSuggestions, handleCategoryInput]
  )

  // --- File input ---

  const acceptFile = useCallback((file: File) => {
    setAttachedFile(file)
    setAttachedPreviewUrl(isImageFile(file) ? URL.createObjectURL(file) : null)
  }, [])

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
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      acceptFile(file)
    },
    [acceptFile]
  )

  // --- Paste ---

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
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
  }, [acceptFile])

  // --- Send ---

  const addChip = useCallback((name: string) => {
    setSelectedChips((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setPrompt("")
  }, [])

  const removeChip = useCallback((name: string) => {
    setSelectedChips((prev) => prev.filter((c) => c !== name))
  }, [])

  const handlePromptSubmit = useCallback(() => {
    const value = prompt.trim()

    if (chipMode) {
      if (selectedChips.length === 0) return
      const joined = selectedChips.join(", ")
      pendingAction?.(joined)
      return
    }

    if (pendingAction && value) {
      pendingAction(value)
      setPrompt("")
      return
    }

    if (attachedFile) {
      startScanFlow(attachedFile)
      clearAttachment()
      setPrompt("")
      return
    }

    if (value) {
      addMessage({ id: uid(), role: "user", type: "text", body: value })
      setPrompt("")
      const fact = MODO_FACTS[Math.floor(Math.random() * MODO_FACTS.length)]
      setTimeout(() => {
        addMessage({
          id: uid(),
          role: "assistant",
          type: "text",
          body: `Det där kan jag tyvärr inte hjälpa med. Men visste du att: _${fact}_`,
        })
      }, 600)
    }
  }, [prompt, chipMode, selectedChips, pendingAction, attachedFile, startScanFlow, clearAttachment, addMessage])

  // --- PDF generation ---

  const handleEditField = useCallback(
    (label: string) => {
      setMessages((prev) => prev.filter((m) => m.type !== "summary"))
      if (label === "Kategori") {
        setTimeout(() => {
          addMessage({ id: uid(), role: "assistant", type: "text", body: "Vilken kategori ska utlägget ha?" })
          showSuggestions(CATEGORIES, handleCategoryInput)
        }, 100)
      } else if (label === "Deltagare") {
        setTimeout(() => {
          addMessage({ id: uid(), role: "assistant", type: "text", body: "Vilka interna deltagare var med? Välj ur listan." })
          setChipMode(true)
          setSelectedChips([])
          showSuggestions(EMPLOYEES, () => {})
          setPendingAction(() => (value: string) => handleParticipantInput(value, "Representation, intern"))
        }, 100)
      }
    },
    [addMessage, showSuggestions, handleCategoryInput, handleParticipantInput]
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
    setTimeout(() => {
      const count = receipts.length
      const lines = receipts
        .map((r, i) => {
          const header = r.fields.find((f) => f.label === "Leverantör")?.value ?? `Kvitto ${i + 1}`
          return `${i + 1}. ${header}\n${r.fields.map((f) => `   ${f.label}: ${f.value}`).join("\n")}`
        })
        .join("\n\n")
      const blob = new Blob([`Sammanställd utläggsrapport (${count} kvitton)\n\n${lines}\n`], {
        type: "application/pdf",
      })
      const filename = count === 1 ? "utlagg.pdf" : `utlagg-sammanstallning-${count}-kvitton.pdf`
      addMessage({
        id: uid(),
        role: "assistant",
        type: "download",
        filename,
        blobUrl: URL.createObjectURL(blob),
      })
      collectedReceiptsRef.current = []
      setCollectedReceipts([])
    }, totalDelay)
  }, [addMessage])

  const handleSubmit = useCallback(
    (summaryFields: { label: string; value: string }[]) => {
      setMessages((prev) => prev.filter((m) => m.type !== "summary"))

      const newReceipt: CollectedReceipt = { id: uid(), fields: summaryFields }
      const updated = [...collectedReceiptsRef.current, newReceipt]
      collectedReceiptsRef.current = updated
      setCollectedReceipts(updated)

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
      className="grain min-h-screen overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <FloatingNav onNewChat={handleNewChat} receipts={collectedReceipts} onGeneratePdf={handleGeneratePdf} />
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-card/90 px-8 py-6 text-center shadow-lg">
            <Paperclip className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-base font-medium text-foreground">Släpp filen för att ladda upp</p>
            <p className="mt-1 text-sm text-muted-foreground">Vi tar emot bilder och PDF-kvitton</p>
          </div>
        </div>
      )}
      <div className="relative flex h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/12 to-transparent" />

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <ChatContainerRoot className="h-full w-full">
              <ChatContainerContent className="mx-auto w-full max-w-[800px] space-y-between-cards px-screen-edge pt-10 pb-32 lg:px-8">
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
                            <ScanningCard fields={scanFields} />
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
                              onSubmit={handleSubmit}
                              onEditField={handleEditField}
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

                  <ChatContainerScrollAnchor />
                </ChatContainerContent>
                <div className="pointer-events-none fixed inset-x-0 bottom-44 z-10 flex justify-end px-screen-edge lg:px-8">
                  <ScrollButton className="pointer-events-auto" />
                </div>
            </ChatContainerRoot>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/92 to-transparent" />

          <footer className="fixed inset-x-0 bottom-0 px-screen-edge pb-6 lg:px-8">
            <div className="mx-auto max-w-[800px]">
              {suggestions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {suggestions
                    .filter(
                      (s) =>
                        !selectedChips.includes(s) &&
                        s.toLowerCase().includes(prompt.toLowerCase())
                    )
                    .map((s) => (
                      <PromptSuggestion
                        key={s}
                        size="sm"
                        highlight={chipMode ? undefined : prompt}
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
                    ))}
                </div>
              )}

              <PromptInput
                value={prompt}
                onValueChange={setPrompt}
                onSubmit={handlePromptSubmit}
                className="rounded-md border-border/80 bg-background/70 px-4 py-3 shadow-none backdrop-blur-xl"
              >
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
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="rounded-full"
                      aria-label="Ta bild"
                      disabled={!hasCamera}
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
