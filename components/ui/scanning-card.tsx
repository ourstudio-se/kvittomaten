import { CheckCircle2, HelpCircle, Loader2 } from "lucide-react"
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought"
import { cn } from "@/lib/utils"
import type { ScanField } from "@/lib/mock-expense-chat"

type Props = {
  fields: ScanField[]
  className?: string
}

export function ScanningCard({ fields, className }: Props) {
  return (
    <div className={cn("space-y-1", className)}>
      <ChainOfThought>
        {fields.map((field) => (
          <ChainOfThoughtStep key={field.label}>
            <ChainOfThoughtTrigger
              leftIcon={<FieldIcon status={field.status} />}
              swapIconOnHover={false}
            >
              <span className={field.status === "found" ? "text-foreground" : undefined}>
                {field.label}
                {field.status === "found" && field.value && (
                  <span className="ml-1.5 text-muted-foreground">: {field.value}</span>
                )}
                {field.status === "missing" && (
                  <span className="ml-1.5 text-amber-500">saknas</span>
                )}
              </span>
            </ChainOfThoughtTrigger>
          </ChainOfThoughtStep>
        ))}
      </ChainOfThought>
    </div>
  )
}

function FieldIcon({ status }: { status: ScanField["status"] }) {
  if (status === "pending") {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />
  }
  if (status === "found") {
    return <CheckCircle2 className="size-4 text-primary" />
  }
  return <HelpCircle className="size-4 text-amber-500" />
}
