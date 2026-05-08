"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

  const lastMessageContent = messages.at(-1)?.content ?? ""
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, lastMessageContent])

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
    <Card className={cn("flex h-[min(75svh,720px)] flex-col", className)}>
      <CardHeader className="border-b">
        <CardTitle>Chat</CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 pt-0">
        <div
          ref={viewportRef}
          className="h-full overflow-y-auto px-4 pb-4 pt-4 [scrollbar-gutter:stable] group-data-[size=sm]/card:px-3"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Type a message to start.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className="mt-1 text-[0.7rem] leading-none text-muted-foreground">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <form
          className="flex w-full items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Textarea
            ref={textareaRef}
            value={draft}
            rows={2}
            placeholder="Write a message…"
            className="min-h-[2.25rem] resize-none"
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

          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
            >
              Stop
            </Button>
          ) : null}

          <Button type="submit" disabled={!draft.trim() || isLoading}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

