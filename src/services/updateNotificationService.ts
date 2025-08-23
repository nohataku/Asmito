import { UpdateNote } from '@/components/ui/UpdateNotification'

// アップデートノートのデータ
export const updateNotes: UpdateNote[] = [
  {
    id: 'update-2025-08-23-v2',
    version: '1.4.1',
    date: '2025年8月23日',
    title: 'アップデートノート機能の実装完了',
    description: 'ダッシュボードでのアップデート通知システムが完成しました。今後の新機能やアップデート情報を効率的に確認できます。',
    features: [
      'ダッシュボードでの自動アップデート通知表示',
      '一度表示したアップデートの自動非表示機能',
      '設定ページでのアップデート履歴表示',
      '開発・テスト用の既読状態リセット機能'
    ],
    improvements: [
      'アップデート情報の視覚的な分類表示（新機能・改善点・バグ修正）',
      'ローカルストレージによる既読状態の永続化',
      'レスポンシブデザインに対応したアップデート通知UI'
    ]
  },
  {
    id: 'update-2025-08-23',
    version: '1.4.0',
    date: '2025年8月23日',
    title: 'アップデート通知機能と通知機能の整理',
    description: 'ダッシュボードでアップデート情報を確認できるようになりました。また、未実装だった通知機能を整理しました。',
    features: [
      'ダッシュボードにアップデート通知機能を追加',
      '一度表示したアップデートは自動的に非表示になる機能',
      'アップデート履歴の詳細表示（新機能、改善点、バグ修正）'
    ],
    improvements: [
      '通知関連の未実装機能を削除し、設定画面をスッキリ整理',
      'プロジェクト文書から将来的な通知機能の記述を削除'
    ]
  },
  {
    id: 'update-2025-07-31',
    version: '1.3.0',
    date: '2025年7月31日',
    title: 'シフト編集・修正機能の大幅強化',
    description: 'シフト管理がより柔軟で使いやすくなりました。ガントチャート上での直接編集や一括操作が可能になりました。',
    features: [
      'ガントチャート上でのシフトバー直接クリック編集',
      '新規シフト作成のワンクリック機能',
      'シフトの一括編集・削除機能',
      'リアルタイムFirestore連携によるデータ同期'
    ],
    improvements: [
      'ガントチャートのインタラクティブ性向上',
      'シフト編集時のバリデーション強化',
      'レスポンシブデザインの改善',
      'エクスポート機能の強化'
    ],
    bugFixes: [
      'シフト時間の整合性チェック修正',
      '給与計算の精度向上',
      'ダークモード表示の不具合修正'
    ]
  }
]

export class UpdateNotificationService {
  // すべてのアップデートノートを取得
  static getAllUpdates(): UpdateNote[] {
    return updateNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // 最新のアップデートのみ取得
  static getLatestUpdate(): UpdateNote | null {
    const sorted = this.getAllUpdates()
    return sorted.length > 0 ? sorted[0] : null
  }

  // 指定した数の最新アップデートを取得
  static getRecentUpdates(count: number = 3): UpdateNote[] {
    return this.getAllUpdates().slice(0, count)
  }

  // 特定のアップデートを取得
  static getUpdateById(id: string): UpdateNote | null {
    return updateNotes.find(update => update.id === id) || null
  }

  // 既読のアップデートIDを取得
  static getDismissedUpdates(): string[] {
    if (typeof window === 'undefined') return []
    
    try {
      const dismissed = localStorage.getItem('asmito-dismissed-updates')
      return dismissed ? JSON.parse(dismissed) : []
    } catch (error) {
      console.error('既読アップデート情報の読み込みに失敗しました:', error)
      return []
    }
  }

  // アップデートを既読にする
  static dismissUpdate(updateId: string): void {
    if (typeof window === 'undefined') return
    
    try {
      const dismissed = this.getDismissedUpdates()
      if (!dismissed.includes(updateId)) {
        dismissed.push(updateId)
        localStorage.setItem('asmito-dismissed-updates', JSON.stringify(dismissed))
      }
    } catch (error) {
      console.error('アップデート既読情報の保存に失敗しました:', error)
    }
  }

  // 未読のアップデートを取得
  static getUnreadUpdates(): UpdateNote[] {
    const dismissed = this.getDismissedUpdates()
    return this.getAllUpdates().filter(update => !dismissed.includes(update.id))
  }

  // すべての既読情報をクリア（開発・テスト用）
  static clearAllDismissed(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('asmito-dismissed-updates')
  }
}
