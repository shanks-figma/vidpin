import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VidPin',
  description: 'Save videos. Extract knowledge. Chat with your pins.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
