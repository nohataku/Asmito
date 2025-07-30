'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme })
        
        if (typeof window !== 'undefined') {
          // システムテーマの場合は実際のテーマを解決
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            set({ resolvedTheme: systemTheme })
            applyTheme(systemTheme)
          } else {
            set({ resolvedTheme: theme })
            applyTheme(theme)
          }
        }
      },
      toggleTheme: () => {
        const { theme } = get()
        if (theme === 'light') {
          get().setTheme('dark')
        } else if (theme === 'dark') {
          get().setTheme('light')
        } else {
          // systemの場合は現在のresolvedThemeの逆にする
          const { resolvedTheme } = get()
          get().setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
        }
      },
      initializeTheme: () => {
        const { theme } = get()
        if (typeof window !== 'undefined') {
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            set({ resolvedTheme: systemTheme })
            applyTheme(systemTheme)
          } else {
            set({ resolvedTheme: theme })
            applyTheme(theme)
          }
        }
      },
    }),
    {
      name: 'asmito-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

function applyTheme(theme: 'light' | 'dark') {
  if (typeof window === 'undefined') return
  
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// システムテーマの変更を監視
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useThemeStore.getState()
    if (theme === 'system') {
      const systemTheme = e.matches ? 'dark' : 'light'
      useThemeStore.setState({ resolvedTheme: systemTheme })
      applyTheme(systemTheme)
    }
  })
}
