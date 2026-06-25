'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';

interface Class {
  id: string;
  name: string;
}

// 验证文件名模板格式
const validateTemplateName = (template: string): boolean => {
  if (!template) return true;
  
  // 检查是否包含有效的占位符
  const hasValidPlaceholders = 
    template.includes('学号') || 
    template.includes('姓名') || 
    template.includes('作业名称');
  
  // 检查是否有文件扩展名
  const hasExtension = template.includes('.') && template.split('.').length > 1;
  
  return hasValidPlaceholders && hasExtension;
};

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalScore, setTotalScore] = useState('100');
  const [allowLate, setAllowLate] = useState(false);
  const [fileNameTemplate, setFileNameTemplate] = useState(''); // 文件名模板
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)
        .eq('is_active', true);

      setClasses(classData || []);
      
      if (classData && classData.length > 0) {
        setSelectedClass(classData[0].id);
      }
    } catch (err) {
      console.error('Load classes error:', err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
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

      if (!selectedClass) {
        setError('请选择班级');
        return;
      }

      // 验证文件名模板格式
      if (fileNameTemplate) {
        const validTemplate = validateTemplateName(fileNameTemplate);
        if (!validTemplate) {
          setError('文件名模板格式不正确，请使用：学号_姓名_作业名称.扩展名');
          return;
        }
      }

      // 获取班级成员数量
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', selectedClass)
        .eq('is_active', true);

      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          class_id: selectedClass,
          title: title,
          description: description || null,
          file_name_template: fileNameTemplate || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          total_score: parseInt(totalScore) || 100,
          allow_late_submission: allowLate,
          created_by: user.id,
        });

      if (assignmentError) {
        setError('创建作业失败：' + assignmentError.message);
        return;
      }

      router.push('/dashboard');

    } catch (err) {
      setError('创建失败，请稍后重试');
      console.error('Create assignment error:', err);
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
              <FileText className="w-5 h-5" />
              发布作业
            </CardTitle>
            <CardDescription>
              为班级创建新的作业任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {classes.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    您还没有创建班级，请先创建班级
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Label>选择班级</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择班级" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">作业标题 *</Label>
                <Input
                  id="title"
                  placeholder="例如：第一章练习题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">作业描述</Label>
                <Textarea
                  id="description"
                  placeholder="作业要求和内容说明"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">截止日期</Label>
                  <div className="relative">
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={isLoading}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalScore">总分</Label>
                  <Input
                    id="totalScore"
                    type="number"
                    value={totalScore}
                    onChange={(e) => setTotalScore(e.target.value)}
                    disabled={isLoading}
                    min="0"
                    max="1000"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowLate"
                  checked={allowLate}
                  onChange={(e) => setAllowLate(e.target.checked)}
                  disabled={isLoading}
                  className="rounded"
                />
                <Label htmlFor="allowLate" className="text-sm font-normal">
                  允许迟交
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileNameTemplate">文件名模板（可选）</Label>
                <Input
                  id="fileNameTemplate"
                  placeholder="例如：学号_姓名_作业名称.docx"
                  value={fileNameTemplate}
                  onChange={(e) => setFileNameTemplate(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  学生提交的文件必须匹配此模板。示例：2021001_张三_第一章练习题.docx
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !title || !selectedClass}
              >
                {isLoading ? '发布中...' : '发布作业'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}