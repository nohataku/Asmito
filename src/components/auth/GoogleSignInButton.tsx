'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

interface GoogleSignInButtonProps {
  text?: string;
  variant?: 'default' | 'icon-only';
  className?: string;
  redirectTo?: string;
}

export default function GoogleSignInButton({ 
  text = 'Googleでログイン',
  variant = 'default',
  className = '',
  redirectTo = '/'
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      console.log('Starting Google sign-in...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('Google sign-in successful:', user.uid);

      // Firestoreでユーザー情報を確認
      console.log('Checking user document...');
      const userDocRef = doc(db, 'users', user.uid);
      
      try {
        const userDoc = await getDoc(userDocRef);
        console.log('User document exists:', userDoc.exists());

        if (!userDoc.exists()) {
          console.log('Creating new user document...');
          // 新規ユーザーの場合、Firestoreにユーザー情報を保存
          await setDoc(userDocRef, {
            name: user.displayName || '',
            email: user.email,
            role: 'admin', // 初回登録者は管理者
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log('User document created successfully');

          console.log('Creating organization document...');
          // 組織情報も作成
          await setDoc(doc(db, 'organizations', user.uid), {
            name: user.displayName ? `${user.displayName}の組織` : '新しい組織',
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
              currency: 'JPY',
              timezone: 'Asia/Tokyo',
              workingHours: {
                start: '09:00',
                end: '18:00'
              }
            }
          });
          console.log('Organization document created successfully');
        }
      } catch (firestoreError: any) {
        console.error('Firestore operation failed:', firestoreError);
        console.error('Error code:', firestoreError.code);
        console.error('Error message:', firestoreError.message);
        
        // Firestoreエラーでもログインは継続
        if (firestoreError.code === 'permission-denied') {
          setError('データベースの権限設定に問題があります。管理者にお問い合わせください。');
        } else {
          setError('ユーザー情報の保存に失敗しましたが、ログインは完了しました。');
        }
      }

      setUser(user);
      router.push(redirectTo);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました。');
      } else if (err.code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。ポップアップを許可してください。');
      } else {
        setError('Googleログインに失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  if (variant === 'icon-only') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={`p-3 border border-gray-300 rounded-full shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${className}`}
          title={text}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <GoogleIcon />
          )}
        </button>
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={`w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
        ) : (
          <GoogleIcon />
        )}
        <span className="ml-2">{text}</span>
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
