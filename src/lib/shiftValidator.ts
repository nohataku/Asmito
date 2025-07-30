import { Employee, ShiftRequest, Shift } from '@/types'

/**
 * シフト生成時の検証ロジック
 */
export class ShiftValidator {
  /**
   * 勤務時間数を計算（安全版）
   */
  static calculateShiftDuration(startTime: string, endTime: string): number {
    try {
      const start = ShiftValidator.timeToMinutes(startTime)
      let end = ShiftValidator.timeToMinutes(endTime)
      
      // 終了時間が開始時間より小さい場合は翌日とみなす
      if (end <= start) {
        end += 24 * 60
      }
      
      const durationMinutes = end - start
      const durationHours = durationMinutes / 60
      
      // 異常な値をチェック
      if (durationHours <= 0 || durationHours > 24) {
        console.warn(`⚠️ 異常な勤務時間: ${startTime}-${endTime} = ${durationHours}時間`)
        return 0
      }
      
      return Math.round(durationHours * 100) / 100
    } catch (error) {
      console.error(`勤務時間計算エラー: ${startTime}-${endTime}`, error)
      return 0
    }
  }

  /**
   * 時刻文字列を分に変換
   */
  static timeToMinutes(time: string): number {
    if (!time || !time.includes(':')) {
      throw new Error(`無効な時刻形式: ${time}`)
    }
    
    const [hours, minutes] = time.split(':').map(Number)
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`無効な時刻値: ${time}`)
    }
    
    return hours * 60 + minutes
  }

  /**
   * 分を時刻文字列に変換
   */
  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  /**
   * シフト希望と実際のシフトが一致するかチェック
   */
  static isShiftWithinRequest(shift: Shift, request: ShiftRequest): boolean {
    if (shift.date !== request.date || shift.employeeId !== request.employeeId) {
      return false
    }

    // 勤務希望の場合のみチェック
    if (request.type !== 'work') {
      return false
    }

    // 開始時間・終了時間が指定されていない場合は許可
    if (!request.startTime || !request.endTime) {
      return true
    }

    try {
      const requestStart = ShiftValidator.timeToMinutes(request.startTime)
      const requestEnd = ShiftValidator.timeToMinutes(request.endTime)
      const shiftStart = ShiftValidator.timeToMinutes(shift.startTime)
      const shiftEnd = ShiftValidator.timeToMinutes(shift.endTime)

      // 日をまたぐ場合の考慮
      let adjustedRequestEnd = requestEnd
      let adjustedShiftEnd = shiftEnd
      
      if (requestEnd <= requestStart) {
        adjustedRequestEnd = requestEnd + 24 * 60
      }
      
      if (shiftEnd <= shiftStart) {
        adjustedShiftEnd = shiftEnd + 24 * 60
      }

      // シフトがリクエスト時間内に収まっているかチェック
      const withinTimeRange = shiftStart >= requestStart && adjustedShiftEnd <= adjustedRequestEnd
      
      if (!withinTimeRange) {
        console.warn(`⚠️ シフト時間がリクエスト範囲外: シフト ${shift.startTime}-${shift.endTime}, リクエスト ${request.startTime}-${request.endTime}`)
      }
      
      return withinTimeRange
    } catch (error) {
      console.error('シフト時間比較エラー:', error)
      return false
    }
  }

  /**
   * シフトの基本妥当性をチェック
   */
  static validateShift(shift: Shift): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 必須フィールドのチェック
    if (!shift.employeeId) errors.push('従業員IDが必要です')
    if (!shift.date) errors.push('日付が必要です')
    if (!shift.startTime) errors.push('開始時間が必要です')
    if (!shift.endTime) errors.push('終了時間が必要です')

    // 日付形式のチェック
    if (shift.date && !/^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
      errors.push('日付形式が無効です (YYYY-MM-DD)')
    }

    // 時刻形式のチェック
    if (shift.startTime && !/^\d{2}:\d{2}$/.test(shift.startTime)) {
      errors.push('開始時間形式が無効です (HH:MM)')
    }
    
    if (shift.endTime && !/^\d{2}:\d{2}$/.test(shift.endTime)) {
      errors.push('終了時間形式が無効です (HH:MM)')
    }

    // 勤務時間の妥当性
    if (shift.startTime && shift.endTime) {
      const duration = ShiftValidator.calculateShiftDuration(shift.startTime, shift.endTime)
      if (duration <= 0) {
        errors.push('勤務時間が無効です (開始時間 >= 終了時間)')
      } else if (duration > 12) {
        errors.push('勤務時間が12時間を超えています')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 複数のシフトの整合性をチェック
   */
  static validateShifts(shifts: Shift[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    for (const shift of shifts) {
      const validation = ShiftValidator.validateShift(shift)
      if (!validation.isValid) {
        errors.push(`従業員 ${shift.employeeName || shift.employeeId} (${shift.date}): ${validation.errors.join(', ')}`)
      }
    }

    // 同じ従業員の同じ日の重複チェック
    const shiftsByEmployee = new Map<string, Shift[]>()
    
    for (const shift of shifts) {
      const key = `${shift.employeeId}-${shift.date}`
      if (!shiftsByEmployee.has(key)) {
        shiftsByEmployee.set(key, [])
      }
      shiftsByEmployee.get(key)!.push(shift)
    }

    for (const [key, employeeShifts] of shiftsByEmployee) {
      if (employeeShifts.length > 1) {
        const [employeeId, date] = key.split('-')
        errors.push(`従業員 ${employeeId} の ${date} に複数のシフトが割り当てられています`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
