"use client"

import * as React from "react"
import { ArrowUp, SquarePen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "../ui/textarea"
import { cn } from "@/lib/utils"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function ChatPanel({ className }: { className?: string }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [draft, setDraft] = React.useState("")
  const [isComposing, setIsComposing] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const starterPrompts = React.useMemo(
    () => [
      "Sammanfatta dagens kvitton",
      "Vilka kostnader sticker ut?",
      "Skriv ett utkast till uppföljning",
    ],
    []
  )

  const lastMessageContent = messages.at(-1)?.content ?? ""
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, lastMessageContent])

  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function resetChat() {
    abortRef.current?.abort()
    setMessages([])
    setDraft("")
    setIsLoading(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function submit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (isLoading) return

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: new Date(),
    }
    const assistantId = createId()
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setDraft("")
    requestAnimationFrame(() => textareaRef.current?.focus())

    const abort = new AbortController()
    abortRef.current?.abort()
    abortRef.current = abort

    setIsLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || `Request failed (${res.status}).`)
      }

      if (!res.body) throw new Error("No response body.")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while contacting Gemini."

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Error: ${message}` } : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={cn("grain min-h-screen overflow-hidden bg-background", className)}>
      <div className="fixed left-4 top-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Ny chatt"
          className="rounded-full border-border/80 bg-background/75 backdrop-blur-xl"
          onClick={resetChat}
        >
          <SquarePen className="size-4" />
        </Button>
        <div className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
          Expense Chat
        </div>
      </div>

      <div className="relative flex h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/12 to-transparent" />

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            className="mx-auto flex min-h-0 w-full max-w-[800px] flex-1 flex-col overflow-y-auto px-6 pt-24 pb-40 [scrollbar-gutter:stable] lg:px-8"
          >
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col justify-center gap-8 pb-24">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Expense AI Interface
                  </p>
                  <h1 className="max-w-2xl text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.92] tracking-[-0.06em] text-foreground">
                    Din chatvy, nu i den här appen.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-muted-foreground">
                    Jag har behållit den befintliga streamade chatlogiken men flyttat över
                    uttrycket, rytmen och ytan från ditt `expense-chat-ui`.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-full border border-border/80 bg-card/80 px-4 py-2 text-sm text-foreground transition hover:border-primary/40 hover:bg-accent"
                      onClick={() => {
                        setDraft(prompt)
                        requestAnimationFrame(() => textareaRef.current?.focus())
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" ? (
                      <img
                        src="/assistant-avatar.svg"
                        alt="AI"
                        className="mt-1 h-8 w-8 shrink-0 rounded-full border border-border/70 bg-secondary"
                      />
                    ) : null}

                    <div className={cn("flex max-w-[85%] flex-col", m.role === "user" ? "items-end" : "")}>
                      <div
                        className={cn(
                          "rounded-[1.4rem] border px-4 py-3 text-sm leading-7 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-sm",
                          m.role === "user"
                            ? "border-primary/30 bg-primary text-primary-foreground"
                            : "border-border/80 bg-card text-card-foreground"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.content || (isLoading ? "…" : "")}</div>
                      </div>
                      <div className="px-1 pt-1 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/92 to-transparent" />

          <footer className="fixed inset-x-0 bottom-0 px-6 pb-6 lg:px-8">
            <div className="mx-auto max-w-[800px]">
              {messages.length === 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={`footer-${prompt}`}
                      type="button"
                      className="rounded-full border border-border/80 bg-background/65 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-xl transition hover:text-foreground"
                      onClick={() => {
                        setDraft(prompt)
                        requestAnimationFrame(() => textareaRef.current?.focus())
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                className="rounded-[1.7rem] border border-border/80 bg-background/72 p-4 shadow-none backdrop-blur-xl"
                onSubmit={(e) => {
                  e.preventDefault()
                  submit()
                }}
              >
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  rows={2}
                  placeholder="Beskriv vad som ska granskas eller skriv ditt nästa meddelande..."
                  className="min-h-[96px] resize-none border-0 bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
                  onChange={(e) => setDraft(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    if (e.shiftKey) return
                    if (isComposing) return
                    if (isLoading) return
                    e.preventDefault()
                    submit()
                  }}
                />

                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    {isLoading ? "Svar streamas..." : "Enter skickar, Shift+Enter ny rad"}
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-border/80 bg-background/80"
                        onClick={() => abortRef.current?.abort()}
                      >
                        Stoppa
                      </Button>
                    ) : null}
                    <Button
                      type="submit"
                      className="size-10 rounded-full p-0"
                      aria-label="Skicka"
                      disabled={!draft.trim() || isLoading}
                    >
                      <ArrowUp className="size-5" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </footer>
        </section>
      </div>
    </main>
  )
}
