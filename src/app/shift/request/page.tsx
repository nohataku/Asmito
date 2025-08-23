'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { EmployeeService } from '@/services/employeeService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertModal } from '@/components/ui/Modal'
import { useModal } from '@/hooks/useModal'
import { Employee, ShiftRequest } from '@/types'
import Layout from '@/components/layout/Layout'

export default function ShiftRequestPage() {
  const { user, loading } = useAuthStore()
  const { alertState, showAlert, closeAlert } = useModal()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<'manual' | 'text' | 'ai' | 'csv'>('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const [aiResults, setAiResults] = useState<any[]>([])
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
        showAlert(`従業員データの取得エラー: ${error.message}`, { type: 'error' })
      } else {
        showAlert('従業員データの取得に失敗しました。ネットワーク接続やFirebase設定を確認してください。', { type: 'error' })
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

  // AI解析機能
  const handleAIAnalysis = async () => {
    if (!textInput.trim()) {
      showAlert('解析するテキストを入力してください。', { type: 'warning' });
      return;
    }

    setIsAIProcessing(true);
    try {
      const response = await fetch('/api/shift-ai/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
          mode: 'bulk'
        }),
      });

      if (!response.ok) {
        throw new Error('AI解析に失敗しました');
      }

      const result = await response.json();
      setAiResults(result.data);
      
      showAlert(`AI解析が完了しました。${result.data.length}件の結果を確認してください。`, { type: 'success' });
    } catch (error) {
      console.error('AI解析エラー:', error);
      showAlert('AI解析に失敗しました。従来の解析方法をお試しください。', { type: 'error' });
    } finally {
      setIsAIProcessing(false);
    }
  };

  // AI解析結果からシフト希望を登録
  const handleAIResultSubmit = async (resultIndex: number) => {
    const result = aiResults[resultIndex];
    if (!result || !result.parsedRequests) return;

    setIsLoading(true);
    try {
      let submittedCount = 0;
      
      for (const request of result.parsedRequests) {
        const selectedEmployeeObj = employees.find(emp => emp.id === selectedEmployee) || employees[0];
        if (!selectedEmployeeObj) continue;

        if (request.type === 'off') {
          // 休み希望
          await addDoc(collection(db, 'shiftRequests'), {
            id: Date.now().toString() + Math.random(),
            employeeId: selectedEmployeeObj.id,
            date: request.date,
            startTime: '',
            endTime: '',
            type: 'off',
            priority: request.priority,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            organizationId: user?.uid,
            notes: request.notes || '',
            aiProcessed: true,
            confidence: request.confidence
          });
          submittedCount++;
        } else if (request.timeSlots && request.timeSlots.length > 0) {
          // 勤務希望
          for (const slot of request.timeSlots) {
            await addDoc(collection(db, 'shiftRequests'), {
              id: Date.now().toString() + Math.random(),
              employeeId: selectedEmployeeObj.id,
              date: request.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: request.type,
              priority: request.priority,
              status: 'pending',
              submittedAt: new Date().toISOString(),
              organizationId: user?.uid,
              notes: request.notes || '',
              aiProcessed: true,
              confidence: request.confidence
            });
            submittedCount++;
          }
        }
      }

      showAlert(`${submittedCount}件のシフト希望を登録しました。`, { type: 'success' });
      
      // 登録済みの結果を削除
      setAiResults(prev => prev.filter((_, index) => index !== resultIndex));
      
    } catch (error) {
      console.error('シフト希望の登録に失敗しました:', error);
      showAlert('シフト希望の登録に失敗しました。', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const parseTextInput = () => {
    const lines = textInput.split('\n').filter(line => line.trim())
    const requests: ShiftRequest[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // 日付部分を抽出する関数
      const extractDate = (text: string) => {
        const dateMatch = text.match(/(\d{1,2}\/\d{1,2})\([月火水木金土日]\)/)
        return dateMatch ? dateMatch[1] : null
      }

      // 時間を正規化する関数（漢字表記も対応）
      const normalizeTime = (timeStr: string) => {
        // 漢字表記の変換 12時 -> 12:00
        timeStr = timeStr.replace(/(\d{1,2})時/g, '$1:00')
        // ハイフンを統一 12ー17 -> 12-17
        timeStr = timeStr.replace(/ー/g, '-')
        // 時間の補完 12-17 -> 12:00-17:00
        timeStr = timeStr.replace(/(\d{1,2})-(\d{1,2})(?![:\d])/g, '$1:00-$2:00')
        timeStr = timeStr.replace(/(\d{1,2}:\d{2})-(\d{1,2})(?![:\d])/g, '$1-$2:00')
        return timeStr
      }

      // 複数の時間帯を分割する関数
      const splitTimeRanges = (text: string) => {
        // 複数時間帯の区切り文字で分割
        const separators = ['or', 'と', '、', '，', ',']
        let parts = [text]
        
        separators.forEach(sep => {
          const newParts: string[] = []
          parts.forEach(part => {
            newParts.push(...part.split(sep))
          })
          parts = newParts
        })
        
        // 単独時間（例：22）も時間帯として扱う
        return parts.map(part => part.trim()).filter(part => part)
      }

      // パターンマッチング
      const dateStr = extractDate(trimmedLine)
      if (!dateStr) return // 日付が見つからない場合はスキップ

      let content = trimmedLine.replace(/\d{1,2}\/\d{1,2}\([月火水木金土日]\)\s*/, '').trim()
      
      // 出勤不可パターンの判定
      const offPatterns = [
        /^(休み|休み希望|OFF|お休み)$/i,
        /^[×✕❌]$/,
        /^$/,  // 空白
        /通院|病院|休暇|有給/,  // 文章による休み申請
        /お休みします/
      ]

      const isOff = offPatterns.some(pattern => pattern.test(content))

      if (isOff) {
        // 休み希望として登録
        const selectedEmployeeObj = employees.find(emp => emp.id === selectedEmployee) || employees[0]
        if (selectedEmployeeObj) {
          const [month, day] = dateStr.split('/')
          const currentYear = new Date().getFullYear()
          // タイムゾーン問題を回避するため、ローカル日付として処理
          const date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

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
        return
      }

      // 出勤可能パターン（◯、〇など）
      const availablePatterns = [
        /^[◯○〇]$/,
        /全てOK/i,
        /出勤可能/i
      ]

      const isAvailable = availablePatterns.some(pattern => pattern.test(content))
      
      if (isAvailable) {
        // 出勤可能として登録（時間は空白）
        const selectedEmployeeObj = employees.find(emp => emp.id === selectedEmployee) || employees[0]
        if (selectedEmployeeObj) {
          const [month, day] = dateStr.split('/')
          const currentYear = new Date().getFullYear()
          // タイムゾーン問題を回避するため、ローカル日付として処理
          const date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

          requests.push({
            id: Date.now().toString() + Math.random(),
            employeeId: selectedEmployeeObj.id,
            date,
            startTime: '',
            endTime: '',
            type: 'work',
            priority: 'medium',
            status: 'pending',
            submittedAt: new Date().toISOString()
          })
        }
        return
      }

      // 時間指定パターンの処理
      content = normalizeTime(content)
      
      // 記号付きパターンの処理 (例: 〇12:00〜17:00or17:00〜22:00)
      content = content.replace(/^[◯○〇]/, '').trim()
      
      // 括弧内の時間除外パターン (例: ❌(6-9))
      const excludeMatch = content.match(/[×✕❌]\((.+?)\)/)
      if (excludeMatch) {
        // 除外時間は現在のバージョンでは処理しない（将来の拡張用）
        return
      }

      // 時間帯を分割して処理
      const timeParts = splitTimeRanges(content)
      
      timeParts.forEach(part => {
        part = part.trim()
        
        // 時間帯パターンの抽出
        const timePatterns = [
          /(\d{1,2}:\d{2})[〜～-](\d{1,2}:\d{2})/,  // 13:00〜22:00
          /(\d{1,2})-(\d{1,2})/,  // 21-2
          /(\d{1,2}:\d{2})-(\d{1,2})/,  // 13:00-17
          /^(\d{1,2})$/,  // 単独時間（例：22）
        ]

        for (const pattern of timePatterns) {
          const match = part.match(pattern)
          if (match) {
            let startTime = match[1]
            let endTime = match[2]

            // 単独時間の場合は1時間の勤務として処理
            if (!endTime) {
              endTime = (parseInt(startTime) + 1).toString()
            }

            // 時間フォーマットの補完
            if (!startTime.includes(':')) startTime += ':00'
            if (!endTime.includes(':')) endTime += ':00'

            // 深夜勤務の処理（21-2 のような場合）
            if (parseInt(endTime.split(':')[0]) <= 6 && parseInt(startTime.split(':')[0]) >= 18) {
              // 深夜勤務として翌日扱いにする場合の処理（必要に応じて）
            }

            const selectedEmployeeObj = employees.find(emp => emp.id === selectedEmployee) || employees[0]
            if (selectedEmployeeObj) {
              const [month, day] = dateStr.split('/')
              const currentYear = new Date().getFullYear()
              // タイムゾーン問題を回避するため、ローカル日付として処理
              const date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

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
            }
            break
          }
        }
      })

      // 従来フォーマットの処理（後方互換性）
      const legacyPatterns = [
        /^(.+?)\s+(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/,  // 勤務希望
        /^(.+?)\s+(\d{1,2}\/\d{1,2})\s+(休み|休み希望|OFF)$/,  // 休み希望
        /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/,  // 勤務希望（フルデート）
        /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(休み|休み希望|OFF)$/   // 休み希望（フルデート）
      ]

      for (let i = 0; i < legacyPatterns.length; i++) {
        const pattern = legacyPatterns[i]
        const match = trimmedLine.match(pattern)
        
        if (match) {
          let employeeName = match[1].trim()
          let legacyDateStr = match[2]
          let startTime = ''
          let endTime = ''
          let isOff = false

          if (match[3] && match[4] && !['休み', '休み希望', 'OFF'].includes(match[3])) {
            // 勤務希望
            startTime = match[3]
            endTime = match[4]
          } else {
            // 休み希望
            isOff = true
          }

          const employee = employees.find(emp => emp.name === employeeName)
          
          if (employee) {
            let date = legacyDateStr
            if (legacyDateStr.includes('/')) {
              // MM/dd 形式を yyyy-MM-dd に変換（タイムゾーン問題を回避）
              const [month, day] = legacyDateStr.split('/')
              const currentYear = new Date().getFullYear()
              date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            }

            if (!isOff && startTime && endTime) {
              // 勤務希望
              requests.push({
                id: Date.now().toString() + Math.random(),
                employeeId: employee.id,
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
                employeeId: employee.id,
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

      showAlert(`${requests.length}件のシフト希望を登録しました。`, { type: 'success' })
      setTextInput('')
    } catch (error) {
      console.error('シフト希望の登録に失敗しました:', error)
      showAlert('シフト希望の登録に失敗しました。', { type: 'error' })
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

      showAlert(`${validRequests.length}件のシフト希望を登録しました。`, { type: 'success' })
      setManualRequests([])
    } catch (error) {
      console.error('シフト希望の登録に失敗しました:', error)
      showAlert('シフト希望の登録に失敗しました。', { type: 'error' })
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
                      variant={selectedMethod === 'ai' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('ai')}
                    >
                      AI自動解析
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
                          <div><strong>勤務希望:</strong></div>
                          <div>• 8/4(月) 13:00〜22:00</div>
                          <div>• 8/5(火) 21-2</div>
                          <div>• 8/5(火) 12時ー17時</div>
                          <div>• 8/5(火) 6-9　13-17 (複数時間)</div>
                          <div>• 8/2(土) 13-17or17-21or22 (or区切り、単独時間含む)</div>
                          <div>• 8/14(木) 6-9 と 22-2 ("と"区切り)</div>
                          <div>• 8/5(火) 〇12:00〜17:00or17:00〜22:00 (記号付き)</div>
                          <div>• 8/1(金) 22 (単独時間：22:00-23:00として処理)</div>
                          <div><strong>出勤可能:</strong></div>
                          <div>• 8/1(金) ◯</div>
                          <div>• 8/1(金) 〇</div>
                          <div><strong>休み希望:</strong></div>
                          <div>• 8/1(金) 休み</div>
                          <div>• 8/2(土) ❌</div>
                          <div>• 8/1(金) ×</div>
                          <div>• 8/2(土) （空白）</div>
                          <div>• 8/5通院の為お休みします。</div>
                          <div><strong>従来形式:</strong></div>
                          <div>• 田中 7/26 13:00-18:00</div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            ※ 新形式では従業員名を省略できます（登録済みの従業員から自動選択）<br/>
                            ※ 単独時間（例：22）は1時間の勤務として処理されます（22:00-23:00）
                          </div>
                        </div>
                      </div>

                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="シフト希望を入力してください（1行に1つずつ）&#10;例：&#10;8/1(金) 休み&#10;8/4(月) 13:00〜22:00&#10;8/5(火) 21-2&#10;8/2(土) ◯&#10;8/3(日) ×&#10;8/6通院のためお休みします&#10;8/1(金) 17-21or22"
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

              {/* AI自動解析 */}
              {selectedMethod === 'ai' && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI自動解析でシフト希望を入力</CardTitle>
                    <CardDescription>
                      自然な日本語でシフト希望を入力すると、無料AIが自動的に解析・構造化します
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 従業員選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          対象従業員
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

                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                          Gemini AIが理解できる自然な表現例:
                        </h4>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <div>• 8月1日金曜日は午後1時から夜10時まで働けます</div>
                          <div>• 8/2(土)は病院に行くためお休みします</div>
                          <div>• 来週月曜日の朝番希望です</div>
                          <div>• 8/5は13時から17時、または17時から21時でお願いします</div>
                          <div>• 今週の土日は絶対に休みたいです</div>
                          <div>• 夜勤（22時-6時）できます</div>
                          <div>• 可能であれば8/10の夕方シフトお願いします</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                            💡 コツ: 日付と時間を具体的に書くとより正確に解析されます
                          </div>
                        </div>
                      </div>

                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="自然な日本語でシフト希望を入力してください&#10;例：&#10;8月1日は午後1時から夜10時まで働けます&#10;8/2は病院のためお休みします&#10;来週の土日は絶対に休みたいです&#10;夜勤（22時-6時）も大丈夫です"
                        className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />

                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          onClick={handleAIAnalysis} 
                          disabled={isAIProcessing || !textInput.trim()}
                        >
                          {isAIProcessing ? 'Gemini解析中...' : 'Gemini AI解析'}
                        </Button>
                        
                        {aiResults.length > 0 && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                            {aiResults.length}件の解析結果があります
                          </span>
                        )}
                      </div>

                      {/* AI解析結果の表示 */}
                      {aiResults.length > 0 && (
                        <div className="space-y-4 mt-6">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">AI解析結果</h4>
                          {aiResults.map((result, index) => (
                            <Card key={index} className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>元のテキスト:</strong> {result.originalText}
                                  </div>
                                  
                                  {result.processingNotes && (
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                      <strong>AI解析メモ:</strong> {result.processingNotes}
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    {result.parsedRequests?.map((request: any, reqIndex: number) => (
                                      <div key={reqIndex} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div><strong>日付:</strong> {request.date}</div>
                                          <div><strong>タイプ:</strong> {
                                            request.type === 'work' ? '勤務希望' : 
                                            request.type === 'off' ? '休み希望' : '出勤可能'
                                          }</div>
                                          <div><strong>優先度:</strong> {
                                            request.priority === 'high' ? '高' :
                                            request.priority === 'medium' ? '中' : '低'
                                          }</div>
                                          <div><strong>信頼度:</strong> {Math.round(request.confidence * 100)}%</div>
                                        </div>
                                        
                                        {request.timeSlots && request.timeSlots.length > 0 && (
                                          <div className="mt-2">
                                            <strong>時間帯:</strong>
                                            {request.timeSlots.map((slot: any, slotIndex: number) => (
                                              <span key={slotIndex} className="ml-2 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                                                {slot.startTime}-{slot.endTime}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {request.notes && (
                                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            <strong>メモ:</strong> {request.notes}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAiResults(prev => prev.filter((_, i) => i !== index))}
                                    >
                                      削除
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAIResultSubmit(index)}
                                      disabled={isLoading}
                                    >
                                      {isLoading ? '登録中...' : 'シフト希望として登録'}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

      {/* アラートモーダル */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.options.title}
        message={alertState.message}
        type={alertState.options.type}
      />
    </Layout>
  )
}
