'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Employee } from '@/types'
import { EmployeePerformanceData, BusinessInsightData, AIDataManager } from '@/lib/aiDataManager'
import { useAuthStore } from '@/store/authStore'

interface AIDataManagementProps {
  employees: Employee[]
  onDataUpdate?: (updatedData: any) => void
  onAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
}

export default function AIDataManagement({ employees, onDataUpdate, onAlert }: AIDataManagementProps) {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'employee' | 'business'>('employee')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [dataManager] = useState(() => new AIDataManager())
  const [employeeData, setEmployeeData] = useState<EmployeePerformanceData | null>(null)
  const [businessData, setBusinessData] = useState<BusinessInsightData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedFromFirebase, setHasLoadedFromFirebase] = useState(false)

  useEffect(() => {
    loadDataFromFirebase()
  }, [user, employees])

  const loadDataFromFirebase = async () => {
    if (!user || hasLoadedFromFirebase) return
    
    try {
      setIsLoading(true)
      console.log('🤖 FirebaseからAIデータを読み込み中...')
      
      await dataManager.loadFromFirebase(user.uid)
      setHasLoadedFromFirebase(true)
      
      // データが読み込まれたら初期化
      initializeDefaultData()
      
    } catch (error) {
      console.error('Firebaseからのデータ読み込みに失敗:', error)
      // エラーの場合はデフォルトデータで初期化
      initializeDefaultData()
    } finally {
      setIsLoading(false)
    }
  }

  const initializeDefaultData = () => {
    // 従業員データのデフォルト値を設定
    employees.forEach(employee => {
      if (!dataManager.getEmployeePerformanceData(employee.id)) {
        const defaultData = dataManager.generateDefaultPerformanceData(employee)
        dataManager.setEmployeePerformanceData(employee.id, defaultData)
      }
    })

    // ビジネスデータのデフォルト値を設定
    if (!dataManager.getBusinessInsightData()) {
      const defaultBusinessData = dataManager.generateDefaultBusinessData()
      dataManager.setBusinessInsightData(defaultBusinessData)
      setBusinessData(defaultBusinessData)
    } else {
      setBusinessData(dataManager.getBusinessInsightData())
    }

    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0].id)
      setEmployeeData(dataManager.getEmployeePerformanceData(employees[0].id))
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    const empData = dataManager.getEmployeePerformanceData(employeeId)
    setEmployeeData(empData)
  }

  const saveToFirebase = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      console.log('💾 AIデータをFirebaseに保存中...')
      
      await dataManager.saveToFirebase(user.uid)
      
      // データ更新コールバックを呼び出し
      if (onDataUpdate) {
        onDataUpdate({
          employeePerformance: dataManager.getAllPerformanceData(),
          businessInsight: dataManager.getBusinessInsightData()
        })
      }
      
      onAlert?.('✅ AIデータが正常にFirebaseに保存されました。', 'success')
    } catch (error) {
      console.error('データ保存エラー:', error)
      onAlert?.('❌ データの保存に失敗しました。', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSampleData = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      console.log('📊 サンプルデータを生成中...')

      // 各従業員のサンプルデータを生成
      employees.forEach(employee => {
        const sampleData = dataManager.generateDefaultPerformanceData(employee)
        dataManager.setEmployeePerformanceData(employee.id, sampleData)
      })

      // ビジネスデータを生成
      const sampleBusinessData = dataManager.generateDefaultBusinessData()
      dataManager.setBusinessInsightData(sampleBusinessData)
      setBusinessData(sampleBusinessData)

      // Firebaseに保存
      await dataManager.saveToFirebase(user.uid)
      
      onAlert?.('📊 サンプルデータを生成してFirebaseに保存しました。', 'success')
      
      // 画面を更新
      if (selectedEmployee) {
        setEmployeeData(dataManager.getEmployeePerformanceData(selectedEmployee))
      }
      
    } catch (error) {
      console.error('サンプルデータ生成エラー:', error)
      onAlert?.('❌ サンプルデータの生成に失敗しました。', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAllAIData = async () => {
    if (!user) return
    
    // 確認ダイアログを表示
    const confirmed = window.confirm(
      '⚠️ 警告: すべてのAI学習データを削除します。\n\n' +
      '削除されるデータ:\n' +
      '• 従業員のパフォーマンスデータ\n' +
      '• 勤務信頼性データ\n' +
      '• スキル評価データ\n' +
      '• ピーク時間設定\n' +
      '• 祝日データ\n\n' +
      'この操作は取り消せません。続行しますか？'
    )
    
    if (!confirmed) return
    
    try {
      setIsLoading(true)
      console.log('🗑️ AIデータを削除中...')
      
      // Firebaseからすべてのデータを削除
      await dataManager.deleteAllData(user.uid)
      
      // ローカル状態をクリア
      setEmployeeData(null)
      setBusinessData(null)
      setSelectedEmployee('')
      setHasLoadedFromFirebase(false)
      
      // 削除後にデフォルトデータで初期化
      console.log('🔄 デフォルトデータで初期化中...')
      initializeDefaultData()
      
      onAlert?.('✅ すべてのAI学習データが削除され、初期設定で再初期化されました。', 'success')
      
    } catch (error) {
      console.error('AIデータ削除エラー:', error)
      onAlert?.('❌ AIデータの削除に失敗しました。', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'employee' as const, label: '👤 従業員パフォーマンス', description: '従業員の詳細データと評価' },
    { id: 'business' as const, label: '⏰ ピーク時間・祝日設定', description: 'ピーク時間帯と祝日データの管理' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🤖 AI データ管理</h2>
          <p className="text-gray-600 dark:text-gray-400">従業員データとビジネス分析データの詳細管理</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={generateSampleData}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? '生成中...' : '📊 サンプル生成'}
          </Button>
          <Button 
            onClick={deleteAllAIData}
            disabled={isLoading}
            variant="outline"
            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 dark:border-red-800"
          >
            {isLoading ? '削除中...' : '🗑️ 学習データ削除'}
          </Button>
          <Button 
            onClick={saveToFirebase}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '💾 データ保存'}
          </Button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>🤖 AI活用方法:</strong>
          <br />• <strong>シフト最適化:</strong> 従業員の勤務信頼性・パフォーマンス評価に基づいて最適な人員配置を自動計算
          <br />• <strong>需要予測:</strong> ピーク時間帯と祝日データから必要スタッフ数を自動調整
          <br />• <strong>コスト最適化:</strong> 従業員の時給・交通費・スキルレベルを考慮した効率的なシフト作成
          <br />• <strong>学習機能:</strong> 過去のシフト実績と従業員パフォーマンスから継続的に最適化ロジックを改善
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <span>{tab.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{tab.description}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* 従業員パフォーマンスタブ */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>👤 従業員選択</CardTitle>
              <CardDescription>編集する従業員を選択してください ({employees.length}名)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedEmployee === employee.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {selectedEmployee === employee.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                        selectedEmployee === employee.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {employee.name.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${
                          selectedEmployee === employee.id
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {employee.name}
                        </h4>
                        <p className={`text-sm truncate ${
                          selectedEmployee === employee.id
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {employee.position || '役職未設定'}
                        </p>
                        {employee.employeeId && (
                          <p className={`text-xs truncate mt-1 ${
                            selectedEmployee === employee.id
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            ID: {employee.employeeId}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {employee.hourlyRate && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            selectedEmployee === employee.id
                              ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            ¥{employee.hourlyRate}/h
                          </span>
                        )}
                        {employee.maxHoursPerWeek && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            selectedEmployee === employee.id
                              ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {employee.maxHoursPerWeek}h/週
                          </span>
                        )}
                      </div>
                      
                      {selectedEmployee === employee.id && (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          編集中
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {employees.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    👥
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    従業員が登録されていません
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    従業員管理画面から従業員を登録してください
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 従業員パフォーマンス編集フォーム */}
          {employeeData && (
            <Card>
              <CardHeader>
                <CardTitle>✏️ 従業員データ編集</CardTitle>
                <CardDescription>従業員のスキルと勤務データの管理</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    {employeeData.employeeId && (
                      <h6 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        従業員 ID: {employeeData.employeeId}
                      </h6>
                    )}
                    
                    {/* 信頼性指標 */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        📊 勤務信頼性
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">出勤率 (%)</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={(employeeData.reliability.attendanceRate * 100).toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                reliability: {
                                  ...employeeData.reliability,
                                  attendanceRate: parseFloat(e.target.value) / 100
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">遅刻回数</label>
                          <Input
                            type="number"
                            min="0"
                            value={employeeData.reliability.lateArrivalCount}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                reliability: {
                                  ...employeeData.reliability,
                                  lateArrivalCount: parseInt(e.target.value) || 0
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">欠勤回数</label>
                          <Input
                            type="number"
                            min="0"
                            value={employeeData.reliability.absenceHistory}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                reliability: {
                                  ...employeeData.reliability,
                                  absenceHistory: parseInt(e.target.value) || 0
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">時間厳守 (1-5)</label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={employeeData.reliability.punctualityScore.toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                reliability: {
                                  ...employeeData.reliability,
                                  punctualityScore: parseFloat(e.target.value) || 1
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* パフォーマンス指標 */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ⭐ パフォーマンス評価
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">顧客満足度 (1-5)</label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={employeeData.performanceMetrics.customerSatisfactionScore.toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                performanceMetrics: {
                                  ...employeeData.performanceMetrics,
                                  customerSatisfactionScore: parseFloat(e.target.value) || 1
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">生産性 (1-5)</label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={employeeData.performanceMetrics.productivityScore.toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                performanceMetrics: {
                                  ...employeeData.performanceMetrics,
                                  productivityScore: parseFloat(e.target.value) || 1
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">エラー率 (%)</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={(employeeData.performanceMetrics.errorRate * 100).toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                performanceMetrics: {
                                  ...employeeData.performanceMetrics,
                                  errorRate: parseFloat(e.target.value) / 100 || 0
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">作業速度 (1-5)</label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={employeeData.performanceMetrics.speedScore.toFixed(2)}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                performanceMetrics: {
                                  ...employeeData.performanceMetrics,
                                  speedScore: parseFloat(e.target.value) || 1
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 勤務設定 */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        🕐 勤務設定
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">最大勤務時間/日</label>
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={employeeData.workPreferences.maxHoursPerDay}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                workPreferences: {
                                  ...employeeData.workPreferences,
                                  maxHoursPerDay: parseInt(e.target.value) || 8
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">最大勤務日数/週</label>
                          <Input
                            type="number"
                            min="1"
                            max="7"
                            value={employeeData.workPreferences.maxDaysPerWeek}
                            onChange={(e) => {
                              const updated = {
                                ...employeeData,
                                workPreferences: {
                                  ...employeeData.workPreferences,
                                  maxDaysPerWeek: parseInt(e.target.value) || 5
                                }
                              }
                              setEmployeeData(updated)
                              dataManager.setEmployeePerformanceData(employeeData.employeeId, updated)
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ピーク時間・祝日設定タブ */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>⏰ ピーク時間設定</CardTitle>
              <CardDescription>需要が高まる時間帯の設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">⏰ ピーク時間の設定</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    店舗の繁忙時間帯を設定します。これらの時間帯にはより多くのスタッフが配置されます。
                  </p>
                </div>

                {businessData && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        ピーク時間帯（複数選択可）
                      </label>
                      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                          <label key={hour} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={businessData.peakHours.includes(hour)}
                              onChange={(e) => {
                                const updated = {
                                  ...businessData,
                                  peakHours: e.target.checked
                                    ? [...businessData.peakHours, hour].sort((a, b) => a - b)
                                    : businessData.peakHours.filter(h => h !== hour)
                                }
                                setBusinessData(updated)
                                dataManager.setBusinessInsightData(updated)
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm">{hour}:00</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>現在設定されているピーク時間:</strong>{' '}
                        {businessData.peakHours.map(h => `${h}:00`).join(', ') || 'なし'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎌 祝日設定</CardTitle>
              <CardDescription>祝日と特別な日の需要調整</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">🎌 祝日データの設定</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    祝日や特別な日における需要の変動を設定します。倍率1.0が通常時、1.0超で需要増、1.0未満で需要減を表します。
                  </p>
                </div>

                {businessData && (
                  <div className="space-y-4">
                    {businessData.holidayData
                      .filter(holiday => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0) // 今日の0時に設定
                        const holidayDate = new Date(holiday.date)
                        const twoMonthsLater = new Date()
                        twoMonthsLater.setMonth(today.getMonth() + 2)
                        twoMonthsLater.setHours(23, 59, 59, 999) // 2ヶ月後の終わりまで
                        
                        // 今日から2ヶ月間の祝日のみ表示
                        return holidayDate >= today && holidayDate <= twoMonthsLater
                      })
                      .sort((a, b) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const dateA = new Date(a.date)
                        const dateB = new Date(b.date)
                        
                        // 今日からの日数の差を計算（未来のもののみなので絶対値不要）
                        const diffA = dateA.getTime() - today.getTime()
                        const diffB = dateB.getTime() - today.getTime()
                        
                        return diffA - diffB
                      })
                      .map((holiday, index) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const holidayDate = new Date(holiday.date)
                        const diffDays = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        const isToday = diffDays === 0
                        
                        let dateLabel = ''
                        if (isToday) {
                          dateLabel = '今日'
                        } else {
                          dateLabel = `${diffDays}日後`
                        }
                        
                        return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-gray-100">{holiday.name}</h6>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {holiday.date}
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                isToday ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {dateLabel}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${
                              holiday.demandMultiplier > 1 ? 'text-green-600 dark:text-green-400' :
                              holiday.demandMultiplier < 1 ? 'text-red-600 dark:text-red-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {holiday.demandMultiplier}x
                            </span>
                            <p className="text-xs text-gray-500">需要倍率</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">日付</label>
                            <Input
                              type="date"
                              value={holiday.date}
                              onChange={(e) => {
                                const updated = {
                                  ...businessData,
                                  holidayData: businessData.holidayData.map((h, i) =>
                                    i === index ? { ...h, date: e.target.value } : h
                                  )
                                }
                                setBusinessData(updated)
                                dataManager.setBusinessInsightData(updated)
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">需要倍率</label>
                            <Input
                              type="number"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              value={holiday.demandMultiplier}
                              onChange={(e) => {
                                const updated = {
                                  ...businessData,
                                  holidayData: businessData.holidayData.map((h, i) =>
                                    i === index ? { ...h, demandMultiplier: parseFloat(e.target.value) || 1.0 } : h
                                  )
                                }
                                setBusinessData(updated)
                                dataManager.setBusinessInsightData(updated)
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                        )
                      })}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📊 <strong>設定のガイドライン:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• 1.0 = 通常時と同じ需要</li>
                        <li>• 1.5 = 通常時の1.5倍の需要（ゴールデンウィークなど）</li>
                        <li>• 0.5 = 通常時の半分の需要（元日など）</li>
                        <li>• 過去の営業実績を参考に倍率を調整してください</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              💡 <strong>データ活用のポイント:</strong>
              <br />• ピーク時間帯の設定により、AI最適化でその時間帯により多くのスタッフが配置されます
              <br />• 祝日の需要倍率設定により、特別な日の人員配置が自動調整されます
              <br />• 過去の営業データを分析し、実際の傾向に合わせて設定を更新してください
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
