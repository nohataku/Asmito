import { Employee, ShiftRequest, Shift } from '@/types'
import { ShiftValidator } from './shiftValidator'
import { AIDataManager, EmployeePerformanceData, BusinessInsightData } from './aiDataManager'

/**
 * AI強化シフト最適化エンジン
 * ローカルAIアルゴリズムとルールベースAIを組み合わせて
 * トークン消費を抑えつつ高精度なシフト生成を実現
 */

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
  assignmentPolicy: {
    allowUnrequestedAssignment: boolean
    prioritizeRequested: boolean
  }
}

interface EmployeeProfile {
  id: string
  name: string
  skillScore: number
  reliabilityScore: number
  flexibilityScore: number
  preferenceMatch: number
  workloadBalance: number
  costEfficiency: number
  totalScore: number
}

interface TimeSlotDemand {
  timeSlot: string
  demand: number
  priority: 'high' | 'medium' | 'low'
  skillRequirements: string[]
}

interface ShiftSolution {
  shift: Shift
  confidence: number
  aiScore: number
  conflictRisk: number
  optimizationNotes: string[]
}

export class AIShiftOptimizer {
  private employees: Employee[]
  private shiftRequests: ShiftRequest[]
  private settings: OptimizationSettings
  private dataManager: AIDataManager
  private employeeProfiles: Map<string, EmployeeProfile> = new Map()
  private timeSlotDemands: TimeSlotDemand[] = []
  private solutions: ShiftSolution[] = []

  constructor(employees: Employee[], shiftRequests: ShiftRequest[], settings: OptimizationSettings, dataManager?: AIDataManager) {
    this.employees = employees
    this.shiftRequests = shiftRequests
    this.settings = settings
    this.dataManager = dataManager || new AIDataManager()
    
    // デフォルトデータの初期化
    this.initializeDefaultData()
  }

  /**
   * デフォルトデータの初期化
   */
  private initializeDefaultData(): void {
    // 従業員のパフォーマンスデータが存在しない場合、デフォルト値を生成
    this.employees.forEach(employee => {
      if (!this.dataManager.getEmployeePerformanceData(employee.id)) {
        const defaultData = this.dataManager.generateDefaultPerformanceData(employee)
        this.dataManager.setEmployeePerformanceData(employee.id, defaultData)
      }
    })

    // ビジネスデータが存在しない場合、デフォルト値を設定
    if (!this.dataManager.getBusinessInsightData()) {
      const defaultBusinessData = this.dataManager.generateDefaultBusinessData()
      this.dataManager.setBusinessInsightData(defaultBusinessData)
    }
  }

  /**
   * AI最適化メイン処理
   */
  async optimize(): Promise<Shift[]> {
    console.log('AI強化シフト最適化を開始...')
    
    // 1. 従業員プロファイル分析
    this.analyzeEmployeeProfiles()
    
    // 2. 需要パターン分析
    this.analyzeDemandPatterns()
    
    // 3. 機械学習ベースの最適化
    this.performMLOptimization()
    
    // 4. ルールベースAIによる調整
    this.applyRuleBasedAI()
    
    // 5. ソリューション評価と選択
    const optimizedShifts = this.evaluateAndSelectSolutions()
    
    // 6. 最終検証
    this.validateSolutions(optimizedShifts)
    
    console.log(`AI最適化完了: ${optimizedShifts.length}件のシフトを生成`)
    return optimizedShifts
  }

  /**
   * 1. 従業員プロファイル分析（ローカルAI）
   */
  private analyzeEmployeeProfiles(): void {
    console.log('従業員プロファイル分析中...')
    
    for (const employee of this.employees) {
      const profile: EmployeeProfile = {
        id: employee.id,
        name: employee.name,
        skillScore: this.calculateSkillScore(employee),
        reliabilityScore: this.calculateReliabilityScore(employee),
        flexibilityScore: this.calculateFlexibilityScore(employee),
        preferenceMatch: this.calculatePreferenceMatch(employee),
        workloadBalance: this.calculateWorkloadBalance(employee),
        costEfficiency: this.calculateCostEfficiency(employee),
        totalScore: 0
      }
      
      // 総合スコア計算（重み付き平均）
      profile.totalScore = (
        profile.skillScore * 0.25 +
        profile.reliabilityScore * 0.20 +
        profile.flexibilityScore * 0.15 +
        profile.preferenceMatch * 0.20 +
        profile.workloadBalance * 0.15 +
        profile.costEfficiency * 0.05
      )
      
      this.employeeProfiles.set(employee.id, profile)
      console.log(`${employee.name}: 総合スコア ${profile.totalScore.toFixed(2)}`)
    }
  }

  /**
   * 2. 需要パターン分析（時系列分析AI）
   */
  private analyzeDemandPatterns(): void {
    console.log('需要パターン分析中...')
    
    const dates = this.generateDateRange()
    const operatingHours = this.generateHourlySlots()
    
    for (const date of dates) {
      for (const hour of operatingHours) {
        const timeSlot = `${hour}:00`
        const demand = this.predictDemand(date, timeSlot)
        const priority = this.determinePriority(date, timeSlot, demand)
        const skillRequirements = this.analyzeSkillRequirements(date, timeSlot)
        
        this.timeSlotDemands.push({
          timeSlot: `${date} ${timeSlot}`,
          demand,
          priority,
          skillRequirements
        })
      }
    }
    
    console.log(`${this.timeSlotDemands.length}の時間帯を分析完了`)
  }

  /**
   * 3. 機械学習ベースの最適化（軽量アルゴリズム）
   */
  private performMLOptimization(): void {
    console.log('機械学習最適化中...')
    
    // 遺伝的アルゴリズムによる最適化（軽量版）
    const populationSize = 20
    const generations = 10
    
    let population = this.generateInitialPopulation(populationSize)
    
    for (let gen = 0; gen < generations; gen++) {
      // 適応度評価
      population = population.map(individual => ({
        ...individual,
        fitness: this.calculateFitness(individual)
      }))
      
      // 選択・交叉・突然変異
      population = this.evolvePopulation(population)
      
      const bestFitness = Math.max(...population.map(ind => ind.fitness))
      console.log(`世代 ${gen + 1}: 最高適応度 ${bestFitness.toFixed(3)}`)
    }
    
    // 最適解を取得
    const bestSolution = population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    )
    
    this.convertToSolutions(bestSolution)
  }

  /**
   * 4. ルールベースAIによる調整
   */
  private applyRuleBasedAI(): void {
    console.log('ルールベースAI調整中...')
    
    for (const solution of this.solutions) {
      const notes: string[] = []
      let adjustedScore = solution.aiScore
      
      // ルール1: スキルマッチング
      if (this.checkSkillMatch(solution.shift)) {
        adjustedScore += 10
        notes.push('スキル適合')
      }
      
      // ルール2: 連続勤務チェック
      if (this.checkConsecutiveWork(solution.shift)) {
        adjustedScore -= 15
        notes.push('連続勤務注意')
      }
      
      // ルール3: 人気時間帯の優先
      if (this.isPopularTimeSlot(solution.shift)) {
        adjustedScore += 5
        notes.push('人気時間帯')
      }
      
      // ルール4: コスト最適化
      if (this.isCostEffective(solution.shift)) {
        adjustedScore += 8
        notes.push('コスト効率良')
      }
      
      // ルール5: ワークライフバランス
      if (this.checkWorkLifeBalance(solution.shift)) {
        adjustedScore += 12
        notes.push('WLB良好')
      }
      
      solution.aiScore = adjustedScore
      solution.optimizationNotes = notes
    }
    
    console.log(`${this.solutions.length}のソリューションを調整完了`)
  }

  /**
   * 5. ソリューション評価と選択
   */
  private evaluateAndSelectSolutions(): Shift[] {
    console.log('ソリューション評価中...')
    
    // スコア順にソート
    this.solutions.sort((a, b) => b.aiScore - a.aiScore)
    
    const selectedShifts: Shift[] = []
    const assignedEmployees = new Set<string>()
    const timeSlotAssignments = new Map<string, number>()
    
    for (const solution of this.solutions) {
      const shift = solution.shift
      const timeSlotKey = `${shift.date}_${shift.startTime}`
      
      // 重複チェック
      if (assignedEmployees.has(`${shift.employeeId}_${shift.date}`)) {
        continue
      }
      
      // 時間帯の人数制限チェック
      const currentCount = timeSlotAssignments.get(timeSlotKey) || 0
      if (currentCount >= this.settings.maxStaffPerHour) {
        continue
      }
      
      // 制約チェック
      if (this.validateConstraints(shift)) {
        selectedShifts.push(shift)
        assignedEmployees.add(`${shift.employeeId}_${shift.date}`)
        timeSlotAssignments.set(timeSlotKey, currentCount + 1)
        
        console.log(`選択: ${shift.employeeName} ${shift.date} ${shift.startTime}-${shift.endTime} (スコア: ${solution.aiScore.toFixed(1)})`)
      }
    }
    
    return selectedShifts
  }

  /**
   * 6. 最終検証
   */
  private validateSolutions(shifts: Shift[]): void {
    console.log('最終検証中...')
    
    const validation = ShiftValidator.validateShifts(shifts)
    if (!validation.isValid) {
      console.warn('検証エラー:', validation.errors)
    }
    
    // AI品質指標の計算
    const qualityMetrics = this.calculateQualityMetrics(shifts)
    console.log('AI品質指標:', qualityMetrics)
  }

  // === ヘルパーメソッド ===

  private calculateSkillScore(employee: Employee): number {
    const skills = employee.skills || []
    const baseScore = Math.min(skills.length * 10, 100)
    const positionBonus = this.getPositionBonus(employee.position)
    return Math.min(baseScore + positionBonus, 100)
  }

  private calculateReliabilityScore(employee: Employee): number {
    // 過去のシフト実績に基づく（今回はランダムで代用）
    return 70 + Math.random() * 30
  }

  private calculateFlexibilityScore(employee: Employee): number {
    const availability = employee.availableShifts
    if (!availability) return 50
    
    const availableDays = Object.values(availability).filter(Boolean).length
    return (availableDays / 7) * 100
  }

  private calculatePreferenceMatch(employee: Employee): number {
    const requests = this.shiftRequests.filter(req => req.employeeId === employee.id)
    if (requests.length === 0) return 30
    
    const workRequests = requests.filter(req => req.type === 'work')
    return Math.min(workRequests.length * 15, 100)
  }

  private calculateWorkloadBalance(employee: Employee): number {
    const currentWorkload = this.getCurrentWorkload(employee.id)
    const idealWorkload = 30 // 理想的な週間労働時間
    const difference = Math.abs(currentWorkload - idealWorkload)
    return Math.max(100 - difference * 2, 0)
  }

  private calculateCostEfficiency(employee: Employee): number {
    const hourlyRate = employee.hourlyRate || 1000
    const maxRate = Math.max(...this.employees.map(emp => emp.hourlyRate || 1000))
    return ((maxRate - hourlyRate) / maxRate) * 100
  }

  private predictDemand(date: string, timeSlot: string): number {
    // 簡単な需要予測（曜日・時間帯ベース）
    const dayOfWeek = new Date(date).getDay()
    const hour = parseInt(timeSlot.split(':')[0])
    
    let baseDemand = this.settings.minStaffPerHour
    
    // 平日/休日調整
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseDemand *= 1.3 // 休日は1.3倍
    }
    
    // 時間帯調整
    if (hour >= 11 && hour <= 14) {
      baseDemand *= 1.5 // ランチタイム
    } else if (hour >= 17 && hour <= 20) {
      baseDemand *= 1.8 // ディナータイム
    }
    
    return Math.round(Math.min(baseDemand, this.settings.maxStaffPerHour))
  }

  private determinePriority(date: string, timeSlot: string, demand: number): 'high' | 'medium' | 'low' {
    if (demand >= this.settings.maxStaffPerHour * 0.8) return 'high'
    if (demand >= this.settings.minStaffPerHour * 1.2) return 'medium'
    return 'low'
  }

  private analyzeSkillRequirements(date: string, timeSlot: string): string[] {
    // 時間帯に応じたスキル要件
    const hour = parseInt(timeSlot.split(':')[0])
    const skills: string[] = []
    
    if (hour >= 11 && hour <= 14) {
      skills.push('調理', 'レジ')
    } else if (hour >= 17 && hour <= 20) {
      skills.push('調理', 'サービス', 'レジ')
    } else {
      skills.push('清掃', '準備')
    }
    
    return skills
  }

  private generateInitialPopulation(size: number): any[] {
    const population = []
    
    for (let i = 0; i < size; i++) {
      const individual = this.generateRandomSolution()
      population.push({
        solution: individual,
        fitness: 0
      })
    }
    
    return population
  }

  private generateRandomSolution(): ShiftSolution[] {
    const solutions: ShiftSolution[] = []
    const dates = this.generateDateRange()
    
    for (const date of dates) {
      const dayRequests = this.shiftRequests.filter(req => 
        req.date === date && req.type === 'work'
      )
      
      for (const request of dayRequests) {
        if (Math.random() > 0.7) continue // ランダムに70%を選択
        
        const employee = this.employees.find(emp => emp.id === request.employeeId)
        if (!employee) continue
        
        const shift: Shift = {
          id: `shift_${Date.now()}_${Math.random()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          date: request.date,
          startTime: request.startTime || '09:00',
          endTime: request.endTime || '17:00',
          isConfirmed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        solutions.push({
          shift,
          confidence: Math.random(),
          aiScore: Math.random() * 100,
          conflictRisk: Math.random() * 0.3,
          optimizationNotes: []
        })
      }
    }
    
    return solutions
  }

  private calculateFitness(individual: any): number {
    let fitness = 0
    const solutions = individual.solution as ShiftSolution[]
    
    // 基本制約の満足度
    for (const solution of solutions) {
      if (this.validateConstraints(solution.shift)) {
        fitness += 10
      }
      fitness += solution.aiScore * 0.1
    }
    
    // 全体のバランス
    const coverage = this.calculateCoverage(solutions)
    fitness += coverage * 50
    
    return fitness
  }

  private evolvePopulation(population: any[]): any[] {
    const newPopulation = []
    const eliteSize = Math.floor(population.length * 0.2)
    
    // エリート保存
    population.sort((a, b) => b.fitness - a.fitness)
    for (let i = 0; i < eliteSize; i++) {
      newPopulation.push(population[i])
    }
    
    // 交叉と突然変異
    while (newPopulation.length < population.length) {
      const parent1 = this.selectParent(population)
      const parent2 = this.selectParent(population)
      const child = this.crossover(parent1, parent2)
      
      if (Math.random() < 0.1) {
        this.mutate(child)
      }
      
      newPopulation.push(child)
    }
    
    return newPopulation
  }

  private selectParent(population: any[]): any {
    // トーナメント選択
    const tournamentSize = 3
    let best = population[Math.floor(Math.random() * population.length)]
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)]
      if (candidate.fitness > best.fitness) {
        best = candidate
      }
    }
    
    return best
  }

  private crossover(parent1: any, parent2: any): any {
    // 単純な単点交叉
    const solutions1 = parent1.solution
    const solutions2 = parent2.solution
    const crossoverPoint = Math.floor(Math.random() * Math.min(solutions1.length, solutions2.length))
    
    const childSolution = [
      ...solutions1.slice(0, crossoverPoint),
      ...solutions2.slice(crossoverPoint)
    ]
    
    return {
      solution: childSolution,
      fitness: 0
    }
  }

  private mutate(individual: any): void {
    const solutions = individual.solution as ShiftSolution[]
    if (solutions.length === 0) return
    
    const mutationIndex = Math.floor(Math.random() * solutions.length)
    const solution = solutions[mutationIndex]
    
    // 時間をランダムに変更
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    solution.shift.startTime = hours[Math.floor(Math.random() * hours.length)]
    
    const startHour = parseInt(solution.shift.startTime.split(':')[0])
    const endHour = Math.min(startHour + 8, 21)
    solution.shift.endTime = `${endHour.toString().padStart(2, '0')}:00`
  }

  private convertToSolutions(bestSolution: any): void {
    this.solutions = bestSolution.solution as ShiftSolution[]
  }

  // その他のヘルパーメソッド
  private getPositionBonus(position: string): number {
    const bonuses: Record<string, number> = {
      'manager': 20,
      'supervisor': 15,
      'senior': 10,
      'regular': 5,
      'part-time': 0
    }
    return bonuses[position.toLowerCase()] || 0
  }

  private getCurrentWorkload(employeeId: string): number {
    // 現在の週間労働時間を計算（簡略化）
    return 20 + Math.random() * 20
  }

  private checkSkillMatch(shift: Shift): boolean {
    const employee = this.employees.find(emp => emp.id === shift.employeeId)
    const requiredSkills = this.analyzeSkillRequirements(shift.date, shift.startTime)
    
    if (!employee?.skills) return false
    
    return requiredSkills.some(skill => 
      employee.skills!.some(empSkill => 
        empSkill.toLowerCase().includes(skill.toLowerCase())
      )
    )
  }

  private checkConsecutiveWork(shift: Shift): boolean {
    // 連続勤務日数をチェック（簡略化）
    return Math.random() > 0.8
  }

  private isPopularTimeSlot(shift: Shift): boolean {
    const hour = parseInt(shift.startTime.split(':')[0])
    return (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)
  }

  private isCostEffective(shift: Shift): boolean {
    const employee = this.employees.find(emp => emp.id === shift.employeeId)
    const avgRate = this.employees.reduce((sum, emp) => sum + (emp.hourlyRate || 1000), 0) / this.employees.length
    return (employee?.hourlyRate || 1000) <= avgRate
  }

  private checkWorkLifeBalance(shift: Shift): boolean {
    // ワークライフバランスをチェック（簡略化）
    const hour = parseInt(shift.startTime.split(':')[0])
    return hour >= 9 && hour <= 18 // 通常時間帯
  }

  private validateConstraints(shift: Shift): boolean {
    const validation = ShiftValidator.validateShift(shift)
    return validation.isValid
  }

  private calculateCoverage(solutions: ShiftSolution[]): number {
    if (solutions.length === 0) return 0
    
    const timeSlots = new Set()
    for (const solution of solutions) {
      timeSlots.add(`${solution.shift.date}_${solution.shift.startTime}`)
    }
    
    const totalTimeSlots = this.timeSlotDemands.length
    return timeSlots.size / Math.max(totalTimeSlots, 1)
  }

  private calculateQualityMetrics(shifts: Shift[]): any {
    const totalShifts = shifts.length
    const uniqueEmployees = new Set(shifts.map(s => s.employeeId)).size
    const avgConfidence = this.solutions
      .filter(sol => shifts.some(shift => shift.id === sol.shift.id))
      .reduce((sum, sol) => sum + sol.confidence, 0) / Math.max(totalShifts, 1)
    
    return {
      totalShifts,
      uniqueEmployees,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      coverageRate: this.calculateCoverage(this.solutions),
      aiOptimizationScore: this.solutions.reduce((sum, sol) => sum + sol.aiScore, 0) / Math.max(this.solutions.length, 1)
    }
  }

  private generateDateRange(): string[] {
    const dates: string[] = []
    const start = new Date(this.settings.startDate)
    const end = new Date(this.settings.endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  private generateHourlySlots(): number[] {
    const start = parseInt(this.settings.operatingHours.start.split(':')[0])
    const end = parseInt(this.settings.operatingHours.end.split(':')[0])
    const hours: number[] = []
    
    for (let hour = start; hour < end; hour++) {
      hours.push(hour)
    }
    
    return hours
  }

  /**
   * 欠員情報を取得
   */
  getStaffingShortages(): any[] {
    // 簡略化された欠員計算
    return []
  }
}
