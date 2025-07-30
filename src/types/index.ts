// 従業員関連の型をインポート・エクスポート
export type { 
  Employee as EmployeeType, 
  CreateEmployeeData, 
  EmployeeBasic,
  ShiftType,
  HourlyRates,
  AvailableShiftTypes
} from './employee'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'employee'
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  industry: string
  size: number
  settings: OrganizationSettings
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationSettings {
  timezone: string
  workingHours: {
    start: string
    end: string
  }
  overtime: {
    enabled: boolean
    rate: number
  }
  nightShift: {
    enabled: boolean
    startTime: string
    endTime: string
    rate: number
  }
}

export interface Employee {
  id: string
  userId?: string
  organizationId: string
  employeeId?: string
  name: string
  email?: string
  phone?: string
  position: string
  department: string
  hourlyRate: number
  joinDate?: string
  maxHoursPerWeek?: number
  maxDaysPerWeek?: number
  status: 'active' | 'inactive' | 'suspended'
  skills?: string[]
  availability?: Availability[]
  constraints?: Constraint[]
  availableShifts?: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  address?: string
  createdAt: string
  updatedAt: string
}

export interface Availability {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string
  endTime: string
  isPreferred: boolean
}

export interface Constraint {
  type: 'max_hours_per_day' | 'max_days_per_week' | 'min_rest_between_shifts'
  value: number
}

export interface ShiftRequest {
  id: string
  employeeId: string
  organizationId?: string
  date: string
  startTime?: string
  endTime?: string
  type: 'work' | 'off'
  priority: 'low' | 'medium' | 'high'
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  createdAt?: Date
}

export interface Shift {
  id?: string
  employeeId: string
  employeeName: string
  date: string // YYYY-MM-DD format
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  breakTime?: number // minutes
  position?: string
  department?: string
  hourlyRate?: number
  isConfirmed: boolean
  notes?: string
  scheduleId?: string
  organizationId?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface Schedule {
  id: string
  organizationId: string
  startDate: string
  endDate: string
  shifts: Shift[]
  status: 'draft' | 'published' | 'locked'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface PayrollPeriod {
  id: string
  organizationId: string
  startDate: string
  endDate: string
  status: 'calculating' | 'ready' | 'paid'
  totalAmount: number
  createdAt: Date
}

export interface PayrollEntry {
  id: string
  payrollPeriodId: string
  employeeId: string
  regularHours: number
  overtimeHours: number
  nightShiftHours: number
  totalPay: number
  deductions: number
  netPay: number
}
