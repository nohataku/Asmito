'use client'

import { useState } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Shift } from '@/types/shift'
import { Employee } from '@/types/index'

interface ShiftBulkEditModalProps {
  shifts: Shift[]
  employees: Employee[]
  isOpen: boolean
  onClose: () => void
  onSave: (updatedShifts: Shift[]) => void
  onDelete: (shiftIds: string[]) => void
}

interface BulkEditData {
  startTime?: string
  endTime?: string
  breakTime?: number
  isConfirmed?: boolean
  notes?: string
}

export default function ShiftBulkEditModal({
  shifts,
  employees,
  isOpen,
  onClose,
  onSave,
  onDelete
}: ShiftBulkEditModalProps) {
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set())
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operation, setOperation] = useState<'edit' | 'delete'>('edit')

  const handleShiftSelection = (shiftId: string, checked: boolean) => {
    const newSelection = new Set(selectedShiftIds)
    if (checked) {
      newSelection.add(shiftId)
    } else {
      newSelection.delete(shiftId)
    }
    setSelectedShiftIds(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedShiftIds(new Set(shifts.map(shift => shift.id!)))
    } else {
      setSelectedShiftIds(new Set())
    }
  }

  const handleBulkEdit = async () => {
    if (selectedShiftIds.size === 0) {
      setError('編集するシフトを選択してください')
      return
    }

    if (bulkEditData.startTime && bulkEditData.endTime && 
        bulkEditData.startTime >= bulkEditData.endTime) {
      setError('終了時間は開始時間より後に設定してください')
      return
    }

    try {
      setLoading(true)
      const updatedShifts: Shift[] = []

      for (const shiftId of selectedShiftIds) {
        const shift = shifts.find(s => s.id === shiftId)
        if (!shift) continue

        const updatedShift = {
          ...shift,
          ...(bulkEditData.startTime && { startTime: bulkEditData.startTime }),
          ...(bulkEditData.endTime && { endTime: bulkEditData.endTime }),
          ...(bulkEditData.breakTime !== undefined && { breakTime: bulkEditData.breakTime }),
          ...(bulkEditData.isConfirmed !== undefined && { isConfirmed: bulkEditData.isConfirmed }),
          ...(bulkEditData.notes !== undefined && { notes: bulkEditData.notes }),
          updatedAt: new Date()
        }

        await updateDoc(doc(db, 'shifts', shiftId), {
          ...updatedShift,
          updatedAt: new Date()
        })

        updatedShifts.push(updatedShift)
      }

      console.log(`✅ ${updatedShifts.length}件のシフトを一括更新しました`)
      onSave(updatedShifts)
      onClose()
    } catch (error) {
      console.error('一括編集に失敗しました:', error)
      setError('一括編集に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedShiftIds.size === 0) {
      setError('削除するシフトを選択してください')
      return
    }

    if (!confirm(`選択した${selectedShiftIds.size}件のシフトを削除してもよろしいですか？`)) {
      return
    }

    try {
      setLoading(true)

      for (const shiftId of selectedShiftIds) {
        await deleteDoc(doc(db, 'shifts', shiftId))
      }

      console.log(`🗑️ ${selectedShiftIds.size}件のシフトを一括削除しました`)
      onDelete(Array.from(selectedShiftIds))
      onClose()
    } catch (error) {
      console.error('一括削除に失敗しました:', error)
      setError('一括削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalHours = () => {
    return shifts
      .filter(shift => selectedShiftIds.has(shift.id!))
      .reduce((total, shift) => {
        const start = new Date(`1970-01-01T${shift.startTime}:00`)
        const end = new Date(`1970-01-01T${shift.endTime}:00`)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }, 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>シフト一括編集</span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded">
                {error}
              </div>
            )}

            {/* 操作選択 */}
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="edit"
                  checked={operation === 'edit'}
                  onChange={(e) => setOperation(e.target.value as 'edit' | 'delete')}
                  className="mr-2"
                />
                一括編集
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="delete"
                  checked={operation === 'delete'}
                  onChange={(e) => setOperation(e.target.value as 'edit' | 'delete')}
                  className="mr-2"
                />
                一括削除
              </label>
            </div>

            {/* シフト一覧と選択 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">対象シフト選択</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedShiftIds.size === shifts.length && shifts.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="mr-2"
                    />
                    全選択
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedShiftIds.size}件選択中
                  </span>
                </div>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">選択</th>
                      <th className="p-2 text-left">日付</th>
                      <th className="p-2 text-left">従業員</th>
                      <th className="p-2 text-left">時間</th>
                      <th className="p-2 text-left">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map(shift => {
                      const employee = employees.find(emp => emp.id === shift.employeeId)
                      return (
                        <tr key={shift.id} className="border-t hover:bg-gray-50">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedShiftIds.has(shift.id!)}
                              onChange={(e) => handleShiftSelection(shift.id!, e.target.checked)}
                            />
                          </td>
                          <td className="p-2">{shift.date}</td>
                          <td className="p-2">{employee?.name || '不明'}</td>
                          <td className="p-2">{shift.startTime} - {shift.endTime}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              shift.isConfirmed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {shift.isConfirmed ? '確定' : '未確定'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {selectedShiftIds.size > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded">
                  <div className="text-sm text-blue-800">
                    選択されたシフト: {selectedShiftIds.size}件
                    （総勤務時間: {calculateTotalHours().toFixed(1)}時間）
                  </div>
                </div>
              )}
            </div>

            {/* 編集フォーム（編集モードの場合のみ） */}
            {operation === 'edit' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">編集内容</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始時間
                    </label>
                    <Input
                      type="time"
                      value={bulkEditData.startTime || ''}
                      onChange={(e) => setBulkEditData(prev => ({ 
                        ...prev, 
                        startTime: e.target.value || undefined 
                      }))}
                      disabled={loading}
                      placeholder="変更しない場合は空にしてください"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了時間
                    </label>
                    <Input
                      type="time"
                      value={bulkEditData.endTime || ''}
                      onChange={(e) => setBulkEditData(prev => ({ 
                        ...prev, 
                        endTime: e.target.value || undefined 
                      }))}
                      disabled={loading}
                      placeholder="変更しない場合は空にしてください"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      休憩時間（分）
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={bulkEditData.breakTime ?? ''}
                      onChange={(e) => setBulkEditData(prev => ({ 
                        ...prev, 
                        breakTime: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      disabled={loading}
                      placeholder="変更しない場合は空にしてください"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      確定状態
                    </label>
                    <select
                      value={bulkEditData.isConfirmed === undefined ? '' : bulkEditData.isConfirmed.toString()}
                      onChange={(e) => setBulkEditData(prev => ({ 
                        ...prev, 
                        isConfirmed: e.target.value === '' ? undefined : e.target.value === 'true' 
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={loading}
                    >
                      <option value="">変更しない</option>
                      <option value="true">確定済み</option>
                      <option value="false">未確定</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備考
                  </label>
                  <textarea
                    value={bulkEditData.notes ?? ''}
                    onChange={(e) => setBulkEditData(prev => ({ 
                      ...prev, 
                      notes: e.target.value || undefined 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    disabled={loading}
                    placeholder="変更しない場合は空にしてください"
                  />
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={onClose}
                disabled={loading}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700"
              >
                キャンセル
              </Button>
              {operation === 'edit' ? (
                <Button
                  onClick={handleBulkEdit}
                  disabled={loading || selectedShiftIds.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? '更新中...' : `💾 ${selectedShiftIds.size}件を更新`}
                </Button>
              ) : (
                <Button
                  onClick={handleBulkDelete}
                  disabled={loading || selectedShiftIds.size === 0}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? '削除中...' : `🗑️ ${selectedShiftIds.size}件を削除`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
