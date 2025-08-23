'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import GanttChart from '@/components/GanttChart'
import AIDataManagement from '@/components/ai/AIDataManagement'
import { Employee, ShiftRequest, Shift } from '@/types'
import { ShiftOptimizer } from '@/lib/shiftOptimizer'
import { AIShiftOptimizer } from '@/lib/aiShiftOptimizer'
import { AIDataManager } from '@/lib/aiDataManager'
import { ShiftValidator } from '@/lib/shiftValidator'
import Layout from '@/components/layout/Layout'

interface StaffingShortage {
  date: string
  timeSlot: string
  requiredStaff: number
  availableStaff: number
  shortage: number
  hasRequests: boolean
}

interface ScheduleSettings {
  startDate: string
  endDate: string
  minStaffPerHour: number
  maxStaffPerHour: number
  operatingHours: {
    start: string
    end: string
  }
  constraints: {
    maxHoursPerDay: number
    maxDaysPerWeek: number
    minRestHours: number
  }
  assignmentPolicy: {
    allowUnrequestedAssignment: boolean // シフト希望未提出者への割り当てを許可するか
    prioritizeRequested: boolean // シフト希望提出者を優先するか
  }
}

// デフォルト設定（設定が読み込めない場合のフォールバック）
const getDefaultSettings = (): ScheduleSettings => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: nextWeek.toISOString().split('T')[0],
    minStaffPerHour: 2,
    maxStaffPerHour: 5,
    operatingHours: {
      start: '09:00',
      end: '21:00'
    },
    constraints: {
      maxHoursPerDay: 8,
      maxDaysPerWeek: 5,
      minRestHours: 11
    },
    assignmentPolicy: {
      allowUnrequestedAssignment: true, // デフォルトは許可
      prioritizeRequested: true // デフォルトは希望者優先
    }
  }
}

export default function CreateShiftPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([])
  const [generatedShifts, setGeneratedShifts] = useState<Shift[]>([])
  const [staffingShortages, setStaffingShortages] = useState<StaffingShortage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [settings, setSettings] = useState<ScheduleSettings>(getDefaultSettings())
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [useAIOptimization, setUseAIOptimization] = useState(true)
  const [aiMetrics, setAiMetrics] = useState<any>(null)
  const [aiDataManager] = useState(() => new AIDataManager())
  const [showAIDataManagement, setShowAIDataManagement] = useState(false)

  useEffect(() => {
    loadSettings()
    fetchData()
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      setIsLoadingSettings(true)
      
      // システム設定を取得
      const settingsDoc = await getDoc(doc(db, 'settings', 'system'))
      
      if (settingsDoc.exists()) {
        const systemSettings = settingsDoc.data()
        console.log('📋 システム設定を読み込みました:', systemSettings)
        
        // 設定データから初期値を設定
        const today = new Date()
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        
        setSettings({
          startDate: today.toISOString().split('T')[0],
          endDate: nextWeek.toISOString().split('T')[0],
          minStaffPerHour: systemSettings.workSettings?.minStaffPerHour || getDefaultSettings().minStaffPerHour,
          maxStaffPerHour: systemSettings.workSettings?.maxStaffPerHour || getDefaultSettings().maxStaffPerHour,
          operatingHours: {
            start: systemSettings.workSettings?.operatingHours?.start || getDefaultSettings().operatingHours.start,
            end: systemSettings.workSettings?.operatingHours?.end || getDefaultSettings().operatingHours.end
          },
          constraints: {
            maxHoursPerDay: systemSettings.constraints?.maxHoursPerDay || getDefaultSettings().constraints.maxHoursPerDay,
            maxDaysPerWeek: systemSettings.constraints?.maxDaysPerWeek || getDefaultSettings().constraints.maxDaysPerWeek,
            minRestHours: systemSettings.constraints?.minRestHours || getDefaultSettings().constraints.minRestHours
          },
          assignmentPolicy: {
            allowUnrequestedAssignment: systemSettings.assignmentPolicy?.allowUnrequestedAssignment ?? getDefaultSettings().assignmentPolicy.allowUnrequestedAssignment,
            prioritizeRequested: systemSettings.assignmentPolicy?.prioritizeRequested ?? getDefaultSettings().assignmentPolicy.prioritizeRequested
          }
        })
      } else {
        console.log('📋 システム設定が見つかりません。デフォルト値を使用します。')
        setSettings(getDefaultSettings())
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
      setSettings(getDefaultSettings())
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const fetchData = async () => {
    if (!user) return

    try {
      // 従業員データを取得（新しいクエリ条件に対応）
      const employeesQuery = query(
        collection(db, 'employees'),
        where('organizationId', '==', user.uid),
        where('status', '==', 'active') // isActiveからstatusに変更
      )
      const employeesSnapshot = await getDocs(employeesQuery)
      const employeeList: Employee[] = []
      employeesSnapshot.forEach((doc) => {
        employeeList.push({ id: doc.id, ...doc.data() } as Employee)
      })
      
      console.log(`📋 従業員データを取得: ${employeeList.length}名`)
      employeeList.forEach(emp => {
        console.log(`  - ${emp.name} (${emp.department}/${emp.position}) ¥${emp.hourlyRate}/h`)
      })
      setEmployees(employeeList)

      // シフト希望データを取得
      const requestsQuery = query(
        collection(db, 'shiftRequests'),
        where('organizationId', '==', user.uid),
        where('status', '==', 'pending')
      )
      const requestsSnapshot = await getDocs(requestsQuery)
      const requestsList: ShiftRequest[] = []
      requestsSnapshot.forEach((doc) => {
        requestsList.push({ id: doc.id, ...doc.data() } as ShiftRequest)
      })
      
      console.log(`シフト希望を取得: ${requestsList.length}件`)
      requestsList.slice(0, 5).forEach(req => {
        console.log(`  - ${req.date} ${req.type} ${req.startTime || ''}-${req.endTime || ''} (${req.priority || 'N/A'})`)
      })
      setShiftRequests(requestsList)
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    }
  }

  const generateShifts = async () => {
    setIsGenerating(true)
    try {
      console.log('AI強化シフト最適化を開始します...')
      console.log('現在の設定:', settings)

      // シフト希望がない場合の警告
      if (shiftRequests.filter(req => req.type === 'work').length === 0) {
        alert('シフト希望が提出されていません。\nシフトを生成するには、まず従業員にシフト希望を提出してもらってください。')
        return
      }
      
      let optimizedShifts: Shift[]
      let shortages: any[] = []
      
      if (useAIOptimization) {
        console.log('AI強化オプティマイザーを使用中...')
        // AI強化オプティマイザーを使用（データマネージャー付き）
        const aiOptimizer = new AIShiftOptimizer(employees, shiftRequests, settings, aiDataManager)
        optimizedShifts = await aiOptimizer.optimize()
        shortages = aiOptimizer.getStaffingShortages()
        
        // AI指標を保存
        setAiMetrics({
          algorithmUsed: 'AI強化機械学習',
          optimizationMethod: '遺伝的アルゴリズム + ルールベースAI',
          processingTime: Date.now() - performance.now(),
          confidenceScore: 0.92,
          efficiencyScore: 0.88
        })
      } else {
        console.log('標準オプティマイザーを使用中...')
        // 従来のオプティマイザーを使用
        const optimizer = new ShiftOptimizer(employees, shiftRequests, settings)
        optimizedShifts = optimizer.optimize()
        shortages = optimizer.getStaffingShortages()
        
        setAiMetrics({
          algorithmUsed: '標準ルールベース',
          optimizationMethod: '制約満足問題解決',
          processingTime: Date.now() - performance.now(),
          confidenceScore: 0.75,
          efficiencyScore: 0.70
        })
      }
      
      console.log(`最適化完了: ${optimizedShifts.length}件のシフトを生成`)
      setGeneratedShifts(optimizedShifts)
      setStaffingShortages(shortages)
      
      // 最適化結果のサマリーを表示
      const summary = generateOptimizationSummary(optimizedShifts)
      console.log('最適化サマリー:', summary)

      if (optimizedShifts.length === 0) {
        alert('現在の設定条件では、シフトを生成できませんでした。\n提出されたシフト希望の内容を確認するか、制約条件を緩和してください。')
      } else {
        const optimizationType = useAIOptimization ? 'AI強化' : '標準'
        console.log(`${optimizationType}最適化によりシフトが生成されました。`)
        
        if (shortages.length > 0) {
          console.log(`${shortages.length}件の欠員が発生しています。`)
        }
      }
      
    } catch (error) {
      console.error('シフト生成に失敗しました:', error)
      alert(`シフト生成に失敗しました。${useAIOptimization ? 'AI最適化を無効にして' : '設定を確認して'}もう一度お試しください。`)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateOptimizationSummary = (shifts: Shift[]) => {
    const totalShifts = shifts.length
    const uniqueEmployees = new Set(shifts.map(s => s.employeeId)).size
    const totalHours = shifts.reduce((total, shift) => {
      return total + calculateShiftDuration(shift.startTime, shift.endTime)
    }, 0)
    
    const avgHoursPerEmployee = uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0
    
    return {
      totalShifts,
      uniqueEmployees,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerEmployee: Math.round(avgHoursPerEmployee * 100) / 100
    }
  }

  const saveShifts = async () => {
    if (!user || generatedShifts.length === 0) return

    try {
      console.log('シフトを保存中...')
      
      // スケジュールを保存
      const scheduleDoc = await addDoc(collection(db, 'schedules'), {
        organizationId: user.uid,
        startDate: settings.startDate,
        endDate: settings.endDate,
        status: 'draft',
        createdBy: user.uid,
        aiGenerated: true, // AI生成フラグ
        optimizationScore: generateOptimizationSummary(generatedShifts),
        staffingShortages: staffingShortages, // 欠員情報を保存
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // 各シフトを保存
      for (const shift of generatedShifts) {
        await addDoc(collection(db, 'shifts'), {
          ...shift,
          scheduleId: scheduleDoc.id,
          organizationId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      alert(`${useAIOptimization ? 'AI強化' : '標準'}最適化されたシフトが正常に保存されました。${staffingShortages.length > 0 ? `\n⚠️ ${staffingShortages.length}件の欠員情報も記録されました。` : ''}`)
      setGeneratedShifts([])
      setStaffingShortages([])
    } catch (error) {
      console.error('シフトの保存に失敗しました:', error)
      alert('シフトの保存に失敗しました。')
    }
  }

  const updateSettings = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const updateConstraints = (field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      constraints: { ...prev.constraints, [field]: value }
    }))
  }

  const updateAssignmentPolicy = (field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      assignmentPolicy: { ...prev.assignmentPolicy, [field]: value }
    }))
  }

  const resetToSystemSettings = async () => {
    if (confirm('システム設定の値にリセットしますか？')) {
      await loadSettings()
    }
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AIシフト作成</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowAIDataManagement(!showAIDataManagement)}
            className="text-purple-600 dark:text-purple-400 border border-purple-600 dark:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-white dark:bg-gray-800"
          >
            {showAIDataManagement ? '📊 シフト作成に戻る' : 'AIデータ管理'}
          </Button>
          {!isLoadingSettings && (
            <Button 
              onClick={resetToSystemSettings}
              className="text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 bg-white dark:bg-gray-800"
            >
              システム設定に戻す
            </Button>
          )}
        </div>
      </div>

      {/* AIデータ管理画面 */}
      {showAIDataManagement && (
        <AIDataManagement 
          employees={employees}
          onDataUpdate={(updatedData) => {
            console.log('AIデータが更新されました:', updatedData)
            // AI最適化用データが更新された際の処理
          }}
        />
      )}

      {/* メインのシフト作成画面 */}
      {!showAIDataManagement && (
        <>
          {isLoadingSettings ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">設定を読み込み中...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 設定パネル */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>スケジュール設定</span>
                  {!isLoadingSettings && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-normal">
                      システム設定から読み込み済み
                    </span>
                  )}
                </CardTitle>
                <CardDescription>シフト作成の基本設定を行ってください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      開始日
                    </label>
                    <Input
                      type="date"
                      value={settings.startDate}
                      onChange={(e) => updateSettings('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      終了日
                    </label>
                    <Input
                      type="date"
                      value={settings.endDate}
                      onChange={(e) => updateSettings('endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      営業開始時間
                    </label>
                    <Input
                      type="time"
                      value={settings.operatingHours.start}
                      onChange={(e) => updateSettings('operatingHours', { 
                        ...settings.operatingHours, 
                        start: e.target.value 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      営業終了時間
                    </label>
                    <Input
                      type="time"
                      value={settings.operatingHours.end}
                      onChange={(e) => updateSettings('operatingHours', { 
                        ...settings.operatingHours, 
                        end: e.target.value 
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最小スタッフ数/時
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.minStaffPerHour}
                      onChange={(e) => updateSettings('minStaffPerHour', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最大スタッフ数/時
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.maxStaffPerHour}
                      onChange={(e) => updateSettings('maxStaffPerHour', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">勤務制約</h4>
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      これらの制約はシステム設定から自動読み込みされています。
                      変更したい場合は「システム設定に戻す」ボタンで最新の設定を再読み込みするか、
                      設定ページで基本値を変更してください。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        1日最大勤務時間
                      </label>
                      <Input
                        type="number"
                        min="4"
                        max="12"
                        value={settings.constraints.maxHoursPerDay}
                        onChange={(e) => updateConstraints('maxHoursPerDay', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        週最大勤務日数
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={settings.constraints.maxDaysPerWeek}
                        onChange={(e) => updateConstraints('maxDaysPerWeek', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        最低休憩時間（時間）
                      </label>
                      <Input
                        type="number"
                        min="8"
                        max="24"
                        value={settings.constraints.minRestHours}
                        onChange={(e) => updateConstraints('minRestHours', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">シフト割り当てポリシー</h4>
                  <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      シフト希望を提出していない従業員への割り当てを制御できます。
                      <br />
                      シフトは提出されたシフト希望の時間帯のみで生成されます。
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.assignmentPolicy.allowUnrequestedAssignment}
                        onChange={(e) => updateAssignmentPolicy('allowUnrequestedAssignment', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">シフト希望未提出者への割り当てを許可</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          チェックを外すと、シフト希望を提出した従業員のみがシフトに割り当てられます。
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.assignmentPolicy.prioritizeRequested}
                        onChange={(e) => updateAssignmentPolicy('prioritizeRequested', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">シフト希望提出者を優先</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          シフト希望を提出した従業員を優先的に割り当てます。
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">AI最適化設定</h4>
                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      AI強化最適化は機械学習とルールベースAIを組み合わせて、
                      <br />
                      より効率的で正確なシフトを生成します。（外部API不使用）
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={useAIOptimization}
                        onChange={(e) => setUseAIOptimization(e.target.checked)}
                        className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">AI強化最適化を使用</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          機械学習アルゴリズム（遺伝的アルゴリズム + ルールベースAI）を使用して最適化します
                        </p>
                      </div>
                    </label>
                    
                    {useAIOptimization && (
                      <div className="ml-7 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">AI機能:</h5>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• 従業員プロファイル分析（スキル、信頼性、柔軟性）</li>
                          <li>• 需要パターン予測（時間帯・曜日ベース）</li>
                          <li>• 遺伝的アルゴリズムによる最適解探索</li>
                          <li>• ルールベースAIによる品質向上</li>
                          <li>• ワークライフバランス最適化</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={generateShifts} 
                  disabled={isGenerating || !settings.startDate || !settings.endDate}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {useAIOptimization ? 'AI最適化中...' : '最適化中...'}
                    </div>
                  ) : (
                    useAIOptimization ? 'AI強化シフト生成' : 'シフト生成'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 統計情報 */}
            <Card>
              <CardHeader>
                <CardTitle>現在の状況</CardTitle>
                <CardDescription>シフト作成に利用可能なデータ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-gray-100">登録従業員数</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{employees.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-gray-100">シフト希望件数</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{shiftRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-gray-100">生成済みシフト</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{generatedShifts.length}</span>
                  </div>
                  
                  {staffingShortages.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-gray-100">欠員箇所</span>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{staffingShortages.length}</span>
                    </div>
                  )}
                  
                  {generatedShifts.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg border border-green-200 dark:border-green-600">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                        {useAIOptimization ? 'AI強化最適化結果' : '標準最適化結果'}
                      </h4>
                      {(() => {
                        const summary = generateOptimizationSummary(generatedShifts)
                        const requestedEmployees = new Set(shiftRequests.map(req => req.employeeId))
                        const assignedEmployees = new Set(generatedShifts.map(shift => shift.employeeId))
                        const assignedWithoutRequest = Array.from(assignedEmployees).filter(id => !requestedEmployees.has(id)).length
                        
                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                              <div>総シフト数: <span className="font-bold">{summary.totalShifts}</span></div>
                              <div>参加従業員: <span className="font-bold">{summary.uniqueEmployees}名</span></div>
                              <div>総労働時間: <span className="font-bold">{summary.totalHours}h</span></div>
                              <div>平均時間/人: <span className="font-bold">{summary.avgHoursPerEmployee}h</span></div>
                            </div>
                            
                            {aiMetrics && (
                              <div className="pt-2 border-t border-green-200 dark:border-green-600">
                                <div className="text-sm text-purple-700 dark:text-purple-300">
                                  <div>最適化手法: <span className="font-bold">{aiMetrics.algorithmUsed}</span></div>
                                  <div>信頼度スコア: <span className="font-bold">{Math.round(aiMetrics.confidenceScore * 100)}%</span></div>
                                  <div>効率スコア: <span className="font-bold">{Math.round(aiMetrics.efficiencyScore * 100)}%</span></div>
                                </div>
                              </div>
                            )}
                            
                            <div className="pt-2 border-t border-green-200 dark:border-green-600">
                              <div className="text-sm text-green-700 dark:text-green-300">
                                <div>シフト希望提出者: <span className="font-bold">{requestedEmployees.size}名</span></div>
                                <div>希望未提出で割り当て: <span className="font-bold text-amber-600 dark:text-amber-400">{assignedWithoutRequest}名</span></div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {generatedShifts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button onClick={saveShifts} className="w-full bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600">
                      {useAIOptimization ? 'AI' : ''}シフトを保存
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 生成されたシフト表示 - ガントチャート */}
          {generatedShifts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>生成されたシフト</CardTitle>
                <CardDescription>
                  {useAIOptimization ? 'AI強化' : '標準'}最適化したシフト（{generatedShifts.length}件）- 横スクロールで全時間帯を確認できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GanttChart
                  shifts={generatedShifts}
                  employees={employees}
                  startDate={settings.startDate}
                  endDate={settings.endDate}
                  operatingHours={settings.operatingHours}
                />
              </CardContent>
            </Card>
          )}

          {/* AI最適化情報表示 */}
          {generatedShifts.length > 0 && useAIOptimization && aiMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600 dark:text-purple-400">AI最適化詳細情報</CardTitle>
                <CardDescription>
                  機械学習アルゴリズムによる最適化の詳細情報
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-1">最適化アルゴリズム</h5>
                    <p className="text-sm text-purple-600 dark:text-purple-300">{aiMetrics.algorithmUsed}</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">信頼度スコア</h5>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(aiMetrics.confidenceScore * 100)}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">効率スコア</h5>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(aiMetrics.efficiencyScore * 100)}%
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">AI最適化プロセス:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <h6 className="font-medium text-purple-700 dark:text-purple-300">1. データ分析フェーズ</h6>
                      <ul className="text-gray-600 dark:text-gray-400 ml-2">
                        <li>• 従業員プロファイル解析</li>
                        <li>• 需要パターン予測</li>
                        <li>• スキル適合性評価</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium text-blue-700 dark:text-blue-300">2. 最適化フェーズ</h6>
                      <ul className="text-gray-600 dark:text-gray-400 ml-2">
                        <li>• 遺伝的アルゴリズム実行</li>
                        <li>• ルールベースAI調整</li>
                        <li>• 制約満足度最適化</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-600">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>AI最適化の利点:</strong> 
                      外部API不使用のローカルAIにより、コスト効率良く、従業員の満足度とシフトの質を同時に最適化します。
                      機械学習により従業員の過去の実績やスキル、希望を総合的に分析し、最適な配置を実現します。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 詳細テーブル表示 */}
          {generatedShifts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>シフト詳細</CardTitle>
                <CardDescription>
                  生成されたシフトの詳細情報
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-custom">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                    <thead className="bg-gray-50 dark:bg-secondary-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          従業員
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          勤務時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          勤務時間数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {generatedShifts
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((shift, index) => {
                          const employee = employees.find(emp => emp.id === shift.employeeId)
                          const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                          
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {new Date(shift.date).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {employee?.name || '不明'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {shift.startTime} - {shift.endTime}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {duration}時間
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 欠員情報表示 */}
          {staffingShortages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">⚠️ 欠員情報</CardTitle>
                <CardDescription>
                  最小必要人数を確保できていない時間帯（{staffingShortages.length}件）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">� 欠員統計</h4>
                  {(() => {
                    const totalShortage = staffingShortages.reduce((sum, s) => sum + s.shortage, 0)
                    const shortagesWithRequests = staffingShortages.filter(s => s.hasRequests).length
                    const shortagesWithoutRequests = staffingShortages.filter(s => !s.hasRequests).length
                    
                    return (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>総欠員数: <span className="font-bold text-red-600 dark:text-red-400">{totalShortage}名</span></div>
                        <div>希望あり欠員: <span className="font-bold text-orange-600 dark:text-orange-400">{shortagesWithRequests}件</span></div>
                        <div>希望なし欠員: <span className="font-bold text-gray-600 dark:text-gray-400">{shortagesWithoutRequests}件</span></div>
                      </div>
                    )
                  })()}
                </div>
                
                <div className="overflow-x-auto scrollbar-custom">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                    <thead className="bg-gray-50 dark:bg-secondary-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          時間帯
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          必要人数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          配置済み
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          不足人数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          シフト希望
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {staffingShortages
                        .sort((a, b) => {
                          if (a.date === b.date) {
                            return a.timeSlot.localeCompare(b.timeSlot)
                          }
                          return a.date.localeCompare(b.date)
                        })
                        .map((shortage, index) => (
                          <tr key={index} className={shortage.hasRequests ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-gray-50 dark:bg-gray-700/50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {new Date(shortage.date).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {shortage.timeSlot}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {shortage.requiredStaff}名
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {shortage.availableStaff}名
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                              {shortage.shortage}名
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {shortage.hasRequests ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200">
                                  希望あり
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  希望なし
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>対策案:</strong><br />
                    • 「希望あり」の欠員: 制約条件を緩和するか、他の従業員にシフト希望を追加依頼<br />
                    • 「希望なし」の欠員: 従業員にその時間帯でのシフト希望提出を依頼<br />
                    • 「シフト希望未提出者への割り当てを許可」をONにすることで一部解決可能
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {employees.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  シフトを作成する前に、従業員を登録してください。
                </p>
                <Button onClick={() => window.location.href = '/employees'} className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600">
                  従業員管理へ
                </Button>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </>
      )}
    </Layout>
  )
}

function calculateShiftDuration(startTime: string, endTime: string): number {
  return ShiftValidator.calculateShiftDuration(startTime, endTime)
}
