'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/layout/Layout';

interface MyShiftRequest {
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'all-day' | 'unavailable' | 'custom';
  customStart?: string;
  customEnd?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  isFlexible: boolean;
}

export default function MyShiftRequestPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<MyShiftRequest[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return startOfWeek.toISOString().split('T')[0];
  });

  // 週の日付を生成
  const getWeekDates = () => {
    const startDate = new Date(selectedWeek);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const timeSlotOptions = [
    { value: 'morning', label: '朝シフト', time: '9:00-13:00', icon: '🌅' },
    { value: 'afternoon', label: '昼シフト', time: '13:00-17:00', icon: '☀️' },
    { value: 'evening', label: '夕シフト', time: '17:00-21:00', icon: '🌆' },
    { value: 'night', label: '夜シフト', time: '21:00-25:00', icon: '🌙' },
    { value: 'all-day', label: '終日', time: '9:00-21:00', icon: '📅' },
    { value: 'custom', label: 'カスタム', time: '時間指定', icon: '⚙️' },
    { value: 'unavailable', label: '勤務不可', time: '休み', icon: '❌' }
  ];

  const priorityOptions = [
    { value: 'high', label: '絶対希望', color: 'bg-red-100 text-red-800 border-red-200' },
    { value: 'medium', label: 'できれば', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'low', label: 'どちらでも', color: 'bg-green-100 text-green-800 border-green-200' }
  ];

  const getRequest = (date: string): MyShiftRequest => {
    return requests.find(req => req.date === date) || {
      date,
      timeSlot: 'morning',
      priority: 'medium',
      isFlexible: false,
      notes: ''
    };
  };

  const updateRequest = (date: string, updates: Partial<MyShiftRequest>) => {
    setRequests(prev => {
      const existingIndex = prev.findIndex(req => req.date === date);
      const updatedRequest = { ...getRequest(date), ...updates, date };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedRequest;
        return updated;
      } else {
        return [...prev, updatedRequest];
      }
    });
  };

  const handleSave = async () => {
    try {
      // TODO: Firestoreに保存
      console.log('Saving shift requests:', requests);
      alert('シフト希望を保存しました！');
    } catch (error) {
      console.error('Error saving shift requests:', error);
      alert('保存中にエラーが発生しました。');
    }
  };

  const quickFillWeek = (timeSlot: MyShiftRequest['timeSlot']) => {
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      updateRequest(dateStr, { timeSlot, priority: 'medium' });
    });
  };

  return (
    <Layout>
      {/* ヘッダー */}
      <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">マイシフト希望</h1>
          <p className="mt-2 text-gray-600">
            あなたのシフト希望を入力できます
          </p>
        </div>

        {/* 週選択 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>対象週を選択</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-600">
                {new Date(selectedWeek).getMonth() + 1}月{new Date(selectedWeek).getDate()}日〜
                {weekDates[6].getMonth() + 1}月{weekDates[6].getDate()}日
              </span>
            </div>
          </CardContent>
        </Card>

        {/* クイック入力 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>一括入力</CardTitle>
            <CardDescription>
              週全体に同じシフトを設定できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {timeSlotOptions.map(option => (
                <Button
                  key={option.value}
                  variant="outline"
                  onClick={() => quickFillWeek(option.value as MyShiftRequest['timeSlot'])}
                  className="text-center p-3 h-auto"
                >
                  <div>
                    <div className="text-lg mb-1">{option.icon}</div>
                    <div className="text-xs font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.time}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 日別入力 */}
        <div className="space-y-4">
          {weekDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const request = getRequest(dateStr);
            const isWeekend = index === 0 || index === 6;
            
            return (
              <Card key={dateStr} className={`${isWeekend ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {date.getMonth() + 1}月{date.getDate()}日 ({dayNames[index]})
                      {isWeekend && <span className="ml-2 text-sm text-blue-600">週末</span>}
                    </span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`flexible-${dateStr}`}
                        checked={request.isFlexible}
                        onChange={(e) => updateRequest(dateStr, { isFlexible: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`flexible-${dateStr}`} className="text-sm text-gray-600">
                        時間調整可能
                      </label>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 時間帯選択 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {timeSlotOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updateRequest(dateStr, { timeSlot: option.value as MyShiftRequest['timeSlot'] })}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-center
                          ${request.timeSlot === option.value 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="text-lg mb-1">{option.icon}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.time}</div>
                      </button>
                    ))}
                  </div>

                  {/* カスタム時間 */}
                  {request.timeSlot === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                        <input
                          type="time"
                          value={request.customStart || '09:00'}
                          onChange={(e) => updateRequest(dateStr, { customStart: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                        <input
                          type="time"
                          value={request.customEnd || '17:00'}
                          onChange={(e) => updateRequest(dateStr, { customEnd: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  )}

                  {/* 優先度 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
                    <div className="grid grid-cols-3 gap-2">
                      {priorityOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateRequest(dateStr, { priority: option.value as MyShiftRequest['priority'] })}
                          className={`
                            p-2 rounded-lg border text-sm font-medium transition-all
                            ${request.priority === option.value 
                              ? option.color 
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* メモ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ・理由</label>
                    <textarea
                      value={request.notes || ''}
                      onChange={(e) => updateRequest(dateStr, { notes: e.target.value })}
                      placeholder="特別な事情があれば記入してください"
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 保存ボタン */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleSave}
            size="lg"
            className="px-8 py-3"
            disabled={requests.length === 0}
          >
            シフト希望を保存
          </Button>
        </div>

        {/* サマリー */}
        {requests.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>入力サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">総日数: </span>
                  {requests.length}日
                </div>
                <div>
                  <span className="font-medium">勤務希望: </span>
                  {requests.filter(r => r.timeSlot !== 'unavailable').length}日
                </div>
                <div>
                  <span className="font-medium">休み希望: </span>
                  {requests.filter(r => r.timeSlot === 'unavailable').length}日
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </Layout>
  );
}
