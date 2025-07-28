'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Layout from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
  notifications: {
    emailNotifications: boolean
    smsNotifications: boolean
    shiftReminders: boolean
    requestNotifications: boolean
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
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    shiftReminders: true,
    requestNotifications: true
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
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'system'))
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() })
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await setDoc(doc(db, 'settings', 'system'), settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
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

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600">設定を読み込み中...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
          <div className="flex gap-2">
            {saved && (
              <span className="text-green-600 font-medium">✅ 保存しました</span>
            )}
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? '保存中...' : '💾 設定を保存'}
            </Button>
          </div>
        </div>

        {/* 会社情報 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">🏢 会社情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
              <Input
                value={settings.company.name}
                onChange={(e) => updateSettings('company.name', e.target.value)}
                placeholder="株式会社サンプル"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <Input
                type="email"
                value={settings.company.email}
                onChange={(e) => updateSettings('company.email', e.target.value)}
                placeholder="info@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <Input
                value={settings.company.address}
                onChange={(e) => updateSettings('company.address', e.target.value)}
                placeholder="東京都渋谷区..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
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
          <h2 className="text-lg font-semibold mb-4">⏰ 勤務設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">営業開始時間</label>
              <Input
                type="time"
                value={settings.workSettings.operatingHours.start}
                onChange={(e) => updateSettings('workSettings.operatingHours.start', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">営業終了時間</label>
              <Input
                type="time"
                value={settings.workSettings.operatingHours.end}
                onChange={(e) => updateSettings('workSettings.operatingHours.end', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小スタッフ数/時間</label>
              <Input
                type="number"
                min="1"
                value={settings.workSettings.minStaffPerHour}
                onChange={(e) => updateSettings('workSettings.minStaffPerHour', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大スタッフ数/時間</label>
              <Input
                type="number"
                min="1"
                value={settings.workSettings.maxStaffPerHour}
                onChange={(e) => updateSettings('workSettings.maxStaffPerHour', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">休憩時間（分）</label>
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
          <h2 className="text-lg font-semibold mb-4">📋 労働制約</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1日最大労働時間</label>
              <Input
                type="number"
                min="1"
                max="24"
                value={settings.constraints.maxHoursPerDay}
                onChange={(e) => updateSettings('constraints.maxHoursPerDay', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">週最大勤務日数</label>
              <Input
                type="number"
                min="1"
                max="7"
                value={settings.constraints.maxDaysPerWeek}
                onChange={(e) => updateSettings('constraints.maxDaysPerWeek', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小休憩時間</label>
              <Input
                type="number"
                min="0"
                value={settings.constraints.minRestHours}
                onChange={(e) => updateSettings('constraints.minRestHours', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">週最大労働時間</label>
              <Input
                type="number"
                min="1"
                value={settings.constraints.maxWeeklyHours}
                onChange={(e) => updateSettings('constraints.maxWeeklyHours', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月最大労働時間</label>
              <Input
                type="number"
                min="1"
                value={settings.constraints.maxMonthlyHours}
                onChange={(e) => updateSettings('constraints.maxMonthlyHours', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* 通知設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">🔔 通知設定</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.emailNotifications}
                onChange={(e) => updateSettings('notifications.emailNotifications', e.target.checked)}
                className="mr-2"
              />
              メール通知を有効にする
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.smsNotifications}
                onChange={(e) => updateSettings('notifications.smsNotifications', e.target.checked)}
                className="mr-2"
              />
              SMS通知を有効にする
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.shiftReminders}
                onChange={(e) => updateSettings('notifications.shiftReminders', e.target.checked)}
                className="mr-2"
              />
              シフトリマインダーを有効にする
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.requestNotifications}
                onChange={(e) => updateSettings('notifications.requestNotifications', e.target.checked)}
                className="mr-2"
              />
              リクエスト通知を有効にする
            </label>
          </div>
        </Card>

        {/* シフト割り当てポリシー */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">📋 シフト割り当てポリシー</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.assignmentPolicy.allowUnrequestedAssignment}
                onChange={(e) => updateSettings('assignmentPolicy.allowUnrequestedAssignment', e.target.checked)}
                className="mr-2"
              />
              シフト希望未提出者への割り当てを許可する
            </label>
            <p className="text-sm text-gray-600 ml-6">
              チェックを外すと、シフト希望を提出した従業員のみがシフトに割り当てられます。
            </p>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.assignmentPolicy.prioritizeRequested}
                onChange={(e) => updateSettings('assignmentPolicy.prioritizeRequested', e.target.checked)}
                className="mr-2"
              />
              シフト希望提出者を優先する
            </label>
            <p className="text-sm text-gray-600 ml-6">
              シフト希望を提出した従業員を優先的に割り当てます。
            </p>
          </div>
        </Card>

        {/* AI設定 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">🤖 AI最適化設定</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.ai.enableAI}
                onChange={(e) => updateSettings('ai.enableAI', e.target.checked)}
                className="mr-2"
              />
              AI最適化を有効にする
            </label>
            
            {settings.ai.enableAI && (
              <div className="ml-6 space-y-4">
                <h3 className="font-medium">最適化の重み設定（合計100%）</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      コスト最適化: {settings.ai.optimizationWeight.cost}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.cost}
                      onChange={(e) => updateSettings('ai.optimizationWeight.cost', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      希望優先: {settings.ai.optimizationWeight.preference}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.preference}
                      onChange={(e) => updateSettings('ai.optimizationWeight.preference', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      利用可能性: {settings.ai.optimizationWeight.availability}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.availability}
                      onChange={(e) => updateSettings('ai.optimizationWeight.availability', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      バランス: {settings.ai.optimizationWeight.balance}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ai.optimizationWeight.balance}
                      onChange={(e) => updateSettings('ai.optimizationWeight.balance', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  合計: {Object.values(settings.ai.optimizationWeight).reduce((sum, val) => sum + val, 0)}%
                  {Object.values(settings.ai.optimizationWeight).reduce((sum, val) => sum + val, 0) !== 100 && (
                    <span className="text-red-600 ml-2">⚠️ 合計を100%にしてください</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* データ管理 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">🗄️ データ管理</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button className="bg-green-600 hover:bg-green-700">
                📤 データエクスポート
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                📥 データインポート
              </Button>
            </div>
            <div className="border-t pt-4">
              <Button className="bg-red-600 hover:bg-red-700">
                🗑️ 全データ削除（危険）
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                この操作は取り消せません。すべてのシフト、従業員、設定データが削除されます。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
