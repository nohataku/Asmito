'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { AnnouncementService, type Announcement } from '@/services/announcementService'

interface AnnouncementPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AnnouncementPanel({ isOpen, onClose }: AnnouncementPanelProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAnnouncements()
    }
  }, [isOpen])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await AnnouncementService.getAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      console.error('お知らせの読み込みに失敗しました:', error)
      setError('お知らせの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAnnouncements = () => {
    if (selectedType === 'all') {
      return announcements
    }
    return announcements.filter(announcement => announcement.type === selectedType)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return dateString
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              運営からのお知らせ
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕ 閉じる
          </Button>
        </div>

        {/* フィルター */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
            >
              すべて
            </Button>
            <Button
              variant={selectedType === 'important' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('important')}
            >
              � 重要
            </Button>
            <Button
              variant={selectedType === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('normal')}
            >
              📢 通常
            </Button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={loadAnnouncements} variant="outline">
                再試行
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredAnnouncements().length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {selectedType === 'all' ? 'お知らせがありません' : `${selectedType}のお知らせがありません`}
                </div>
              ) : (
                getFilteredAnnouncements().map((announcement) => (
                  <Card 
                    key={announcement.id} 
                    className={`${AnnouncementService.getTypeBackgroundClass(announcement.type)} ${
                      announcement.isImportant ? 'border-l-4 border-l-red-500 dark:border-l-red-400' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                            <span className="text-xl">
                              {AnnouncementService.getTypeIcon(announcement.type)}
                            </span>
                            <span className={`flex-1 min-w-0 ${announcement.isImportant ? 'text-red-700 dark:text-red-200' : ''}`}>
                              {announcement.title}
                            </span>
                            {announcement.isImportant && (
                              <span className="bg-red-600 dark:bg-red-500 text-white dark:text-white text-xs px-2 py-1 rounded font-medium flex-shrink-0">
                                重要
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(announcement.date)}
                            </span>
                          </div>
                          {announcement.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {announcement.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded flex-shrink-0"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getFilteredAnnouncements().length}件のお知らせ
            </span>
            <Button onClick={loadAnnouncements} variant="outline" size="sm">
              🔄 更新
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
