'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { EmployeeService } from '@/services/employeeService';
import { ShiftRequestService, ShiftRequest } from '@/services/shiftRequestService';
import { Employee } from '@/types/index';
import { useAuthStore } from '@/store/authStore';

export default function ShiftRequestsPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'half-month' | 'month'>('half-month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    startTime: string;
    endTime: string;
    notes: string;
  }>({ startTime: '', endTime: '', notes: '' });

  // 従業員データとシフト希望データを取得
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 従業員データを取得
        const employeeData = await EmployeeService.getEmployees(user.uid);
        setEmployees(employeeData);

        // 表示期間に応じた開始日と終了日を計算
        const dates = getDisplayDates();
        const startDateStr = dates[0].toISOString().split('T')[0];
        const endDateStr = dates[dates.length - 1].toISOString().split('T')[0];

        // シフト希望データを取得
        const shiftRequestData = await ShiftRequestService.getShiftRequests(
          user.uid, 
          startDateStr, 
          endDateStr
        );
        setShiftRequests(shiftRequestData);
        
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError('データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, selectedDate, viewMode]);

  // 表示期間に応じた日付を生成
  const getDisplayDates = () => {
    switch (viewMode) {
      case 'day':
        return [new Date(selectedDate)];
      
      case 'week':
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()); // 日曜日から開始
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          weekDates.push(date);
        }
        return weekDates;
      
      case 'half-month':
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const currentDay = selectedDate.getDate();
        
        const isFirstHalf = currentDay <= 15;
        const startDay = isFirstHalf ? 1 : 16;
        const endDay = isFirstHalf ? 15 : new Date(year, month + 1, 0).getDate(); // 月末
        
        const halfMonthDates = [];
        for (let day = startDay; day <= endDay; day++) {
          halfMonthDates.push(new Date(year, month, day));
        }
        return halfMonthDates;
      
      case 'month':
        const monthYear = selectedDate.getFullYear();
        const monthIndex = selectedDate.getMonth();
        const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
        
        const monthDates = [];
        for (let day = 1; day <= daysInMonth; day++) {
          monthDates.push(new Date(monthYear, monthIndex, day));
        }
        return monthDates;
      
      default:
        return [];
    }
  };

  const displayDates = getDisplayDates();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  // 特定の従業員と日付のシフト希望を取得
  const getShiftRequestsForEmployeeAndDate = (employeeId: string, date: string): ShiftRequest[] => {
    return shiftRequests.filter(request => 
      request.employeeId === employeeId && 
      request.date === date
    );
  };

  // シフトタイプの表示ラベル
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'on': return '勤務希望';
      case 'off': return '休み希望';
      case 'prefer': return '優先希望';
      default: return type;
    }
  };

  // タイプの色を取得
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'on': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
      case 'off': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'prefer': return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // 期間を変更
  const changePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'half-month':
        const currentDay = selectedDate.getDate();
        const isFirstHalf = currentDay <= 15;
        
        if (direction === 'next') {
          if (isFirstHalf) {
            // 前半から後半へ
            newDate.setDate(16);
          } else {
            // 後半から次月の前半へ
            newDate.setMonth(selectedDate.getMonth() + 1);
            newDate.setDate(1);
          }
        } else {
          if (isFirstHalf) {
            // 前半から前月の後半へ
            newDate.setMonth(selectedDate.getMonth() - 1);
            newDate.setDate(16);
          } else {
            // 後半から前半へ
            newDate.setDate(1);
          }
        }
        break;
      case 'month':
        newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  // 表示期間のラベルを取得
  const getPeriodLabel = () => {
    const dates = displayDates;
    if (dates.length === 0) return '';
    
    const start = dates[0];
    const end = dates[dates.length - 1];
    
    switch (viewMode) {
      case 'day':
        return `${start.getMonth() + 1}/${start.getDate()} (${dayNames[start.getDay()]})`;
      case 'week':
        return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
      case 'half-month':
        const isFirstHalf = start.getDate() === 1;
        return `${start.getFullYear()}年${start.getMonth() + 1}月${isFirstHalf ? '前半' : '後半'} (${start.getDate()}-${end.getDate()}日)`;
      case 'month':
        return `${start.getFullYear()}年${start.getMonth() + 1}月`;
      default:
        return '';
    }
  };

  // 表示モードのラベルを取得
  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'day': return '日表示';
      case 'week': return '週表示';
      case 'half-month': return '半月表示';
      case 'month': return '月表示';
      default: return '';
    }
  };

  // 時間表示をフォーマット（24時間表記）
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // 既に HH:MM 形式の場合はそのまま返す
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    // その他の形式の場合は変換処理
    return timeString;
  };

  // 深夜勤務かどうかを判定
  const isNightShift = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return false;
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    // 開始時間が終了時間より大きい場合（例: 22:00-06:00）
    return start > end;
  };

  // 編集開始
  const startEditing = (request: ShiftRequest) => {
    setEditingRequest(request.id!);
    setEditForm({
      startTime: request.startTime || '',
      endTime: request.endTime || '',
      notes: request.notes || ''
    });
  };

  // 編集キャンセル
  const cancelEditing = () => {
    setEditingRequest(null);
    setEditForm({ startTime: '', endTime: '', notes: '' });
  };

  // 編集保存
  const saveEdit = async (requestId: string) => {
    try {
      await ShiftRequestService.updateShiftRequest(requestId, {
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        notes: editForm.notes
      });

      // ローカル状態を更新
      setShiftRequests(prev => 
        prev.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                startTime: editForm.startTime,
                endTime: editForm.endTime,
                notes: editForm.notes
              }
            : request
        )
      );

      // 編集状態をリセット
      setEditingRequest(null);
      setEditForm({ startTime: '', endTime: '', notes: '' });
    } catch (error) {
      console.error('シフト希望の更新に失敗しました:', error);
      alert('シフト希望の更新に失敗しました。');
    }
  };

  return (
    <Layout>
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">シフト希望確認</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              従業員から提出されたシフト希望を柔軟な期間で確認できます
            </p>
          </div>
          <Link href="/">
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
              <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
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

      {/* データが読み込まれている場合のメインコンテンツ */}
      {!loading && !error && (
        <div>
          {/* フィルターとナビゲーション */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>表示設定</CardTitle>
              <CardDescription>
                表示期間を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* 表示モード選択 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">表示モード:</label>
                  <div className="flex gap-2">
                    {(['day', 'week', 'half-month', 'month'] as const).map(mode => (
                      <Button
                        key={mode}
                        variant={viewMode === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode(mode)}
                      >
                        {mode === 'day' && '日'}
                        {mode === 'week' && '週'}
                        {mode === 'half-month' && '半月'}
                        {mode === 'month' && '月'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 期間ナビゲーション */}
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline" onClick={() => changePeriod('prev')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    前の{getViewModeLabel().replace('表示', '')}
                  </Button>
                  <div className="text-center min-w-[200px]">
                    <p className="font-medium">
                      {getPeriodLabel()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getViewModeLabel()}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => changePeriod('next')}>
                    次の{getViewModeLabel().replace('表示', '')}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* シフト希望表 */}
          <Card>
            <CardHeader>
              <CardTitle>シフト希望一覧 ({getViewModeLabel()})</CardTitle>
              <CardDescription>
                従業員のシフト希望を{getViewModeLabel()}で確認できます（00:00-23:59対応）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-secondary-700">
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">従業員</th>
                      {displayDates.map((date, index) => (
                        <th key={index} className={`text-center p-3 font-medium text-gray-900 dark:text-gray-100 min-w-48 ${
                          viewMode === 'half-month' && index === 7 ? 'border-l-2 border-indigo-200 dark:border-indigo-600' : ''
                        }`}>
                          {date.getMonth() + 1}/{date.getDate()}<br />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({dayNames[date.getDay()]})
                            {viewMode === 'half-month' && index === 6 && <span className="ml-1 text-indigo-600 dark:text-indigo-400">|</span>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(employee => (
                      <tr key={employee.id} className="border-b dark:border-secondary-700 hover:bg-gray-50 dark:hover:bg-secondary-800 transition-colors duration-200">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.department} - {employee.position}
                            </div>
                          </div>
                        </td>
                        {displayDates.map((date, dateIndex) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const dayRequests = getShiftRequestsForEmployeeAndDate(employee.id, dateStr);
                          
                          return (
                            <td key={dateIndex} className={`p-2 ${
                              viewMode === 'half-month' && dateIndex === 7 ? 'border-l-2 border-indigo-200 dark:border-indigo-600' : ''
                            }`}>
                              <div className="space-y-2">
                                {dayRequests.length === 0 ? (
                                  <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-2">
                                    希望なし
                                  </div>
                                ) : (
                                  dayRequests.map((request, reqIndex) => (
                                    <div key={reqIndex} className="border rounded-lg p-3 bg-white dark:bg-secondary-800 dark:border-secondary-600">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 text-xs rounded ${getTypeColor(request.type)}`}>
                                          {getTypeLabel(request.type)}
                                        </span>
                                        {!editingRequest && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => startEditing(request)}
                                            className="text-xs px-2 py-1"
                                          >
                                            編集
                                          </Button>
                                        )}
                                      </div>
                                      
                                      {editingRequest === request.id ? (
                                        // 編集モード
                                        <div className="space-y-2">
                                          <div className="flex space-x-2 items-center">
                                            <input
                                              type="time"
                                              value={editForm.startTime}
                                              onChange={(e) => setEditForm(prev => ({...prev, startTime: e.target.value}))}
                                              className="text-xs px-2 py-1 border border-gray-300 dark:border-secondary-600 rounded w-20 bg-white dark:bg-secondary-700 text-gray-900 dark:text-gray-100"
                                              step="900"
                                              min="00:00"
                                              max="23:59"
                                            />
                                            <span className="text-xs py-1">-</span>
                                            <input
                                              type="time"
                                              value={editForm.endTime}
                                              onChange={(e) => setEditForm(prev => ({...prev, endTime: e.target.value}))}
                                              className="text-xs px-2 py-1 border border-gray-300 dark:border-secondary-600 rounded w-20 bg-white dark:bg-secondary-700 text-gray-900 dark:text-gray-100"
                                              step="900"
                                              min="00:00"
                                              max="23:59"
                                            />
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            ※24時間営業対応 (00:00-23:59)
                                          </div>
                                          <textarea
                                            value={editForm.notes}
                                            onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))}
                                            placeholder="メモ・備考"
                                            className="text-xs px-2 py-1 border border-gray-300 dark:border-secondary-600 rounded w-full h-16 resize-none bg-white dark:bg-secondary-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                          />
                                          <div className="flex space-x-1">
                                            <Button
                                              size="sm"
                                              onClick={() => saveEdit(request.id!)}
                                              className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                                            >
                                              保存
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEditing}
                                              className="text-xs px-2 py-1"
                                            >
                                              キャンセル
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        // 表示モード
                                        <>
                                          {request.startTime && request.endTime && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                              <span className="font-medium">
                                                {formatTime(request.startTime)} - {formatTime(request.endTime)}
                                              </span>
                                              {isNightShift(request.startTime, request.endTime) && (
                                                <span className="ml-2 px-1 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded">
                                                  深夜勤務
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {request.notes && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                              {request.notes}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
