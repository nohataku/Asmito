'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import AuthForm from '@/components/auth/AuthForm';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import Layout from '@/components/layout/Layout';

export default function SignUpPage() {
  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-8">
              <Image
                src="/logo.png"
                alt="Asmito Logo"
                width={380}
                height={140}
                className="h-28 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center">アカウント作成</CardTitle>
            <CardDescription className="text-center">
              新しいアカウントを作成してAsmitoを始めましょう
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleSignInButton 
              text="Googleで新規登録"
              className="w-full"
            />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            <AuthForm mode="signup" />

            <div className="text-center text-sm">
              <span className="text-gray-600">すでにアカウントをお持ちですか？</span>
              <Link href="/auth/login" className="ml-1 text-indigo-600 hover:text-indigo-500 font-medium">
                ログイン
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
}