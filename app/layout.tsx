import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NezhaDash Pro - AI-Powered VPS Monitoring",
  description: "Advanced server monitoring dashboard with AI-powered alerts, multi-channel notifications, and real-time analytics",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#111827" />
      </head>
      <body className="min-h-screen bg-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
