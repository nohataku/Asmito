'use client';

import { useAuthStore } from '@/store/authStore';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4 text-center">
              <h2 className="text-xl font-semibold text-gray-700">
                ようこそ、{user.email}さん！
              </h2>
              <p className="mt-2 text-gray-600">
                ここにアプリケーションのメインコンテンツが表示されます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
