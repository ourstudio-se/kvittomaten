"use client"

import { createContext, useContext, useMemo } from "react"
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

  const ctx = useMemo(() => ({ isAtBottom, scrollToBottom }), [isAtBottom, scrollToBottom])

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
