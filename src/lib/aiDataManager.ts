import { Employee, ShiftRequest } from '@/types'
import { AIDataFirebaseService } from './aiDataFirebaseService'

/**
 * AI最適化用の詳細データ管理サービス
 * 従業員の詳細情報、パフォーマンスデータ、予測データを管理
 */

export interface EmployeePerformanceData {
  employeeId: string
  reliability: {
    attendanceRate: number // 出勤率 (0-1)
    punctualityScore: number // 時間厳守スコア (0-1)
    absenceHistory: number // 過去3ヶ月の欠勤回数
    lateArrivalCount: number // 遅刻回数
  }
  skillAssessment: {
    technicalSkills: Record<string, number> // スキル名: レベル(1-5)
    softSkills: {
      communication: number // コミュニケーション (1-5)
      teamwork: number // チームワーク (1-5)
      problemSolving: number // 問題解決能力 (1-5)
      adaptability: number // 適応性 (1-5)
    }
    certifications: string[] // 保有資格
    trainingHistory: {
      course: string
      completedDate: string
      score: number
    }[]
  }
  workPreferences: {
    preferredShiftTypes: ('morning' | 'afternoon' | 'evening' | 'night')[]
    preferredDays: number[] // 0-6 (日-土)
    maxHoursPerDay: number
    maxDaysPerWeek: number
    unavailablePeriods: {
      startDate: string
      endDate: string
      reason: string
    }[]
  }
  performanceMetrics: {
    customerSatisfactionScore: number // 顧客満足度 (1-5)
    productivityScore: number // 生産性スコア (1-5)
    errorRate: number // エラー率 (0-1)
    speedScore: number // 作業速度スコア (1-5)
    lastEvaluationDate: string
  }
  personalInfo: {
    commutingTime: number // 通勤時間（分）
    transportMethod: 'car' | 'train' | 'bus' | 'bicycle' | 'walk'
    emergencyContactReachable: boolean
    healthRestrictions: string[]
    languages: string[]
  }
}

export interface BusinessInsightData {
  peakHours: number[] // ピーク時間帯 (0-23)
  holidayData: {
    date: string
    name: string
    demandMultiplier: number // 需要倍率
  }[]
}

export class AIDataManager {
  private performanceData: Map<string, EmployeePerformanceData> = new Map()
  private businessData: BusinessInsightData | null = null

  /**
   * 従業員のパフォーマンスデータを設定
   */
  setEmployeePerformanceData(employeeId: string, data: EmployeePerformanceData): void {
    this.performanceData.set(employeeId, data)
  }

  /**
   * 従業員のパフォーマンスデータを取得
   */
  getEmployeePerformanceData(employeeId: string): EmployeePerformanceData | null {
    return this.performanceData.get(employeeId) || null
  }

  /**
   * すべての従業員のパフォーマンスデータを取得
   */
  getAllPerformanceData(): Map<string, EmployeePerformanceData> {
    return this.performanceData
  }

  /**
   * ビジネスインサイトデータを設定
   */
  setBusinessInsightData(data: BusinessInsightData): void {
    this.businessData = data
  }

  /**
   * ビジネスインサイトデータを取得
   */
  getBusinessInsightData(): BusinessInsightData | null {
    return this.businessData
  }

  /**
   * Firebaseからデータを読み込み
   */
  async loadFromFirebase(organizationId: string): Promise<void> {
    try {
      console.log('🤖 Firebaseから全AIデータを読み込み中...', organizationId)
      
      const allData = await AIDataFirebaseService.loadAllAIData(organizationId)
      
      // パフォーマンスデータを設定
      this.performanceData = allData.performanceData
      
      // ビジネスデータを設定
      if (allData.businessData) {
        this.businessData = allData.businessData
      }
      
      console.log(`✅ Firebaseからデータ読み込み完了: 従業員${this.performanceData.size}名`)
      
    } catch (error) {
      console.error('Firebaseからのデータ読み込みに失敗:', error)
      throw error
    }
  }

  /**
   * Firebaseにデータを保存
   */
  async saveToFirebase(organizationId: string): Promise<void> {
    try {
      console.log('💾 FirebaseにAIデータを保存中...', organizationId)
      
      // データが存在しない場合はデフォルト値を生成
      if (!this.businessData) {
        this.businessData = this.generateDefaultBusinessData()
      }
      
      await AIDataFirebaseService.saveAllAIData(
        organizationId,
        this.performanceData,
        this.businessData
      )
      
      console.log('✅ Firebaseへのデータ保存が完了しました')
      
    } catch (error) {
      console.error('Firebaseへのデータ保存に失敗:', error)
      throw error
    }
  }

  /**
   * Firebaseから全データを削除
   */
  async deleteAllData(organizationId: string): Promise<void> {
    try {
      console.log('🗑️ FirebaseからAIデータを削除中...', organizationId)
      
      // Firebaseから削除
      await AIDataFirebaseService.deleteAllAIData(organizationId)
      
      // ローカルデータもクリア
      this.performanceData.clear()
      this.businessData = null
      
      console.log('✅ 全AIデータの削除が完了しました')
      
    } catch (error) {
      console.error('全AIデータの削除に失敗:', error)
      throw error
    }
  }

  /**
   * デフォルトのパフォーマンスデータを生成
   */
  generateDefaultPerformanceData(employee: Employee): EmployeePerformanceData {
    return {
      employeeId: employee.employeeId || employee.name, // 従業員管理画面で入力されたemployeeIdを使用、なければ名前を使用
      reliability: {
        attendanceRate: 0.95, // デフォルト95%
        punctualityScore: 0.9, // デフォルト90%
        absenceHistory: 1, // デフォルト1回
        lateArrivalCount: 2 // デフォルト2回
      },
      skillAssessment: {
        technicalSkills: this.inferTechnicalSkills(employee.skills || []),
        softSkills: {
          communication: 3,
          teamwork: 3,
          problemSolving: 3,
          adaptability: 3
        },
        certifications: employee.skills || [],
        trainingHistory: []
      },
      workPreferences: {
        preferredShiftTypes: ['morning', 'afternoon'],
        preferredDays: [1, 2, 3, 4, 5], // 平日
        maxHoursPerDay: employee.maxHoursPerWeek ? Math.floor(employee.maxHoursPerWeek / 5) : 8,
        maxDaysPerWeek: employee.maxDaysPerWeek || 5,
        unavailablePeriods: []
      },
      performanceMetrics: {
        customerSatisfactionScore: 3.5,
        productivityScore: 3.5,
        errorRate: 0.05,
        speedScore: 3.5,
        lastEvaluationDate: new Date().toISOString().split('T')[0]
      },
      personalInfo: {
        commutingTime: 30, // デフォルト30分
        transportMethod: 'train',
        emergencyContactReachable: true,
        healthRestrictions: [],
        languages: ['日本語']
      }
    }
  }

  /**
   * スキル配列から技術スキルスコアを推測
   */
  private inferTechnicalSkills(skills: string[]): Record<string, number> {
    const technicalSkills: Record<string, number> = {}
    
    skills.forEach(skill => {
      // スキル名に基づいてレベルを推測（簡易版）
      if (skill.includes('上級') || skill.includes('エキスパート')) {
        technicalSkills[skill] = 5
      } else if (skill.includes('中級') || skill.includes('経験者')) {
        technicalSkills[skill] = 4
      } else if (skill.includes('初級') || skill.includes('基本')) {
        technicalSkills[skill] = 3
      } else {
        technicalSkills[skill] = 3 // デフォルト
      }
    })

    return technicalSkills
  }

  /**
   * デフォルトのビジネスインサイトデータを生成
   */
  generateDefaultBusinessData(): BusinessInsightData {
    return {
      peakHours: [12, 13, 18, 19, 20], // ランチタイムとディナータイム
      holidayData: [
        { date: '2025-01-01', name: '元日', demandMultiplier: 0.3 },
        { date: '2025-01-13', name: '成人の日', demandMultiplier: 1.2 },
        { date: '2025-02-11', name: '建国記念の日', demandMultiplier: 1.1 },
        { date: '2025-03-20', name: '春分の日', demandMultiplier: 1.0 },
        { date: '2025-04-29', name: '昭和の日', demandMultiplier: 1.3 },
        { date: '2025-05-03', name: '憲法記念日', demandMultiplier: 1.4 },
        { date: '2025-05-04', name: 'みどりの日', demandMultiplier: 1.4 },
        { date: '2025-05-05', name: 'こどもの日', demandMultiplier: 1.5 },
        { date: '2025-07-21', name: '海の日', demandMultiplier: 1.3 },
        { date: '2025-08-11', name: '山の日', demandMultiplier: 1.2 },
        { date: '2025-09-15', name: '敬老の日', demandMultiplier: 1.1 },
        { date: '2025-09-23', name: '秋分の日', demandMultiplier: 1.0 },
        { date: '2025-10-13', name: 'スポーツの日', demandMultiplier: 1.3 },
        { date: '2025-11-03', name: '文化の日', demandMultiplier: 1.1 },
        { date: '2025-11-23', name: '勤労感謝の日', demandMultiplier: 1.2 },
        { date: '2025-12-23', name: '天皇誕生日', demandMultiplier: 1.1 },
        { date: '2025-12-31', name: '大晦日', demandMultiplier: 0.5 }
      ]
    }
  }
}
