// 従業員に関する型定義
export interface Employee {
  id: string;
  userId?: string;
  organizationId: string;
  employeeId?: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hourlyRate: number;
  joinDate: string;
  maxHoursPerWeek?: number;
  maxDaysPerWeek?: number;
  status: 'active' | 'inactive' | 'suspended';
  skills?: string[];
  availability?: Availability[];
  constraints?: Constraint[];
  availableShifts?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: string;
  createdAt: string;
  updatedAt: string;
}

// 従業員の可用性
export interface Availability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isPreferred: boolean;
}

// 従業員の制約条件
export interface Constraint {
  type: 'max_hours_per_day' | 'max_days_per_week' | 'min_rest_between_shifts';
  value: number;
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
  skills?: string[];
  availability?: Availability[];
  constraints?: Constraint[];
  availableShifts?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

// シンプルな従業員情報（ドロップダウンなど軽量な用途向け）
export interface EmployeeBasic {
  id: string;
  name: string;
  department: string;
  position: string;
}
