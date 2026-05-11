import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  filename: string
  blobUrl: string
  className?: string
}

export function DownloadCard({ filename, blobUrl, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename}</p>
        <p className="text-xs text-muted-foreground">PDF</p>
      </div>
      <Button asChild size="icon-sm" variant="ghost" aria-label="Ladda ner">
        <a href={blobUrl} download={filename}>
          <Download className="size-4" />
        </a>
      </Button>
    </div>
  )
}
