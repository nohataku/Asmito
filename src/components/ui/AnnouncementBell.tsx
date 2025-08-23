'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'
import { AnnouncementService, type Announcement } from '@/services/announcementService'
import AnnouncementPanel from './AnnouncementPanel'

export default function AnnouncementBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [announcementCount, setAnnouncementCount] = useState(0)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  useEffect(() => {
    checkForNewAnnouncements()
    // 最後にチェックした時刻を取得
    const stored = localStorage.getItem('asmito-last-announcement-check')
    setLastChecked(stored)
  }, [])

  const checkForNewAnnouncements = async () => {
    try {
      const announcements = await AnnouncementService.getAnnouncements()
      const important = announcements.filter(a => a.isImportant)
      
      setAnnouncementCount(announcements.length)

      // 最後にチェックした時刻以降に新しいお知らせがあるかチェック
      const lastCheck = localStorage.getItem('asmito-last-announcement-check')
      if (lastCheck && announcements.length > 0) {
        const lastCheckDate = new Date(lastCheck)
        const hasNew = announcements.some(a => new Date(a.date) > lastCheckDate)
        setHasUnread(hasNew || important.length > 0)
      } else {
        // 初回または過去にチェックしたことがない場合
        setHasUnread(announcements.length > 0)
      }
    } catch (error) {
      console.error('お知らせの確認に失敗しました:', error)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    // パネルを開いた時刻を記録
    const now = new Date().toISOString()
    localStorage.setItem('asmito-last-announcement-check', now)
    setLastChecked(now)
    // 未読マークをリセット
    setHasUnread(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* ベルアイコンボタン */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="運営からのお知らせ"
        >
          {/* ベルアイコン */}
          <svg 
            className="w-5 h-5 text-gray-600 dark:text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          
          {/* 未読のお知らせバッジ */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-3 h-3 bg-red-500 text-white rounded-full">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </div>

      {/* お知らせパネル */}
      <AnnouncementPanel isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
