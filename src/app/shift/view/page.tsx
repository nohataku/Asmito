'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import GanttChart from '@/components/GanttChart'
import { Employee, Shift, Schedule } from '@/types'
import Layout from '@/components/layout/Layout'

export default function ShiftViewPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // 従業員データを取得
      const employeesQuery = query(
        collection(db, 'employees'),
        where('organizationId', '==', user.uid),
        where('isActive', '==', true)
      )
      const employeesSnapshot = await getDocs(employeesQuery)
      const employeeList: Employee[] = []
      employeesSnapshot.forEach((doc) => {
        employeeList.push({ id: doc.id, ...doc.data() } as Employee)
      })
      setEmployees(employeeList)

      // スケジュール一覧を取得
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('organizationId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const schedulesSnapshot = await getDocs(schedulesQuery)
      const scheduleList: Schedule[] = []
      schedulesSnapshot.forEach((doc) => {
        scheduleList.push({ id: doc.id, ...doc.data() } as Schedule)
      })
      setSchedules(scheduleList)

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
      setShifts(shiftList)
    } catch (error) {
      console.error('シフトデータの取得に失敗しました:', error)
    }
  }

  const fetchShiftsByDateRange = async () => {
    if (!user || !dateRange.startDate || !dateRange.endDate) return

    try {
      setLoading(true)
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('organizationId', '==', user.uid),
        where('date', '>=', dateRange.startDate),
        where('date', '<=', dateRange.endDate)
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
      setShifts(shiftList)
      setSelectedSchedule(null)
    } catch (error) {
      console.error('シフトデータの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleChange = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
      setDateRange({
        startDate: schedule.startDate,
        endDate: schedule.endDate
      })
      await fetchShiftsForSchedule(scheduleId)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">シフトデータを読み込み中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">シフト表・エクスポート</h1>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    スケジュール選択
                  </label>
                  <select
                    value={selectedSchedule?.id || ''}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <div className="text-2xl font-bold text-indigo-600">{shifts.length}</div>
                    <div className="text-sm text-gray-600">総シフト数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {shifts.reduce((sum, shift) => {
                        const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                        return sum + duration
                      }, 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">総勤務時間</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{employees.length}</div>
                    <div className="text-sm text-gray-600">対象従業員数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {employees.length > 0 ? (
                        shifts.reduce((sum, shift) => {
                          const duration = calculateShiftDuration(shift.startTime, shift.endTime)
                          return sum + duration
                        }, 0) / employees.length
                      ).toFixed(1) : 0}
                    </div>
                    <div className="text-sm text-gray-600">平均勤務時間/人</div>
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
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  {employees.length === 0 ? (
                    <>
                      <p className="mb-4">従業員が登録されていません。</p>
                      <Button onClick={() => window.location.href = '/employees'}>
                        従業員管理へ
                      </Button>
                    </>
                  ) : shifts.length === 0 ? (
                    <>
                      <p className="mb-4">指定された期間にシフトデータがありません。</p>
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
    </Layout>
  )
}

function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}:00`)
  const end = new Date(`1970-01-01T${endTime}:00`)
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100
}
