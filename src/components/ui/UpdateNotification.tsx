'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'

export interface UpdateNote {
  id: string
  version: string
  date: string
  title: string
  description: string
  features: string[]
  improvements?: string[]
  bugFixes?: string[]
}

interface UpdateNotificationProps {
  updateNotes: UpdateNote[]
  onDismiss?: (updateId: string) => void
}

export default function UpdateNotification({ updateNotes, onDismiss }: UpdateNotificationProps) {
  const [dismissedUpdates, setDismissedUpdates] = useState<string[]>([])

  useEffect(() => {
    // ローカルストレージから既に表示済みのアップデートIDを取得
    const dismissed = localStorage.getItem('asmito-dismissed-updates')
    if (dismissed) {
      try {
        setDismissedUpdates(JSON.parse(dismissed))
      } catch (error) {
        console.error('既読アップデート情報の読み込みに失敗しました:', error)
      }
    }
  }, [])

  const handleDismiss = (updateId: string) => {
    const newDismissed = [...dismissedUpdates, updateId]
    setDismissedUpdates(newDismissed)
    
    // ローカルストレージに保存
    localStorage.setItem('asmito-dismissed-updates', JSON.stringify(newDismissed))
    
    // 親コンポーネントのコールバックを呼び出し
    onDismiss?.(updateId)
  }

  // まだ表示していないアップデートのみフィルタリング
  const unreadUpdates = updateNotes.filter(update => !dismissedUpdates.includes(update.id))

  if (unreadUpdates.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 mb-6">
      {unreadUpdates.map((update) => (
        <Card key={update.id} className="border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                  <span className="text-2xl">🆕</span>
                  <span className="flex-1 min-w-0">
                    {update.title}
                  </span>
                  <span className="text-sm font-normal bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0">
                    v{update.version}
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {update.date}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismiss(update.id)}
                className="ml-4 text-xs flex-shrink-0"
              >
                ✕ 閉じる
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-700 dark:text-gray-200 mb-4">
              {update.description}
            </p>
            
            {update.features && update.features.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-green-700 dark:text-green-200 mb-2">✨ 新機能</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  {update.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {update.improvements && update.improvements.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-blue-700 dark:text-blue-200 mb-2">🔧 改善点</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  {update.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {update.bugFixes && update.bugFixes.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-red-700 dark:text-red-200 mb-2">🐛 バグ修正</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  {update.bugFixes.map((fix, index) => (
                    <li key={index}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              この通知は一度閉じると再表示されません
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
