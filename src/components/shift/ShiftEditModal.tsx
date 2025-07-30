'use client'

import { useState, useEffect } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Shift } from '@/types/shift'
import { Employee } from '@/types/index'

interface ShiftEditModalProps {
  shift: Shift | null
  employees: Employee[]
  isOpen: boolean
  onClose: () => void
  onSave: (updatedShift: Shift) => void
  onDelete: (shiftId: string) => void
}

export default function ShiftEditModal({
  shift,
  employees,
  isOpen,
  onClose,
  onSave,
  onDelete
}: ShiftEditModalProps) {
  const [formData, setFormData] = useState<Partial<Shift>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (shift) {
      setFormData({
        ...shift,
        startTime: shift.startTime.length === 5 ? shift.startTime : shift.startTime.padStart(5, '0'),
        endTime: shift.endTime.length === 5 ? shift.endTime : shift.endTime.padStart(5, '0')
      })
    }
  }, [shift])

  const handleInputChange = (field: keyof Shift, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.employeeId) {
      setError('従業員を選択してください')
      return false
    }
    if (!formData.date) {
      setError('日付を入力してください')
      return false
    }
    if (!formData.startTime || !formData.endTime) {
      setError('開始時間と終了時間を入力してください')
      return false
    }
    if (formData.startTime >= formData.endTime) {
      setError('終了時間は開始時間より後に設定してください')
      return false
    }
    return true
  }

  const calculateDuration = (): number => {
    if (!formData.startTime || !formData.endTime) return 0
    const start = new Date(`1970-01-01T${formData.startTime}:00`)
    const end = new Date(`1970-01-01T${formData.endTime}:00`)
    const diffMs = end.getTime() - start.getTime()
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100
  }

  const handleSave = async () => {
    if (!shift || !validateForm()) return

    try {
      setLoading(true)
      
      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId)
      if (!selectedEmployee) {
        setError('選択された従業員が見つかりません')
        return
      }

      const updatedShift: Shift = {
        ...shift,
        ...formData,
        employeeName: selectedEmployee.name,
        position: selectedEmployee.position || formData.position || '',
        department: selectedEmployee.department || formData.department || '',
        hourlyRate: selectedEmployee.hourlyRate || formData.hourlyRate || 0,
        updatedAt: new Date()
      }

      // Firestoreに保存
      await updateDoc(doc(db, 'shifts', shift.id!), {
        ...updatedShift,
        updatedAt: new Date()
      })

      console.log('✅ シフトを更新しました:', updatedShift)
      onSave(updatedShift)
      onClose()
    } catch (error) {
      console.error('シフトの更新に失敗しました:', error)
      setError('シフトの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!shift || !confirm('このシフトを削除してもよろしいですか？')) return

    try {
      setLoading(true)
      await deleteDoc(doc(db, 'shifts', shift.id!))
      console.log('🗑️ シフトを削除しました:', shift.id)
      onDelete(shift.id!)
      onClose()
    } catch (error) {
      console.error('シフトの削除に失敗しました:', error)
      setError('シフトの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !shift) return null

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>シフト編集</span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded">
                {error}
              </div>
            )}

            {/* 従業員選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                従業員 *
              </label>
              <select
                value={formData.employeeId || ''}
                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="">従業員を選択</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.department})
                  </option>
                ))}
              </select>
            </div>

            {/* 日付 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日付 *
              </label>
              <Input
                type="date"
                value={formData.date || ''}
                onChange={(e) => handleInputChange('date', e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 時間設定 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時間 *
                </label>
                <Input
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了時間 *
                </label>
                <Input
                  type="time"
                  value={formData.endTime || ''}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 勤務時間表示 */}
            {formData.startTime && formData.endTime && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-800">
                  勤務時間: {calculateDuration()}時間
                </div>
                {selectedEmployee && (
                  <div className="text-sm text-blue-600 mt-1">
                    予想給与: ¥{(calculateDuration() * selectedEmployee.hourlyRate).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* 休憩時間 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                休憩時間（分）
              </label>
              <Input
                type="number"
                min="0"
                value={formData.breakTime || 0}
                onChange={(e) => handleInputChange('breakTime', parseInt(e.target.value) || 0)}
                disabled={loading}
              />
            </div>

            {/* 備考 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                disabled={loading}
                placeholder="特記事項があれば入力してください"
              />
            </div>

            {/* 確認状態 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isConfirmed"
                checked={formData.isConfirmed || false}
                onChange={(e) => handleInputChange('isConfirmed', e.target.checked)}
                className="mr-2"
                disabled={loading}
              />
              <label htmlFor="isConfirmed" className="text-sm text-gray-700">
                確定済み
              </label>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-between pt-4">
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? '削除中...' : '🗑️ 削除'}
              </Button>
              <div className="space-x-2">
                <Button
                  onClick={onClose}
                  disabled={loading}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? '保存中...' : '💾 保存'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
