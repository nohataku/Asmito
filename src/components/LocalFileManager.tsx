'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import AsmitoFileManager, { AsmitoFileData } from '@/lib/asmitoFileManager'
import { Employee, Shift } from '@/types'

interface LocalFileManagerProps {
  employees: Employee[]
  shifts: Shift[]
  organizationName: string
  period: string
  onFileLoaded?: (data: AsmitoFileData) => void
}

export default function LocalFileManager({
  employees,
  shifts,
  organizationName,
  period,
  onFileLoaded
}: LocalFileManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string>('')

  const handleSaveFile = async () => {
    setIsLoading(true)
    setLastAction('保存中...')
    
    try {
      const fileData = AsmitoFileManager.createFileData(
        employees,
        shifts,
        organizationName,
        period,
        {
          constraints: {
            maxHoursPerDay: 8,
            maxDaysPerWeek: 5,
            minRestHours: 11,
            operatingHours: {
              start: '09:00',
              end: '21:00'
            }
          },
          settings: {
            currency: 'JPY',
            timezone: 'Asia/Tokyo',
            minStaffPerHour: 2,
            maxStaffPerHour: 5
          }
        }
      )

      await AsmitoFileManager.downloadFile(fileData)
      setLastAction('ファイルを正常に保存しました。')
    } catch (error) {
      console.error('保存エラー:', error)
      setLastAction('ファイルの保存に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadFile = async () => {
    setIsLoading(true)
    setLastAction('読み込み中...')
    
    try {
      const fileData = await AsmitoFileManager.loadFile()
      
      // ファイルの整合性チェック
      const validation = AsmitoFileManager.validateDataIntegrity(fileData)
      if (!validation.isValid) {
        throw new Error(`ファイルに問題があります: ${validation.errors.join(', ')}`)
      }

      setLastAction(`ファイルを正常に読み込みました。（従業員: ${fileData.employees.length}名, シフト: ${fileData.shifts.length}件）`)
      
      if (onFileLoaded) {
        onFileLoaded(fileData)
      }
    } catch (error) {
      console.error('読み込みエラー:', error)
      setLastAction(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportBackup = async () => {
    setIsLoading(true)
    setLastAction('バックアップ作成中...')
    
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `backup_${organizationName}_${timestamp}.asmito`
      
      const fileData = AsmitoFileManager.createFileData(
        employees,
        shifts,
        organizationName,
        period
      )

      await AsmitoFileManager.downloadFile(fileData, filename)
      setLastAction('バックアップファイルを作成しました。')
    } catch (error) {
      console.error('バックアップエラー:', error)
      setLastAction('バックアップの作成に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const getFileStats = () => {
    const totalHours = shifts.reduce((sum, shift) => {
      const start = new Date(`1970-01-01T${shift.startTime}:00`)
      const end = new Date(`1970-01-01T${shift.endTime}:00`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return sum + hours
    }, 0)

    return {
      employees: employees.length,
      shifts: shifts.length,
      totalHours: Math.round(totalHours * 100) / 100,
      estimatedSize: Math.round((JSON.stringify({employees, shifts}).length / 1024) * 100) / 100
    }
  }

  const stats = getFileStats()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ローカルファイル管理
        </CardTitle>
        <CardDescription>
          .asmito形式でシフトデータを保存・読み込みできます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ファイル統計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.employees}</div>
            <div className="text-sm text-gray-600">従業員</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.shifts}</div>
            <div className="text-sm text-gray-600">シフト</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
            <div className="text-sm text-gray-600">総時間</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.estimatedSize}</div>
            <div className="text-sm text-gray-600">KB</div>
          </div>
        </div>

        {/* アクション buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            onClick={handleSaveFile}
            disabled={isLoading || (employees.length === 0 && shifts.length === 0)}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            保存
          </Button>

          <Button 
            variant="outline"
            onClick={handleLoadFile}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            読み込み
          </Button>

          <Button 
            variant="secondary"
            onClick={handleExportBackup}
            disabled={isLoading || (employees.length === 0 && shifts.length === 0)}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            バックアップ
          </Button>
        </div>

        {/* 状態表示 */}
        {lastAction && (
          <div className={`p-3 rounded-lg text-sm ${
            lastAction.includes('失敗') || lastAction.includes('問題') 
              ? 'bg-red-50 text-red-700' 
              : 'bg-green-50 text-green-700'
          }`}>
            {lastAction}
          </div>
        )}

        {/* ファイル形式の説明 */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">
            .asmitoファイル形式について
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• JSON形式をベースとした独自ファイル形式</div>
            <div>• 従業員情報、シフト、制約条件を包括的に保存</div>
            <div>• 他のAsmitoインスタンスとのデータ共有が可能</div>
            <div>• バージョン管理と整合性チェック機能内蔵</div>
          </div>
        </div>

        {/* ブラウザ対応状況 */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">
            ブラウザ対応状況
          </h4>
          <div className="text-sm text-gray-600">
            {'showSaveFilePicker' in window && 'showOpenFilePicker' in window ? (
              <div className="text-green-600">
                ✓ File System Access API対応 - ファイルの直接保存・読み込みが可能
              </div>
            ) : (
              <div className="text-yellow-600">
                ! 従来のダウンロード・アップロード方式 - ファイル名の指定は制限されます
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
