'use client'

import { useState } from 'react'
import GanttChart from '@/components/GanttChart'
import { Employee, Shift } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// テスト用サンプルデータ
const sampleEmployees: Employee[] = [
  {
    id: 'emp1',
    organizationId: 'org1',
    employeeId: 'EMP001',
    name: '田中太郎',
    department: 'レジ',
    position: 'スタッフ',
    hourlyRate: 1000,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'emp2',
    organizationId: 'org1',
    employeeId: 'EMP002',
    name: '佐藤花子',
    department: 'キッチン',
    position: 'シフトリーダー',
    hourlyRate: 1200,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'emp3',
    organizationId: 'org1',
    employeeId: 'EMP003',
    name: '山田次郎',
    department: 'ホール',
    position: 'スタッフ',
    hourlyRate: 1100,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'emp4',
    organizationId: 'org1',
    employeeId: 'EMP004',
    name: '鈴木三郎',
    department: 'レジ',
    position: 'マネージャー',
    hourlyRate: 1500,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }
]

const generateSampleShifts = (startDate: string, endDate: string): Shift[] => {
  const shifts: Shift[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // 各日付に対してシフトを生成
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    
    // 各従業員に対してランダムにシフトを割り当て
    sampleEmployees.forEach((employee, index) => {
      // 50%の確率でシフトを作成
      if (Math.random() > 0.5) {
        const startHour = 9 + Math.floor(Math.random() * 6) // 9-14時開始
        const duration = 4 + Math.floor(Math.random() * 5) // 4-8時間勤務
        
        shifts.push({
          id: `shift_${employee.id}_${dateString}`,
          employeeId: employee.id,
          date: dateString,
          startTime: `${startHour.toString().padStart(2, '0')}:00`,
          endTime: `${(startHour + duration).toString().padStart(2, '0')}:00`,
          position: employee.position || 'staff',
          isConfirmed: Math.random() > 0.3,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    })
  }
  
  return shifts
}

export default function TestGanttPage() {
  const [dateRange, setDateRange] = useState({
    startDate: '2025-07-26',
    endDate: '2025-08-01'
  })
  
  const [shifts, setShifts] = useState<Shift[]>(() => 
    generateSampleShifts(dateRange.startDate, dateRange.endDate)
  )

  const regenerateShifts = () => {
    const newShifts = generateSampleShifts(dateRange.startDate, dateRange.endDate)
    setShifts(newShifts)
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newRange = { ...dateRange, [field]: value }
    setDateRange(newRange)
    
    if (newRange.startDate && newRange.endDate) {
      const newShifts = generateSampleShifts(newRange.startDate, newRange.endDate)
      setShifts(newShifts)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">ガントチャート機能テスト</h1>
          
          {/* 設定パネル */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>テスト設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={regenerateShifts} className="w-full">
                    サンプルシフト再生成
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 統計情報 */}
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
                  <div className="text-2xl font-bold text-green-600">{sampleEmployees.length}</div>
                  <div className="text-sm text-gray-600">従業員数</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {shifts.reduce((sum, shift) => {
                      const start = new Date(`1970-01-01T${shift.startTime}:00`)
                      const end = new Date(`1970-01-01T${shift.endTime}:00`)
                      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                    }, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">総勤務時間</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {shifts.filter(s => s.isConfirmed).length}
                  </div>
                  <div className="text-sm text-gray-600">確定済シフト</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ガントチャート */}
          <GanttChart
            shifts={shifts}
            employees={sampleEmployees}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />

          {/* 従業員一覧 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>テスト用従業員データ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sampleEmployees.map(employee => (
                  <div key={employee.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.department}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                    <div className="text-sm text-indigo-600">¥{employee.hourlyRate}/時</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
