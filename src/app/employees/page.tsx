'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Employee } from '@/types'

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hourlyRate: '',
    position: '',
    maxHoursPerWeek: '',
    maxDaysPerWeek: ''
  })

  useEffect(() => {
    fetchEmployees()
  }, [user])

  const fetchEmployees = async () => {
    if (!user) return

    try {
      const q = query(
        collection(db, 'employees'),
        where('organizationId', '==', user.uid)
      )
      const querySnapshot = await getDocs(q)
      const employeeList: Employee[] = []
      
      querySnapshot.forEach((doc) => {
        employeeList.push({ id: doc.id, ...doc.data() } as Employee)
      })
      
      setEmployees(employeeList)
    } catch (error) {
      console.error('従業員データの取得に失敗しました:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const employeeData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        hourlyRate: parseInt(formData.hourlyRate),
        position: formData.position,
        maxHoursPerWeek: parseInt(formData.maxHoursPerWeek),
        maxDaysPerWeek: parseInt(formData.maxDaysPerWeek),
        organizationId: user.uid,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (editingEmployee) {
        // 更新
        await updateDoc(doc(db, 'employees', editingEmployee.id), {
          ...employeeData,
          createdAt: editingEmployee.createdAt // 作成日は保持
        })
      } else {
        // 新規追加
        await addDoc(collection(db, 'employees'), employeeData)
      }

      // フォームリセット
      setFormData({
        name: '',
        email: '',
        phone: '',
        hourlyRate: '',
        position: '',
        maxHoursPerWeek: '',
        maxDaysPerWeek: ''
      })
      setShowAddForm(false)
      setEditingEmployee(null)
      fetchEmployees()
    } catch (error) {
      console.error('従業員の保存に失敗しました:', error)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      hourlyRate: employee.hourlyRate.toString(),
      position: employee.position || '',
      maxHoursPerWeek: employee.maxHoursPerWeek?.toString() || '',
      maxDaysPerWeek: employee.maxDaysPerWeek?.toString() || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('この従業員を削除しますか？')) return

    try {
      await deleteDoc(doc(db, 'employees', employeeId))
      fetchEmployees()
    } catch (error) {
      console.error('従業員の削除に失敗しました:', error)
    }
  }

  const cancelEdit = () => {
    setEditingEmployee(null)
    setShowAddForm(false)
    setFormData({
      name: '',
      email: '',
      phone: '',
      hourlyRate: '',
      position: '',
      maxHoursPerWeek: '',
      maxDaysPerWeek: ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">従業員管理</h1>
            <Button onClick={() => setShowAddForm(true)}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              従業員追加
            </Button>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      name="name"
                      placeholder="氏名"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
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
                    <Input
                      name="hourlyRate"
                      type="number"
                      placeholder="時給（円）"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      name="maxHoursPerWeek"
                      type="number"
                      placeholder="週間最大勤務時間"
                      value={formData.maxHoursPerWeek}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="maxDaysPerWeek"
                      type="number"
                      placeholder="週間最大勤務日数"
                      value={formData.maxDaysPerWeek}
                      onChange={handleInputChange}
                    />
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
                <div className="text-center py-8 text-gray-500">
                  まだ従業員が登録されていません。<br />
                  最初の従業員を追加してみましょう！
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          氏名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          役職
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          時給
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          勤務制限
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-medium">
                                  {employee.name.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {employee.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {employee.position || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ¥{employee.hourlyRate.toLocaleString()}/時
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.maxHoursPerWeek && employee.maxDaysPerWeek
                              ? `${employee.maxHoursPerWeek}時間/週, ${employee.maxDaysPerWeek}日/週`
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(employee)}
                              className="mr-2"
                            >
                              編集
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(employee.id)}
                            >
                              削除
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
