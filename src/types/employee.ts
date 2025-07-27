// 従業員に関する型定義
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  hourlyRate: number;
  joinDate: string;
  status: 'active' | 'inactive';
  maxHoursPerWeek?: number;
  maxDaysPerWeek?: number;
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
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  department: string;
  position: string;
  hourlyRate: number;
  joinDate: string;
  maxHoursPerWeek?: number;
  maxDaysPerWeek?: number;
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

// シンプルな従業員情報（ドロップダウンなど軽量な用途向け）
export interface EmployeeBasic {
  id: string;
  name: string;
  department: string;
  position: string;
}
