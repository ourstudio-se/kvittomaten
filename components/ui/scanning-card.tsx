import { CheckCircle2, HelpCircle, Loader2 } from "lucide-react"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
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
          <ChainOfThoughtStep
            key={field.label}
            defaultOpen={field.status !== "pending"}
          >
            <ChainOfThoughtTrigger
              leftIcon={<FieldIcon status={field.status} />}
              swapIconOnHover={false}
            >
              <span className={field.status === "found" ? "text-foreground" : undefined}>
                {field.label}
                {field.status === "missing" && (
                  <span className="ml-1.5 text-amber-500">saknas</span>
                )}
              </span>
            </ChainOfThoughtTrigger>
            {field.value && (
              <ChainOfThoughtContent>
                <ChainOfThoughtItem>{field.value}</ChainOfThoughtItem>
              </ChainOfThoughtContent>
            )}
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
