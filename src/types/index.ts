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
  userId: string
  organizationId: string
  name: string
  position: string
  hourlyRate: number
  skills: string[]
  availability: Availability[]
  constraints: Constraint[]
  createdAt: Date
  updatedAt: Date
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
  date: string
  startTime?: string
  endTime?: string
  type: 'work_request' | 'time_off_request'
  priority: 'low' | 'medium' | 'high'
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface Shift {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  position: string
  isConfirmed: boolean
  createdAt: Date
  updatedAt: Date
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
