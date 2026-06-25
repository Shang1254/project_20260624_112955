'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users } from 'lucide-react';

export default function JoinClassPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const code = classCode.trim().toUpperCase();

      if (!code) {
        setError('请输入班级码');
        setIsLoading(false);
        return;
      }

      // 查找班级
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (classError || !classData) {
        setError('班级码无效或班级已停用');
        return;
      }

      // 检查是否已经是成员
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingMember) {
        setError('您已经是该班级的成员');
        return;
      }

      // 加入班级
      const { error: joinError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          role: 'student',
          is_active: true,
        });

      if (joinError) {
        setError('加入班级失败：' + joinError.message);
        return;
      }

      router.push('/dashboard');

    } catch (err) {
      setError('加入失败，请稍后重试');
      console.error('Join class error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-xl">加入班级</CardTitle>
            <CardDescription>
              输入老师提供的班级码即可加入班级
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="classCode">班级码</Label>
                <Input
                  id="classCode"
                  placeholder="请输入6位班级码"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  required
                  disabled={isLoading}
                  maxLength={6}
                  className="text-center text-xl font-mono tracking-widest uppercase"
                />
                <p className="text-xs text-gray-500 text-center">
                  班级码由老师提供，格式如：A3B9X2
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || classCode.trim().length < 4}
              >
                {isLoading ? '加入中...' : '加入班级'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
