import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee as EmployeeType } from '@/types/index';

export type Employee = EmployeeType;

export interface CreateEmployeeData {
  name: string;
  email?: string;
  department: string;
  position: string;
  hourlyRate: number;
  joinDate?: string;
  phone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  skills?: string[];
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

export class EmployeeService {
  private static collectionName = 'employees';

  // 従業員一覧を取得
  static async getEmployees(organizationId: string): Promise<Employee[]> {
    try {
      const employeesRef = collection(db, this.collectionName);
      const q = query(
        employeesRef,
        where('organizationId', '==', organizationId)
      );
      
      const querySnapshot = await getDocs(q);
      const employees: Employee[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('取得した従業員データ:', data);
        
        // isActiveフィールドまたはstatusフィールドでアクティブかチェック
        const isActive = data.isActive === true || data.status === 'active';
        
        if (isActive) {
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
      
      console.log(`アクティブな従業員: ${employees.length}件`);
      
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

  // 従業員を削除（ソフトデリート）
  static async deleteEmployee(employeeId: string): Promise<void> {
    try {
      const employeeRef = doc(db, this.collectionName, employeeId);
      await updateDoc(employeeRef, {
        status: 'inactive',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('従業員の削除に失敗しました:', error);
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
