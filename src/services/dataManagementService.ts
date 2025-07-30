import { collection, doc, getDocs, deleteDoc, query, where, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/types/employee';
import { ShiftRequest } from '@/types/shift';

export interface ExportData {
  employees: Employee[];
  shiftRequests: ShiftRequest[];
  shifts: any[];
  settings?: any;
  exportDate: string;
  organizationId: string;
}

export interface DataStats {
  employees: number;
  shiftRequests: number;
  shifts: number;
  settings: boolean;
}

export class DataManagementService {
  // データ統計を取得
  static async getDataStats(organizationId: string): Promise<DataStats> {
    try {
      console.log('データ統計を取得中...', { organizationId });

      const [employeesSnapshot, shiftRequestsSnapshot, shiftsSnapshot, settingsDoc] = await Promise.all([
        getDocs(query(collection(db, 'employees'), where('organizationId', '==', organizationId))),
        getDocs(query(collection(db, 'shiftRequests'), where('organizationId', '==', organizationId))),
        getDocs(query(collection(db, 'shifts'), where('organizationId', '==', organizationId))),
        getDoc(doc(db, 'settings', organizationId))
      ]);

      const stats = {
        employees: employeesSnapshot.size,
        shiftRequests: shiftRequestsSnapshot.size,
        shifts: shiftsSnapshot.size,
        settings: settingsDoc.exists()
      };

      console.log('データ統計:', stats);
      return stats;
    } catch (error) {
      console.error('データ統計の取得に失敗しました:', error);
      throw error;
    }
  }

  // データエクスポート
  static async exportData(organizationId: string): Promise<ExportData> {
    try {
      console.log('データエクスポートを開始...', { organizationId });

      const [employeesSnapshot, shiftRequestsSnapshot, shiftsSnapshot, settingsDoc] = await Promise.all([
        getDocs(query(collection(db, 'employees'), where('organizationId', '==', organizationId))),
        getDocs(query(collection(db, 'shiftRequests'), where('organizationId', '==', organizationId))),
        getDocs(query(collection(db, 'shifts'), where('organizationId', '==', organizationId))),
        getDoc(doc(db, 'settings', organizationId))
      ]);

      const employees: Employee[] = [];
      employeesSnapshot.forEach(doc => {
        employees.push({ id: doc.id, ...doc.data() } as Employee);
      });

      const shiftRequests: ShiftRequest[] = [];
      shiftRequestsSnapshot.forEach(doc => {
        shiftRequests.push({ id: doc.id, ...doc.data() } as ShiftRequest);
      });

      const shifts: any[] = [];
      shiftsSnapshot.forEach(doc => {
        shifts.push({ id: doc.id, ...doc.data() });
      });

      const exportData: ExportData = {
        employees,
        shiftRequests,
        shifts,
        settings: settingsDoc.exists() ? settingsDoc.data() : undefined,
        exportDate: new Date().toISOString(),
        organizationId
      };

      console.log(`データエクスポート完了: 従業員=${employees.length}件, シフト希望=${shiftRequests.length}件, 確定シフト=${shifts.length}件`);
      return exportData;
    } catch (error) {
      console.error('データエクスポートに失敗しました:', error);
      throw error;
    }
  }

  // JSONファイルとしてダウンロード
  static downloadAsJSON(data: ExportData, filename?: string): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `asmito-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('データダウンロード完了:', link.download);
    } catch (error) {
      console.error('データダウンロードに失敗しました:', error);
      throw error;
    }
  }

  // CSVファイルとしてダウンロード（従業員データ）
  static downloadEmployeesAsCSV(employees: Employee[], filename?: string): void {
    try {
      const headers = ['ID', '氏名', 'メール', '部署', '役職', '時給', '入社日', '電話番号', 'ステータス'];
      const csvContent = [
        headers.join(','),
        ...employees.map(emp => [
          emp.id,
          `"${emp.name}"`,
          `"${emp.email || ''}"`,
          `"${emp.department || ''}"`,
          `"${emp.position || ''}"`,
          emp.hourlyRate,
          emp.joinDate || '',
          `"${emp.phone || ''}"`,
          emp.status || 'active'
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `asmito-employees-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('従業員CSVダウンロード完了:', link.download);
    } catch (error) {
      console.error('従業員CSVダウンロードに失敗しました:', error);
      throw error;
    }
  }

  // 全データ削除（組織データのみ）
  static async deleteAllData(organizationId: string): Promise<{
    employees: number;
    shiftRequests: number;
    shifts: number;
    settings: boolean;
  }> {
    try {
      console.log('全データ削除を開始...', { organizationId });
      
      if (!organizationId) {
        throw new Error('組織IDが必要です');
      }

      // バッチ処理の準備
      const batch = writeBatch(db);
      let deletedCounts = {
        employees: 0,
        shiftRequests: 0,
        shifts: 0,
        settings: false
      };

      // 従業員データの削除
      const employeesSnapshot = await getDocs(
        query(collection(db, 'employees'), where('organizationId', '==', organizationId))
      );
      employeesSnapshot.forEach(docSnap => {
        batch.delete(doc(db, 'employees', docSnap.id));
        deletedCounts.employees++;
      });

      // シフト希望データの削除
      const shiftRequestsSnapshot = await getDocs(
        query(collection(db, 'shiftRequests'), where('organizationId', '==', organizationId))
      );
      shiftRequestsSnapshot.forEach(docSnap => {
        batch.delete(doc(db, 'shiftRequests', docSnap.id));
        deletedCounts.shiftRequests++;
      });

      // 確定シフトデータの削除
      const shiftsSnapshot = await getDocs(
        query(collection(db, 'shifts'), where('organizationId', '==', organizationId))
      );
      shiftsSnapshot.forEach(docSnap => {
        batch.delete(doc(db, 'shifts', docSnap.id));
        deletedCounts.shifts++;
      });

      // 設定データの削除
      const settingsDoc = await getDoc(doc(db, 'settings', organizationId));
      if (settingsDoc.exists()) {
        batch.delete(doc(db, 'settings', organizationId));
        deletedCounts.settings = true;
      }

      // バッチ処理を実行
      await batch.commit();

      console.log('全データ削除完了:', deletedCounts);
      return deletedCounts;
    } catch (error) {
      console.error('全データ削除に失敗しました:', error);
      throw error;
    }
  }

  // データインポート用のバリデーション
  static validateImportData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('データが存在しません');
      return { isValid: false, errors };
    }

    if (!data.organizationId) {
      errors.push('組織IDが存在しません');
    }

    if (!Array.isArray(data.employees)) {
      errors.push('従業員データが配列ではありません');
    } else {
      data.employees.forEach((emp: any, index: number) => {
        if (!emp.name) {
          errors.push(`従業員[${index}]: 名前が必須です`);
        }
        if (typeof emp.hourlyRate !== 'number') {
          errors.push(`従業員[${index}]: 時給は数値である必要があります`);
        }
      });
    }

    if (!Array.isArray(data.shiftRequests)) {
      errors.push('シフト希望データが配列ではありません');
    }

    if (!Array.isArray(data.shifts)) {
      errors.push('シフトデータが配列ではありません');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
