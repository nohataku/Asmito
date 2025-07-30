// 勤務時間帯の種類
export type ShiftType = 'morning' | 'day' | 'evening' | 'night';

// 時給設定（時間帯別）
export interface HourlyRates {
  morning: number;    // 朝勤務（6:00-9:00）
  day: number;        // 昼勤務（9:00-17:00）+ 夕方勤務（17:00-22:00）
  night: number;      // 深夜勤務（22:00-6:00）
}

// 勤務可能時間帯設定
export interface AvailableShiftTypes {
  morning: boolean;   // 朝勤務可能（6:00-9:00）
  day: boolean;       // 昼勤務可能（9:00-17:00）
  evening: boolean;   // 夕方勤務可能（17:00-22:00）
  night: boolean;     // 深夜勤務可能（22:00-6:00）
}

// 従業員に関する型定義
export interface Employee {
  id: string;
  userId?: string;
  organizationId: string;
  employeeId?: string;
  name: string;
  email: string;
  employeeId?: string; // 従業員ID（任意）
  department: string;
  position: string;
  hourlyRate: number; // 基本時給（後方互換性のため残す）
  hourlyRates?: HourlyRates; // 時間帯別時給
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
  availableShiftTypes?: AvailableShiftTypes; // 勤務可能時間帯
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
  employeeId?: string; // 従業員ID（任意）
  department: string;
  position: string;
  hourlyRate: number; // 基本時給（後方互換性のため残す）
  hourlyRates?: HourlyRates; // 時間帯別時給
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
  availableShiftTypes?: AvailableShiftTypes; // 勤務可能時間帯
}

// シンプルな従業員情報（ドロップダウンなど軽量な用途向け）
export interface EmployeeBasic {
  id: string;
  name: string;
  department: string;
  position: string;
}
