'use client'

import { useState, useRef, useEffect } from 'react'
import { Shift } from '@/types/shift'
import { Employee } from '@/types/employee'
import { Button } from './ui/Button'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import ShiftEditModal from './shift/ShiftEditModal'

interface GanttChartProps {
  shifts: Shift[]
  employees: Employee[]
  startDate: string
  endDate: string
  operatingHours?: {
    start: string
    end: string
  }
  onShiftUpdate?: (updatedShift: Shift) => void
  onShiftDelete?: (shiftId: string) => void
}

interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf' | 'excel' | 'csv'
  title: string
  includeEmployeeInfo: boolean
  includeStatistics: boolean
}

export default function GanttChart({ 
  shifts, 
  employees, 
  startDate, 
  endDate, 
  operatingHours = { start: '06:00', end: '24:00' },
  onShiftUpdate,
  onShiftDelete
}: GanttChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    title: 'シフト表',
    includeEmployeeInfo: true,
    includeStatistics: true
  })
  const [showExportModal, setShowExportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showShiftEditModal, setShowShiftEditModal] = useState(false)

  // 日付範囲を生成
  const dateRange = generateDateRange(startDate, endDate)
  
  // 営業時間に基づいて時間範囲を動的生成
  const generateTimeRange = (start: string, end: string) => {
    const startHour = parseInt(start.split(':')[0])
    const endHour = parseInt(end.split(':')[0])
    
    // 24時間を超える場合（例: 22:00-06:00）
    if (endHour <= startHour) {
      const range = []
      // 開始時間から24時まで
      for (let i = startHour; i < 24; i++) {
        range.push(`${i.toString().padStart(2, '0')}:00`)
      }
      // 0時から終了時間まで
      for (let i = 0; i <= endHour; i++) {
        range.push(`${i.toString().padStart(2, '0')}:00`)
      }
      return range
    } else {
      // 通常の営業時間
      const range = []
      for (let i = startHour; i <= endHour; i++) {
        range.push(`${i.toString().padStart(2, '0')}:00`)
      }
      return range
    }
  }
  
  const timeRange = generateTimeRange(operatingHours.start, operatingHours.end)

  const exportAsImage = async (format: 'png' | 'jpeg') => {
    if (!chartRef.current) return

    try {
      setIsExporting(true)
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      })

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${exportOptions.title}.${format}`)
        }
      }, `image/${format}`)
    } catch (error) {
      console.error('画像エクスポートに失敗しました:', error)
      alert('画像エクスポートに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsPDF = async () => {
    if (!chartRef.current) return

    try {
      setIsExporting(true)
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 297 // A4 landscape width
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${exportOptions.title}.pdf`)
    } catch (error) {
      console.error('PDFエクスポートに失敗しました:', error)
      alert('PDFエクスポートに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsExcel = () => {
    try {
      setIsExporting(true)
      const wb = XLSX.utils.book_new()

      // シフトデータのワークシート
      const shiftData = shifts.map(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId)
        return {
          日付: shift.date,
          従業員名: employee?.name || '不明',
          従業員ID: employee?.id || '',
          開始時間: shift.startTime,
          終了時間: shift.endTime,
          勤務時間: calculateShiftDuration(shift.startTime, shift.endTime),
          ポジション: shift.position || 'staff'
        }
      })

      const ws1 = XLSX.utils.json_to_sheet(shiftData)
      XLSX.utils.book_append_sheet(wb, ws1, 'シフト詳細')

      // 従業員別統計のワークシート
      if (exportOptions.includeStatistics) {
        const employeeStats = employees.map(employee => {
          const employeeShifts = shifts.filter(shift => shift.employeeId === employee.id)
          const totalHours = employeeShifts.reduce((sum, shift) => 
            sum + calculateShiftDuration(shift.startTime, shift.endTime), 0
          )
          
          return {
            従業員名: employee.name,
            従業員ID: employee.id,
            シフト日数: employeeShifts.length,
            総勤務時間: totalHours,
            平均勤務時間: employeeShifts.length > 0 ? (totalHours / employeeShifts.length).toFixed(1) : 0,
            部署: employee.department || '',
            役職: employee.position || ''
          }
        })

        const ws2 = XLSX.utils.json_to_sheet(employeeStats)
        XLSX.utils.book_append_sheet(wb, ws2, '従業員別統計')
      }

      XLSX.writeFile(wb, `${exportOptions.title}.xlsx`)
    } catch (error) {
      console.error('Excelエクスポートに失敗しました:', error)
      alert('Excelエクスポートに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsCSV = () => {
    try {
      setIsExporting(true)
      const csvData = shifts.map(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId)
        return [
          shift.date,
          employee?.name || '不明',
          employee?.id || '',
          shift.startTime,
          shift.endTime,
          calculateShiftDuration(shift.startTime, shift.endTime),
          shift.position || 'staff'
        ]
      })

      const headers = ['日付', '従業員名', '従業員ID', '開始時間', '終了時間', '勤務時間', 'ポジション']
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `${exportOptions.title}.csv`)
    } catch (error) {
      console.error('CSVエクスポートに失敗しました:', error)
      alert('CSVエクスポートに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = async () => {
    switch (exportOptions.format) {
      case 'png':
      case 'jpeg':
        await exportAsImage(exportOptions.format)
        break
      case 'pdf':
        await exportAsPDF()
        break
      case 'excel':
        exportAsExcel()
        break
      case 'csv':
        exportAsCSV()
        break
    }
    setShowExportModal(false)
  }

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift)
    setShowShiftEditModal(true)
  }

  const handleShiftUpdate = (updatedShift: Shift) => {
    if (onShiftUpdate) {
      onShiftUpdate(updatedShift)
    }
  }

  const handleShiftDelete = (shiftId: string) => {
    if (onShiftDelete) {
      onShiftDelete(shiftId)
    }
  }

  const getShiftForEmployeeAndTime = (employeeId: string, date: string, time: string) => {
    return shifts.find(shift => {
      if (shift.employeeId !== employeeId || shift.date !== date) return false
      
      const shiftStart = timeToMinutes(shift.startTime)
      const shiftEnd = timeToMinutes(shift.endTime)
      const currentTime = timeToMinutes(time)
      
      return currentTime >= shiftStart && currentTime < shiftEnd
    })
  }

  const getShiftBarStyle = (shift: Shift, date: string) => {
    const startTime = timeToMinutes(shift.startTime)
    const endTime = timeToMinutes(shift.endTime)
    const dayStart = timeToMinutes(operatingHours.start)
    const dayEnd = timeToMinutes(operatingHours.end)
    
    // 営業時間が日をまたぐ場合の処理
    let actualDayEnd = dayEnd
    if (dayEnd <= dayStart) {
      actualDayEnd = dayEnd + 24 * 60
    }
    
    const left = ((startTime - dayStart) / (actualDayEnd - dayStart)) * 100
    const width = ((endTime - startTime) / (actualDayEnd - dayStart)) * 100
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - Math.max(0, left), width)}%`
    }
  }

  return (
    <div className="space-y-4">
      {/* エクスポートボタン */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">ガントチャート型シフト表</h3>
        <Button onClick={() => setShowExportModal(true)}>
          エクスポート
        </Button>
      </div>

      {/* ガントチャート */}
      <div ref={chartRef} className="bg-white border rounded-lg overflow-hidden">
        {/* ヘッダー */}
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-center">{exportOptions.title}</h2>
          <p className="text-sm text-gray-600 text-center">
            期間: {new Date(startDate).toLocaleDateString('ja-JP')} ～ {new Date(endDate).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* スクロール可能コンテナ */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* タイムヘッダー */}
            <div className="grid grid-cols-[200px_1fr] border-b">
              <div className="p-3 bg-gray-100 border-r">
                <strong>従業員 / 時間</strong>
              </div>
              <div className="flex text-xs">
                {timeRange.map(time => (
                  <div key={time} className="flex-none p-2 text-center border-r border-gray-200 bg-gray-100 w-20">
                    {time}
                  </div>
                ))}
              </div>
            </div>

            {/* 日付ヘッダー */}
            {dateRange.map(date => (
              <div key={date}>
                <div className="grid grid-cols-[200px_1fr] border-b bg-blue-50">
                  <div className="p-2 bg-blue-100 border-r font-medium">
                    {new Date(date).toLocaleDateString('ja-JP', { 
                      month: 'short', 
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </div>
                  <div className="h-8 flex">
                    {timeRange.map(time => (
                      <div key={time} className="flex-none w-20 border-r border-gray-200"></div>
                    ))}
                  </div>
                </div>

                {/* 従業員行 */}
                {employees.map(employee => (
                  <div key={`${employee.id}-${date}`} className="grid grid-cols-[200px_1fr] border-b hover:bg-gray-50">
                    <div className="p-3 border-r">
                      <div className="font-medium text-sm">{employee.name}</div>
                      <div className="text-xs text-gray-500">{employee.department}</div>
                    </div>
                    <div className="relative h-12 flex">
                      {/* 時間グリッド */}
                      {timeRange.map((time, index) => (
                        <div key={time} className="flex-none w-20 border-r border-gray-100 h-full relative">
                          {/* シフトバー（この時間帯に含まれる場合のみ表示） */}
                          {shifts
                            .filter(shift => {
                              if (shift.employeeId !== employee.id || shift.date !== date) return false
                              const shiftStart = timeToMinutes(shift.startTime)
                              const shiftEnd = timeToMinutes(shift.endTime)
                              const timeStart = timeToMinutes(time)
                              const timeEnd = timeStart + 60
                              return shiftStart < timeEnd && shiftEnd > timeStart
                            })
                            .map((shift, shiftIndex) => {
                              const shiftStart = timeToMinutes(shift.startTime)
                              const shiftEnd = timeToMinutes(shift.endTime)
                              const timeStart = timeToMinutes(time)
                              const timeEnd = timeStart + 60
                              
                              // この時間帯でのシフトバーの位置とサイズを計算
                              const overlapStart = Math.max(shiftStart, timeStart)
                              const overlapEnd = Math.min(shiftEnd, timeEnd)
                              const overlapDuration = overlapEnd - overlapStart
                              
                              if (overlapDuration <= 0) return null
                              
                              const leftPercent = ((overlapStart - timeStart) / 60) * 100
                              const widthPercent = (overlapDuration / 60) * 100
                              
                              return (
                                <div
                                  key={shiftIndex}
                                  className="absolute top-1 bottom-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded px-1 flex items-center justify-center z-10 overflow-hidden cursor-pointer transition-colors"
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`
                                  }}
                                  title={`${shift.startTime} - ${shift.endTime} (クリックで編集)`}
                                  onClick={() => handleShiftClick(shift)}
                                >
                                  {/* 開始時刻のみの時間帯では時間を表示 */}
                                  {timeToMinutes(time) === shiftStart && (
                                    <span className="truncate text-[10px] leading-tight">
                                      {shift.startTime.slice(0, 5)}-{shift.endTime.slice(0, 5)}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 統計情報 */}
        {exportOptions.includeStatistics && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>総シフト数:</strong> {shifts.length}
              </div>
              <div>
                <strong>総勤務時間:</strong> {
                  shifts.reduce((sum, shift) => 
                    sum + calculateShiftDuration(shift.startTime, shift.endTime), 0
                  ).toFixed(1)
                }時間
              </div>
              <div>
                <strong>平均勤務時間/人:</strong> {
                  employees.length > 0 
                    ? (shifts.reduce((sum, shift) => 
                        sum + calculateShiftDuration(shift.startTime, shift.endTime), 0
                      ) / employees.length).toFixed(1)
                    : 0
                }時間
              </div>
            </div>
          </div>
        )}
      </div>

      {/* エクスポートモーダル */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">エクスポート設定</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ファイル形式
                </label>
                <select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    format: e.target.value as ExportOptions['format']
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="png">PNG画像</option>
                  <option value="jpeg">JPEG画像</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ファイル名
                </label>
                <input
                  type="text"
                  value={exportOptions.title}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeEmployeeInfo}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeEmployeeInfo: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  従業員情報を含める
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStatistics}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeStatistics: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  統計情報を含める
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="flex-1"
              >
                {isExporting ? 'エクスポート中...' : 'エクスポート'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowExportModal(false)}
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* シフト編集モーダル */}
      <ShiftEditModal
        shift={selectedShift}
        employees={employees}
        isOpen={showShiftEditModal}
        onClose={() => {
          setShowShiftEditModal(false)
          setSelectedShift(null)
        }}
        onSave={handleShiftUpdate}
        onDelete={handleShiftDelete}
      />
    </div>
  )
}

// ユーティリティ関数
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = Math.floor(minutes % 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return Math.round((end - start) / 60 * 100) / 100
}
