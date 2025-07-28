import { Employee, ShiftRequest, Shift } from '@/types'

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
}

interface ShiftCandidate {
  employeeId: string
  date: string
  startTime: string
  endTime: string
  score: number
  conflicts: string[]
}

export class ShiftOptimizer {
  private employees: ExtendedEmployee[]
  private shiftRequests: ShiftRequest[]
  private settings: OptimizationSettings
  private generatedShifts: Shift[] = []

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
    console.log('🤖 AI最適化開始...')
    console.log(`📊 最適化設定:`)
    console.log(`  期間: ${this.settings.startDate} ～ ${this.settings.endDate}`)
    console.log(`  営業時間: ${this.settings.operatingHours.start} ～ ${this.settings.operatingHours.end}`)
    console.log(`  必要人数: ${this.settings.minStaffPerHour}名 ～ ${this.settings.maxStaffPerHour}名/時間`)
    console.log(`  制約: 最大${this.settings.constraints.maxHoursPerDay}h/日, 週${this.settings.constraints.maxDaysPerWeek}日, 休憩${this.settings.constraints.minRestHours}h`)
    console.log(`  従業員: ${this.employees.length}名, シフト希望: ${this.shiftRequests.length}件`)
    
    this.generatedShifts = []
    
    // 1. 日付ごとに処理
    const dates = this.generateDateRange()
    
    for (const date of dates) {
      console.log(`📅 ${date} のシフト最適化中...`)
      this.optimizeDay(date)
    }

    // 2. 週次制約をチェックして調整
    this.enforceWeeklyConstraints()

    // 3. 最終スコア計算とレポート
    const score = this.calculateOverallScore()
    console.log(`✅ 最適化完了 - 総合スコア: ${score.toFixed(2)}`)

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
    
    // 利用可能な従業員
    const availableEmployees = this.employees.filter(emp => 
      !unavailableEmployeeIds.includes(emp.id)
    ) as ExtendedEmployee[]

    // その日の勤務希望
    const workRequests = this.shiftRequests.filter(req => 
      req.date === date && req.type === 'work'
    )

    console.log(`📋 ${date}: 利用可能従業員${availableEmployees.length}名、勤務希望${workRequests.length}件、休み希望${offRequests.length}件`)

    // 時間帯ごとに最適化
    const operatingStart = this.timeToMinutes(this.settings.operatingHours.start)
    const operatingEnd = this.timeToMinutes(this.settings.operatingHours.end)
    
    console.log(`🕐 営業時間: ${this.settings.operatingHours.start} - ${this.settings.operatingHours.end} (${operatingStart}分 - ${operatingEnd}分)`)
    
    // 24時間営業または日をまたぐ営業時間の場合の処理
    let actualEnd = operatingEnd
    if (operatingEnd <= operatingStart) {
      // 24時間営業の場合（例: 06:00 - 05:59）
      actualEnd = operatingEnd + 24 * 60 // 翌日の時間として扱う
      console.log(`🌙 24時間営業モード: 実際の終了時間 ${actualEnd}分 (翌日${this.minutesToTime(operatingEnd)})`)
    }
    
    // 1時間単位で処理
    for (let time = operatingStart; time < actualEnd; time += 60) {
      const timeStr = this.minutesToTime(time % (24 * 60)) // 24時間でループ
      console.log(`⏰ ${timeStr}の時間帯を最適化中...`)
      this.optimizeTimeSlot(date, time, availableEmployees, workRequests)
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
    const maxShiftHours = this.settings.constraints.maxHoursPerDay
    const endTimeMinutes = normalizedStartTime + (maxShiftHours * 60)
    
    // 営業時間の終了を考慮
    const operatingEnd = this.timeToMinutes(this.settings.operatingHours.end)
    const operatingStart = this.timeToMinutes(this.settings.operatingHours.start)
    
    let actualOperatingEnd = operatingEnd
    if (operatingEnd <= operatingStart) {
      actualOperatingEnd = operatingEnd + 24 * 60
    }
    
    const finalEndTime = Math.min(endTimeMinutes, actualOperatingEnd)
    const endTime = this.minutesToTime(finalEndTime % (24 * 60))

    // その時間帯で既に働いている人数
    const currentStaff = this.generatedShifts.filter(shift => {
      const shiftStart = this.timeToMinutes(shift.startTime)
      const shiftEnd = this.timeToMinutes(shift.endTime)
      const checkTime = normalizedStartTime
      
      return shift.date === date &&
        shiftStart <= checkTime &&
        shiftEnd > checkTime
    }).length

    // 必要な追加人数
    const neededStaff = Math.max(0, this.settings.minStaffPerHour - currentStaff)
    
    console.log(`⏰ ${date} ${startTime}: 現在${currentStaff}名、必要${neededStaff}名追加`)
    
    if (neededStaff === 0) return

    // 候補者をスコアリング
    const candidates: ShiftCandidate[] = []
    
    for (const employee of availableEmployees) {
      // 既にその日に働いているかチェック
      const alreadyWorking = this.generatedShifts.some(shift => 
        shift.date === date && shift.employeeId === employee.id
      )
      
      if (alreadyWorking) continue

      // 制約チェック
      const conflicts = this.checkConstraints(employee.id, date, startTime, endTime)
      
      console.log(`👤 ${employee.name}: 制約チェック結果 - ${conflicts.length > 0 ? conflicts.join(', ') : '問題なし'}`)
      
      if (conflicts.length === 0) {
        const score = this.calculateCandidateScore(employee, date, startTime, workRequests)
        console.log(`   スコア: ${score.toFixed(2)}`)
        candidates.push({
          employeeId: employee.id,
          date,
          startTime,
          endTime,
          score,
          conflicts: []
        })
      }
    }

    console.log(`📊 候補者${candidates.length}名から${Math.min(neededStaff, candidates.length)}名選択`)

    // スコア順にソートして最適な候補を選択
    candidates.sort((a, b) => b.score - a.score)
    
    const selectedCandidates = candidates.slice(0, Math.min(neededStaff, candidates.length))
    
    // シフトを生成
    for (const candidate of selectedCandidates) {
      console.log(`✅ シフト生成: ${this.employees.find(e => e.id === candidate.employeeId)?.name} ${candidate.startTime}-${candidate.endTime}`)
      this.generatedShifts.push({
        id: `shift_${Date.now()}_${Math.random()}`,
        employeeId: candidate.employeeId,
        date: candidate.date,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        position: 'staff',
        isConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
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
    
    console.log(`🔍 従業員${employee?.name || employeeId}の制約チェック (${date} ${startTime}-${endTime}):`)

    // 1日の最大勤務時間チェック
    const shiftDuration = this.calculateShiftDuration(startTime, endTime)
    console.log(`  勤務時間: ${shiftDuration}時間 (最大: ${this.settings.constraints.maxHoursPerDay}時間)`)
    if (shiftDuration > this.settings.constraints.maxHoursPerDay) {
      const conflict = '1日の最大勤務時間を超過'
      conflicts.push(conflict)
      console.log(`  ❌ ${conflict}`)
    } else {
      console.log(`  ✅ 1日の勤務時間OK`)
    }

    // 週の最大勤務日数チェック
    const weeklyShifts = this.getWeeklyShifts(employeeId, date)
    console.log(`  今週のシフト数: ${weeklyShifts.length}日 (最大: ${this.settings.constraints.maxDaysPerWeek}日)`)
    if (weeklyShifts.length >= this.settings.constraints.maxDaysPerWeek) {
      const conflict = '週の最大勤務日数を超過'
      conflicts.push(conflict)
      console.log(`  ❌ ${conflict}`)
    } else {
      console.log(`  ✅ 週の勤務日数OK`)
    }

    // 最低休憩時間チェック（前日までのシフトのみチェック）
    const lastShift = this.getLastShift(employeeId, date)
    if (lastShift) {
      const restHours = this.calculateRestHours(lastShift, { date, startTime })
      console.log(`  前回シフト: ${lastShift.date} ${lastShift.endTime}終了, 休憩時間: ${restHours.toFixed(1)}時間 (最小: ${this.settings.constraints.minRestHours}時間)`)
      if (restHours < this.settings.constraints.minRestHours) {
        const conflict = `最低休憩時間不足（${restHours.toFixed(1)}時間）`
        conflicts.push(conflict)
        console.log(`  ❌ ${conflict}`)
      } else {
        console.log(`  ✅ 休憩時間OK`)
      }
    } else {
      console.log(`  ✅ 前回シフトなし（休憩時間制約なし）`)
    }

    if (conflicts.length === 0) {
      console.log(`  🎉 全制約をクリア！`)
    } else {
      console.log(`  ❌ 制約違反: ${conflicts.join(', ')}`)
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
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  private calculateShiftDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime)
    const end = this.timeToMinutes(endTime)
    return (end - start) / 60
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
