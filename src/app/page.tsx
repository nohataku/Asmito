import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Layout from '@/components/layout/Layout'

export default function HomePage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        {/* メインコンテンツ */}
        <main>
        {/* ヒーローセクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AIがシフト作成を
              <span className="text-indigo-600 block">革新する</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              煩雑なシフト作成・給与計算をAIで自動化。従業員の希望を最大限反映しながら、
              法的制約も自動チェック。管理者の負担を80%削減します。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="px-8 py-3">
                  今すぐ無料で始める
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  デモを見る
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                なぜAsmitoなのか？
              </h3>
              <p className="text-lg text-gray-600">
                従来のシフト管理の課題をAIの力で解決します
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <CardTitle>AI自動最適化</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    従業員の希望・スキル・制約を同時に考慮して、最適なシフトを自動生成。
                    複雑な条件も瞬時に処理します。
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <CardTitle>自動給与計算</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    深夜・残業・休日手当を自動計算。労働基準法への準拠チェックも同時に実行し、
                    計算ミスを完全に排除します。
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                  </div>
                  <CardTitle>柔軟な入力形式</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    フリーテキスト・Excel・Googleフォームなど、様々な形式でシフト希望を受付。
                    既存の運用を変えずに導入できます。
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <CardTitle>Googleアカウント対応</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Googleアカウントで簡単ログイン。面倒な登録手続きは不要で、
                    セキュリティも安心です。
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="bg-indigo-600 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              今すぐシフト管理を革新しませんか？
            </h3>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              無料プランで今すぐ開始。クレジットカード不要、いつでもキャンセル可能です。
            </p>
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="px-8 py-3 bg-white text-indigo-600 hover:bg-gray-100">
                無料で始める
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Asmito</h4>
              <p className="text-gray-400 text-sm">
                AI駆動のシフト&給与管理システムで、業務効率を革新します。
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">製品</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/features">機能一覧</Link></li>
                <li><Link href="/pricing">料金プラン</Link></li>
                <li><Link href="/demo">デモ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/docs">ドキュメント</Link></li>
                <li><Link href="/help">ヘルプセンター</Link></li>
                <li><Link href="/contact">お問い合わせ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">会社</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about">会社概要</Link></li>
                <li><Link href="/privacy">プライバシーポリシー</Link></li>
                <li><Link href="/terms">利用規約</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Asmito. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </Layout>
  )
}