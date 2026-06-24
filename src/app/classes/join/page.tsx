'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';

export default function JoinClassPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [className, setClassName] = useState('');

  useEffect(() => {
    // 从URL参数获取班级邀请码
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setClassCode(code);
    }
  }, []);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // 查找班级
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('code', classCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (classError || !classData) {
        setError('班级邀请码无效或班级已关闭');
        return;
      }

      // 检查是否已经是班级成员
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('user_id', user.id)
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
        });

      if (joinError) {
        setError('加入班级失败：' + joinError.message);
        return;
      }

      setClassName(classData.name);
      setSuccess(true);

    } catch (err) {
      setError('加入失败，请稍后重试');
      console.error('Join class error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">成功加入班级！</CardTitle>
              <CardDescription>
                您已成功加入 {className}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push('/dashboard')}>
                查看班级
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              加入班级
            </CardTitle>
            <CardDescription>
              输入教师提供的班级邀请码加入班级
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinClass} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">班级邀请码</Label>
                <Input
                  id="code"
                  placeholder="请输入6位邀请码"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  required
                  disabled={isLoading}
                  maxLength={6}
                  className="uppercase"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || classCode.length !== 6}
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