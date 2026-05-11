"use client"

import { useState } from "react"
import { Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Field = { label: string; value: string }

type Props = {
  fields: Field[]
  flowFields?: string[]
  onSubmit: (fields: Field[]) => void
  onEditField?: (label: string) => void
  className?: string
}

export function SummaryCard({ fields: initialFields, flowFields = [], onSubmit, onEditField, className }: Props) {
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {fields.map((field, i) => {
          const isFlowField = flowFields.includes(field.label)
          return (
            <div
              key={field.label}
              className={cn(
                "group flex items-center gap-3 px-4 py-2.5 text-sm",
                i !== 0 && "border-t border-border"
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
                  onClick={() => isFlowField ? onEditField?.(field.label) : startEdit(i)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label={`Ändra ${field.label}`}
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <Button className="w-full rounded-md" onClick={() => onSubmit(fields)}>
        Lägg till kvitto
      </Button>
    </div>
  )
}
