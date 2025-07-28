'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import GanttChart from '@/components/GanttChart'
import { Employee, ShiftRequest, Shift } from '@/types'
import { ShiftOptimizer } from '@/lib/shiftOptimizer'
import Layout from '@/components/layout/Layout'

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
}

export default function CreateShiftPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([])
  const [generatedShifts, setGeneratedShifts] = useState<Shift[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [settings, setSettings] = useState<ScheduleSettings>({
    startDate: '',
    endDate: '',
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
    }
  })

  useEffect(() => {
    fetchData()
  }, [user])

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
      
      console.log(`🗓️ シフト希望を取得: ${requestsList.length}件`)
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
      console.log('🤖 AIシフト最適化を開始します...')
      
      // 新しいAIオプティマイザーを使用
      const optimizer = new ShiftOptimizer(employees, shiftRequests, settings)
      const optimizedShifts = optimizer.optimize()
      
      console.log(`✅ 最適化完了: ${optimizedShifts.length}件のシフトを生成`)
      setGeneratedShifts(optimizedShifts)
      
      // 最適化結果のサマリーを表示
      const summary = generateOptimizationSummary(optimizedShifts)
      console.log('📊 最適化サマリー:', summary)
      
    } catch (error) {
      console.error('シフト生成に失敗しました:', error)
      alert('シフト生成に失敗しました。')
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
      console.log('💾 シフトを保存中...')
      
      // スケジュールを保存
      const scheduleDoc = await addDoc(collection(db, 'schedules'), {
        organizationId: user.uid,
        startDate: settings.startDate,
        endDate: settings.endDate,
        status: 'draft',
        createdBy: user.uid,
        aiGenerated: true, // AI生成フラグ
        optimizationScore: generateOptimizationSummary(generatedShifts),
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

      alert('✅ AIで最適化されたシフトが正常に保存されました。')
      setGeneratedShifts([])
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

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AIシフト作成</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 設定パネル */}
            <Card>
              <CardHeader>
                <CardTitle>スケジュール設定</CardTitle>
                <CardDescription>シフト作成の基本設定を行ってください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始日
                    </label>
                    <Input
                      type="date"
                      value={settings.startDate}
                      onChange={(e) => updateSettings('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <h4 className="font-medium text-gray-900 mb-3">勤務制約</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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

                <Button 
                  onClick={generateShifts} 
                  disabled={isGenerating || !settings.startDate || !settings.endDate}
                  className="w-full"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      🤖 AI最適化中...
                    </div>
                  ) : (
                    '🚀 AIシフト生成'
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
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">登録従業員数</span>
                    <span className="text-2xl font-bold text-blue-600">{employees.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">シフト希望件数</span>
                    <span className="text-2xl font-bold text-green-600">{shiftRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">生成済みシフト</span>
                    <span className="text-2xl font-bold text-purple-600">{generatedShifts.length}</span>
                  </div>
                  
                  {generatedShifts.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">🤖 AI最適化結果</h4>
                      {(() => {
                        const summary = generateOptimizationSummary(generatedShifts)
                        return (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>総シフト数: <span className="font-bold">{summary.totalShifts}</span></div>
                            <div>参加従業員: <span className="font-bold">{summary.uniqueEmployees}名</span></div>
                            <div>総労働時間: <span className="font-bold">{summary.totalHours}h</span></div>
                            <div>平均時間/人: <span className="font-bold">{summary.avgHoursPerEmployee}h</span></div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {generatedShifts.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <Button onClick={saveShifts} className="w-full bg-green-600 hover:bg-green-700">
                      💾 AIシフトを保存
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
                  AIが最適化したシフト（{generatedShifts.length}件）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GanttChart
                  shifts={generatedShifts}
                  employees={employees}
                  startDate={settings.startDate}
                  endDate={settings.endDate}
                />
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          従業員
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          勤務時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          勤務時間数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {generatedShifts
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((shift, index) => {
                          const employee = employees.find(emp => emp.id === shift.employeeId)
                          const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                          
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(shift.date).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {employee?.name || '不明'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shift.startTime} - {shift.endTime}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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

          {employees.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  シフトを作成する前に、従業員を登録してください。
                </p>
                <Button onClick={() => window.location.href = '/employees'}>
                  従業員管理へ
                </Button>
              </CardContent>
            </Card>
          )}
    </Layout>
  )
}

function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}:00`)
  const end = new Date(`1970-01-01T${endTime}:00`)
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100
}
