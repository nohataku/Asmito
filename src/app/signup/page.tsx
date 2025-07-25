import AuthForm from '@/components/auth/AuthForm'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Asmitoアカウント作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              既存のアカウントでログイン
            </Link>
          </p>
        </div>
        
        <AuthForm mode="signup" />

        <div className="text-center text-xs text-gray-500">
          アカウント作成により、
          <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">利用規約</Link>
          および
          <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">プライバシーポリシー</Link>
          に同意したものとみなされます。
        </div>
      </div>
    </div>
  )
}
