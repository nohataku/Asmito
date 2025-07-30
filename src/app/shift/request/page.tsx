'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { EmployeeService } from '@/services/employeeService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Employee, ShiftRequest } from '@/types'
import Layout from '@/components/layout/Layout'

export default function ShiftRequestPage() {
  const { user, loading } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<'manual' | 'text' | 'csv'>('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [manualRequests, setManualRequests] = useState<{
    employeeId: string
    date: string
    startTime: string
    endTime: string
    priority: 'high' | 'medium' | 'low'
    type: 'work' | 'off'
  }[]>([])

  useEffect(() => {
    console.log('useEffect triggered:', { user: user?.uid, userEmail: user?.email })
    fetchEmployees()
  }, [user])

  const fetchEmployees = async () => {
    if (!user) {
      console.warn('ユーザーが認証されていません')
      return
    }

    try {
      setIsLoading(true)
      console.log('従業員データを取得中...', { organizationId: user.uid })
      
      const employeeList = await EmployeeService.getEmployees(user.uid)
      
      console.log(`従業員データを取得しました: ${employeeList.length}件`, employeeList)
      setEmployees(employeeList)
      
      // 最初の従業員を自動選択
      if (employeeList.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employeeList[0].id)
      }
      
      if (employeeList.length === 0) {
        console.warn('該当する従業員が見つかりませんでした')
      }
    } catch (error) {
      console.error('従業員データの取得に失敗しました:', error)
      // より詳細なエラー情報を表示
      if (error instanceof Error) {
        alert(`従業員データの取得エラー: ${error.message}`)
      } else {
        alert('従業員データの取得に失敗しました。ネットワーク接続やFirebase設定を確認してください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const addManualRequest = () => {
    setManualRequests(prev => [...prev, {
      employeeId: '',
      date: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      type: 'work'
    }])
  }

  const updateManualRequest = (index: number, field: string, value: string) => {
    setManualRequests(prev => prev.map((request, i) => 
      i === index ? { ...request, [field]: value } : request
    ))
  }

  const removeManualRequest = (index: number) => {
    setManualRequests(prev => prev.filter((_, i) => i !== index))
  }

  const parseTextInput = () => {
    const lines = textInput.split('\n').filter(line => line.trim())
    const requests: ShiftRequest[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // 新しいフォーマット例: "8/1(金) 休み希望" または "8/4(月) 13:00〜22:00"
      const patterns = [
        // 新フォーマット - 勤務希望: "8/4(月) 13:00〜22:00"
        /^(\d{1,2}\/\d{1,2})\([月火水木金土日]\)\s+(\d{1,2}:\d{2})〜(\d{1,2}:\d{2})$/,
        // 新フォーマット - 勤務希望（ハイフン）: "8/4(月) 13:00-22:00"
        /^(\d{1,2}\/\d{1,2})\([月火水木金土日]\)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/,
        // 新フォーマット - 休み希望: "8/1(金) 休み希望"
        /^(\d{1,2}\/\d{1,2})\([月火水木金土日]\)\s+(休み希望|休み|OFF)$/,
        
        // 従来フォーマット（後方互換性のため）
        /^(.+?)\s+(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/,  // 勤務希望
        /^(.+?)\s+(\d{1,2}\/\d{1,2})\s+(休み|休み希望|OFF)$/,  // 休み希望
        /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/,  // 勤務希望（フルデート）
        /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(休み|休み希望|OFF)$/   // 休み希望（フルデート）
      ]

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        const match = trimmedLine.match(pattern)
        
        if (match) {
          let employeeName = ''
          let dateStr = ''
          let startTime = ''
          let endTime = ''
          let isOff = false

          if (i <= 2) {
            // 新フォーマットの場合（従業員名を選択可能にする）
            dateStr = match[1]
            
            if (i === 0 || i === 1) {
              // 勤務希望
              startTime = match[2]
              endTime = match[3]
            } else {
              // 休み希望
              isOff = true
            }
            
            // 従業員が1人しかいない場合は自動選択、複数いる場合は選択された従業員を使用
            if (employees.length > 0) {
              const targetEmployee = employees.find(emp => emp.id === selectedEmployee) || employees[0]
              employeeName = targetEmployee.name
            }
          } else {
            // 従来フォーマットの場合
            employeeName = match[1].trim()
            dateStr = match[2]
            
            if (match[3] && match[4] && !['休み', '休み希望', 'OFF'].includes(match[3])) {
              // 勤務希望
              startTime = match[3]
              endTime = match[4]
            } else {
              // 休み希望
              isOff = true
            }
          }

          const employee = employees.find(emp => emp.name === employeeName)
          
          if (employee || (i <= 2 && employees.length > 0)) {
            let date = dateStr
            if (dateStr.includes('/')) {
              // MM/dd 形式を yyyy-MM-dd に変換
              const [month, day] = dateStr.split('/')
              const currentYear = new Date().getFullYear()
              date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            }

            const selectedEmployeeObj = employee || employees.find(emp => emp.id === selectedEmployee) || employees[0]

            if (!isOff && startTime && endTime) {
              // 勤務希望
              requests.push({
                id: Date.now().toString() + Math.random(),
                employeeId: selectedEmployeeObj.id,
                date,
                startTime,
                endTime,
                type: 'work',
                priority: 'medium',
                status: 'pending',
                submittedAt: new Date().toISOString()
              })
            } else if (isOff) {
              // 休み希望
              requests.push({
                id: Date.now().toString() + Math.random(),
                employeeId: selectedEmployeeObj.id,
                date,
                startTime: '',
                endTime: '',
                type: 'off',
                priority: 'high',
                status: 'pending',
                submittedAt: new Date().toISOString()
              })
            }
          }
          break
        }
      }
    })

    return requests
  }

  const handleTextSubmit = async () => {
    setIsLoading(true)
    try {
      const requests = parseTextInput()
      
      for (const request of requests) {
        await addDoc(collection(db, 'shiftRequests'), {
          ...request,
          organizationId: user?.uid
        })
      }

      alert(`${requests.length}件のシフト希望を登録しました。`)
      setTextInput('')
    } catch (error) {
      console.error('シフト希望の登録に失敗しました:', error)
      alert('シフト希望の登録に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    setIsLoading(true)
    try {
      const validRequests = manualRequests.filter(req => 
        req.employeeId && req.date && (req.type === 'off' || (req.startTime && req.endTime))
      )

      for (const request of validRequests) {
        await addDoc(collection(db, 'shiftRequests'), {
          id: Date.now().toString() + Math.random(),
          ...request,
          organizationId: user?.uid,
          status: 'pending',
          submittedAt: new Date().toISOString()
        })
      }

      alert(`${validRequests.length}件のシフト希望を登録しました。`)
      setManualRequests([])
    } catch (error) {
      console.error('シフト希望の登録に失敗しました:', error)
      alert('シフト希望の登録に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">シフト希望入力</h1>

      {/* 認証ローディング */}
      {loading && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">認証状態を確認中...</p>
              </CardContent>
            </Card>
          )}

          {/* 認証チェック */}
          {!loading && !user && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  シフト希望を入力するにはログインが必要です。
                </p>
                <Button onClick={() => window.location.href = '/login'}>
                  ログインする
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ローディング状態 */}
          {!loading && user && isLoading && employees.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">従業員データを読み込み中...</p>
              </CardContent>
            </Card>
          )}

          {/* 従業員データなし */}
          {!loading && user && !isLoading && employees.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  シフト希望を入力する前に、従業員を登録してください。
                </p>
                <Button onClick={() => window.location.href = '/employees'}>
                  従業員管理へ
                </Button>
              </CardContent>
            </Card>
          )}

          {/* メイン機能（従業員データがある場合のみ表示） */}
          {!loading && user && employees.length > 0 && (
            <>
              {/* 入力方法選択 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>入力方法の選択</CardTitle>
                  <CardDescription>
                    シフト希望の入力方法を選択してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button
                      variant={selectedMethod === 'manual' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('manual')}
                    >
                      手動入力
                    </Button>
                    <Button
                      variant={selectedMethod === 'text' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('text')}
                    >
                      テキスト一括入力
                    </Button>
                    <Button
                      variant={selectedMethod === 'csv' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('csv')}
                      disabled
                    >
                      CSV/Excelアップロード（準備中）
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 手動入力 */}
              {selectedMethod === 'manual' && (
                <Card>
                  <CardHeader>
                    <CardTitle>手動でシフト希望を入力</CardTitle>
                    <CardDescription>
                      個別にシフト希望を入力してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {manualRequests.map((request, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                          <select
                            value={request.employeeId}
                            onChange={(e) => updateManualRequest(index, 'employeeId', e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">従業員を選択</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>

                          <Input
                            type="date"
                            value={request.date}
                            onChange={(e) => updateManualRequest(index, 'date', e.target.value)}
                            required
                          />

                          <select
                            value={request.type}
                            onChange={(e) => updateManualRequest(index, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="work">勤務希望</option>
                            <option value="off">休み希望</option>
                          </select>

                          {request.type === 'work' && (
                            <>
                              <Input
                                type="time"
                                placeholder="開始時間"
                                value={request.startTime}
                                onChange={(e) => updateManualRequest(index, 'startTime', e.target.value)}
                                required={request.type === 'work'}
                              />
                              <Input
                                type="time"
                                placeholder="終了時間"
                                value={request.endTime}
                                onChange={(e) => updateManualRequest(index, 'endTime', e.target.value)}
                                required={request.type === 'work'}
                              />
                            </>
                          )}

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeManualRequest(index)}
                          >
                            削除
                          </Button>
                        </div>
                      ))}

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={addManualRequest}>
                          希望を追加
                        </Button>
                        {manualRequests.length > 0 && (
                          <Button onClick={handleManualSubmit} disabled={isLoading}>
                            {isLoading ? '登録中...' : 'シフト希望を登録'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* テキスト一括入力 */}
              {selectedMethod === 'text' && (
                <Card>
                  <CardHeader>
                    <CardTitle>テキスト一括入力</CardTitle>
                    <CardDescription>
                      複数のシフト希望を一度に入力できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 従業員選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          対象従業員（従業員名を省略した場合に適用されます）
                        </label>
                        <select
                          value={selectedEmployee}
                          onChange={(e) => setSelectedEmployee(e.target.value)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">入力フォーマット例:</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div>勤務希望: 8/4(月) 13:00〜22:00</div>
                          <div>休み希望: 8/1(金) 休み希望</div>
                          <div>従来形式: 田中 7/26 13:00-18:00</div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            ※ 新形式では従業員名を省略できます（登録済みの従業員から自動選択）
                          </div>
                        </div>
                      </div>

                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="シフト希望を入力してください（1行に1つずつ）&#10;例：&#10;8/1(金) 休み希望&#10;8/4(月) 13:00〜22:00&#10;8/5(火) 休み希望"
                        className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />

                      <div className="flex justify-end">
                        <Button onClick={handleTextSubmit} disabled={isLoading || !textInput.trim()}>
                          {isLoading ? '登録中...' : 'シフト希望を登録'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
    </Layout>
  )
}
