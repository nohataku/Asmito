'use client'

import AuthForm from '@/components/auth/AuthForm'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">Asmito</h1>
            <h2 className="text-2xl font-bold text-gray-900">
              アカウントにログイン
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              または{' '}
              <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                新しいアカウントを作成
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          {/* Googleログイン */}
          <div className="mb-6">
            <GoogleSignInButton text="Googleでログイン" />
          </div>

          {/* 区切り線 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">またはメールアドレスで</span>
            </div>
          </div>

          {/* メール・パスワードログイン */}
          <AuthForm mode="login" />
          
          <div className="mt-6 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
              パスワードを忘れた方はこちら
            </Link>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  )
}
