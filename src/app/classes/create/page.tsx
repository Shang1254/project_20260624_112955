'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users } from 'lucide-react';

export default function CreateClassPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [classCode, setClassCode] = useState('');

  const generateClassCode = () => {
    // 生成6位随机班级邀请码
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateClass = async (e: React.FormEvent) => {
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

      // 检查用户是否是教师
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData || userData.role !== 'teacher') {
        setError('只有教师才能创建班级');
        return;
      }

      // 创建班级
      const code = generateClassCode();
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert({
          name: name,
          description: description || null,
          teacher_id: user.id,
          code: code,
        })
        .select()
        .single();

      if (classError) {
        setError('创建班级失败：' + classError.message);
        return;
      }

      // 教师自动成为班级成员
      await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          role: 'teacher',
        });

      setClassCode(code);
      setSuccess(true);

    } catch (err) {
      setError('创建失败，请稍后重试');
      console.error('Create class error:', err);
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
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">班级创建成功！</CardTitle>
              <CardDescription>
                请将以下班级邀请码分享给学生
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-gray-100 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">班级邀请码</p>
                <p className="text-3xl font-bold text-blue-600">{classCode}</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  返回首页
                </Button>
                <Button onClick={() => router.push(`/classes/${classCode}/manage`)}>
                  管理班级
                </Button>
              </div>
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
              创建班级
            </CardTitle>
            <CardDescription>
              创建新的班级，学生可通过邀请码加入
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClass} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">班级名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：高一(3)班"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">班级描述</Label>
                <Textarea
                  id="description"
                  placeholder="例如：2024届高一数学班级"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !name}
              >
                {isLoading ? '创建中...' : '创建班级'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}