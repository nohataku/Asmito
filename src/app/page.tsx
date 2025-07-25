import Link from 'next/link'
import { Calendar, Users, TrendingUp, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Asmito</h1>
              <span className="ml-2 text-sm text-secondary-500">アスミト</span>
            </div>
            <nav className="flex space-x-8">
              <Link href="/login" className="btn-secondary">
                ログイン
              </Link>
              <Link href="/register" className="btn-primary">
                無料で始める
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-secondary-900 sm:text-6xl">
            AI駆動
            <span className="text-primary-600">シフト&給与</span>
            管理システム
          </h2>
          <p className="mt-6 text-xl text-secondary-600 max-w-3xl mx-auto">
            シフト作成や給与計算をAIの力で効率化。
            管理者と従業員双方の負担を軽減する次世代管理ツール
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              無料で始める
            </Link>
            <Link href="/demo" className="btn-secondary text-lg px-8 py-3">
              デモを見る
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-center text-secondary-900 mb-16">
            主な機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center">
              <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">AI シフト作成</h4>
              <p className="text-secondary-600">
                従業員の希望を考慮した最適なシフトを自動生成
              </p>
            </div>
            <div className="card text-center">
              <Users className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">給与自動計算</h4>
              <p className="text-secondary-600">
                労働時間に基づく正確な給与計算とレポート生成
              </p>
            </div>
            <div className="card text-center">
              <TrendingUp className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">分析・最適化</h4>
              <p className="text-secondary-600">
                労働コスト分析と効率性向上のためのインサイト
              </p>
            </div>
            <div className="card text-center">
              <Shield className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">法令遵守</h4>
              <p className="text-secondary-600">
                労働基準法に準拠した自動チェック機能
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600">80%</div>
              <div className="text-lg text-secondary-600 mt-2">時間削減</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">100%</div>
              <div className="text-lg text-secondary-600 mt-2">計算精度</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">95%</div>
              <div className="text-lg text-secondary-600 mt-2">満足度向上</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Asmito</h3>
            <p className="text-secondary-300 mb-8">
              AI駆動シフト&給与管理システム
            </p>
            <div className="flex justify-center space-x-6 text-sm text-secondary-400">
              <Link href="/privacy">プライバシーポリシー</Link>
              <Link href="/terms">利用規約</Link>
              <Link href="/contact">お問い合わせ</Link>
            </div>
            <div className="mt-8 text-sm text-secondary-500">
              © 2025 Nohataku. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
