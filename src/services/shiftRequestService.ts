import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ShiftRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  organizationId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string; // 'on', 'off', 'prefer' など
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  notes?: string;
}

export class ShiftRequestService {
  private static COLLECTION_NAME = 'shiftRequests';

  // シフト希望を取得
  static async getShiftRequests(organizationId: string, startDate?: string, endDate?: string): Promise<ShiftRequest[]> {
    try {
      // 基本クエリ（organizationIdのみでフィルタリング）
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('organizationId', '==', organizationId)
      );

      const snapshot = await getDocs(q);
      
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // submittedAtフィールドの安全な変換
        let submittedAtDate: Date;
        if (data.submittedAt) {
          if (typeof data.submittedAt.toDate === 'function') {
            // Firestore Timestamp オブジェクトの場合
            submittedAtDate = data.submittedAt.toDate();
          } else if (data.submittedAt instanceof Date) {
            // 既にDateオブジェクトの場合
            submittedAtDate = data.submittedAt;
          } else if (typeof data.submittedAt === 'string') {
            // 文字列の場合
            submittedAtDate = new Date(data.submittedAt);
          } else {
            // その他の場合はデフォルト値
            submittedAtDate = new Date();
          }
        } else {
          submittedAtDate = new Date();
        }
        
        return {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName || '',
          organizationId: data.organizationId,
          date: data.date,
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          type: data.type || 'prefer',
          priority: data.priority || 'medium',
          status: data.status || 'pending',
          submittedAt: submittedAtDate,
          notes: data.notes || ''
        } as ShiftRequest;
      });

      // クライアントサイドで日付フィルタリング
      if (startDate && endDate) {
        results = results.filter(request => 
          request.date >= startDate && request.date <= endDate
        );
      }

      // クライアントサイドでソート
      results.sort((a, b) => {
        // まず日付でソート
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        // 次に提出日時でソート（新しい順）
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });

      return results;
    } catch (error) {
      console.error('シフト希望の取得に失敗しました:', error);
      throw error;
    }
  }

  // 従業員別のシフト希望を取得
  static async getShiftRequestsByEmployee(organizationId: string, employeeId: string): Promise<ShiftRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        where('employeeId', '==', employeeId)
      );

      const snapshot = await getDocs(q);
      
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // submittedAtフィールドの安全な変換
        let submittedAtDate: Date;
        if (data.submittedAt) {
          if (typeof data.submittedAt.toDate === 'function') {
            // Firestore Timestamp オブジェクトの場合
            submittedAtDate = data.submittedAt.toDate();
          } else if (data.submittedAt instanceof Date) {
            // 既にDateオブジェクトの場合
            submittedAtDate = data.submittedAt;
          } else if (typeof data.submittedAt === 'string') {
            // 文字列の場合
            submittedAtDate = new Date(data.submittedAt);
          } else {
            // その他の場合はデフォルト値
            submittedAtDate = new Date();
          }
        } else {
          submittedAtDate = new Date();
        }
        
        return {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName || '',
          organizationId: data.organizationId,
          date: data.date,
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          type: data.type || 'prefer',
          priority: data.priority || 'medium',
          status: data.status || 'pending',
          submittedAt: submittedAtDate,
          notes: data.notes || ''
        } as ShiftRequest;
      });

      // クライアントサイドで日付順にソート
      results.sort((a, b) => a.date.localeCompare(b.date));

      return results;
    } catch (error) {
      console.error('従業員のシフト希望取得に失敗しました:', error);
      throw error;
    }
  }

  // シフト希望のステータスを更新
  static async updateShiftRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      await updateDoc(docRef, {
        status: status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('シフト希望ステータスの更新に失敗しました:', error);
      throw error;
    }
  }

  // シフト希望の詳細を更新
  static async updateShiftRequest(requestId: string, updates: {
    startTime?: string;
    endTime?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('シフト希望の更新に失敗しました:', error);
      throw error;
    }
  }
}
