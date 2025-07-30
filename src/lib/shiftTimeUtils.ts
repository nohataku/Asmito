import { ShiftType, HourlyRates } from '@/types/employee';

// 時間帯の定義（デフォルト設定）
export const DEFAULT_SHIFT_TIME_RANGES = {
  morning: { start: '06:00', end: '09:00', label: '朝勤務' },
  day: { start: '09:00', end: '17:00', label: '昼勤務' },
  evening: { start: '17:00', end: '22:00', label: '夕方勤務' },
  night: { start: '22:00', end: '06:00', label: '深夜勤務' },
} as const;

/**
 * 時間から勤務時間帯を判定する
 * @param time HH:MM形式の時間文字列
 * @returns 該当する勤務時間帯
 */
export function getShiftTypeByTime(time: string): ShiftType {
  const hour = parseInt(time.split(':')[0]);
  
  if (hour >= 6 && hour < 9) return 'morning';   // 6:00-9:00
  if (hour >= 9 && hour < 17) return 'day';      // 9:00-17:00
  if (hour >= 17 && hour < 22) return 'evening'; // 17:00-22:00
  return 'night'; // 22:00-6:00
}

/**
 * 勤務時間帯から時給を取得する
 * @param shiftType 勤務時間帯
 * @param hourlyRates 時間帯別時給設定
 * @param fallbackRate 基本時給（フォールバック）
 * @returns 該当時間帯の時給
 */
export function getHourlyRateByShiftType(
  shiftType: ShiftType, 
  hourlyRates?: HourlyRates, 
  fallbackRate: number = 0
): number {
  if (!hourlyRates) return fallbackRate;
  
  switch (shiftType) {
    case 'morning':
      return hourlyRates.morning;
    case 'day':
      return hourlyRates.day;
    case 'evening':
      return hourlyRates.day; // 夕方勤務も昼勤務の時給を適用
    case 'night':
      return hourlyRates.night;
    default:
      return fallbackRate;
  }
}

/**
 * 勤務時間帯のラベルを取得する
 * @param shiftType 勤務時間帯
 * @returns 日本語ラベル
 */
export function getShiftTypeLabel(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'morning':
      return '朝勤務';
    case 'day':
      return '昼勤務';
    case 'evening':
      return '夕方勤務';
    case 'night':
      return '深夜勤務';
    default:
      return '不明';
  }
}

/**
 * 時間範囲から勤務時間を計算し、時間帯別の時給を適用して給与を計算する
 * @param startTime 開始時間（HH:MM）
 * @param endTime 終了時間（HH:MM）
 * @param hourlyRates 時間帯別時給設定
 * @param fallbackRate 基本時給
 * @returns 計算結果
 */
export function calculateShiftPayment(
  startTime: string, 
  endTime: string, 
  hourlyRates?: HourlyRates,
  fallbackRate: number = 0
): {
  totalHours: number;
  totalPayment: number;
  breakdown: Array<{
    shiftType: ShiftType;
    hours: number;
    rate: number;
    payment: number;
  }>;
} {
  const startHour = parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1]);
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  const breakdown: Array<{
    shiftType: ShiftType;
    hours: number;
    rate: number;
    payment: number;
  }> = [];
  
  let totalHours = 0;
  let totalPayment = 0;
  
  // 日をまたぐ場合の処理
  let targetEndHour = endHour;
  if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
    targetEndHour = endHour + 24;
  }
  
  while (currentHour < targetEndHour || (currentHour === targetEndHour && currentMinute < endMinute)) {
    const currentTimeStr = `${String(currentHour % 24).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const shiftType = getShiftTypeByTime(currentTimeStr);
    const rate = getHourlyRateByShiftType(shiftType, hourlyRates, fallbackRate);
    
    // 次の時間境界または終了時間を決定
    let nextBoundaryHour = currentHour;
    let nextBoundaryMinute = currentMinute;
    
    // 時間帯の境界を考慮して次の境界を決定
    const currentHourOnly = currentHour % 24;
    if (currentHourOnly >= 6 && currentHourOnly < 9) {
      // 朝勤務中：9:00が次の境界
      nextBoundaryHour = Math.floor(currentHour / 24) * 24 + 9;
      nextBoundaryMinute = 0;
    } else if (currentHourOnly >= 9 && currentHourOnly < 17) {
      // 昼勤務中：17:00が次の境界
      nextBoundaryHour = Math.floor(currentHour / 24) * 24 + 17;
      nextBoundaryMinute = 0;
    } else if (currentHourOnly >= 17 && currentHourOnly < 22) {
      // 夕方勤務中：22:00が次の境界
      nextBoundaryHour = Math.floor(currentHour / 24) * 24 + 22;
      nextBoundaryMinute = 0;
    } else {
      // 深夜勤務中：6:00が次の境界（翌日）
      if (currentHourOnly >= 22) {
        nextBoundaryHour = Math.floor(currentHour / 24) * 24 + 24 + 6;
      } else {
        nextBoundaryHour = Math.floor(currentHour / 24) * 24 + 6;
      }
      nextBoundaryMinute = 0;
    }
    
    // 終了時間が次の境界より前の場合は終了時間を使用
    if (nextBoundaryHour > targetEndHour || (nextBoundaryHour === targetEndHour && nextBoundaryMinute > endMinute)) {
      nextBoundaryHour = targetEndHour;
      nextBoundaryMinute = endMinute;
    }
    
    const hoursInThisSlot = (nextBoundaryHour - currentHour) + (nextBoundaryMinute - currentMinute) / 60;
    const payment = hoursInThisSlot * rate;
    
    // 既存の同じ時間帯があるかチェック
    const existingIndex = breakdown.findIndex(item => item.shiftType === shiftType);
    if (existingIndex >= 0) {
      breakdown[existingIndex].hours += hoursInThisSlot;
      breakdown[existingIndex].payment += payment;
    } else {
      breakdown.push({
        shiftType,
        hours: hoursInThisSlot,
        rate,
        payment
      });
    }
    
    totalHours += hoursInThisSlot;
    totalPayment += payment;
    
    currentHour = nextBoundaryHour;
    currentMinute = nextBoundaryMinute;
  }
  
  return {
    totalHours,
    totalPayment,
    breakdown
  };
}

/**
 * デフォルトの時間帯別時給を生成する（基本時給ベース）
 * @param baseRate 基本時給
 * @returns 時間帯別時給設定
 */
export function generateDefaultHourlyRates(baseRate: number): HourlyRates {
  return {
    morning: baseRate,
    day: baseRate,
    night: Math.round(baseRate * 1.25) // 深夜割増25%
  };
}
