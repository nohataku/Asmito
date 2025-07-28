// シフト関連の型定義

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  hourlyRate: number;
  skills: string[];
  availability: WeeklyAvailability;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAvailability {
  [dayOfWeek: string]: DayAvailability;
}

export interface DayAvailability {
  isAvailable: boolean;
  timeSlots: TimeSlot[];
  notes?: string;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface ShiftRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD format
  timeSlot: ShiftTimeSlot;
  customStart?: string; // HH:mm format
  customEnd?: string;   // HH:mm format
  priority: ShiftPriority;
  notes?: string;
  isFlexible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ShiftTimeSlot = 
  | 'morning'     // 9:00-13:00
  | 'afternoon'   // 13:00-17:00
  | 'evening'     // 17:00-21:00
  | 'night'       // 21:00-25:00
  | 'all-day'     // 9:00-21:00
  | 'custom'      // カスタム時間
  | 'unavailable'; // 勤務不可

export type ShiftPriority = 'high' | 'medium' | 'low';

export interface Shift {
  id?: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  breakTime?: number; // minutes
  position?: string;
  department?: string;
  hourlyRate?: number;
  isConfirmed: boolean;
  notes?: string;
  scheduleId?: string;
  organizationId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface WeeklyShift {
  weekStartDate: string; // YYYY-MM-DD format (Monday)
  shifts: Shift[];
  totalHours: number;
  totalCost: number;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftStats {
  totalEmployees: number;
  totalShifts: number;
  totalHours: number;
  totalCost: number;
  averageHoursPerEmployee: number;
  departmentBreakdown: {
    [department: string]: {
      employees: number;
      hours: number;
      cost: number;
    };
  };
}

// UI関連の型定義
export interface TimeSlotOption {
  value: ShiftTimeSlot;
  label: string;
  time: string;
  icon: string;
}

export interface PriorityOption {
  value: ShiftPriority;
  label: string;
  color: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// フォーム関連
export interface ShiftRequestFormData {
  employeeId: string;
  weekStartDate: string;
  dailyRequests: {
    [date: string]: {
      timeSlot: ShiftTimeSlot;
      customStart?: string;
      customEnd?: string;
      priority: ShiftPriority;
      notes?: string;
      isFlexible: boolean;
    };
  };
  generalNotes?: string;
}

// 検索・フィルター用
export interface ShiftFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  employeeIds?: string[];
  departments?: string[];
  timeSlots?: ShiftTimeSlot[];
  priorities?: ShiftPriority[];
}

export interface EmployeeFilter {
  departments?: string[];
  positions?: string[];
  skills?: string[];
  availability?: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    timeSlot: ShiftTimeSlot;
  };
}
