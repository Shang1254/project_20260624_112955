'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { GraduationCap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isLoading, error } = useSupabaseConfig();

  const checkAuth = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  useEffect(() => {
    if (!isLoading && !error) {
      checkAuth();
    }
  }, [isLoading, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">智能班级管理系统</h1>
        <p className="text-gray-600 mb-6">正在检查登录状态...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}