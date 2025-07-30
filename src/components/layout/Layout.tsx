'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 transition-colors duration-300">
      {showSidebar && <Sidebar />}
      
      <main className={`transition-all duration-300 ease-in-out ${showSidebar ? 'lg:ml-64' : ''}`}>
        <div className={`${showSidebar ? 'p-6 max-w-5xl mx-auto' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
