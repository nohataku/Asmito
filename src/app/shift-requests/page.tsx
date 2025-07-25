'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { EmployeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import { useAuthStore } from '@/store/authStore';

// シフト希望の型定義
interface ShiftRequest {
  employeeId: string;
  employeeName: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'all-day' | 'unavailable';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export default function ShiftRequestPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [requests, setRequests] = useState<ShiftRequest[]>([]);

  // 従業員データを取得
  useEffect(() => {
    const loadEmployees = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const employeeData = await EmployeeService.getEmployees(user.uid);
        setEmployees(employeeData);
      } catch (err) {
        console.error('従業員データの取得に失敗しました:', err);
        setError('従業員データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [user]);

  // 現在の週の日付を生成
  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentWeek = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 日曜日から開始

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      currentWeek.push(date);
    }
    return currentWeek;
  };

  const weekDates = getCurrentWeekDates();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const handleShiftRequest = (
    employeeId: string,
    date: string,
    timeSlot: ShiftRequest['timeSlot'],
    priority: ShiftRequest['priority']
  ) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const newRequest: ShiftRequest = {
      employeeId,
      employeeName: employee.name,
      date,
      timeSlot,
      priority
    };

    setRequests(prev => {
      const existingIndex = prev.findIndex(
        req => req.employeeId === employeeId && req.date === date
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newRequest;
        return updated;
      } else {
        return [...prev, newRequest];
      }
    });
  };

  const getShiftRequest = (employeeId: string, date: string) => {
    return requests.find(req => req.employeeId === employeeId && req.date === date);
  };

  const timeSlotLabels = {
    'morning': '朝 (9-13)',
    'afternoon': '昼 (13-17)',
    'evening': '夕 (17-21)',
    'night': '夜 (21-25)',
    'all-day': '終日',
    'unavailable': '不可'
  };

  const getTimeSlotColor = (timeSlot: ShiftRequest['timeSlot']) => {
    switch (timeSlot) {
      case 'morning': return 'bg-yellow-100 text-yellow-800';
      case 'afternoon': return 'bg-blue-100 text-blue-800';
      case 'evening': return 'bg-orange-100 text-orange-800';
      case 'night': return 'bg-purple-100 text-purple-800';
      case 'all-day': return 'bg-green-100 text-green-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">シフト希望入力</h1>
              <p className="mt-2 text-gray-600">
                従業員のシフト希望を入力・管理できます
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">ダッシュボードに戻る</Button>
            </Link>
          </div>
        </div>

        {/* ローディング表示 */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">従業員データを読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* エラー表示 */}
        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent className="py-4">
              <div className="flex items-center text-red-800">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 従業員データが空の場合の表示 */}
        {!loading && !error && employees.length === 0 && (
          <Card className="mb-8">
            <CardContent className="text-center py-8">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-lg font-medium mb-2">従業員が登録されていません</p>
                <p className="text-gray-600 mb-4">シフト希望を入力するには、まず従業員を登録してください。</p>
                <Link href="/employees">
                  <Button>従業員を登録する</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* メインコンテンツ（従業員データが存在する場合のみ表示） */}
        {!loading && !error && employees.length > 0 && (
          <div>
            {/* 操作パネル */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>クイック入力</CardTitle>
                <CardDescription>
                  従業員と日付を選択して、素早くシフト希望を入力できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      従業員選択
                    </label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">従業員を選択してください</option>
                      {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.department} - {employee.position})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      日付選択
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">日付を選択してください</option>
                      {weekDates.map((date, index) => (
                        <option key={index} value={date.toISOString().split('T')[0]}>
                          {date.getMonth() + 1}/{date.getDate()} ({dayNames[index]})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* シフト希望表 */}
            <Card>
              <CardHeader>
                <CardTitle>週間シフト希望表</CardTitle>
            <CardDescription>
              各従業員の週間シフト希望を一覧で確認・編集できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-900">従業員</th>
                    {weekDates.map((date, index) => (
                      <th key={index} className="text-center p-3 font-medium text-gray-900 min-w-32">
                        {date.getMonth() + 1}/{date.getDate()}<br />
                        <span className="text-sm text-gray-500">({dayNames[index]})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">
                            {employee.department} - {employee.position}
                          </div>
                        </div>
                      </td>
                      {weekDates.map((date, dateIndex) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const request = getShiftRequest(employee.id, dateStr);
                        
                        return (
                          <td key={dateIndex} className="p-2 text-center">
                            <div className="space-y-1">
                              {Object.entries(timeSlotLabels).map(([slot, label]) => (
                                <button
                                  key={slot}
                                  onClick={() => handleShiftRequest(
                                    employee.id,
                                    dateStr,
                                    slot as ShiftRequest['timeSlot'],
                                    'medium'
                                  )}
                                  className={`
                                    w-full text-xs py-1 px-2 rounded transition-colors
                                    ${request?.timeSlot === slot
                                      ? getTimeSlotColor(slot as ShiftRequest['timeSlot'])
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }
                                  `}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 凡例 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">時間帯の説明</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(timeSlotLabels).map(([slot, label]) => (
                  <div key={slot} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${getTimeSlotColor(slot as ShiftRequest['timeSlot']).split(' ')[0]}`} />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 保存ボタン */}
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => {
                  // TODO: Firestoreに保存
                  alert(`${requests.length}件のシフト希望を保存しました`);
                }}
                disabled={requests.length === 0}
              >
                シフト希望を保存 ({requests.length}件)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 入力済みリスト */}
        {requests.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>入力済みシフト希望</CardTitle>
              <CardDescription>
                現在入力されているシフト希望の一覧です
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {requests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">{request.employeeName}</span>
                      <span className="text-gray-600">{request.date}</span>
                      <span className={`px-2 py-1 text-xs rounded ${getTimeSlotColor(request.timeSlot)}`}>
                        {timeSlotLabels[request.timeSlot]}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRequests(prev => prev.filter((_, i) => i !== index))}
                    >
                      削除
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>)} {/* employees>0 条件ブロックの div 終了 */}
    </div>   {/* max-w コンテナ終了 */}
  </div>     {/* min-h コンテナ終了 */}
</Layout>
  );
}
