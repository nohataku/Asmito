import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Asmito - AI駆動シフト&給与管理システム',
  description: 'シフト作成や給与計算をAIの力で効率化する次世代管理ツール',
  keywords: ['シフト管理', '給与計算', 'AI', '労務管理', '人事管理'],
  authors: [{ name: 'Nohataku' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Asmito - AI駆動シフト&給与管理システム',
    description: 'シフト作成や給与計算をAIの力で効率化する次世代管理ツール',
    type: 'website',
    locale: 'ja_JP',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
