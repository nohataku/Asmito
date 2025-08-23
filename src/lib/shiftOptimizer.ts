import { Employee, ShiftRequest, Shift } from '@/types'
import { ShiftValidator } from './shiftValidator'

// 拡張された従業員型定義（オプティマイザー用）
interface ExtendedEmployee extends Employee {
  availableShifts?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface OptimizationSettings {
  startDate: string
  endDate: string
  minStaffPerHour: number
  maxStaffPerHour: number
  operatingHours: {
    start: string
    end: string
  }
  constraints: {
    maxHoursPerDay: number
    maxDaysPerWeek: number
    minRestHours: number
  }
  assignmentPolicy?: {
    allowUnrequestedAssignment: boolean
    prioritizeRequested: boolean
  }
}

interface ShiftCandidate {
  employeeId: string
  date: string
  startTime: string
  endTime: string
  score: number
  conflicts: string[]
}

interface StaffingShortage {
  date: string
  timeSlot: string
  requiredStaff: number
  availableStaff: number
  shortage: number
  hasRequests: boolean
}

export class ShiftOptimizer {
  private employees: ExtendedEmployee[]
  private shiftRequests: ShiftRequest[]
  private settings: OptimizationSettings
  private generatedShifts: Shift[] = []
  private staffingShortages: StaffingShortage[] = []

  constructor(employees: Employee[], shiftRequests: ShiftRequest[], settings: OptimizationSettings) {
    // Employee型をExtendedEmployee型にキャスト
    this.employees = employees as ExtendedEmployee[]
    this.shiftRequests = shiftRequests
    this.settings = settings
  }

  /**
   * メインの最適化関数
   */
  optimize(): Shift[] {
    console.log('最適化開始...')
    console.log(`最適化設定:`)
    console.log(`  期間: ${this.settings.startDate} ～ ${this.settings.endDate}`)
    console.log(`  営業時間: ${this.settings.operatingHours.start} ～ ${this.settings.operatingHours.end}`)
    console.log(`  必要人数: ${this.settings.minStaffPerHour}名 ～ ${this.settings.maxStaffPerHour}名/時間`)
    console.log(`  制約: 最大${this.settings.constraints.maxHoursPerDay}h/日, 週${this.settings.constraints.maxDaysPerWeek}日, 休憩${this.settings.constraints.minRestHours}h`)
    console.log(`  割り当てポリシー: 未提出者への割り当て${this.settings.assignmentPolicy?.allowUnrequestedAssignment ? '許可' : '禁止'}, 希望者優先${this.settings.assignmentPolicy?.prioritizeRequested ? 'ON' : 'OFF'}`)
    console.log(`  従業員: ${this.employees.length}名, シフト希望: ${this.shiftRequests.length}件`)
    
    this.generatedShifts = []
    this.staffingShortages = []
    
    // 1. 日付ごとに処理
    const dates = this.generateDateRange()
    
    for (const date of dates) {
      console.log(`${date} のシフト最適化中...`)
      this.optimizeDay(date)
      this.checkStaffingShortages(date)
    }

    // 2. 週次制約をチェックして調整
    this.enforceWeeklyConstraints()

    // 3. 最終スコア計算とレポート
    const score = this.calculateOverallScore()
    console.log(`最適化完了 - 総合スコア: ${score.toFixed(2)}`)

    // 3.5. 生成されたシフトの検証
    this.validateGeneratedShifts()

    // 4. 欠員レポート
    this.reportStaffingShortages()

    return this.generatedShifts
  }

  /**
   * 1日のシフト最適化
   */
  private optimizeDay(date: string) {
    const dayOfWeek = new Date(date).getDay()
    
    // その日の休み希望者を除外
    const offRequests = this.shiftRequests.filter(req => 
      req.date === date && req.type === 'off'
    )
    const unavailableEmployeeIds = offRequests.map(req => req.employeeId)
    
    // 利用可能な従業員をポリシーに基づいてフィルタリング
    let availableEmployees = this.employees.filter(emp => 
      !unavailableEmployeeIds.includes(emp.id)
    ) as ExtendedEmployee[]

    // その日の勤務希望
    const workRequests = this.shiftRequests.filter(req => 
      req.date === date && req.type === 'work'
    )

    // シフト希望未提出者への割り当てを禁止する場合
    if (!this.settings.assignmentPolicy?.allowUnrequestedAssignment) {
      const requestedEmployeeIds = workRequests.map(req => req.employeeId)
      const originalCount = availableEmployees.length
      availableEmployees = availableEmployees.filter(emp => 
        requestedEmployeeIds.includes(emp.id)
      )
      console.log(`シフト希望未提出者を除外: ${originalCount}名 → ${availableEmployees.length}名`)
    }

    console.log(`${date}: 利用可能従業員${availableEmployees.length}名、勤務希望${workRequests.length}件、休み希望${offRequests.length}件`)

    // シフト希望が提出されている時間帯のみを処理
    const requestedTimeSlots = new Set<string>()
    workRequests.forEach(req => {
      if (req.startTime) {
        // 時刻を時間単位に正規化（例: "09:30" → "09:00"）
        const hour = req.startTime.split(':')[0]
        requestedTimeSlots.add(`${hour}:00`)
        console.log(`シフト希望時間帯: ${req.startTime} → ${hour}:00`)
      }
    })

    if (requestedTimeSlots.size === 0) {
      console.log(`${date}: シフト希望時間帯がないため、スキップします`)
      return
    }

    console.log(`${date}: シフト希望のある時間帯: ${Array.from(requestedTimeSlots).sort().join(', ')}`)

    // シフト希望がある時間帯のみ最適化
    for (const timeSlot of Array.from(requestedTimeSlots).sort()) {
      const timeMinutes = this.timeToMinutes(timeSlot)
      console.log(`${timeSlot}の時間帯を最適化中（シフト希望あり）...`)
      this.optimizeTimeSlot(date, timeMinutes, availableEmployees, workRequests)
    }
  }

  /**
   * 特定の時間帯の最適化
   */
  private optimizeTimeSlot(
    date: string, 
    startTimeMinutes: number, 
    availableEmployees: ExtendedEmployee[], 
    workRequests: ShiftRequest[]
  ) {
    // 24時間でモジュロを取って正規化
    const normalizedStartTime = startTimeMinutes % (24 * 60)
    const startTime = this.minutesToTime(normalizedStartTime)
    
    // この時間帯での勤務希望があるかチェック
    const timeSlotRequests = workRequests.filter(req => {
      if (!req.startTime) return false
      const reqHour = req.startTime.split(':')[0]
      const slotHour = startTime.split(':')[0]
      return reqHour === slotHour
    })

    if (timeSlotRequests.length === 0) {
      console.log(`${date} ${startTime}: この時間帯にシフト希望がないためスキップ`)
      return
    }

    console.log(`${date} ${startTime}: ${timeSlotRequests.length}件のシフト希望あり`)

    // その時間帯で既に働いている人数
    const currentStaff = this.generatedShifts.filter(shift => {
      const shiftStart = this.timeToMinutes(shift.startTime)
      const shiftEnd = this.timeToMinutes(shift.endTime)
      let checkTime = normalizedStartTime
      
      // 日をまたぐシフトの考慮
      let adjustedShiftEnd = shiftEnd
      if (shiftEnd <= shiftStart) {
        adjustedShiftEnd = shiftEnd + 24 * 60
      }
      
      return shift.date === date &&
        shiftStart <= checkTime &&
        adjustedShiftEnd > checkTime
    }).length

    // シフト希望者を個別に処理（希望時間を尊重）
    for (const request of timeSlotRequests) {
      const employee = availableEmployees.find(emp => emp.id === request.employeeId)
      if (!employee) {
        console.log(`従業員が見つかりません: ${request.employeeId}`)
        continue
      }

      // 既にその日に働いているかチェック
      const alreadyWorking = this.generatedShifts.some(shift => 
        shift.date === date && shift.employeeId === employee.id
      )
      
      if (alreadyWorking) {
        console.log(`${employee.name}: 既に${date}に勤務予定のためスキップ`)
        continue
      }

      // シフト希望の実際の時間を使用
      let actualStartTime = request.startTime || startTime
      let actualEndTime = request.endTime || startTime
      
      // 終了時間が指定されていない場合、デフォルト勤務時間を設定
      if (!request.endTime || request.startTime === request.endTime) {
        const defaultHours = Math.min(this.settings.constraints.maxHoursPerDay, 8)
        const startMinutes = this.timeToMinutes(actualStartTime)
        const endMinutes = startMinutes + (defaultHours * 60)
        
        // 営業時間内に収める
        const operatingEnd = this.timeToMinutes(this.settings.operatingHours.end)
        let maxEndMinutes = operatingEnd
        if (operatingEnd <= this.timeToMinutes(this.settings.operatingHours.start)) {
          maxEndMinutes = operatingEnd + 24 * 60
        }
        
        actualEndTime = this.minutesToTime(Math.min(endMinutes, maxEndMinutes) % (24 * 60))
      }

      // 勤務時間の妥当性チェック
      const duration = this.calculateShiftDuration(actualStartTime, actualEndTime)
      if (duration <= 0) {
        console.log(`${employee.name}: 無効な勤務時間 ${actualStartTime}-${actualEndTime}`)
        continue
      }

      // 制約チェック
      const conflicts = this.checkConstraints(employee.id, date, actualStartTime, actualEndTime)
      
      console.log(`👤 ${employee.name}: ${actualStartTime}-${actualEndTime} (${duration}h) - ${conflicts.length > 0 ? conflicts.join(', ') : '問題なし'}`)
      
      if (conflicts.length === 0) {
        console.log(`シフト生成: ${employee.name} ${actualStartTime}-${actualEndTime} (${duration}時間)`)
        this.generatedShifts.push({
          id: `shift_${Date.now()}_${Math.random()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          date: date,
          startTime: actualStartTime,
          endTime: actualEndTime,
          position: employee.position || 'staff',
          department: employee.department || '',
          hourlyRate: employee.hourlyRate || 0,
          isConfirmed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      } else {
        console.log(`${employee.name}: 制約違反により割り当て不可`)
      }
    }
  }

  /**
   * 候補者のスコア計算（AI的な重み付け）
   */
  private calculateCandidateScore(
    employee: ExtendedEmployee, 
    date: string, 
    startTime: string, 
    workRequests: ShiftRequest[]
  ): number {
    let score = 0
    
    // 1. シフト希望がある場合は高スコア
    const hasRequest = workRequests.some(req => 
      req.employeeId === employee.id && 
      req.startTime === startTime
    )
    if (hasRequest) score += 100

    // 2. 希望優先度による加点
    const request = workRequests.find(req => req.employeeId === employee.id)
    if (request) {
      const priorityBonus = { high: 50, medium: 30, low: 10 }
      score += priorityBonus[request.priority] || 0
    }

    // 2.5. 希望者優先ポリシーによる大幅な加点
    if (this.settings.assignmentPolicy?.prioritizeRequested) {
      const hasAnyRequest = workRequests.some(req => req.employeeId === employee.id)
      if (hasAnyRequest) {
        score += 200 // シフト希望を提出している場合は大幅加点
        console.log(`${employee.name}: 希望者優先により+200点`)
      } else {
        console.log(`${employee.name}: シフト希望なし`)
      }
    }

    // 3. 時給の逆比例（コスト最適化）
    const maxHourlyRate = Math.max(...this.employees.map(emp => emp.hourlyRate))
    const costScore = ((maxHourlyRate - employee.hourlyRate) / maxHourlyRate) * 20
    score += costScore

    // 4. 週の勤務バランス
    const thisWeekShifts = this.getWeeklyShifts(employee.id, date)
    const weeklyHours = thisWeekShifts.reduce((total, shift) => {
      return total + this.calculateShiftDuration(shift.startTime, shift.endTime)
    }, 0)
    
    // 週の勤務時間が少ない人を優先
    if (weeklyHours < 20) score += 30
    else if (weeklyHours < 30) score += 20
    else if (weeklyHours < 40) score += 10

    // 5. 連続勤務日数の考慮
    const consecutiveDays = this.getConsecutiveWorkDays(employee.id, date)
    if (consecutiveDays >= 3) score -= 20
    else if (consecutiveDays >= 5) score -= 50

    // 6. スキルベースの加点
    if (employee.skills && employee.skills.length > 0) {
      score += employee.skills.length * 5
    }

    // 7. 曜日の適性
    const dayOfWeek = new Date(date).getDay()
    if (employee.availableShifts) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = days[dayOfWeek] as keyof typeof employee.availableShifts
      if (employee.availableShifts[dayKey]) score += 25
    }

    return score
  }

  /**
   * 制約チェック
   */
  private checkConstraints(
    employeeId: string, 
    date: string, 
    startTime: string, 
    endTime: string
  ): string[] {
    const conflicts: string[] = []
    const employee = this.employees.find(e => e.id === employeeId)
    
    console.log(`従業員${employee?.name || employeeId}の制約チェック (${date} ${startTime}-${endTime}):`)

    // 1日の最大勤務時間チェック
    const shiftDuration = this.calculateShiftDuration(startTime, endTime)
    console.log(`  勤務時間: ${shiftDuration}時間 (最大: ${this.settings.constraints.maxHoursPerDay}時間)`)
    
    // 勤務時間が0以下または異常な値の場合
    if (shiftDuration <= 0) {
      const conflict = '無効な勤務時間（開始時間 >= 終了時間）'
      conflicts.push(conflict)
      console.log(`  ${conflict}`)
      return conflicts // 他のチェックは無意味なので早期返却
    }
    
    if (shiftDuration > this.settings.constraints.maxHoursPerDay) {
      const conflict = '1日の最大勤務時間を超過'
      conflicts.push(conflict)
      console.log(`  ${conflict}`)
    } else {
      console.log(`  1日の勤務時間OK`)
    }

    // 週の最大勤務日数チェック
    const weeklyShifts = this.getWeeklyShifts(employeeId, date)
    console.log(`  今週のシフト数: ${weeklyShifts.length}日 (最大: ${this.settings.constraints.maxDaysPerWeek}日)`)
    if (weeklyShifts.length >= this.settings.constraints.maxDaysPerWeek) {
      const conflict = '週の最大勤務日数を超過'
      conflicts.push(conflict)
      console.log(`  ${conflict}`)
    } else {
      console.log(`  週の勤務日数OK`)
    }

    // 最低休憩時間チェック（前日までのシフトのみチェック）
    const lastShift = this.getLastShift(employeeId, date)
    if (lastShift) {
      const restHours = this.calculateRestHours(lastShift, { date, startTime })
      console.log(`  前回シフト: ${lastShift.date} ${lastShift.endTime}終了, 休憩時間: ${restHours.toFixed(1)}時間 (最小: ${this.settings.constraints.minRestHours}時間)`)
      if (restHours < this.settings.constraints.minRestHours) {
        const conflict = `最低休憩時間不足（${restHours.toFixed(1)}時間）`
        conflicts.push(conflict)
        console.log(`  ${conflict}`)
      } else {
        console.log(`  休憩時間OK`)
      }
    } else {
      console.log(`  前回シフトなし（休憩時間制約なし）`)
    }

    if (conflicts.length === 0) {
      console.log(`  全制約をクリア！`)
    } else {
      console.log(`  制約違反: ${conflicts.join(', ')}`)
    }

    return conflicts
  }

  /**
   * 週次制約の調整
   */
  private enforceWeeklyConstraints() {
    // 各従業員の週次制約をチェックして調整
    for (const employee of this.employees) {
      const dates = this.generateDateRange()
      
      for (const date of dates) {
        const weeklyShifts = this.getWeeklyShifts(employee.id, date)
        const weeklyHours = weeklyShifts.reduce((total, shift) => {
          return total + this.calculateShiftDuration(shift.startTime, shift.endTime)
        }, 0)

        // 週40時間を超える場合は調整
        if (weeklyHours > 40) {
          this.reduceWeeklyHours(employee.id, date, weeklyHours - 40)
        }
      }
    }
  }

  /**
   * 欠員チェック
   */
  private checkStaffingShortages(date: string) {
    console.log(`${date} の欠員チェック開始...`)
    
    const operatingStart = this.timeToMinutes(this.settings.operatingHours.start)
    const operatingEnd = this.timeToMinutes(this.settings.operatingHours.end)
    
    // 24時間営業または日をまたぐ営業時間の場合の処理
    let actualEnd = operatingEnd
    if (operatingEnd <= operatingStart) {
      actualEnd = operatingEnd + 24 * 60
    }
    
    // その日の勤務希望
    const workRequests = this.shiftRequests.filter(req => 
      req.date === date && req.type === 'work'
    )
    
    // 1時間単位で欠員チェック
    for (let time = operatingStart; time < actualEnd; time += 60) {
      const timeStr = this.minutesToTime(time % (24 * 60))
      
      // その時間帯で働いている人数
      const currentStaff = this.generatedShifts.filter(shift => {
        const shiftStart = this.timeToMinutes(shift.startTime)
        const shiftEnd = this.timeToMinutes(shift.endTime)
        const checkTime = time % (24 * 60)
        
        return shift.date === date &&
          shiftStart <= checkTime &&
          shiftEnd > checkTime
      }).length
      
      // その時間帯のシフト希望があるか
      const hasRequests = workRequests.some(req => {
        if (!req.startTime) return false
        const reqHour = req.startTime.split(':')[0]
        const timeHour = timeStr.split(':')[0]
        return reqHour === timeHour
      })
      
      // 欠員判定
      const shortage = this.settings.minStaffPerHour - currentStaff
      if (shortage > 0) {
        this.staffingShortages.push({
          date,
          timeSlot: timeStr,
          requiredStaff: this.settings.minStaffPerHour,
          availableStaff: currentStaff,
          shortage,
          hasRequests
        })
        
        const requestStatus = hasRequests ? '（シフト希望あり）' : '（シフト希望なし）'
        console.log(`欠員: ${date} ${timeStr} - 必要${this.settings.minStaffPerHour}名/現在${currentStaff}名/不足${shortage}名 ${requestStatus}`)
      }
    }
  }

  /**
   * 欠員レポート
   */
  private reportStaffingShortages() {
    if (this.staffingShortages.length === 0) {
      console.log('欠員なし - すべての時間帯で最小人数を確保できています')
      return
    }
    
    console.log(`欠員レポート: ${this.staffingShortages.length}件の欠員が発生`)
    
    // 日付別にグループ化
    const shortagesByDate = this.staffingShortages.reduce((acc, shortage) => {
      if (!acc[shortage.date]) acc[shortage.date] = []
      acc[shortage.date].push(shortage)
      return acc
    }, {} as Record<string, StaffingShortage[]>)
    
    Object.entries(shortagesByDate).forEach(([date, shortages]) => {
      console.log(`${date}:`)
      shortages.forEach(shortage => {
        const requestStatus = shortage.hasRequests ? '（希望あり）' : '（希望なし）'
        console.log(`  ${shortage.timeSlot}: ${shortage.shortage}名不足 ${requestStatus}`)
      })
    })
    
    // 統計情報
    const totalShortage = this.staffingShortages.reduce((sum, s) => sum + s.shortage, 0)
    const shortagesWithRequests = this.staffingShortages.filter(s => s.hasRequests).length
    const shortagesWithoutRequests = this.staffingShortages.filter(s => !s.hasRequests).length
    
    console.log(`欠員統計:`)
    console.log(`  総欠員数: ${totalShortage}名`)
    console.log(`  シフト希望ありの欠員: ${shortagesWithRequests}件`)
    console.log(`  シフト希望なしの欠員: ${shortagesWithoutRequests}件`)
  }

  /**
   * 生成されたシフトの検証
   */
  private validateGeneratedShifts() {
    console.log('生成されたシフトの検証中...')
    
    const validation = ShiftValidator.validateShifts(this.generatedShifts)
    
    if (!validation.isValid) {
      console.warn('生成されたシフトに問題があります:')
      validation.errors.forEach(error => console.warn(`  - ${error}`))
      
      // 問題のあるシフトを除去
      const validShifts: Shift[] = []
      for (const shift of this.generatedShifts) {
        const shiftValidation = ShiftValidator.validateShift(shift)
        if (shiftValidation.isValid) {
          validShifts.push(shift)
        } else {
          console.warn(`無効なシフトを除去: ${shift.employeeName || shift.employeeId} ${shift.date} ${shift.startTime}-${shift.endTime}`)
        }
      }
      
      this.generatedShifts = validShifts
      console.log(`検証後のシフト数: ${this.generatedShifts.length}件`)
    } else {
      console.log('全てのシフトが正常です')
    }

    // シフト希望との整合性チェック
    let inconsistentCount = 0
    for (const shift of this.generatedShifts) {
      const request = this.shiftRequests.find(req => 
        req.employeeId === shift.employeeId && 
        req.date === shift.date && 
        req.type === 'work'
      )
      
      if (request && !ShiftValidator.isShiftWithinRequest(shift, request)) {
        console.warn(`シフト希望と不整合: ${shift.employeeName} ${shift.date} ${shift.startTime}-${shift.endTime}`)
        inconsistentCount++
      }
    }
    
    if (inconsistentCount > 0) {
      console.warn(`${inconsistentCount}件のシフトがシフト希望と不整合です`)
    } else {
      console.log('全てのシフトがシフト希望と整合しています')
    }
  }

  /**
   * 欠員情報を取得
   */
  getStaffingShortages(): StaffingShortage[] {
    return this.staffingShortages
  }

  /**
   * ユーティリティ関数群
   */
  private generateDateRange(): string[] {
    const dates: string[] = []
    const start = new Date(this.settings.startDate)
    const end = new Date(this.settings.endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  private timeToMinutes(time: string): number {
    return ShiftValidator.timeToMinutes(time)
  }

  private minutesToTime(minutes: number): string {
    return ShiftValidator.minutesToTime(minutes)
  }

  private calculateShiftDuration(startTime: string, endTime: string): number {
    return ShiftValidator.calculateShiftDuration(startTime, endTime)
  }

  private getWeeklyShifts(employeeId: string, date: string): Shift[] {
    const targetDate = new Date(date)
    const weekStart = new Date(targetDate)
    weekStart.setDate(targetDate.getDate() - targetDate.getDay())
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return this.generatedShifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shift.employeeId === employeeId &&
             shiftDate >= weekStart &&
             shiftDate <= weekEnd
    })
  }

  private getLastShift(employeeId: string, beforeDate: string): Shift | null {
    const shifts = this.generatedShifts
      .filter(shift => shift.employeeId === employeeId && shift.date < beforeDate)
      .sort((a, b) => {
        if (a.date === b.date) {
          return b.endTime.localeCompare(a.endTime) // 同じ日なら終了時間の遅い方
        }
        return b.date.localeCompare(a.date) // 日付の新しい方
      })
    
    return shifts[0] || null
  }

  private getConsecutiveWorkDays(employeeId: string, date: string): number {
    let count = 0
    let currentDate = new Date(date)
    currentDate.setDate(currentDate.getDate() - 1)
    
    while (count < 7) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const hasShift = this.generatedShifts.some(shift => 
        shift.employeeId === employeeId && shift.date === dateStr
      )
      
      if (!hasShift) break
      
      count++
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return count
  }

  private calculateRestHours(lastShift: Shift, nextShift: { date: string, startTime: string }): number {
    const lastEnd = new Date(`${lastShift.date}T${lastShift.endTime}:00`)
    const nextStart = new Date(`${nextShift.date}T${nextShift.startTime}:00`)
    
    const diffMs = nextStart.getTime() - lastEnd.getTime()
    return diffMs / (1000 * 60 * 60)
  }

  private reduceWeeklyHours(employeeId: string, date: string, excessHours: number) {
    // 週の超過時間を削減するロジック
    const weeklyShifts = this.getWeeklyShifts(employeeId, date)
    // 最新の、または最も短いシフトから削減
    // 実装は簡略化
  }

  private calculateOverallScore(): number {
    let totalScore = 0
    let maxScore = 0

    // 各シフトのスコアを計算
    for (const shift of this.generatedShifts) {
      const employee = this.employees.find(emp => emp.id === shift.employeeId)
      if (!employee) continue

      const workRequests = this.shiftRequests.filter(req => req.date === shift.date)
      const score = this.calculateCandidateScore(employee as ExtendedEmployee, shift.date, shift.startTime, workRequests)
      totalScore += score
      maxScore += 100 // 理論上の最大スコア
    }

    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0
  }
}
