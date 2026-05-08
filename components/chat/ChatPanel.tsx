"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "../ui/textarea"
import { cn } from "@/lib/utils"

type ChatMessage = {
  id: string
  role: "user"
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

  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  function submit() {
    const trimmed = draft.trim()
    if (!trimmed) return

    setMessages((prev) => [
      ...prev,
      { id: createId(), role: "user", content: trimmed, createdAt: new Date() },
    ])
    setDraft("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <Card className={cn("flex h-[min(75svh,720px)] flex-col", className)}>
      <CardHeader className="border-b">
        <CardTitle>Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <div
          ref={viewportRef}
          className="h-full overflow-y-auto px-4 pb-4 pt-4 group-data-[size=sm]/card:px-3"
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
                  <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed">
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
              e.preventDefault()
              submit()
            }}
          />

          <Button type="submit" disabled={!draft.trim()}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

