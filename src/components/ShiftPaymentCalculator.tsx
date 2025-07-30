import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { calculateShiftPayment, getShiftTypeLabel } from '@/lib/shiftTimeUtils';
import { HourlyRates } from '@/types/employee';

interface ShiftPaymentCalculatorProps {
  employee: {
    name: string;
    hourlyRate: number;
    hourlyRates?: HourlyRates;
  };
}

export const ShiftPaymentCalculator: React.FC<ShiftPaymentCalculatorProps> = ({ employee }) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [calculation, setCalculation] = useState<any>(null);

  const handleCalculate = () => {
    const result = calculateShiftPayment(
      startTime,
      endTime,
      employee.hourlyRates,
      employee.hourlyRate
    );
    setCalculation(result);
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        シフト給与計算 - {employee.name}
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            開始時間
          </label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            終了時間
          </label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleCalculate} className="mb-4">
        給与を計算
      </Button>

      {calculation && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">総勤務時間</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {calculation.totalHours.toFixed(2)}時間
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">総給与</span>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  ¥{Math.round(calculation.totalPayment).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">時間帯別内訳</h4>
              {calculation.breakdown.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getShiftTypeLabel(item.shiftType)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.hours.toFixed(2)}時間 × ¥{item.rate.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ¥{Math.round(item.payment).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
