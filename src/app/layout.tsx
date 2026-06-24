import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';

export const metadata: Metadata = {
  title: {
    default: '智能班级管理系统',
    template: '%s | 智能班级管理系统',
  },
  description:
    '智能班级管理系统 - 实现作业提交、未提交统计、AI助手辅助教学',
  keywords: [
    '班级管理',
    '作业系统',
    '教育科技',
    'AI助手',
    '在线教育',
  ],
  authors: [{ name: 'Class Management Team' }],
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
          {isDev && <Inspector />}
          {children}
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}