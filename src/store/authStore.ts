import { create } from 'zustand'
import { User, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    try {
      await signOut(auth)
      set({ user: null })
      // ログアウト後はログインページにリダイレクトする場合は、コンポーネント側で処理
    } catch (error) {
      console.error('ログアウトエラー:', error)
      throw error
    }
  },
}))
