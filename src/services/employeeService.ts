import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee as EmployeeType, CreateEmployeeData as CreateEmployeeDataType, HourlyRates, AvailableShiftTypes } from '@/types/employee';

export type Employee = EmployeeType;
export type CreateEmployeeData = CreateEmployeeDataType;

export class EmployeeService {
  private static collectionName = 'employees';

  // 従業員一覧を取得
  static async getEmployees(organizationId: string, includeInactive: boolean = false): Promise<Employee[]> {
    try {
      const employeesRef = collection(db, this.collectionName);
      const q = query(
        employeesRef,
        where('organizationId', '==', organizationId)
      );
      
      const querySnapshot = await getDocs(q);
      const employees: Employee[] = [];
      let totalCount = 0;
      let activeCount = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalCount++;
        console.log(`従業員データ [${doc.id}]:`, data);
        
        // アクティブかどうかの判定ロジック
        // 1. statusフィールドがある場合：status === 'active' なら表示
        // 2. statusフィールドがない場合：isActive !== false なら表示（デフォルトはtrue）
        // 3. statusが'inactive'の場合：明示的に削除されているので非表示
        let isActive = false;
        
        if (data.status !== undefined) {
          // statusフィールドがある場合
          isActive = data.status === 'active';
        } else {
          // statusフィールドがない古いデータの場合
          isActive = data.isActive !== false; // デフォルトはtrue
        }
        
        console.log(`従業員 [${doc.id}] のアクティブ状態:`, { 
          isActive: data.isActive, 
          status: data.status, 
          結果: isActive 
        });
        
        // includeInactiveがtrueの場合は非アクティブも含める（デバッグ用）
        if (isActive || includeInactive) {
          if (isActive) activeCount++;
          employees.push({
            ...data,
            id: doc.id,
            // 必須フィールドのデフォルト値を設定
            name: data.name || '',
            email: data.email || '',
            department: data.department || data.position || 'その他',
            position: data.position || '',
            hourlyRate: data.hourlyRate || 0,
            joinDate: data.joinDate || data.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            status: data.status || 'active',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            organizationId: data.organizationId || organizationId
          } as Employee);
        }
      });
      
      console.log(`従業員取得結果: 全体=${totalCount}件, アクティブ=${activeCount}件, 返却=${employees.length}件`);
      
      // クライアント側で名前順にソート
      return employees.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('従業員一覧の取得に失敗しました:', error);
      throw error;
    }
  }

  // 特定の従業員を取得
  static async getEmployee(employeeId: string): Promise<Employee | null> {
    try {
      const employeeRef = doc(db, this.collectionName, employeeId);
      const employeeDoc = await getDoc(employeeRef);
      
      if (employeeDoc.exists()) {
        return {
          id: employeeDoc.id,
          ...employeeDoc.data()
        } as Employee;
      }
      
      return null;
    } catch (error) {
      console.error('従業員の取得に失敗しました:', error);
      throw error;
    }
  }

  // 従業員を追加
  static async addEmployee(organizationId: string, employeeData: CreateEmployeeData): Promise<string> {
    try {
      const now = new Date().toISOString();
      const employee = {
        ...employeeData,
        status: 'active' as const,
        organizationId,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('従業員データを追加中:', employee);
      const docRef = await addDoc(collection(db, this.collectionName), employee);
      console.log('従業員データを追加しました:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('従業員の追加に失敗しました:', error);
      throw error;
    }
  }

  // 従業員情報を更新
  static async updateEmployee(employeeId: string, updates: Partial<CreateEmployeeData>): Promise<void> {
    try {
      const employeeRef = doc(db, this.collectionName, employeeId);
      await updateDoc(employeeRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('従業員の更新に失敗しました:', error);
      throw error;
    }
  }

  // 従業員に関連するシフトデータを削除するヘルパーメソッド
  private static async deleteRelatedShiftData(employeeId: string): Promise<{shiftRequests: number, shifts: number}> {
    try {
      console.log(`従業員 ${employeeId} の関連シフトデータを削除中...`);
      
      // シフト希望データの削除
      const shiftRequestsRef = collection(db, 'shiftRequests');
      const shiftRequestsQuery = query(
        shiftRequestsRef,
        where('employeeId', '==', employeeId)
      );
      const shiftRequestsSnapshot = await getDocs(shiftRequestsQuery);
      
      let deletedShiftRequests = 0;
      for (const docSnap of shiftRequestsSnapshot.docs) {
        await deleteDoc(doc(db, 'shiftRequests', docSnap.id));
        deletedShiftRequests++;
      }
      
      // 確定シフトデータの削除
      const shiftsRef = collection(db, 'shifts');
      const shiftsQuery = query(
        shiftsRef,
        where('employeeId', '==', employeeId)
      );
      const shiftsSnapshot = await getDocs(shiftsQuery);
      
      let deletedShifts = 0;
      for (const docSnap of shiftsSnapshot.docs) {
        await deleteDoc(doc(db, 'shifts', docSnap.id));
        deletedShifts++;
      }
      
      console.log(`削除完了: シフト希望=${deletedShiftRequests}件, 確定シフト=${deletedShifts}件`);
      
      return { shiftRequests: deletedShiftRequests, shifts: deletedShifts };
      
    } catch (error) {
      console.error('関連シフトデータの削除に失敗しました:', error);
      // シフトデータの削除が失敗しても従業員削除は続行する
      return { shiftRequests: 0, shifts: 0 };
    }
  }

  // 従業員を削除（ソフトデリート）
  static async deleteEmployee(employeeId: string): Promise<{shiftRequests: number, shifts: number}> {
    try {
      console.log('従業員削除処理開始:', employeeId)
      
      // 削除前の従業員データを取得してログ出力
      const employeeRef = doc(db, this.collectionName, employeeId);
      const beforeDoc = await getDoc(employeeRef);
      
      if (!beforeDoc.exists()) {
        throw new Error(`従業員が見つかりません: ${employeeId}`);
      }
      
      console.log('削除前のデータ:', beforeDoc.data());
      
      // 関連するシフトデータを削除
      const deletedData = await this.deleteRelatedShiftData(employeeId);
      
      // ソフトデリート実行
      await updateDoc(employeeRef, {
        status: 'inactive',
        updatedAt: new Date().toISOString()
      });
      
      console.log('従業員のステータスをinactiveに更新しました:', employeeId);
      
      // 更新後のデータも確認
      const afterDoc = await getDoc(employeeRef);
      console.log('削除後のデータ:', afterDoc.data());
      
      return deletedData;
      
    } catch (error) {
      console.error('従業員の削除に失敗しました:', error);
      throw error;
    }
  }

  // 従業員を完全削除（ハードデリート）
  static async hardDeleteEmployee(employeeId: string): Promise<{shiftRequests: number, shifts: number}> {
    try {
      console.log('従業員完全削除処理開始:', employeeId)
      
      const employeeRef = doc(db, this.collectionName, employeeId);
      const beforeDoc = await getDoc(employeeRef);
      
      if (!beforeDoc.exists()) {
        throw new Error(`従業員が見つかりません: ${employeeId}`);
      }
      
      console.log('完全削除前のデータ:', beforeDoc.data());
      
      // 関連するシフトデータを削除
      const deletedData = await this.deleteRelatedShiftData(employeeId);
      
      // ハードデリート実行
      await deleteDoc(employeeRef);
      
      console.log('従業員を完全削除しました:', employeeId);
      
      return deletedData;
      
    } catch (error) {
      console.error('従業員の完全削除に失敗しました:', error);
      throw error;
    }
  }

  // 部署一覧を取得
  static async getDepartments(organizationId: string): Promise<string[]> {
    try {
      const employees = await this.getEmployees(organizationId);
      const departments = [...new Set(employees.map(emp => emp.department))];
      return departments.sort();
    } catch (error) {
      console.error('部署一覧の取得に失敗しました:', error);
      throw error;
    }
  }

  // データベースの従業員データを修正する（デバッグ用）
  static async fixEmployeeData(organizationId: string): Promise<number> {
    try {
      console.log('従業員データの修正を開始...');
      
      const employeesRef = collection(db, this.collectionName);
      const q = query(
        employeesRef,
        where('organizationId', '==', organizationId)
      );
      
      const querySnapshot = await getDocs(q);
      let fixedCount = 0;
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const updates: any = {};
        
        console.log(`データ修正チェック [${docSnap.id}]:`, data);
        
        // statusフィールドがない、またはisActiveがtrueでstatusがinactiveの矛盾を修正
        if (!data.status || (data.isActive === true && data.status === 'inactive')) {
          // isActiveがfalseでない限りactiveにする
          updates.status = data.isActive === false ? 'inactive' : 'active';
          console.log(`statusフィールドを修正: ${updates.status}`);
        }
        
        // 必須フィールドのデフォルト値を設定
        if (!data.department && data.position) {
          updates.department = data.position;
        }
        if (!data.joinDate && data.createdAt) {
          updates.joinDate = data.createdAt.split('T')[0];
        }
        if (!data.name) {
          updates.name = 'Unknown';
        }
        if (!data.email) {
          updates.email = '';
        }
        if (data.hourlyRate === undefined) {
          updates.hourlyRate = 0;
        }
        
        // 更新が必要な場合のみ実行
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString();
          const employeeRef = doc(db, this.collectionName, docSnap.id);
          await updateDoc(employeeRef, updates);
          fixedCount++;
          console.log(`従業員データを修正: ${docSnap.id}`, updates);
        }
      }
      
      console.log(`データ修正完了: ${fixedCount}件`);
      return fixedCount;
    } catch (error) {
      console.error('データ修正に失敗しました:', error);
      throw error;
    }
  }

  // 役職一覧を取得
  static async getPositions(organizationId: string): Promise<string[]> {
    try {
      const employees = await this.getEmployees(organizationId);
      const positions = [...new Set(employees.map(emp => emp.position))];
      return positions.sort();
    } catch (error) {
      console.error('役職一覧の取得に失敗しました:', error);
      throw error;
    }
  }
}
