import type { Metadata } from "next"
import { IBM_Plex_Mono, Inter } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
})

export const metadata: Metadata = {
  title: "Expense AI Chat",
  description: "UI shell for an expense interpretation assistant."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="sv"
      className={`dark ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
