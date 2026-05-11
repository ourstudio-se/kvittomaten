"use client"

import { FileText, SquarePen, Trash2 } from "lucide-react"
import { DropdownMenu } from "radix-ui"
import { Button } from "@/components/ui/button"
import type { CollectedReceipt } from "@/lib/mock-expense-chat"

interface FloatingNavProps {
  onNewChat: () => void
  receipts?: CollectedReceipt[]
  onGeneratePdf?: () => void
  onDeleteReceipt?: (id: string) => void
}

export function FloatingNav({
  onNewChat,
  receipts = [],
  onGeneratePdf,
  onDeleteReceipt,
}: FloatingNavProps) {
  const count = receipts.length

  return (
    <div className="fixed left-4 top-4 z-50 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onNewChat}
        aria-label="Nytt utlägg"
      >
        <SquarePen className="size-4" />
      </Button>

      {count > 0 && (
        <>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" className="gap-2 text-sm" aria-label={`${count} inlagda kvitton`}>
              <FileText className="size-4" />
              {count} {count === 1 ? "kvitto" : "kvitton"}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="start"
              sideOffset={8}
              className="z-50 min-w-[280px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-md"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">
                Inlagda kvitton
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
              {receipts.map((receipt, i) => {
                const supplier = receipt.fields.find((f) => f.label === "Leverantör")?.value ?? `Kvitto ${i + 1}`
                const amount = receipt.fields.find((f) => f.label === "Belopp")?.value
                const category = receipt.fields.find((f) => f.label === "Kategori")?.value
                return (
                  <div
                    key={receipt.id}
                    className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{supplier}</span>
                      {category && <span className="ml-2 text-xs text-muted-foreground">{category}</span>}
                    </div>
                    {amount && <span className="text-muted-foreground">{amount}</span>}
                    {onDeleteReceipt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDeleteReceipt(receipt.id)
                        }}
                        aria-label={`Ta bort kvitto från ${supplier}`}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        {onGeneratePdf && (
          <Button
            variant="outline"
            className="text-sm"
            onClick={onGeneratePdf}
            aria-label="Generera PDF"
          >
            Generera PDF
          </Button>
        )}
        </>
      )}
    </div>
  )
}
