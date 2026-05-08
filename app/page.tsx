export default function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-2xl">
        <ChatPanel />
      </div>
    </div>
  )
}

import { ChatPanel } from "@/components/chat/ChatPanel"
