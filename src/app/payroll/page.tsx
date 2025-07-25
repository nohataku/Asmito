'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Employee, Shift } from '@/types'

interface PayrollCalculation {
  employeeId: string
  employeeName: string
  regularHours: number
  overtimeHours: number
  nightShiftHours: number
  holidayHours: number
  regularPay: number
  overtimePay: number
  nightShiftPay: number
  holidayPay: number
  totalPay: number
  workDays: number
}

interface PayrollSettings {
  overtimeRate: number // 残業割増率（1.25 = 25%増）
  nightShiftRate: number // 深夜割増率（1.25 = 25%増）
  holidayRate: number // 休日割増率（1.35 = 35%増）
  nightShiftStart: string // 深夜時間開始
  nightShiftEnd: string // 深夜時間終了
  maxRegularHoursPerDay: number // 1日の法定労働時間
  maxRegularHoursPerMonth: number // 1ヶ月の法定労働時間
}

export default function PayrollPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [payrollData, setPayrollData] = useState<PayrollCalculation[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: '',
    endDate: ''
  })
  const [settings, setSettings] = useState<PayrollSettings>({
    overtimeRate: 1.25,
    nightShiftRate: 1.25,
    holidayRate: 1.35,
    nightShiftStart: '22:00',
    nightShiftEnd: '05:00',
    maxRegularHoursPerDay: 8,
    maxRegularHoursPerMonth: 160
  })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
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

      // シフトデータを取得
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('organizationId', '==', user.uid)
      )
      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftList: Shift[] = []
      shiftsSnapshot.forEach((doc) => {
        shiftList.push({ id: doc.id, ...doc.data() } as Shift)
      })
      setShifts(shiftList)
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    }
  }

  const calculatePayroll = () => {
    setIsCalculating(true)

    try {
      const calculations: PayrollCalculation[] = []

      employees.forEach(employee => {
        // 期間内のシフトを取得
        const employeeShifts = shifts.filter(shift => 
          shift.employeeId === employee.id &&
          shift.date >= selectedPeriod.startDate &&
          shift.date <= selectedPeriod.endDate
        )

        if (employeeShifts.length === 0) return

        let regularHours = 0
        let overtimeHours = 0
        let nightShiftHours = 0
        let holidayHours = 0
        const workDays = employeeShifts.length

        employeeShifts.forEach(shift => {
          const { regular, overtime, night, holiday } = calculateShiftHours(shift)
          regularHours += regular
          overtimeHours += overtime
          nightShiftHours += night
          holidayHours += holiday
        })

        // 給与計算
        const regularPay = regularHours * employee.hourlyRate
        const overtimePay = overtimeHours * employee.hourlyRate * settings.overtimeRate
        const nightShiftPay = nightShiftHours * employee.hourlyRate * settings.nightShiftRate
        const holidayPay = holidayHours * employee.hourlyRate * settings.holidayRate
        const totalPay = regularPay + overtimePay + nightShiftPay + holidayPay

        calculations.push({
          employeeId: employee.id,
          employeeName: employee.name,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          nightShiftHours: Math.round(nightShiftHours * 100) / 100,
          holidayHours: Math.round(holidayHours * 100) / 100,
          regularPay: Math.round(regularPay),
          overtimePay: Math.round(overtimePay),
          nightShiftPay: Math.round(nightShiftPay),
          holidayPay: Math.round(holidayPay),
          totalPay: Math.round(totalPay),
          workDays
        })
      })

      setPayrollData(calculations)
    } catch (error) {
      console.error('給与計算に失敗しました:', error)
      alert('給与計算に失敗しました。')
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateShiftHours = (shift: Shift) => {
    const start = new Date(`1970-01-01T${shift.startTime}:00`)
    const end = new Date(`1970-01-01T${shift.endTime}:00`)
    
    // 終了時刻が開始時刻より早い場合は翌日とみなす
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }

    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    const totalHours = totalMinutes / 60

    // 休憩時間を控除（6時間以上の場合は45分、8時間以上の場合は60分）
    let workingHours = totalHours
    if (totalHours >= 8) {
      workingHours -= 1 // 60分休憩
    } else if (totalHours >= 6) {
      workingHours -= 0.75 // 45分休憩
    }

    // 日付の曜日チェック（簡易的に日曜日を休日とする）
    const shiftDate = new Date(shift.date)
    const isHoliday = shiftDate.getDay() === 0

    // 深夜時間の計算
    const nightStart = parseInt(settings.nightShiftStart.split(':')[0])
    const nightEnd = parseInt(settings.nightShiftEnd.split(':')[0])
    const shiftStartHour = parseInt(shift.startTime.split(':')[0])
    const shiftEndHour = parseInt(shift.endTime.split(':')[0])

    let nightShiftHours = 0
    if (shiftStartHour >= nightStart || shiftStartHour < nightEnd) {
      // 深夜時間帯の重複を計算（簡易版）
      nightShiftHours = Math.min(workingHours, 8) // 最大8時間まで
    }

    let regular = workingHours
    let overtime = 0
    let night = nightShiftHours
    let holiday = 0

    if (isHoliday) {
      holiday = workingHours
      regular = 0
    } else {
      // 残業時間の計算
      if (workingHours > settings.maxRegularHoursPerDay) {
        overtime = workingHours - settings.maxRegularHoursPerDay
        regular = settings.maxRegularHoursPerDay
      }
    }

    return { regular, overtime, night, holiday }
  }

  const exportToCSV = () => {
    if (payrollData.length === 0) return

    const headers = [
      '従業員名', '勤務日数', '通常時間', '残業時間', '深夜時間', '休日時間',
      '通常給与', '残業手当', '深夜手当', '休日手当', '総支給額'
    ]

    const csvContent = [
      headers.join(','),
      ...payrollData.map(data => [
        data.employeeName,
        data.workDays,
        data.regularHours,
        data.overtimeHours,
        data.nightShiftHours,
        data.holidayHours,
        data.regularPay,
        data.overtimePay,
        data.nightShiftPay,
        data.holidayPay,
        data.totalPay
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `payroll_${selectedPeriod.startDate}_${selectedPeriod.endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const savePayrollPeriod = async () => {
    if (!user || payrollData.length === 0) return

    try {
      const totalAmount = payrollData.reduce((sum, data) => sum + data.totalPay, 0)
      
      await addDoc(collection(db, 'payrollPeriods'), {
        organizationId: user.uid,
        startDate: selectedPeriod.startDate,
        endDate: selectedPeriod.endDate,
        totalAmount,
        employeeCount: payrollData.length,
        status: 'ready',
        calculations: payrollData,
        createdAt: new Date().toISOString()
      })

      alert('給与計算結果を保存しました。')
    } catch (error) {
      console.error('給与データの保存に失敗しました:', error)
      alert('給与データの保存に失敗しました。')
    }
  }

  const totalAmount = payrollData.reduce((sum, data) => sum + data.totalPay, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">給与計算</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* 計算設定 */}
            <Card>
              <CardHeader>
                <CardTitle>計算設定</CardTitle>
                <CardDescription>給与計算の期間と設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    期間開始日
                  </label>
                  <Input
                    type="date"
                    value={selectedPeriod.startDate}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    期間終了日
                  </label>
                  <Input
                    type="date"
                    value={selectedPeriod.endDate}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">割増設定</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        残業割増率
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        max="2"
                        value={settings.overtimeRate}
                        onChange={(e) => setSettings(prev => ({ ...prev, overtimeRate: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        深夜割増率
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        max="2"
                        value={settings.nightShiftRate}
                        onChange={(e) => setSettings(prev => ({ ...prev, nightShiftRate: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={calculatePayroll}
                  disabled={isCalculating || !selectedPeriod.startDate || !selectedPeriod.endDate}
                  className="w-full"
                >
                  {isCalculating ? '計算中...' : '給与計算実行'}
                </Button>
              </CardContent>
            </Card>

            {/* 統計サマリー */}
            <Card>
              <CardHeader>
                <CardTitle>計算結果サマリー</CardTitle>
                <CardDescription>給与計算の統計情報</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">対象従業員数</span>
                    <span className="text-2xl font-bold text-blue-600">{payrollData.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">総支給額</span>
                    <span className="text-2xl font-bold text-green-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">平均支給額</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ¥{payrollData.length > 0 ? Math.round(totalAmount / payrollData.length).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

                {payrollData.length > 0 && (
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <Button onClick={exportToCSV} variant="outline" className="w-full">
                      CSVエクスポート
                    </Button>
                    <Button onClick={savePayrollPeriod} className="w-full">
                      給与データ保存
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 対象データ */}
            <Card>
              <CardHeader>
                <CardTitle>対象データ</CardTitle>
                <CardDescription>計算に使用するデータの状況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">登録従業員</span>
                    <span className="text-lg font-bold">{employees.length}名</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">総シフト数</span>
                    <span className="text-lg font-bold">{shifts.length}件</span>
                  </div>
                  
                  {selectedPeriod.startDate && selectedPeriod.endDate && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">期間内シフト</span>
                      <span className="text-lg font-bold">
                        {shifts.filter(s => s.date >= selectedPeriod.startDate && s.date <= selectedPeriod.endDate).length}件
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 給与計算結果テーブル */}
          {payrollData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>給与計算結果</CardTitle>
                <CardDescription>
                  期間: {selectedPeriod.startDate} - {selectedPeriod.endDate}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          従業員名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          勤務日数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          通常時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          残業時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          深夜時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          総支給額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrollData.map((data, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.employeeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.workDays}日
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.regularHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.overtimeHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.nightShiftHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            ¥{data.totalPay.toLocaleString()}
                          </td>
                        </tr>
                      ))}
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
                  給与計算を行う前に、従業員とシフトを登録してください。
                </p>
                <div className="space-x-4">
                  <Button onClick={() => window.location.href = '/employees'}>
                    従業員管理へ
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/shift/create'}>
                    シフト作成へ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
