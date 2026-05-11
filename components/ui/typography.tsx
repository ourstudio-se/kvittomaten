import { cn } from "@/lib/utils"

type HeadingSize = "h1" | "h2" | "h3" | "h4" | "display-sm"
type TextVariant = "lead" | "body" | "small" | "caption"

const headingStyles: Record<HeadingSize, string> = {
  "display-sm":
    "font-bold uppercase leading-[0.85] tracking-wide text-[clamp(1.25rem,3vw,2rem)]",
  h1: "font-normal tracking-tight text-[clamp(2rem,5vw,3.5rem)]",
  h2: "text-3xl font-normal tracking-tight",
  h3: "text-2xl font-normal tracking-tight",
  h4: "text-xl font-normal tracking-tight",
}

const textStyles: Record<TextVariant, string> = {
  lead: "text-xl",
  body: "text-base",
  small: "text-sm",
  caption: "text-xs",
}

export function Heading({
  as: Comp = "h2",
  size = "h2",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h1"> & {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div"
  size?: HeadingSize
}) {
  return (
    <Comp
      className={cn("text-foreground", headingStyles[size], className)}
      {...props}
    />
  )
}

export function Text({
  as: Comp = "p",
  variant = "body",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p"> & {
  as?: "p" | "span" | "div"
  variant?: TextVariant
}) {
  return (
    <Comp className={cn("text-foreground", textStyles[variant], className)} {...props} />
  )
}

export function Eyebrow({
  as: Comp = "p",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p"> & {
  as?: "p" | "span" | "div"
}) {
  return (
    <Comp
      className={cn(
        "text-muted-foreground text-xs uppercase tracking-widest",
        className
      )}
      {...props}
    />
  )
}
