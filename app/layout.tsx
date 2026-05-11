import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Expense Chat",
  description: "Chatvy med integrerad expense UI-styling.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
