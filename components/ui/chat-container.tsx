"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { useStickToBottom } from "use-stick-to-bottom"
import { cn } from "@/lib/utils"

type ChatScrollContext = {
  isAtBottom: boolean
  scrollToBottom: () => void
}

const ChatScrollContext = createContext<ChatScrollContext>({
  isAtBottom: true,
  scrollToBottom: () => {},
})

export function useChatScroll() {
  return useContext(ChatScrollContext)
}

export type ChatContainerRootProps = {
  children: React.ReactNode
  className?: string
}

export type ChatContainerContentProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type ChatContainerScrollAnchorProps = {
  className?: string
  ref?: React.RefObject<HTMLDivElement>
} & React.HTMLAttributes<HTMLDivElement>

function ChatContainerRoot({ children, className }: ChatContainerRootProps) {
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: { damping: 0.8, stiffness: 0.04, mass: 1.4 },
    initial: "instant",
  })

  const scrollElRef = scrollRef as unknown as { current: HTMLElement | null }
  const isAtBottomRef = useRef(isAtBottom)
  isAtBottomRef.current = isAtBottom

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom()
    const el = scrollElRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [scrollToBottom, scrollElRef])

  // Stick to bottom when the scroll viewport itself shrinks (e.g. footer/input
  // grows after attaching a file). useStickToBottom only observes content, not
  // the viewport, so we patch that here.
  useEffect(() => {
    const el = scrollElRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [scrollElRef])

  const ctx = useMemo(
    () => ({ isAtBottom, scrollToBottom: handleScrollToBottom }),
    [isAtBottom, handleScrollToBottom]
  )

  return (
    <ChatScrollContext.Provider value={ctx}>
      <div
        ref={scrollRef}
        role="log"
        className={cn("h-full overflow-y-auto", className)}
      >
        <div ref={contentRef} className="flex w-full flex-col">
          {children}
        </div>
      </div>
    </ChatScrollContext.Provider>
  )
}

function ChatContainerContent({
  children,
  className,
  ...props
}: ChatContainerContentProps) {
  return (
    <div className={cn("flex w-full flex-col", className)} {...props}>
      {children}
    </div>
  )
}

function ChatContainerScrollAnchor({
  className,
  ...props
}: ChatContainerScrollAnchorProps) {
  return (
    <div
      className={cn("h-px w-full shrink-0 scroll-mt-4", className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor }
