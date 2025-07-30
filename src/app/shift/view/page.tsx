'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import GanttChart from '@/components/GanttChart'
import ShiftCreateModal from '@/components/shift/ShiftCreateModal'
import ShiftBulkEditModal from '@/components/shift/ShiftBulkEditModal'
import { Employee } from '@/types/index'
import { Shift } from '@/types/shift'
import { Schedule } from '@/types'
import Layout from '@/components/layout/Layout'

export default function ShiftViewPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [operatingHours, setOperatingHours] = useState({
    start: '09:00',
    end: '21:00'
  })
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)

  useEffect(() => {
    loadSettings()
    fetchData()
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      // システム設定を取得
      const settingsDoc = await getDoc(doc(db, 'settings', 'system'))
      
      if (settingsDoc.exists()) {
        const systemSettings = settingsDoc.data()
        console.log('📋 システム設定を読み込みました:', systemSettings)
        
        setOperatingHours({
          start: systemSettings.workSettings?.operatingHours?.start || '09:00',
          end: systemSettings.workSettings?.operatingHours?.end || '21:00'
        })
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
    }
  }

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // 従業員データを取得（すべてのフィールドパターンに対応）
      let employeeList: Employee[] = []
      try {
        // まず status フィールドで試行
        let employeesQuery = query(
          collection(db, 'employees'),
          where('organizationId', '==', user.uid),
          where('status', '==', 'active')
        )
        let employeesSnapshot = await getDocs(employeesQuery)
        employeesSnapshot.forEach((doc) => {
          employeeList.push({ id: doc.id, ...doc.data() } as Employee)
        })
        console.log(`📋 従業員データを取得 (status): ${employeeList.length}名`)
        
        // データが0件の場合は isActive で再試行
        if (employeeList.length === 0) {
          console.log('status フィールドで0件、isActive で再試行...')
          employeesQuery = query(
            collection(db, 'employees'),
            where('organizationId', '==', user.uid),
            where('isActive', '==', true)
          )
          employeesSnapshot = await getDocs(employeesQuery)
          employeeList = []
          employeesSnapshot.forEach((doc) => {
            employeeList.push({ id: doc.id, ...doc.data() } as Employee)
          })
          console.log(`📋 従業員データを取得 (isActive): ${employeeList.length}名`)
        }
        
        // それでも0件の場合は全従業員を取得
        if (employeeList.length === 0) {
          console.log('条件付きで0件、全従業員を取得...')
          employeesQuery = query(
            collection(db, 'employees'),
            where('organizationId', '==', user.uid)
          )
          employeesSnapshot = await getDocs(employeesQuery)
          employeeList = []
          employeesSnapshot.forEach((doc) => {
            employeeList.push({ id: doc.id, ...doc.data() } as Employee)
          })
          console.log(`📋 全従業員データを取得: ${employeeList.length}名`)
        }
        
        console.log('従業員データの詳細:', employeeList)
        setEmployees(employeeList)
      } catch (error) {
        console.error('従業員データの取得に失敗しました:', error)
      }

      // スケジュール一覧を取得
      let scheduleList: Schedule[] = []
      try {
        const schedulesQuery = query(
          collection(db, 'schedules'),
          where('organizationId', '==', user.uid)
          // orderBy を一時的に削除してインデックスエラーを回避
        )
        const schedulesSnapshot = await getDocs(schedulesQuery)
        schedulesSnapshot.forEach((doc) => {
          scheduleList.push({ id: doc.id, ...doc.data() } as Schedule)
        })
        
        // クライアントサイドでソート
        scheduleList.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate)
          const dateB = new Date(b.createdAt || b.startDate)
          return dateB.getTime() - dateA.getTime()
        })
        
        console.log(`📅 スケジュールデータを取得: ${scheduleList.length}件`, scheduleList)
        setSchedules(scheduleList)
      } catch (error) {
        console.error('スケジュールデータの取得に失敗しました:', error)
        setSchedules([])
      }

      // 最新のスケジュールを選択
      if (scheduleList.length > 0) {
        const latestSchedule = scheduleList[0]
        setSelectedSchedule(latestSchedule)
        setDateRange({
          startDate: latestSchedule.startDate,
          endDate: latestSchedule.endDate
        })
        
        // 選択されたスケジュールのシフトを取得
        await fetchShiftsForSchedule(latestSchedule.id)
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchShiftsForSchedule = async (scheduleId: string) => {
    try {
      console.log(`🔍 スケジュール ${scheduleId} のシフトを取得中...`)
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('scheduleId', '==', scheduleId)
      )
      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftList: Shift[] = []
      shiftsSnapshot.forEach((doc) => {
        const data = doc.data()
        shiftList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as Shift)
      })
      console.log(`📊 シフトデータを取得: ${shiftList.length}件`, shiftList)
      setShifts(shiftList)
    } catch (error) {
      console.error('シフトデータの取得に失敗しました:', error)
    }
  }

  const fetchShiftsByDateRange = async () => {
    if (!user || !dateRange.startDate || !dateRange.endDate) return

    try {
      setLoading(true)
      console.log(`🔍 期間検索: ${dateRange.startDate} ～ ${dateRange.endDate}`)
      
      // インデックスエラーを回避するため、まず organizationId のみでクエリ
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('organizationId', '==', user.uid)
      )
      const shiftsSnapshot = await getDocs(shiftsQuery)
      const allShifts: Shift[] = []
      shiftsSnapshot.forEach((doc) => {
        const data = doc.data()
        allShifts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as Shift)
      })
      
      // クライアントサイドで日付フィルタリング
      const filteredShifts = allShifts.filter(shift => 
        shift.date >= dateRange.startDate && shift.date <= dateRange.endDate
      )
      
      console.log(`📊 期間検索結果: ${filteredShifts.length}件 (全体: ${allShifts.length}件)`, filteredShifts)
      setShifts(filteredShifts)
      setSelectedSchedule(null)
    } catch (error) {
      console.error('シフトデータの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleChange = async (scheduleId: string) => {
    if (!scheduleId) {
      // カスタム期間を選択
      setSelectedSchedule(null)
      setShifts([])
      console.log('📋 カスタム期間モードに切り替えました')
      return
    }
    
    const schedule = schedules.find(s => s.id === scheduleId)
    if (schedule) {
      console.log('📅 スケジュールを選択:', schedule)
      setSelectedSchedule(schedule)
      setDateRange({
        startDate: schedule.startDate,
        endDate: schedule.endDate
      })
      await fetchShiftsForSchedule(scheduleId)
    }
  }

  const handleShiftBulkUpdate = (updatedShifts: Shift[]) => {
    setShifts(prevShifts => {
      const updatedShiftMap = new Map(updatedShifts.map(shift => [shift.id, shift]))
      return prevShifts.map(shift => 
        updatedShiftMap.has(shift.id) ? updatedShiftMap.get(shift.id)! : shift
      )
    })
  }

  const handleShiftBulkDelete = (shiftIds: string[]) => {
    const shiftIdSet = new Set(shiftIds)
    setShifts(prevShifts => 
      prevShifts.filter(shift => !shiftIdSet.has(shift.id!))
    )
  }

  const handleShiftCreate = (newShift: Shift) => {
    setShifts(prevShifts => [...prevShifts, newShift])
  }

  const handleShiftUpdate = (updatedShift: Shift) => {
    setShifts(prevShifts => 
      prevShifts.map(shift => 
        shift.id === updatedShift.id ? updatedShift : shift
      )
    )
  }

  const handleShiftDelete = (shiftId: string) => {
    setShifts(prevShifts => 
      prevShifts.filter(shift => shift.id !== shiftId)
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">シフトデータを読み込み中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">シフト表・エクスポート</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            ➕ 新規シフト
          </Button>
          {shifts.length > 0 && (
            <Button 
              onClick={() => setShowBulkEditModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              📝 一括編集
            </Button>
          )}
          <Button onClick={() => { setLoading(true); fetchData(); }} className="bg-blue-600 hover:bg-blue-700">
            🔄 データを再読み込み
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
            <CardHeader>
              <CardTitle>表示設定</CardTitle>
              <CardDescription>表示するシフトデータを選択してください</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* スケジュール選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    スケジュール選択
                  </label>
                  <select
                    value={selectedSchedule?.id || ''}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">カスタム期間を設定</option>
                    {schedules.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.startDate} ～ {schedule.endDate} 
                        ({schedule.status === 'published' ? '公開済み' : 
                          schedule.status === 'draft' ? '下書き' : 'ロック済み'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 日付範囲 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    開始日
                  </label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    disabled={!!selectedSchedule}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    終了日
                  </label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    disabled={!!selectedSchedule}
                  />
                </div>
              </div>

              {!selectedSchedule && (
                <div className="mt-4">
                  <Button 
                    onClick={fetchShiftsByDateRange}
                    disabled={!dateRange.startDate || !dateRange.endDate}
                  >
                    期間で検索
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 統計情報 */}
          {shifts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{shifts.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">総シフト数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {shifts.reduce((sum, shift) => {
                        const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                        return sum + duration
                      }, 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">総勤務時間</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{employees.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">対象従業員数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {employees.length > 0 ? (
                        shifts.reduce((sum, shift) => {
                          const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                          return sum + duration
                        }, 0) / employees.length
                      ).toFixed(1) : 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">平均勤務時間/人</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ガントチャート */}
          {shifts.length > 0 && dateRange.startDate && dateRange.endDate ? (
            <GanttChart
              shifts={shifts}
              employees={employees}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              operatingHours={operatingHours}
              onShiftUpdate={handleShiftUpdate}
              onShiftDelete={handleShiftDelete}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  {employees.length === 0 ? (
                    <>
                      <p className="mb-4">従業員が登録されていません。</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                        デバッグ情報: 組織ID = {user?.uid}
                      </p>
                      <Button onClick={() => window.location.href = '/employees'}>
                        従業員管理へ
                      </Button>
                    </>
                  ) : shifts.length === 0 ? (
                    <>
                      <p className="mb-4">指定された期間にシフトデータがありません。</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                        従業員数: {employees.length}名、スケジュール数: {schedules.length}件
                        {selectedSchedule && (
                          <>
                            <br />選択されたスケジュール: {selectedSchedule.id}
                            <br />期間: {dateRange.startDate} ～ {dateRange.endDate}
                          </>
                        )}
                      </p>
                      <Button onClick={() => window.location.href = '/shift/create'}>
                        シフトを作成
                      </Button>
                    </>
                  ) : (
                    <p>期間を選択してください。</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* シフト作成モーダル */}
          <ShiftCreateModal
            employees={employees}
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleShiftCreate}
            defaultDate={dateRange.startDate}
          />

          {/* シフト一括編集モーダル */}
          <ShiftBulkEditModal
            shifts={shifts}
            employees={employees}
            isOpen={showBulkEditModal}
            onClose={() => setShowBulkEditModal(false)}
            onSave={handleShiftBulkUpdate}
            onDelete={handleShiftBulkDelete}
          />
    </Layout>
  )
}

function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}:00`)
  const end = new Date(`1970-01-01T${endTime}:00`)
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100
}
