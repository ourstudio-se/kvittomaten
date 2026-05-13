"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onClose: () => void
  employees: string[]
  selected: string[]
  onChange: (next: string[]) => void
  title?: string
}

export function ParticipantSheet(props: Props) {
  if (typeof document === "undefined" || !props.open) return null
  return createPortal(<SheetBody {...props} />, document.body)
}

function SheetBody({
  onClose,
  employees,
  selected,
  onChange,
  title = "Välj deltagare",
}: Props) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.toLowerCase().includes(q))
  }, [employees, query])

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ paddingBottom: "max(1rem, var(--kb-inset, 0px))" }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex w-full max-w-[640px] flex-col",
          "h-[min(80dvh,calc(100dvh-var(--kb-inset,0px)-2rem))]",
          "sm:h-[min(80dvh,720px,calc(100dvh-var(--kb-inset,0px)-4rem))]",
          "rounded-sm border border-border bg-card shadow-2xl overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök anställd…"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Ingen träff på &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((name) => {
                const isSelected = selected.includes(name)
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => toggle(name)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm",
                        "hover:bg-accent active:bg-accent/80",
                        isSelected && "text-foreground"
                      )}
                    >
                      <span className="truncate">{name}</span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border bg-card px-4 py-3">
          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={onClose}
          >
            {selected.length > 0 ? `Lägg till (${selected.length})` : "Lägg till"}
          </Button>
        </div>
      </div>
    </div>
  )
}
