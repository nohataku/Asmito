'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Layout from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Shift, Employee } from '@/types'

interface ReportData {
  totalShifts: number
  totalHours: number
  totalCost: number
  employeeStats: Array<{
    employee: Employee
    shiftsCount: number
    totalHours: number
    totalCost: number
  }>
  dailyStats: Array<{
    date: string
    shiftsCount: number
    totalHours: number
    totalCost: number
  }>
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // シフトデータを取得
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('date', '>=', dateRange.startDate),
        where('date', '<=', dateRange.endDate),
        orderBy('date', 'asc')
      )
      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shifts: Shift[] = shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift))

      // 従業員データを取得
      const employeesSnapshot = await getDocs(collection(db, 'employees'))
      const employees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee))

      // レポートデータを計算
      const totalShifts = shifts.length
      const totalHours = shifts.reduce((sum, shift) => {
        const start = new Date(`1970-01-01T${shift.startTime}:00`)
        const end = new Date(`1970-01-01T${shift.endTime}:00`)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

      // 従業員別統計
      const employeeStats = employees.map(employee => {
        const employeeShifts = shifts.filter(shift => shift.employeeId === employee.id)
        const shiftsCount = employeeShifts.length
        const totalHours = employeeShifts.reduce((sum, shift) => {
          const start = new Date(`1970-01-01T${shift.startTime}:00`)
          const end = new Date(`1970-01-01T${shift.endTime}:00`)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }, 0)
        const totalCost = totalHours * employee.hourlyRate

        return {
          employee,
          shiftsCount,
          totalHours,
          totalCost
        }
      }).filter(stat => stat.shiftsCount > 0) // シフトがある従業員のみ

      // 日別統計
      const dailyStatsMap = new Map<string, { shiftsCount: number; totalHours: number; totalCost: number }>()
      
      shifts.forEach(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId)
        if (!employee) return

        const start = new Date(`1970-01-01T${shift.startTime}:00`)
        const end = new Date(`1970-01-01T${shift.endTime}:00`)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        const cost = hours * employee.hourlyRate

        if (!dailyStatsMap.has(shift.date)) {
          dailyStatsMap.set(shift.date, { shiftsCount: 0, totalHours: 0, totalCost: 0 })
        }

        const dayStats = dailyStatsMap.get(shift.date)!
        dayStats.shiftsCount += 1
        dayStats.totalHours += hours
        dayStats.totalCost += cost
      })

      const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
        date,
        ...stats
      })).sort((a, b) => a.date.localeCompare(b.date))

      const totalCost = employeeStats.reduce((sum, stat) => sum + stat.totalCost, 0)

      setReportData({
        totalShifts,
        totalHours,
        totalCost,
        employeeStats,
        dailyStats
      })
    } catch (error) {
      console.error('レポートデータの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const exportCSV = () => {
    if (!reportData) return

    const csvData = [
      ['従業員名', 'シフト数', '労働時間', '人件費'],
      ...reportData.employeeStats.map(stat => [
        stat.employee.name,
        stat.shiftsCount.toString(),
        stat.totalHours.toFixed(1),
        stat.totalCost.toLocaleString()
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `シフトレポート_${dateRange.startDate}_${dateRange.endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
          <Button onClick={exportCSV} disabled={!reportData}>
            📊 CSVエクスポート
          </Button>
        </div>

        {/* 期間選択 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">期間選択</h2>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">レポートを生成中...</p>
          </div>
        ) : reportData ? (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">総シフト数</h3>
                <p className="text-3xl font-bold text-blue-600">{reportData.totalShifts}件</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">総労働時間</h3>
                <p className="text-3xl font-bold text-green-600">{reportData.totalHours.toFixed(1)}時間</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">総人件費</h3>
                <p className="text-3xl font-bold text-purple-600">¥{reportData.totalCost.toLocaleString()}</p>
              </Card>
            </div>

            {/* 従業員別統計 */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">従業員別統計</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">従業員名</th>
                      <th className="px-4 py-2 text-right">シフト数</th>
                      <th className="px-4 py-2 text-right">労働時間</th>
                      <th className="px-4 py-2 text-right">時給</th>
                      <th className="px-4 py-2 text-right">人件費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.employeeStats.map((stat, index) => (
                      <tr key={stat.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium">{stat.employee.name}</td>
                        <td className="px-4 py-2 text-right">{stat.shiftsCount}件</td>
                        <td className="px-4 py-2 text-right">{stat.totalHours.toFixed(1)}時間</td>
                        <td className="px-4 py-2 text-right">¥{stat.employee.hourlyRate.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-semibold">¥{stat.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 日別統計 */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">日別統計</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">日付</th>
                      <th className="px-4 py-2 text-right">シフト数</th>
                      <th className="px-4 py-2 text-right">労働時間</th>
                      <th className="px-4 py-2 text-right">人件費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.dailyStats.map((stat, index) => (
                      <tr key={stat.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium">{stat.date}</td>
                        <td className="px-4 py-2 text-right">{stat.shiftsCount}件</td>
                        <td className="px-4 py-2 text-right">{stat.totalHours.toFixed(1)}時間</td>
                        <td className="px-4 py-2 text-right">¥{stat.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">データがありません</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
