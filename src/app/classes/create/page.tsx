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

  const handleCreate = async (e: React.FormEvent) => {
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

      if (!name.trim()) {
        setError('请输入班级名称');
        setIsLoading(false);
        return;
      }

      // 生成班级码（6位大写字母+数字）
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error: classError } = await supabase
        .from('classes')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          code,
          teacher_id: user.id,
          is_active: true,
        });

      if (classError) {
        setError('创建班级失败：' + classError.message);
        return;
      }

      router.push('/dashboard');

    } catch (err) {
      setError('创建失败，请稍后重试');
      console.error('Create class error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
              创建一个新的班级，学生可以通过班级码加入
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">班级名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：2024级计算机科学1班"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">班级描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="班级简介、课程信息等"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong>创建班级后，系统会自动生成一个班级码。
                  学生可以在加入班级页面输入此班级码来加入您的班级。
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !name.trim()}
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
