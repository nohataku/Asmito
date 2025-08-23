export interface Announcement {
  id: string
  title: string
  content: string
  type: 'important' | 'normal'
  priority: 'low' | 'medium' | 'high'
  date: string
  isImportant: boolean
  tags: string[]
}

export interface AnnouncementData {
  announcements: Announcement[]
}

export class AnnouncementService {
  private static cache: Announcement[] | null = null
  private static lastFetchTime: number = 0
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5分

  // お知らせデータを取得
  static async getAnnouncements(): Promise<Announcement[]> {
    const now = Date.now()
    
    // キャッシュが有効な場合はキャッシュを返す
    if (this.cache && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cache
    }

    try {
      const response = await fetch('/data/announcements.json')
      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.status}`)
      }
      
      const data: AnnouncementData = await response.json()
      
      // 日付順でソート（新しい順）
      const sortedAnnouncements = data.announcements.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      
      this.cache = sortedAnnouncements
      this.lastFetchTime = now
      
      return sortedAnnouncements
    } catch (error) {
      console.error('お知らせの取得に失敗しました:', error)
      return []
    }
  }

  // 重要なお知らせのみ取得
  static async getImportantAnnouncements(): Promise<Announcement[]> {
    const announcements = await this.getAnnouncements()
    return announcements.filter(announcement => announcement.isImportant)
  }

  // タイプ別にお知らせを取得
  static async getAnnouncementsByType(type: Announcement['type']): Promise<Announcement[]> {
    const announcements = await this.getAnnouncements()
    return announcements.filter(announcement => announcement.type === type)
  }

  // 優先度別にお知らせを取得
  static async getAnnouncementsByPriority(priority: Announcement['priority']): Promise<Announcement[]> {
    const announcements = await this.getAnnouncements()
    return announcements.filter(announcement => announcement.priority === priority)
  }

  // 特定のお知らせを取得
  static async getAnnouncementById(id: string): Promise<Announcement | null> {
    const announcements = await this.getAnnouncements()
    return announcements.find(announcement => announcement.id === id) || null
  }

  // 最新のお知らせを指定数取得
  static async getRecentAnnouncements(count: number = 5): Promise<Announcement[]> {
    const announcements = await this.getAnnouncements()
    return announcements.slice(0, count)
  }

  // 優先度に応じた色クラスを取得
  static getPriorityColorClass(priority: Announcement['priority']): string {
    const colors = {
      low: 'text-gray-600 dark:text-gray-400',
      medium: 'text-blue-600 dark:text-blue-400',
      high: 'text-red-600 dark:text-red-400'
    }
    return colors[priority]
  }

  // タイプに応じた背景色クラスを取得
  static getTypeBackgroundClass(type: Announcement['type']): string {
    const backgrounds = {
      important: '!bg-red-50 dark:!bg-red-900/30 border-red-200 dark:border-red-700',
      normal: '!bg-gray-50 dark:!bg-gray-800/50 border-gray-200 dark:border-gray-600'
    }
    return backgrounds[type] || backgrounds.normal
  }

  // キャッシュをクリア
  static clearCache(): void {
    this.cache = null
    this.lastFetchTime = 0
  }
}
