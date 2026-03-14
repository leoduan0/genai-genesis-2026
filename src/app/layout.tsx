import type { Metadata } from "next"
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        manrope.variable,
        fraunces.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
