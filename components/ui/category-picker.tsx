"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  categories: string[]
  suggested: string
  onSelect: (category: string, freetext?: string) => void
  className?: string
}

export function CategoryPicker({ categories, suggested, onSelect, className }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [freetext, setFreetext] = useState("")
  const [locked, setLocked] = useState(false)

  const active = selected ?? (suggested || null)
  const isOvrigt = active === "Övrigt"

  const handleSelect = (cat: string) => {
    if (locked) return
    setSelected(cat)
    if (cat !== "Övrigt") {
      setLocked(true)
      onSelect(cat)
    }
  }

  const handleFreetextConfirm = () => {
    if (locked || !freetext.trim()) return
    setLocked(true)
    onSelect("Övrigt", freetext)
  }

  return (
    <div className={cn("mt-3 space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={active !== null && active === cat ? "default" : "outline"}
            size="sm"
            disabled={locked}
            className="rounded-full"
            onClick={() => handleSelect(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {isOvrigt && !locked && (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            rows={2}
            placeholder="Beskriv kategorin…"
            value={freetext}
            onChange={(e) => setFreetext(e.target.value)}
          />
          <Button
            size="sm"
            className="rounded-full"
            disabled={!freetext.trim()}
            onClick={handleFreetextConfirm}
          >
            Bekräfta
          </Button>
        </div>
      )}
    </div>
  )
}
