'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Layout from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertModal } from '@/components/ui/Modal'
import { useModal } from '@/hooks/useModal'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { DataManagementService, type DataStats } from '@/services/dataManagementService'
import { AIDataManager } from '@/lib/aiDataManager'
import { UpdateNotificationService } from '@/services/updateNotificationService'

interface SystemSettings {
  company: {
    name: string
    address: string
    phone: string
    email: string
  }
  workSettings: {
    operatingHours: {
      start: string
      end: string
    }
    minStaffPerHour: number
    maxStaffPerHour: number
    breakTime: number
  }
  constraints: {
    maxHoursPerDay: number
    maxDaysPerWeek: number
    minRestHours: number
    maxWeeklyHours: number
    maxMonthlyHours: number
  }
  assignmentPolicy: {
    allowUnrequestedAssignment: boolean
    prioritizeRequested: boolean
  }
  ai: {
    enableAI: boolean
    optimizationWeight: {
      cost: number
      preference: number
      availability: number
      balance: number
    }
  }
}

const defaultSettings: SystemSettings = {
  company: {
    name: '',
    address: '',
    phone: '',
    email: ''
  },
  workSettings: {
    operatingHours: {
      start: '09:00',
      end: '18:00'
    },
    minStaffPerHour: 2,
    maxStaffPerHour: 4,
    breakTime: 60
  },
  constraints: {
    maxHoursPerDay: 8,
    maxDaysPerWeek: 5,
    minRestHours: 8,
    maxWeeklyHours: 40,
    maxMonthlyHours: 160
  },
  assignmentPolicy: {
    allowUnrequestedAssignment: true,
    prioritizeRequested: true
  },
  ai: {
    enableAI: true,
    optimizationWeight: {
      cost: 30,
      preference: 40,
      availability: 20,
      balance: 10
    }
  }
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { alertState, showAlert, closeAlert } = useModal()
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { theme, setTheme } = useThemeStore()
  const [saved, setSaved] = useState(false)
  const [dataStats, setDataStats] = useState<DataStats | null>(null)
  const [dataOperationLoading, setDataOperationLoading] = useState(false)
  const [showUpdateHistory, setShowUpdateHistory] = useState(false)

  useEffect(() => {
    if (user) {
      loadSettings()
      loadDataStats()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return
    
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', user.uid))
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() })
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDataStats = async () => {
    if (!user) return
    
    try {
      const stats = await DataManagementService.getDataStats(user.uid)
      setDataStats(stats)
    } catch (error) {
      console.error('データ統計の読み込みに失敗しました:', error)
    }
  }

  const saveSettings = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      await setDoc(doc(db, 'settings', user.uid), settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      showAlert('設定の保存に失敗しました。', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current = newSettings as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  // データエクスポート処理
  const handleExportData = async () => {
    if (!user) return
    
    try {
      setDataOperationLoading(true)
      const exportData = await DataManagementService.exportData(user.uid)
      DataManagementService.downloadAsJSON(exportData)
      showAlert('データエクスポートが完了しました。', { type: 'success' })
    } catch (error) {
      console.error('データエクスポートに失敗しました:', error)
      showAlert('データエクスポートに失敗しました。', { type: 'error' })
    } finally {
      setDataOperationLoading(false)
    }
  }

  // 従業員CSVエクスポート処理
  const handleExportEmployeesCSV = async () => {
    if (!user) return
    
    try {
      setDataOperationLoading(true)
      const exportData = await DataManagementService.exportData(user.uid)
      DataManagementService.downloadEmployeesAsCSV(exportData.employees)
      showAlert('従業員CSVエクスポートが完了しました。', { type: 'success' })
    } catch (error) {
      console.error('従業員CSVエクスポートに失敗しました:', error)
      showAlert('従業員CSVエクスポートに失敗しました。', { type: 'error' })
    } finally {
      setDataOperationLoading(false)
    }
  }

  // データインポート処理
  const handleImportData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            const validation = DataManagementService.validateImportData(data)
            
            if (!validation.isValid) {
              showAlert(`データが無効です:\n${validation.errors.join('\n')}`, { type: 'error' })
              return
            }
            
            // インポート処理は複雑なため、現在は準備中として表示
            showAlert('データインポート機能は準備中です。', { type: 'info' })
          } catch (error) {
            console.error('データインポートに失敗しました:', error)
            showAlert('データインポートに失敗しました。ファイル形式を確認してください。', { type: 'error' })
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  // 全データ削除処理
  const handleDeleteAllData = async () => {
    if (!user) return
    
    const confirmation1 = confirm(
      '⚠️ 危険な操作です！\n\n' +
      'すべてのデータが削除されます:\n' +
      '• 従業員データ\n' +
      '• シフト希望・確定シフト\n' +
      '• AIデータ（パフォーマンス・学習データ）\n' +
      '• システム設定\n\n' +
      'この操作は取り消せません。\n' +
      '本当に続行しますか？'
    )
    
    if (!confirmation1) return
    
    const confirmation2 = confirm(
      '🚨 最終確認\n\n' +
      'AIの学習データを含むすべてのデータが完全に削除されます。\n' +
      'データの復元はできません。\n' +
      '本当にすべてのデータを削除しますか？\n\n' +
      '※この操作はあなたのデータのみに影響し、他のユーザーには影響しません。'
    )
    
    if (!confirmation2) return
    
    try {
      setDataOperationLoading(true)
      
      // 通常のデータを削除
      const deletedCounts = await DataManagementService.deleteAllData(user.uid)
      
      // AIデータも削除
      const aiDataManager = new AIDataManager()
      await aiDataManager.deleteAllData(user.uid)
      
      const message = [
        'すべてのデータを削除しました:',
        `• 従業員: ${deletedCounts.employees}件`,
        `• シフト希望: ${deletedCounts.shiftRequests}件`,
        `• 確定シフト: ${deletedCounts.shifts}件`,
        `• 設定: ${deletedCounts.settings ? '削除済み' : 'なし'}`,
        '• AIデータ: 削除済み（パフォーマンスデータ・学習データ）'
      ].join('\n')
      
      showAlert(message, { type: 'success' })
      
      // データ統計を再読み込み
      await loadDataStats()
      
      // 設定をデフォルトに戻す
      setSettings(defaultSettings)
      
    } catch (error) {
      console.error('全データ削除に失敗しました:', error)
      showAlert('全データ削除に失敗しました。一部のデータが残っている可能性があります。', { type: 'error' })
    } finally {
      setDataOperationLoading(false)
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">ログインが必要です。</p>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">設定を読み込み中...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">システム設定</h1>
          <div className="flex gap-2">
            {saved && (
              <span className="text-green-600 dark:text-green-400 font-medium">保存しました</span>
            )}
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              {saving ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </div>

        {/* 会社情報 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">会社情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">会社名</label>
              <Input
                value={settings.company.name}
                onChange={(e) => updateSettings('company.name', e.target.value)}
                placeholder="株式会社サンプル"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メールアドレス</label>
              <Input
                type="email"
                value={settings.company.email}
                onChange={(e) => updateSettings('company.email', e.target.value)}
                placeholder="info@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">住所</label>
              <Input
                value={settings.company.address}
                onChange={(e) => updateSettings('company.address', e.target.value)}
                placeholder="東京都渋谷区..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">電話番号</label>
              <Input
                value={settings.company.phone}
                onChange={(e) => updateSettings('company.phone', e.target.value)}
                placeholder="03-1234-5678"
              />
            </div>
          </div>
        </Card>

        {/* 勤務設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">勤務設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">営業開始時間</label>
              <Input
                type="time"
                value={settings.workSettings.operatingHours.start}
                onChange={(e) => updateSettings('workSettings.operatingHours.start', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">営業終了時間</label>
              <Input
                type="time"
                value={settings.workSettings.operatingHours.end}
                onChange={(e) => updateSettings('workSettings.operatingHours.end', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最小スタッフ数/時間</label>
              <Input
                type="number"
                min="1"
                value={settings.workSettings.minStaffPerHour}
                onChange={(e) => updateSettings('workSettings.minStaffPerHour', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最大スタッフ数/時間</label>
              <Input
                type="number"
                min="1"
                value={settings.workSettings.maxStaffPerHour}
                onChange={(e) => updateSettings('workSettings.maxStaffPerHour', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">休憩時間（分）</label>
              <Input
                type="number"
                min="0"
                value={settings.workSettings.breakTime}
                onChange={(e) => updateSettings('workSettings.breakTime', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* 労働制約 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">労働制約</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1日最大労働時間</label>
              <Input
                type="number"
                min="1"
                max="24"
                value={settings.constraints.maxHoursPerDay}
                onChange={(e) => updateSettings('constraints.maxHoursPerDay', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">週最大勤務日数</label>
              <Input
                type="number"
                min="1"
                max="7"
                value={settings.constraints.maxDaysPerWeek}
                onChange={(e) => updateSettings('constraints.maxDaysPerWeek', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最小休憩時間</label>
              <Input
                type="number"
                min="0"
                value={settings.constraints.minRestHours}
                onChange={(e) => updateSettings('constraints.minRestHours', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">週最大労働時間</label>
              <Input
                type="number"
                min="1"
                value={settings.constraints.maxWeeklyHours}
                onChange={(e) => updateSettings('constraints.maxWeeklyHours', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">月最大労働時間</label>
              <Input
                type="number"
                min="1"
                value={settings.constraints.maxMonthlyHours}
                onChange={(e) => updateSettings('constraints.maxMonthlyHours', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* シフト割り当てポリシー */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">シフト割り当てポリシー</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.assignmentPolicy.allowUnrequestedAssignment}
                onChange={(e) => updateSettings('assignmentPolicy.allowUnrequestedAssignment', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="text-gray-900 dark:text-gray-100">シフト希望未提出者への割り当てを許可する</span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
              チェックを外すと、シフト希望を提出した従業員のみがシフトに割り当てられます。
            </p>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.assignmentPolicy.prioritizeRequested}
                onChange={(e) => updateSettings('assignmentPolicy.prioritizeRequested', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="text-gray-900 dark:text-gray-100">シフト希望提出者を優先する</span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
              シフト希望を提出した従業員を優先的に割り当てます。
            </p>
          </div>
        </Card>

        {/* AI設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">AI最適化設定</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.ai.enableAI}
                onChange={(e) => updateSettings('ai.enableAI', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="text-gray-900 dark:text-gray-100">AI最適化を有効にする</span>
            </label>
            
            {settings.ai.enableAI && (
              <div className="ml-6 space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">最適化の重み設定（合計100%）</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      コスト最適化: {settings.ai.optimizationWeight.cost}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.cost}
                      onChange={(e) => updateSettings('ai.optimizationWeight.cost', parseInt(e.target.value))}
                      className="w-full accent-blue-600 dark:accent-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      希望優先: {settings.ai.optimizationWeight.preference}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.preference}
                      onChange={(e) => updateSettings('ai.optimizationWeight.preference', parseInt(e.target.value))}
                      className="w-full accent-blue-600 dark:accent-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      利用可能性: {settings.ai.optimizationWeight.availability}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.availability}
                      onChange={(e) => updateSettings('ai.optimizationWeight.availability', parseInt(e.target.value))}
                      className="w-full accent-blue-600 dark:accent-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      バランス: {settings.ai.optimizationWeight.balance}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.balance}
                      onChange={(e) => updateSettings('ai.optimizationWeight.balance', parseInt(e.target.value))}
                      className="w-full accent-blue-600 dark:accent-blue-400"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  合計: {Object.values(settings.ai.optimizationWeight).reduce((sum, val) => sum + val, 0)}%
                  {Object.values(settings.ai.optimizationWeight).reduce((sum, val) => sum + val, 0) !== 100 && (
                    <span className="text-red-600 dark:text-red-400 ml-2">合計を100%にしてください</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* テーマ設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">テーマ設定</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              アプリケーションの外観テーマを選択できます。システムを選択すると、お使いのOSやブラウザの設定に基づいて自動的に切り替わります。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-xl">☀️</span>
                <span className="font-medium">ライト</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-xl">🌙</span>
                <span className="font-medium">ダーク</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                  theme === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-xl">💻</span>
                <span className="font-medium">システム</span>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              現在のテーマ: <span className="font-medium">{theme === 'system' ? 'システム (自動)' : theme === 'light' ? 'ライト' : 'ダーク'}</span>
            </div>
          </div>
        </Card>

        {/* アップデート履歴 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">アップデート履歴</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Asmitoの最新情報とアップデート履歴を確認できます。
              </p>
              <Button
                variant="outline"
                onClick={() => setShowUpdateHistory(!showUpdateHistory)}
                className="text-sm"
              >
                {showUpdateHistory ? '履歴を閉じる' : '履歴を表示'}
              </Button>
            </div>
            
            {showUpdateHistory && (
              <div className="mt-4 space-y-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {UpdateNotificationService.getAllUpdates().map((update) => (
                  <div key={update.id} className="border-l-4 border-l-blue-400 pl-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 break-words">
                          {update.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0">
                            v{update.version}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {update.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words">
                      {update.description}
                    </p>
                    
                    {update.features && update.features.length > 0 && (
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">✨ 新機能</h4>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {update.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {update.improvements && update.improvements.length > 0 && (
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">改善点</h4>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {update.improvements.map((improvement, index) => (
                            <li key={index}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {update.bugFixes && update.bugFixes.length > 0 && (
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">バグ修正</h4>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {update.bugFixes.map((fix, index) => (
                            <li key={index}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* 開発者向け機能 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={() => {
                  UpdateNotificationService.clearAllDismissed()
                  alert('すべての既読状態をリセットしました。ページを再読み込みするとアップデート通知が再表示されます。')
                }}
                variant="outline"
                className="text-xs"
              >
                既読状態をリセット（開発・テスト用）
              </Button>
            </div>
          </div>
        </Card>

        {/* データ管理 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">データ管理</h2>
          
          {/* データ統計 */}
          {dataStats && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">データ統計</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataStats.employees}</div>
                  <div className="text-gray-600 dark:text-gray-400">従業員</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dataStats.shiftRequests}</div>
                  <div className="text-gray-600 dark:text-gray-400">シフト希望</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dataStats.shifts}</div>
                  <div className="text-gray-600 dark:text-gray-400">確定シフト</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {dataStats.settings ? '✓' : '✗'}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">設定</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* エクスポート */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">データエクスポート</h3>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={handleExportData}
                  disabled={dataOperationLoading}
                  className="bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600"
                >
                  {dataOperationLoading ? '処理中...' : 'JSONエクスポート'}
                </Button>
                <Button 
                  onClick={handleExportEmployeesCSV}
                  disabled={dataOperationLoading}
                  className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {dataOperationLoading ? '処理中...' : '従業員CSV'}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                すべてのデータをJSONファイルまたは従業員データをCSVファイルでダウンロードできます。
              </p>
            </div>
            
            {/* インポート */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">データインポート</h3>
              <Button 
                onClick={handleImportData}
                disabled={dataOperationLoading}
                className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                {dataOperationLoading ? '処理中...' : 'ファイル選択'}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                JSONファイルからデータをインポートできます。（準備中）
              </p>
            </div>
            
            {/* データ統計更新 */}
            <div>
              <Button 
                onClick={loadDataStats}
                disabled={dataOperationLoading}
                variant="outline"
                className="mr-2"
              >
                統計更新
              </Button>
            </div>
            
            {/* 危険な操作 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">危険な操作</h3>
              <Button 
                onClick={handleDeleteAllData}
                disabled={dataOperationLoading}
                className="bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600"
              >
                {dataOperationLoading ? '削除中...' : '🗑️ 全データ削除'}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>注意:</strong> この操作は取り消せません。あなたの組織のすべてのデータ
                （従業員、シフト、設定、AIデータ）が削除されます。
                他のユーザーのデータには影響しません。
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* アラートモーダル */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.options.title}
        message={alertState.message}
        type={alertState.options.type}
      />
    </Layout>
  )
}
