'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface DetailedShiftRequest {
  employeeId: string;
  employeeName: string;
  weekStartDate: string;
  dailyRequests: {
    [date: string]: {
      timeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'all-day' | 'unavailable' | 'custom';
      customStart?: string;
      customEnd?: string;
      priority: 'high' | 'medium' | 'low';
      notes?: string;
      isFlexible: boolean;
    };
  };
  generalNotes?: string;
}

interface ShiftRequestFormProps {
  employeeId: string;
  employeeName: string;
  onSave: (request: DetailedShiftRequest) => void;
  onCancel: () => void;
}

export default function ShiftRequestForm({ 
  employeeId, 
  employeeName, 
  onSave, 
  onCancel 
}: ShiftRequestFormProps) {
  const [request, setRequest] = useState<DetailedShiftRequest>({
    employeeId,
    employeeName,
    weekStartDate: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    dailyRequests: {},
    generalNotes: ''
  });

  // 現在の週の日付を生成（タイムゾーン問題を回避）
  const getCurrentWeekDates = () => {
    const startDate = new Date(request.weekStartDate + 'T00:00:00');
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getCurrentWeekDates();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const timeSlotOptions = [
    { value: 'morning', label: '朝シフト (9:00-13:00)' },
    { value: 'afternoon', label: '昼シフト (13:00-17:00)' },
    { value: 'evening', label: '夕シフト (17:00-21:00)' },
    { value: 'night', label: '夜シフト (21:00-25:00)' },
    { value: 'all-day', label: '終日 (9:00-21:00)' },
    { value: 'custom', label: 'カスタム時間' },
    { value: 'unavailable', label: '勤務不可' }
  ];

  const priorityOptions = [
    { value: 'high', label: '高 (絶対に希望)', color: 'text-red-600' },
    { value: 'medium', label: '中 (できれば希望)', color: 'text-yellow-600' },
    { value: 'low', label: '低 (どちらでも)', color: 'text-green-600' }
  ];

  const updateDailyRequest = (date: string, field: string, value: any) => {
    setRequest(prev => ({
      ...prev,
      dailyRequests: {
        ...prev.dailyRequests,
        [date]: {
          ...prev.dailyRequests[date],
          [field]: value
        }
      }
    }));
  };

  const getDailyRequest = (date: string) => {
    return request.dailyRequests[date] || {
      timeSlot: 'morning' as const,
      priority: 'medium' as const,
      isFlexible: false,
      notes: ''
    };
  };

  const handleSubmit = () => {
    onSave(request);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>シフト希望入力 - {employeeName}</span>
            <div className="space-x-2">
              <Button variant="outline" onClick={onCancel}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit}>
                保存
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            週間のシフト希望を詳細に入力できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 週選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象週
            </label>
            <input
              type="date"
              value={request.weekStartDate}
              onChange={(e) => setRequest(prev => ({ ...prev, weekStartDate: e.target.value }))}
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 日別シフト希望 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">日別シフト希望</h3>
            
            {weekDates.map((date, index) => {
              // タイムゾーン問題を回避するため、ローカル日付として処理
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              const dailyRequest = getDailyRequest(dateStr);
              
              return (
                <Card key={dateStr} className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {date.getMonth() + 1}月{date.getDate()}日 ({dayNames[index]})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 時間帯選択 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          希望時間帯
                        </label>
                        <select
                          value={dailyRequest.timeSlot}
                          onChange={(e) => updateDailyRequest(dateStr, 'timeSlot', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                        >
                          {timeSlotOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* カスタム時間 */}
                      {dailyRequest.timeSlot === 'custom' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              開始時間
                            </label>
                            <input
                              type="time"
                              value={dailyRequest.customStart || '09:00'}
                              onChange={(e) => updateDailyRequest(dateStr, 'customStart', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              終了時間
                            </label>
                            <input
                              type="time"
                              value={dailyRequest.customEnd || '17:00'}
                              onChange={(e) => updateDailyRequest(dateStr, 'customEnd', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </>
                      )}

                      {/* 優先度 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          優先度
                        </label>
                        <select
                          value={dailyRequest.priority}
                          onChange={(e) => updateDailyRequest(dateStr, 'priority', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                        >
                          {priorityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 柔軟性とメモ */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`flexible-${dateStr}`}
                          checked={dailyRequest.isFlexible}
                          onChange={(e) => updateDailyRequest(dateStr, 'isFlexible', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`flexible-${dateStr}`} className="text-sm text-gray-700">
                          時間調整可能（±1時間程度の変更OK）
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          特記事項・理由
                        </label>
                        <textarea
                          value={dailyRequest.notes || ''}
                          onChange={(e) => updateDailyRequest(dateStr, 'notes', e.target.value)}
                          placeholder="例：学校の授業のため、家族の用事など"
                          rows={2}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 全体的なメモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              全体的な備考
            </label>
            <textarea
              value={request.generalNotes || ''}
              onChange={(e) => setRequest(prev => ({ ...prev, generalNotes: e.target.value }))}
              placeholder="その他、シフト作成時に考慮してほしいことがあれば記入してください"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              シフト希望を保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
