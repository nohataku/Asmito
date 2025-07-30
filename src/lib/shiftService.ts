import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShiftRequest, Employee, ShiftRequestFormData } from '@/types/shift';

// シフト希望を保存
export const saveShiftRequest = async (
  organizationId: string, 
  shiftRequest: ShiftRequest
): Promise<{ success: boolean; error?: string }> => {
  try {
    const requestId = shiftRequest.id || `${shiftRequest.employeeId}_${shiftRequest.date}`;
    const requestRef = doc(db, 'organizations', organizationId, 'shiftRequests', requestId);
    
    const requestData = {
      ...shiftRequest,
      id: requestId,
      createdAt: shiftRequest.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(requestRef, requestData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving shift request:', error);
    return { success: false, error: 'シフト希望の保存に失敗しました' };
  }
};

// 複数のシフト希望を一括保存
export const saveMultipleShiftRequests = async (
  organizationId: string,
  formData: ShiftRequestFormData
): Promise<{ success: boolean; saved: number; error?: string }> => {
  try {
    let savedCount = 0;
    const employee = await getEmployee(organizationId, formData.employeeId);
    
    if (!employee) {
      return { success: false, saved: 0, error: '従業員が見つかりません' };
    }

    for (const [date, dailyRequest] of Object.entries(formData.dailyRequests)) {
      const shiftRequest: ShiftRequest = {
        employeeId: formData.employeeId,
        employeeName: employee.name,
        date,
        timeSlot: dailyRequest.timeSlot,
        customStart: dailyRequest.customStart,
        customEnd: dailyRequest.customEnd,
        priority: dailyRequest.priority,
        notes: dailyRequest.notes,
        isFlexible: dailyRequest.isFlexible
      };

      const result = await saveShiftRequest(organizationId, shiftRequest);
      if (result.success) {
        savedCount++;
      }
    }

    return { success: true, saved: savedCount };
  } catch (error) {
    console.error('Error saving multiple shift requests:', error);
    return { success: false, saved: 0, error: '一括保存に失敗しました' };
  }
};

// 従業員のシフト希望を取得
export const getEmployeeShiftRequests = async (
  organizationId: string,
  employeeId: string,
  weekStartDate?: string
): Promise<ShiftRequest[]> => {
  try {
    let requestQuery = query(
      collection(db, 'organizations', organizationId, 'shiftRequests'),
      where('employeeId', '==', employeeId),
      orderBy('date', 'asc')
    );

    if (weekStartDate) {
      const weekEndDate = new Date(weekStartDate + 'T00:00:00');
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // ローカル日付として処理
      const year = weekEndDate.getFullYear();
      const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
      const day = String(weekEndDate.getDate()).padStart(2, '0');
      const weekEndDateStr = `${year}-${month}-${day}`;
      
      requestQuery = query(
        collection(db, 'organizations', organizationId, 'shiftRequests'),
        where('employeeId', '==', employeeId),
        where('date', '>=', weekStartDate),
        where('date', '<=', weekEndDateStr),
        orderBy('date', 'asc')
      );
    }

    const snapshot = await getDocs(requestQuery);
    return snapshot.docs.map(doc => doc.data() as ShiftRequest);
  } catch (error) {
    console.error('Error getting employee shift requests:', error);
    return [];
  }
};

// 全従業員のシフト希望を取得
export const getAllShiftRequests = async (
  organizationId: string,
  weekStartDate?: string
): Promise<ShiftRequest[]> => {
  try {
    let requestQuery = query(
      collection(db, 'organizations', organizationId, 'shiftRequests'),
      orderBy('date', 'asc'),
      orderBy('employeeName', 'asc')
    );

    if (weekStartDate) {
      const weekEndDate = new Date(weekStartDate + 'T00:00:00');
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // ローカル日付として処理
      const year = weekEndDate.getFullYear();
      const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
      const day = String(weekEndDate.getDate()).padStart(2, '0');
      const weekEndDateStr = `${year}-${month}-${day}`;
      
      requestQuery = query(
        collection(db, 'organizations', organizationId, 'shiftRequests'),
        where('date', '>=', weekStartDate),
        where('date', '<=', weekEndDateStr),
        orderBy('date', 'asc'),
        orderBy('employeeName', 'asc')
      );
    }

    const snapshot = await getDocs(requestQuery);
    return snapshot.docs.map(doc => doc.data() as ShiftRequest);
  } catch (error) {
    console.error('Error getting all shift requests:', error);
    return [];
  }
};

// 従業員情報を取得
export const getEmployee = async (
  organizationId: string,
  employeeId: string
): Promise<Employee | null> => {
  try {
    const employeeRef = doc(db, 'organizations', organizationId, 'employees', employeeId);
    const employeeDoc = await getDoc(employeeRef);
    
    if (employeeDoc.exists()) {
      return employeeDoc.data() as Employee;
    }
    return null;
  } catch (error) {
    console.error('Error getting employee:', error);
    return null;
  }
};

// 全従業員を取得
export const getAllEmployees = async (organizationId: string): Promise<Employee[]> => {
  try {
    const employeesRef = collection(db, 'organizations', organizationId, 'employees');
    const snapshot = await getDocs(employeesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
  } catch (error) {
    console.error('Error getting employees:', error);
    return [];
  }
};

// シフト希望を削除
export const deleteShiftRequest = async (
  organizationId: string,
  employeeId: string,
  date: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const requestId = `${employeeId}_${date}`;
    const requestRef = doc(db, 'organizations', organizationId, 'shiftRequests', requestId);
    await setDoc(requestRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting shift request:', error);
    return { success: false, error: 'シフト希望の削除に失敗しました' };
  }
};

// 週の日付を生成するユーティリティ関数（タイムゾーン問題を回避）
export const getWeekDates = (startDate: string): string[] => {
  const dates = [];
  const start = new Date(startDate + 'T00:00:00');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    
    // ローカル日付として処理
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
};

// 今週の開始日を取得（月曜日）- タイムゾーン問題を回避
export const getCurrentWeekStart = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 日曜日の場合は前週の月曜日
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  // ローカル日付として処理
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
