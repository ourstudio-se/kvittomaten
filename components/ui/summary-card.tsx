"use client"

import { useCallback, useState } from "react"
import { Pencil, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type Field = { label: string; value: string }
type LineItem = { beskrivning: string; belopp: string }

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

type Props = {
  fields: Field[]
  flowFields?: string[]
  lineItems?: LineItem[]
  currency?: string
  exchangeRate?: number
  onSubmit: (fields: Field[]) => void
  onEditField?: (label: string) => void
  onLineItemsChange?: (included: LineItem[]) => void
  className?: string
}

const AMOUNT_LABELS = new Set(["Belopp", "Originalbelopp", "Belopp (SEK)"])

export function SummaryCard({
  fields: initialFields,
  flowFields = [],
  lineItems,
  currency = "SEK",
  exchangeRate,
  onSubmit,
  onEditField,
  onLineItemsChange,
  className,
}: Props) {
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [raderOpen, setRaderOpen] = useState(false)

  const isForeign = currency !== "SEK" && exchangeRate != null && exchangeRate > 0
  const hasLineItems = lineItems != null && lineItems.length > 0

  const startEdit = (i: number) => {
    setEditingIndex(i)
    setEditValue(fields[i].value)
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    setFields((prev) =>
      prev.map((f, i) => (i === editingIndex ? { ...f, value: editValue } : f))
    )
    setEditingIndex(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit()
    if (e.key === "Escape") setEditingIndex(null)
  }

  const toggleItem = useCallback(
    (index: number) => {
      setExcluded((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }

        if (hasLineItems) {
          const includedTotal = lineItems.reduce(
            (sum, item, i) => (next.has(i) ? sum : sum + parseAmount(item.belopp)),
            0
          )
          const newBelopp = formatAmount(includedTotal, currency)
          const newBeloppSek = isForeign
            ? formatAmount(includedTotal * exchangeRate!, "SEK")
            : undefined

          setFields((prev) =>
            prev.map((f) => {
              if (isForeign) {
                if (f.label === "Originalbelopp") return { ...f, value: newBelopp }
                if (f.label === "Belopp (SEK)" && newBeloppSek) return { ...f, value: newBeloppSek }
              } else {
                if (f.label === "Belopp") return { ...f, value: newBelopp }
              }
              return f
            })
          )

          const included = lineItems.filter((_, i) => !next.has(i))
          onLineItemsChange?.(included)
        }

        return next
      })
    },
    [hasLineItems, lineItems, currency, isForeign, exchangeRate, onLineItemsChange]
  )

  const lineItemRows = hasLineItems
    ? lineItems.map((item, i) => {
        const isExcluded = excluded.has(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggleItem(i)}
            className={cn(
              "flex w-full items-center gap-3 border-t border-border px-4 py-2 text-sm transition-opacity",
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
                "flex-1 text-left",
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
      })
    : null

  const excludedCount = excluded.size
  const includedCount = hasLineItems ? lineItems.length - excludedCount : 0

  const renderFieldRow = (field: Field, i: number, isFirst: boolean) => {
    const isFlowField = flowFields.includes(field.label)
    return (
      <div
        key={field.label}
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 text-sm",
          !isFirst && "border-t border-border"
        )}
      >
        <span className="w-28 shrink-0 text-muted-foreground">{field.label}</span>

        {editingIndex === i ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-medium outline-none"
          />
        ) : (
          <span className="flex-1 font-medium">{field.value}</span>
        )}

        {editingIndex === i ? (
          <button
            onClick={commitEdit}
            className="shrink-0 text-primary hover:opacity-70"
            aria-label="Spara"
          >
            <Check className="size-3.5" />
          </button>
        ) : (
          <button
            onClick={() =>
              isFlowField ? onEditField?.(field.label) : startEdit(i)
            }
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            aria-label={`Ändra ${field.label}`}
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  const infoFields = fields
    .map((f, i) => ({ field: f, index: i }))
    .filter(({ field }) => !AMOUNT_LABELS.has(field.label))
  const amountFields = fields
    .map((f, i) => ({ field: f, index: i }))
    .filter(({ field }) => AMOUNT_LABELS.has(field.label))

  return (
    <div className={cn("space-y-3", className)}>
      {infoFields.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {infoFields.map(({ field, index }, i) =>
            renderFieldRow(field, index, i === 0)
          )}
        </div>
      )}

      {(amountFields.length > 0 || hasLineItems) && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {hasLineItems && (
            <Collapsible open={raderOpen} onOpenChange={setRaderOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40">
                <span>
                  Rader ({includedCount} av {lineItems.length}
                  {excludedCount > 0 ? `, ${excludedCount} exkluderade` : ""})
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    raderOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>{lineItemRows}</CollapsibleContent>
            </Collapsible>
          )}

          {amountFields.map(({ field, index }, i) =>
            renderFieldRow(field, index, !hasLineItems && i === 0)
          )}
        </div>
      )}

      <Button className="w-full rounded-md" onClick={() => onSubmit(fields)}>
        Lägg till kvitto
      </Button>
    </div>
  )
}
