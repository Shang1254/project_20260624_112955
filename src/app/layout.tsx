import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/error-boundary';

export const metadata: Metadata = {
  title: {
    default: '智能班级管理系统 - 武汉晴川学院',
    template: '%s | 智能班级管理系统',
  },
  description:
    '武汉晴川学院智能班级管理系统 - 实现作业提交、未提交统计、AI助手辅助教学、成绩管理等功能',
  keywords: [
    '武汉晴川学院',
    '班级管理',
    '作业系统',
    '教育科技',
    'AI助手',
    '在线教育',
    '晴川学院',
  ],
  authors: [{ name: '武汉晴川学院' }],
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <SupabaseConfigProvider>
          <ErrorBoundary>
            {isDev && <Inspector />}
            {children}
          </ErrorBoundary>
          <Toaster position="top-center" richColors closeButton />
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}