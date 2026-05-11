"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  options: string[]
  onSelect: (option: string) => void
  className?: string
}

export function QuickReply({ options, onSelect, className }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (option: string) => {
    if (selected) return
    setSelected(option)
    onSelect(option)
  }

  return (
    <div className={cn("mt-3 flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option}
          variant={selected === option ? "default" : "outline"}
          size="sm"
          disabled={!!selected && selected !== option}
          className="rounded-full"
          onClick={() => handleSelect(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  )
}
