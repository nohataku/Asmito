'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { EmployeeService } from '@/services/employeeService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertModal, ConfirmModal } from '@/components/ui/Modal'
import { useModal } from '@/hooks/useModal'
import { ShiftPaymentCalculator } from '@/components/ShiftPaymentCalculator'
import { Employee, HourlyRates, AvailableShiftTypes } from '@/types/employee'
import { generateDefaultHourlyRates, DEFAULT_SHIFT_TIME_RANGES } from '@/lib/shiftTimeUtils'
import Layout from '@/components/layout/Layout'

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const { alertState, confirmState, showAlert, closeAlert, showConfirm, closeConfirm } = useModal()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showPaymentCalculator, setShowPaymentCalculator] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employeeId: '',
    hourlyRate: '',
    position: '',
    maxHoursPerWeek: '',
    maxDaysPerWeek: '',
    // 時間帯別時給
    morningRate: '',
    dayRate: '',
    nightRate: '',
    // 勤務可能時間帯
    availableMorning: false,
    availableDay: false,
    availableEvening: false,
    availableNight: false
  })

  // 基本時給から時間帯別時給を自動設定
  const handleAutoCalculateRates = () => {
    const baseRate = parseInt(formData.hourlyRate) || 0;
    if (baseRate > 0) {
      const defaultRates = generateDefaultHourlyRates(baseRate);
      setFormData(prev => ({
        ...prev,
        morningRate: defaultRates.morning.toString(),
        dayRate: defaultRates.day.toString(),
        nightRate: defaultRates.night.toString()
      }));
    }
  };

  // フォームリセット関数
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      employeeId: '',
      hourlyRate: '',
      position: '',
      maxHoursPerWeek: '',
      maxDaysPerWeek: '',
      morningRate: '',
      dayRate: '',
      nightRate: '',
      availableMorning: false,
      availableDay: false,
      availableEvening: false,
      availableNight: false
    })
  }

  useEffect(() => {
    fetchEmployees()
  }, [user])

  const fetchEmployees = async () => {
    if (!user) return

    try {
      console.log('従業員データを取得中...', { organizationId: user.uid })
      // 通常のアクティブ従業員のみ取得
      const employeeList = await EmployeeService.getEmployees(user.uid)
      console.log(`従業員データを取得しました: ${employeeList.length}件`, employeeList)
      setEmployees(employeeList as Employee[])
    } catch (error) {
      console.error('従業員データの取得に失敗しました:', error)
      showAlert('従業員データの取得に失敗しました。', { type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // 時間帯別時給の作成
      const baseRate = parseInt(formData.hourlyRate) || 0;
      const hourlyRates: HourlyRates | undefined = 
        formData.morningRate || formData.dayRate || formData.nightRate ? {
          morning: parseInt(formData.morningRate) || baseRate,
          day: parseInt(formData.dayRate) || baseRate,
          night: parseInt(formData.nightRate) || baseRate
        } : undefined

      // 勤務可能時間帯の作成
      const availableShiftTypes: AvailableShiftTypes | undefined = 
        formData.availableMorning || formData.availableDay || formData.availableEvening || formData.availableNight ? {
          morning: formData.availableMorning,
          day: formData.availableDay,
          evening: formData.availableEvening,
          night: formData.availableNight
        } : undefined

      const employeeData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        hourlyRate: parseInt(formData.hourlyRate),
        hourlyRates,
        position: formData.position,
        maxHoursPerWeek: formData.maxHoursPerWeek ? parseInt(formData.maxHoursPerWeek) : undefined,
        maxDaysPerWeek: formData.maxDaysPerWeek ? parseInt(formData.maxDaysPerWeek) : undefined,
        availableShiftTypes,
        department: formData.position, // 部署は一旦役職と同じにする
        joinDate: new Date().toISOString().split('T')[0] // 今日の日付
      }

      if (editingEmployee) {
        // 更新
        await EmployeeService.updateEmployee(editingEmployee.id, employeeData)
      } else {
        // 新規追加
        await EmployeeService.addEmployee(user.uid, employeeData)
      }

      // フォームリセット
      resetForm()
      setShowAddForm(false)
      setEditingEmployee(null)
      fetchEmployees()
    } catch (error) {
      console.error('従業員の保存に失敗しました:', error)
      showAlert('従業員の保存に失敗しました。', { type: 'error' })
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      employeeId: employee.employeeId || '',
      hourlyRate: employee.hourlyRate.toString(),
      position: employee.position || '',
      maxHoursPerWeek: employee.maxHoursPerWeek?.toString() || '',
      maxDaysPerWeek: employee.maxDaysPerWeek?.toString() || '',
      morningRate: employee.hourlyRates?.morning?.toString() || '',
      dayRate: employee.hourlyRates?.day?.toString() || '',
      nightRate: employee.hourlyRates?.night?.toString() || '',
      availableMorning: employee.availableShiftTypes?.morning || false,
      availableDay: employee.availableShiftTypes?.day || false,
      availableEvening: employee.availableShiftTypes?.evening || false,
      availableNight: employee.availableShiftTypes?.night || false
    })
    setShowAddForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    const deleteConfirm = await showConfirm(
      'この従業員を完全削除しますか？\n\n' +
      '⚠️ 注意: この操作は取り消せません。\n' +
      'データベースから完全に削除されます。',
      {
        title: '従業員の削除',
        confirmText: '完全削除',
        cancelText: 'キャンセル',
        type: 'danger'
      }
    );
    
    if (!deleteConfirm) return;

    // Shift+Ctrlキーが押されている場合はソフトデリートのオプションを表示
    const isSoftDeleteRequested = window.event && 
      (window.event as KeyboardEvent).shiftKey && 
      (window.event as KeyboardEvent).ctrlKey;

    let useSoftDelete = false;
    if (isSoftDeleteRequested) {
      useSoftDelete = await showConfirm(
        'ソフトデリートモード\n\n' +
        'この従業員のデータを非表示にしますか？\n' +
        '（データは保持され、後で復元可能）',
        {
          title: 'ソフトデリート',
          confirmText: 'ソフトデリート',
          cancelText: '完全削除',
          type: 'warning'
        }
      );
    }

    try {
      console.log('従業員削除を開始:', employeeId, useSoftDelete ? '(ソフトデリート)' : '(完全削除)')
      
      if (useSoftDelete) {
        const deletedData = await EmployeeService.deleteEmployee(employeeId)
        const totalDeleted = deletedData.shiftRequests + deletedData.shifts
        const message = totalDeleted > 0 
          ? `従業員を非表示にしました。\n関連データも削除: シフト希望${deletedData.shiftRequests}件、確定シフト${deletedData.shifts}件`
          : '従業員を非表示にしました。'
        showAlert(message, { type: 'success' })
      } else {
        const deletedData = await EmployeeService.hardDeleteEmployee(employeeId)
        const totalDeleted = deletedData.shiftRequests + deletedData.shifts
        const message = totalDeleted > 0 
          ? `従業員を完全削除しました。\n関連データも削除: シフト希望${deletedData.shiftRequests}件、確定シフト${deletedData.shifts}件`
          : '従業員を完全削除しました。'
        showAlert(message, { type: 'success' })
      }
      
      console.log('従業員削除が完了しました:', employeeId)
      fetchEmployees()
    } catch (error) {
      console.error('従業員の削除に失敗しました:', error)
      showAlert(`従業員の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`, { type: 'error' })
    }
  }

  const addSampleData = async () => {
    if (!user) return

    const sampleEmployees = [
      {
        name: '田中太郎',
        email: 'tanaka@example.com',
        department: 'フロント',
        position: 'スタッフ',
        hourlyRate: 1000,
        joinDate: '2025-01-01',
        phone: '090-1234-5678'
      },
      {
        name: '佐藤花子',
        email: 'sato@example.com', 
        department: 'キッチン',
        position: 'シェフ',
        hourlyRate: 1200,
        joinDate: '2025-01-01',
        phone: '090-2345-6789'
      },
      {
        name: '山田次郎',
        email: 'yamada@example.com',
        department: 'フロント',
        position: 'マネージャー',
        hourlyRate: 1500,
        joinDate: '2025-01-01',
        phone: '090-3456-7890'
      }
    ]

    try {
      for (const employeeData of sampleEmployees) {
        await EmployeeService.addEmployee(user.uid, employeeData)
      }
      fetchEmployees()
      showAlert('サンプル従業員データを追加しました。', { type: 'success' })
    } catch (error) {
      console.error('サンプルデータの追加に失敗しました:', error)
      showAlert('サンプルデータの追加に失敗しました。', { type: 'error' })
    }
  }

  const fixExistingData = async () => {
    if (!user) return

    try {
      console.log('既存データの修正を開始...')
      const fixedCount = await EmployeeService.fixEmployeeData(user.uid)
      console.log(`データ修正完了: ${fixedCount}件`)
      showAlert(`${fixedCount}件の従業員データを修正しました。`, { type: 'success' })
      fetchEmployees()
    } catch (error) {
      console.error('データ修正に失敗しました:', error)
      showAlert('データ修正に失敗しました。', { type: 'error' })
    }
  }

  const cancelEdit = () => {
    setEditingEmployee(null)
    setShowAddForm(false)
    resetForm()
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">従業員管理</h1>
            <div className="space-x-2">
              {employees.length === 0 && (
                <Button variant="outline" onClick={addSampleData}>
                  サンプルデータを追加
                </Button>
              )}
              <Button variant="outline" onClick={fixExistingData}>
                既存データを修正
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                従業員追加
              </Button>
            </div>
          </div>

          {/* 従業員追加・編集フォーム */}
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {editingEmployee ? '従業員情報編集' : '新規従業員追加'}
                </CardTitle>
                <CardDescription>
                  従業員の基本情報と勤務条件を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">基本情報</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        name="name"
                        placeholder="氏名"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                      <Input
                        name="employeeId"
                        placeholder="従業員ID（任意）"
                        value={formData.employeeId}
                        onChange={handleInputChange}
                      />
                      <Input
                        name="email"
                        type="email"
                        placeholder="メールアドレス"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                      <Input
                        name="phone"
                        placeholder="電話番号"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                      <Input
                        name="position"
                        placeholder="役職・ポジション"
                        value={formData.position}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* 時給設定 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">時給設定</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          基本時給（円）<span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="hourlyRate"
                          type="number"
                          placeholder="1000"
                          value={formData.hourlyRate}
                          onChange={handleInputChange}
                          required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          時間帯別時給が未設定の場合、この値が適用されます
                        </p>
                      </div>
                      
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">時間帯別時給設定（任意）</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoCalculateRates}
                            disabled={!formData.hourlyRate}
                          >
                            自動設定
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          自動設定では深夜時間帯に25%の割増が適用されます。夕方勤務（17:00-22:00）は昼勤務の時給が適用されます。
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              朝勤務（6:00-9:00）
                            </label>
                            <Input
                              name="morningRate"
                              type="number"
                              placeholder="基本時給を使用"
                              value={formData.morningRate}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              昼勤務（9:00-17:00）
                              <span className="block text-xs text-gray-500 dark:text-gray-400">※夕方勤務（17:00-22:00）も同じ時給</span>
                            </label>
                            <Input
                              name="dayRate"
                              type="number"
                              placeholder="基本時給を使用"
                              value={formData.dayRate}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              深夜勤務（22:00-6:00）
                            </label>
                            <Input
                              name="nightRate"
                              type="number"
                              placeholder="基本時給を使用"
                              value={formData.nightRate}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 勤務可能時間帯 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">勤務可能時間帯</h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="availableMorning"
                            checked={formData.availableMorning}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">朝勤務（6-9時）</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="availableDay"
                            checked={formData.availableDay}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">昼勤務（9-17時）</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="availableEvening"
                            checked={formData.availableEvening}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">夕方勤務（17-22時）</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="availableNight"
                            checked={formData.availableNight}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">深夜勤務（22-6時）</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        シフト作成時に、選択した時間帯のみでシフトを組むことができます
                      </p>
                    </div>
                  </div>

                  {/* 勤務制限 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">勤務制限</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          週間最大勤務時間
                        </label>
                        <Input
                          name="maxHoursPerWeek"
                          type="number"
                          placeholder="40"
                          value={formData.maxHoursPerWeek}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          週間最大勤務日数
                        </label>
                        <Input
                          name="maxDaysPerWeek"
                          type="number"
                          placeholder="5"
                          value={formData.maxDaysPerWeek}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      キャンセル
                    </Button>
                    <Button type="submit">
                      {editingEmployee ? '更新' : '追加'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 時給計算モーダル */}
          {showPaymentCalculator && editingEmployee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">シフト時給計算</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPaymentCalculator(false);
                      setEditingEmployee(null);
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <ShiftPaymentCalculator
                  employee={{
                    name: editingEmployee.name,
                    hourlyRate: editingEmployee.hourlyRate,
                    hourlyRates: editingEmployee.hourlyRates
                  }}
                />
              </div>
            </div>
          )}

          {/* 従業員一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>従業員一覧</CardTitle>
              <CardDescription>
                現在登録されている従業員（{employees.length}名）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  まだ従業員が登録されていません。<br />
                  最初の従業員を追加してみましょう！
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          氏名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          役職
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          時給・時間帯設定
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          勤務制限
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                  {employee.name.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {employee.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {employee.email}
                                </div>
                                {employee.employeeId && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    ID: {employee.employeeId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {employee.position || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div className="space-y-1">
                              <div className="font-medium">基本: ¥{employee.hourlyRate.toLocaleString()}/時</div>
                              {employee.hourlyRates && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                  <div>朝（6-9時）: ¥{employee.hourlyRates.morning.toLocaleString()}/時</div>
                                  <div>昼（9-17時）: ¥{employee.hourlyRates.day.toLocaleString()}/時</div>
                                  <div>深夜（22-6時）: ¥{employee.hourlyRates.night.toLocaleString()}/時</div>
                                </div>
                              )}
                              {employee.availableShiftTypes && (
                                <div className="text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">対応時間帯: </span>
                                  <span className="text-blue-600 dark:text-blue-400">
                                    {employee.availableShiftTypes.morning && '朝 '}
                                    {employee.availableShiftTypes.day && '昼 '}
                                    {employee.availableShiftTypes.evening && '夕 '}
                                    {employee.availableShiftTypes.night && '夜'}
                                    {!employee.availableShiftTypes.morning && 
                                     !employee.availableShiftTypes.day && 
                                     !employee.availableShiftTypes.evening && 
                                     !employee.availableShiftTypes.night && '未設定'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {employee.maxHoursPerWeek && employee.maxDaysPerWeek
                              ? `${employee.maxHoursPerWeek}時間/週, ${employee.maxDaysPerWeek}日/週`
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(employee)}
                              >
                                編集
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingEmployee(employee);
                                  setShowPaymentCalculator(true);
                                }}
                                title="シフト時給計算"
                              >
                                給与計算
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(employee.id)}
                                title="完全削除（Shift+Ctrl+クリックでソフトデリート）"
                              >
                                削除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

      {/* アラートモーダル */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.options.title}
        message={alertState.message}
        type={alertState.options.type}
      />

      {/* 確認モーダル */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
        title={confirmState.options.title}
        message={confirmState.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        type={confirmState.options.type}
      />
    </Layout>
  )
}
