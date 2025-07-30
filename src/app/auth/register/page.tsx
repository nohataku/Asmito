'use client'

import AuthForm from '@/components/auth/AuthForm'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <Image
                src="/logo.png"
                alt="Asmito Logo"
                width={400}
                height={160}
                className="h-32 w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              アカウントを作成
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              または{' '}
              <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                既存のアカウントでログイン
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          {/* Googleアカウント作成 */}
          <div className="mb-6">
            <GoogleSignInButton text="Googleでアカウント作成" />
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

          {/* メール・パスワード登録 */}
          <AuthForm mode="signup" />
          
          <div className="mt-6 text-center text-xs text-gray-600">
            アカウントを作成することで、{' '}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
              利用規約
            </Link>
            {' '}と{' '}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
              プライバシーポリシー
            </Link>
            に同意したものとみなします。
          </div>
        </div>
      </div>
    </div>
  )
}
