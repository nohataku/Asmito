import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { EmployeePerformanceData, BusinessInsightData } from './aiDataManager'

/**
 * AI分析データのFirebase管理サービス
 * パフォーマンスデータ、ビジネス分析データ、予測データをFirestoreに保存・読み込み
 */

export class AIDataFirebaseService {
  
  /**
   * 従業員パフォーマンスデータを保存
   */
  static async saveEmployeePerformanceData(
    organizationId: string, 
    employeeId: string, 
    data: EmployeePerformanceData
  ): Promise<void> {
    try {
      const docRef = doc(db, 'aiPerformanceData', `${organizationId}_${employeeId}`)
      await setDoc(docRef, {
        ...data,
        organizationId,
        updatedAt: new Date().toISOString()
      })
      console.log(`✅ 従業員パフォーマンスデータを保存: ${employeeId}`)
    } catch (error) {
      console.error('従業員パフォーマンスデータの保存に失敗:', error)
      throw error
    }
  }

  /**
   * 従業員パフォーマンスデータを読み込み
   */
  static async loadEmployeePerformanceData(
    organizationId: string, 
    employeeId: string
  ): Promise<EmployeePerformanceData | null> {
    try {
      const docRef = doc(db, 'aiPerformanceData', `${organizationId}_${employeeId}`)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log(`📋 従業員パフォーマンスデータを読み込み: ${employeeId}`)
        return data as EmployeePerformanceData
      }
      
      return null
    } catch (error) {
      console.error('従業員パフォーマンスデータの読み込みに失敗:', error)
      return null
    }
  }

  /**
   * 全従業員のパフォーマンスデータを読み込み
   */
  static async loadAllEmployeePerformanceData(
    organizationId: string
  ): Promise<Map<string, EmployeePerformanceData>> {
    try {
      const q = query(
        collection(db, 'aiPerformanceData'),
        where('organizationId', '==', organizationId)
      )
      
      const querySnapshot = await getDocs(q)
      const performanceData = new Map<string, EmployeePerformanceData>()
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as EmployeePerformanceData
        performanceData.set(data.employeeId, data)
      })
      
      console.log(`📋 全従業員パフォーマンスデータを読み込み: ${performanceData.size}名`)
      return performanceData
      
    } catch (error) {
      console.error('全従業員パフォーマンスデータの読み込みに失敗:', error)
      return new Map()
    }
  }

  /**
   * ビジネス分析データを保存
   */
  static async saveBusinessInsightData(
    organizationId: string, 
    data: BusinessInsightData
  ): Promise<void> {
    try {
      const docRef = doc(db, 'aiBusinessData', organizationId)
      await setDoc(docRef, {
        ...data,
        organizationId,
        updatedAt: new Date().toISOString()
      })
      console.log(`✅ ビジネス分析データを保存: ${organizationId}`)
    } catch (error) {
      console.error('ビジネス分析データの保存に失敗:', error)
      throw error
    }
  }

  /**
   * ビジネス分析データを読み込み
   */
  static async loadBusinessInsightData(
    organizationId: string
  ): Promise<BusinessInsightData | null> {
    try {
      const docRef = doc(db, 'aiBusinessData', organizationId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log(`📊 ビジネス分析データを読み込み: ${organizationId}`)
        return data as BusinessInsightData
      }
      
      return null
    } catch (error) {
      console.error('ビジネス分析データの読み込みに失敗:', error)
      return null
    }
  }

  /**
   * 全AIデータを一括保存
   */
  static async saveAllAIData(
    organizationId: string,
    performanceData: Map<string, EmployeePerformanceData>,
    businessData: BusinessInsightData
  ): Promise<void> {
    try {
      console.log('🤖 全AIデータを一括保存中...')
      
      // 従業員パフォーマンスデータを保存
      const performancePromises = Array.from(performanceData.entries()).map(
        ([employeeId, data]) => this.saveEmployeePerformanceData(organizationId, employeeId, data)
      )
      await Promise.all(performancePromises)

      // ビジネスデータを保存
      await this.saveBusinessInsightData(organizationId, businessData)

      console.log('✅ 全AIデータの一括保存が完了しました')
      
    } catch (error) {
      console.error('全AIデータの一括保存に失敗:', error)
      throw error
    }
  }

  /**
   * 全AIデータを一括読み込み
   */
  static async loadAllAIData(organizationId: string): Promise<{
    performanceData: Map<string, EmployeePerformanceData>
    businessData: BusinessInsightData | null
  }> {
    try {
      console.log('🤖 全AIデータを一括読み込み中...')
      
      const [performanceData, businessData] = await Promise.all([
        this.loadAllEmployeePerformanceData(organizationId),
        this.loadBusinessInsightData(organizationId)
      ])

      console.log('✅ 全AIデータの一括読み込みが完了しました')
      
      return {
        performanceData,
        businessData
      }
      
    } catch (error) {
      console.error('全AIデータの一括読み込みに失敗:', error)
      return {
        performanceData: new Map(),
        businessData: null
      }
    }
  }

  /**
   * 組織のAIデータ統計を取得
   */
  static async getAIDataStatistics(organizationId: string): Promise<{
    employeeDataCount: number
    hasBusinessData: boolean
    lastUpdated: string | null
  }> {
    try {
      const [performanceData, businessData] = await Promise.all([
        this.loadAllEmployeePerformanceData(organizationId),
        this.loadBusinessInsightData(organizationId)
      ])

      return {
        employeeDataCount: performanceData.size,
        hasBusinessData: businessData !== null,
        lastUpdated: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('AIデータ統計の取得に失敗:', error)
      return {
        employeeDataCount: 0,
        hasBusinessData: false,
        lastUpdated: null
      }
    }
  }

  /**
   * サンプルデータをインポート（開発・テスト用）
   */
  static async importSampleData(
    organizationId: string,
    employeeIds: string[]
  ): Promise<void> {
    try {
      console.log('📊 サンプルデータをインポート中...')
      
      // 各従業員にサンプルパフォーマンスデータを作成
      const samplePromises = employeeIds.map(employeeId => {
        const sampleData: EmployeePerformanceData = {
          employeeId,
          reliability: {
            attendanceRate: 0.85 + Math.random() * 0.15,
            punctualityScore: 0.8 + Math.random() * 0.2,
            absenceHistory: Math.floor(Math.random() * 5),
            lateArrivalCount: Math.floor(Math.random() * 8)
          },
          skillAssessment: {
            technicalSkills: {},
            softSkills: {
              communication: 2 + Math.floor(Math.random() * 4),
              teamwork: 2 + Math.floor(Math.random() * 4),
              problemSolving: 2 + Math.floor(Math.random() * 4),
              adaptability: 2 + Math.floor(Math.random() * 4)
            },
            certifications: [],
            trainingHistory: []
          },
          workPreferences: {
            preferredShiftTypes: ['morning', 'afternoon'],
            preferredDays: [1, 2, 3, 4, 5],
            maxHoursPerDay: 8,
            maxDaysPerWeek: 5,
            unavailablePeriods: []
          },
          performanceMetrics: {
            customerSatisfactionScore: 2.5 + Math.random() * 2.5,
            productivityScore: 2.5 + Math.random() * 2.5,
            errorRate: Math.random() * 0.1,
            speedScore: 2.5 + Math.random() * 2.5,
            lastEvaluationDate: new Date().toISOString().split('T')[0]
          },
          personalInfo: {
            commutingTime: 15 + Math.floor(Math.random() * 60),
            transportMethod: ['car', 'train', 'bus', 'bicycle', 'walk'][Math.floor(Math.random() * 5)] as any,
            emergencyContactReachable: Math.random() > 0.1,
            healthRestrictions: [],
            languages: ['日本語']
          }
        }
        
        return this.saveEmployeePerformanceData(organizationId, employeeId, sampleData)
      })

      await Promise.all(samplePromises)
      console.log('✅ サンプルデータのインポートが完了しました')
      
    } catch (error) {
      console.error('サンプルデータのインポートに失敗:', error)
      throw error
    }
  }

  /**
   * AIデータをエクスポート（バックアップ用）
   */
  static async exportAIData(organizationId: string): Promise<string> {
    try {
      const allData = await this.loadAllAIData(organizationId)
      
      const exportData = {
        organizationId,
        exportDate: new Date().toISOString(),
        performanceData: Object.fromEntries(allData.performanceData),
        businessData: allData.businessData
      }
      
      return JSON.stringify(exportData, null, 2)
      
    } catch (error) {
      console.error('AIデータのエクスポートに失敗:', error)
      throw error
    }
  }

  /**
   * 全AIデータを削除（危険な操作）
   */
  static async deleteAllAIData(organizationId: string): Promise<void> {
    try {
      console.log('🗑️ 全AIデータを削除中...', organizationId)
      
      // 従業員パフォーマンスデータを削除
      const performanceQuery = query(
        collection(db, 'aiPerformanceData'),
        where('organizationId', '==', organizationId)
      )
      const performanceSnapshot = await getDocs(performanceQuery)
      
      const performanceDeletePromises = performanceSnapshot.docs.map(docSnap => 
        deleteDoc(docSnap.ref)
      )
      await Promise.all(performanceDeletePromises)
      
      // ビジネスデータを削除
      const businessDocRef = doc(db, 'aiBusinessData', organizationId)
      await deleteDoc(businessDocRef)
      
      console.log(`✅ 全AIデータの削除が完了しました: 従業員データ${performanceSnapshot.size}件、ビジネスデータ1件`)
      
    } catch (error) {
      console.error('全AIデータの削除に失敗:', error)
      throw error
    }
  }
}
