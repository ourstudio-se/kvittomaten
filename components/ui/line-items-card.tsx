"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type LineItem = { beskrivning: string; belopp: string }

type Props = {
  items: LineItem[]
  currency?: string
  exchangeRate?: number
  onChange: (includedItems: LineItem[], newTotal: string, newTotalSek?: string) => void
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

function formatAmount(amount: number, currency: string): string {
  return (
    amount.toLocaleString("sv-SE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) +
    " " +
    currency
  )
}

export function LineItemsCard({ items, currency = "SEK", exchangeRate, onChange }: Props) {
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const isForeign = currency !== "SEK" && exchangeRate != null && exchangeRate > 0

  const toggle = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const includedTotal = items.reduce(
    (sum, item, i) => (excluded.has(i) ? sum : sum + parseAmount(item.belopp)),
    0
  )

  const includedTotalSek = isForeign ? includedTotal * exchangeRate : undefined

  useEffect(() => {
    const includedItems = items.filter((_, i) => !excluded.has(i))
    onChange(
      includedItems,
      formatAmount(includedTotal, currency),
      includedTotalSek != null ? formatAmount(includedTotalSek, "SEK") : undefined
    )
  }, [excluded]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {items.map((item, i) => {
        const isExcluded = excluded.has(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-opacity",
              i !== 0 && "border-t border-border",
              isExcluded && "opacity-40"
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                isExcluded
                  ? "border-muted-foreground/40 bg-transparent"
                  : "border-primary bg-primary text-primary-foreground"
              )}
            >
              {!isExcluded && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "flex-1 text-left font-medium",
                isExcluded && "line-through"
              )}
            >
              {item.beskrivning}
            </span>
            <span
              className={cn(
                "shrink-0 tabular-nums text-muted-foreground",
                isExcluded && "line-through"
              )}
            >
              {item.belopp}
            </span>
          </button>
        )
      })}

      <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Summa</span>
          <span className="font-medium tabular-nums">
            {formatAmount(includedTotal, currency)}
          </span>
        </div>
        {isForeign && includedTotalSek != null && (
          <div className="mt-1 flex items-center justify-between text-muted-foreground">
            <span>≈ i SEK</span>
            <span className="tabular-nums">
              {formatAmount(includedTotalSek, "SEK")}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
