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
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Asmito - AI駆動シフト&給与管理システム',
    description: 'シフト作成や給与計算をAIの力で効率化する次世代管理ツール',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Asmito Logo',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('asmito-theme')) {
                  const theme = JSON.parse(localStorage.getItem('asmito-theme')).state.theme;
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
