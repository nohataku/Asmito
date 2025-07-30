'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const { initializeTheme } = useThemeStore()

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, setLoading])

  useEffect(() => {
    // テーマの初期化
    if (typeof window !== 'undefined') {
      initializeTheme()
    }
  }, [initializeTheme])

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgb(var(--card-background))',
            color: 'rgb(var(--foreground-rgb))',
            border: '1px solid rgb(var(--border-color))',
          },
        }}
      />
    </>
  )
}
