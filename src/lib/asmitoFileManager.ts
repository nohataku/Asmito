// ローカルファイル保存・読み込み機能
import { Employee, Shift, Schedule, ShiftRequest } from '@/types'

export interface AsmitoFileData {
  version: string
  metadata: {
    created: string
    modified: string
    organization: string
    period: string
  }
  employees: Employee[]
  shifts: Shift[]
  constraints: {
    maxHoursPerDay: number
    maxDaysPerWeek: number
    minRestHours: number
    operatingHours: {
      start: string
      end: string
    }
  }
  settings: {
    currency: string
    timezone: string
    minStaffPerHour: number
    maxStaffPerHour: number
  }
  shiftRequests?: ShiftRequest[]
  schedule?: Schedule
}

class AsmitoFileManager {
  private static readonly FILE_VERSION = '1.0'
  private static readonly FILE_EXTENSION = '.asmito'

  // データをAsmitoファイル形式に変換
  static createFileData(
    employees: Employee[],
    shifts: Shift[],
    organizationName: string,
    period: string,
    options?: {
      constraints?: any
      settings?: any
      shiftRequests?: ShiftRequest[]
      schedule?: Schedule
    }
  ): AsmitoFileData {
    return {
      version: this.FILE_VERSION,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        organization: organizationName,
        period: period
      },
      employees,
      shifts,
      constraints: options?.constraints || {
        maxHoursPerDay: 8,
        maxDaysPerWeek: 5,
        minRestHours: 11,
        operatingHours: {
          start: '09:00',
          end: '21:00'
        }
      },
      settings: options?.settings || {
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        minStaffPerHour: 2,
        maxStaffPerHour: 5
      },
      ...(options?.shiftRequests && { shiftRequests: options.shiftRequests }),
      ...(options?.schedule && { schedule: options.schedule })
    }
  }

  // ファイルをダウンロード
  static async downloadFile(data: AsmitoFileData, filename?: string): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      const defaultFilename = `${data.metadata.organization}_${data.metadata.period}${this.FILE_EXTENSION}`
      const finalFilename = filename || defaultFilename

      // File System Access API対応ブラウザの場合
      if ('showSaveFilePicker' in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [
            {
              description: 'Asmito Shift Files',
              accept: {
                'application/json': [this.FILE_EXTENSION],
              },
            },
          ],
        })

        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        // 従来のダウンロード方式
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = finalFilename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('ファイルの保存に失敗しました:', error)
      throw new Error('ファイルの保存に失敗しました。')
    }
  }

  // ファイルを読み込み
  static async loadFile(): Promise<AsmitoFileData> {
    try {
      // File System Access API対応ブラウザの場合
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Asmito Shift Files',
              accept: {
                'application/json': [this.FILE_EXTENSION],
              },
            },
          ],
        })

        const file = await fileHandle.getFile()
        const text = await file.text()
        const data = JSON.parse(text) as AsmitoFileData

        // バージョンチェック
        if (!this.validateFileVersion(data.version)) {
          throw new Error(`サポートされていないファイルバージョンです: ${data.version}`)
        }

        return data
      } else {
        // 従来のファイル入力方式
        return new Promise((resolve, reject) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = this.FILE_EXTENSION
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) {
              reject(new Error('ファイルが選択されていません。'))
              return
            }

            try {
              const text = await file.text()
              const data = JSON.parse(text) as AsmitoFileData

              if (!this.validateFileVersion(data.version)) {
                reject(new Error(`サポートされていないファイルバージョンです: ${data.version}`))
                return
              }

              resolve(data)
            } catch (error) {
              reject(new Error('ファイルの読み込みに失敗しました。'))
            }
          }
          input.click()
        })
      }
    } catch (error) {
      console.error('ファイルの読み込みに失敗しました:', error)
      throw new Error('ファイルの読み込みに失敗しました。')
    }
  }

  // ファイル形式の検証
  static validateFile(data: any): data is AsmitoFileData {
    return (
      data &&
      typeof data.version === 'string' &&
      data.metadata &&
      Array.isArray(data.employees) &&
      Array.isArray(data.shifts) &&
      data.constraints &&
      data.settings
    )
  }

  // バージョン互換性チェック
  private static validateFileVersion(version: string): boolean {
    const [major] = version.split('.')
    const [currentMajor] = this.FILE_VERSION.split('.')
    return major === currentMajor
  }

  // データの暗号化（オプション）
  static async encryptData(data: AsmitoFileData, password: string): Promise<string> {
    // 実装例：AES-256暗号化
    // 実際の本格実装では、Web Crypto APIを使用
    const jsonString = JSON.stringify(data)
    
    // 簡易的な暗号化（本格実装では適切な暗号化ライブラリを使用）
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(jsonString)
    const passwordBuffer = encoder.encode(password)
    
    // Web Crypto APIを使用した暗号化の例
    if (crypto.subtle) {
      const key = await crypto.subtle.importKey(
        'raw',
        passwordBuffer.slice(0, 32), // 32バイトに調整
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )
      
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      )
      
      // IVと暗号化データを結合してBase64エンコード
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      return btoa(String.fromCharCode(...combined))
    }
    
    // フォールバック：Base64エンコードのみ（暗号化なし）
    return btoa(jsonString)
  }

  // データの復号化（オプション）
  static async decryptData(encryptedData: string, password: string): Promise<AsmitoFileData> {
    try {
      if (crypto.subtle) {
        const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
        const iv = combined.slice(0, 12)
        const encrypted = combined.slice(12)
        
        const passwordBuffer = new TextEncoder().encode(password)
        const key = await crypto.subtle.importKey(
          'raw',
          passwordBuffer.slice(0, 32),
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        )
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encrypted
        )
        
        const jsonString = new TextDecoder().decode(decrypted)
        return JSON.parse(jsonString)
      }
      
      // フォールバック：Base64デコード
      const jsonString = atob(encryptedData)
      return JSON.parse(jsonString)
    } catch (error) {
      throw new Error('ファイルの復号化に失敗しました。パスワードが正しいか確認してください。')
    }
  }

  // ファイルの整合性チェック
  static validateDataIntegrity(data: AsmitoFileData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 基本構造チェック
    if (!this.validateFile(data)) {
      errors.push('ファイル形式が正しくありません。')
      return { isValid: false, errors }
    }

    // 従業員データの整合性チェック
    data.employees.forEach((employee, index) => {
      if (!employee.id || !employee.name || typeof employee.hourlyRate !== 'number') {
        errors.push(`従業員データ ${index + 1} に不正な値があります。`)
      }
    })

    // シフトデータの整合性チェック
    data.shifts.forEach((shift, index) => {
      if (!shift.id || !shift.employeeId || !shift.date || !shift.startTime || !shift.endTime) {
        errors.push(`シフトデータ ${index + 1} に不正な値があります。`)
      }
      
      // 従業員が存在するかチェック
      if (!data.employees.some(emp => emp.id === shift.employeeId)) {
        errors.push(`シフトデータ ${index + 1} の従業員が見つかりません。`)
      }
    })

    return { isValid: errors.length === 0, errors }
  }
}

export default AsmitoFileManager
