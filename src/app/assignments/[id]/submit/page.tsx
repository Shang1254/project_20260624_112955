'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SubmissionFile {
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface Submission {
  id: string;
  user_id: string;
  assignment_id: string;
  class_id: string;
  content: string;
  files: SubmissionFile[];
  status: string;
  score: number | null;
  feedback: string;
  reviewer_id: string;
  is_late: boolean;
  file_name_valid: boolean | null;
  file_name_error: string;
  submitted_at: string;
  reviewed_at: string;
  users: {
    name: string;
    email: string;
    student_number?: string;
  };
}

export default function SubmitAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [assignment, setAssignment] = useState<{
    id: string;
    title: string;
    description: string;
    file_name_template: string;
    due_date: string;
    class_id: string;
  } | null>(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 已提交的作业信息
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    loadAssignment();
    checkExistingSubmission();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();
      
      if (data) {
        setAssignment(data);
      } else {
        setError('作业不存在');
      }
    } catch (err) {
      console.error('Load assignment error:', err);
      setError('加载作业信息失败');
    }
  };

  const checkExistingSubmission = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setExistingSubmission(data);
        
        // 如果已被拒绝，显示错误信息
        if (data.status === 'rejected' && data.file_name_error) {
          setError(`之前的提交被拒绝：${data.file_name_error}`);
        }
      }
    } catch (err: unknown) {
      console.error('Check submission error:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 验证文件名是否符合模板
  const validateFileName = (file: File, template?: string): { valid: boolean; error?: string } => {
    if (!template) {
      return { valid: true };
    }

    // 模板格式：学号_姓名_作业名称.docx
    // 将模板转换为正则表达式
    const regexPattern = template
      .replace(/学号/g, '\\d+')           // 学号 → 数字
      .replace(/姓名/g, '[\\u4e00-\\u9fa5]+')  // 姓名 → 中文字符
      .replace(/作业名称/g, '.+');         // 作业名称 → 任意字符

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    
    if (regex.test(file.name)) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `文件名 "${file.name}" 不符合模板要求 "${template}"`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // 确保作业数据已加载
      if (!assignment) {
        setError('作业信息未加载，请刷新页面后重试');
        return;
      }

      // 检查是否已提交
      if (existingSubmission && existingSubmission.status !== 'rejected') {
        setError('您已经提交过此作业，无法重复提交');
        return;
      }

      if (files.length === 0) {
        setError('请至少选择一个文件');
        return;
      }

      // 验证文件名
      const invalidFiles = files.map(file => validateFileName(file, assignment.file_name_template))
        .filter(v => !v.valid);

      if (invalidFiles.length > 0) {
        const errors = invalidFiles.map(f => f.error).join('\n');
        setError(`文件名验证失败：\n${errors}`);
        setIsLoading(false);
        return;
      }

      // TODO: 上传文件到存储服务
      // 这里暂时只保存文件信息
      const fileData = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // url: 上传后的 URL
      }));

      // 插入提交记录
      const submissionData = {
        assignment_id: assignmentId,
        user_id: user.id,
        class_id: assignment.class_id,
        content: content || null,
        files: fileData,
        status: 'pending_review', // 待审核状态
        file_name_valid: true,
      };

      const { error: submissionError } = await supabase
        .from('submissions')
        .insert(submissionData);

      if (submissionError) {
        throw new Error(submissionError.message);
      }

      setSuccess('提交成功！等待班长审核文件名...');
      setFiles([]);
      setContent('');
      
      // 刷新页面查看状态
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: unknown) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (submissionId: string, reason: string) => {
    if (!confirm('确定要驳回这份提交吗？')) return;

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('用户未登录');
        return;
      }

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          file_name_valid: false,
          file_name_error: reason,
          feedback: reason,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw new Error(error.message);

      setSuccess('已驳回提交');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      console.error('Reject error:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleApprove = async (submissionId: string) => {
    if (!confirm('确定要通过这份提交吗？')) return;

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('用户未登录');
        return;
      }

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'reviewed',
          file_name_valid: true,
          file_name_error: null,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user.id,
        })
        .eq('id', submissionId);

      if (error) throw new Error(error.message);

      setSuccess('已通过提交');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      console.error('Approve error:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
        
        {existingSubmission && (
          <div className="mb-6">
            {existingSubmission.status === 'rejected' ? (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                已被驳回
              </Badge>
            ) : existingSubmission.status === 'reviewed' ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                文件名审核通过
              </Badge>
            ) : (
              <Badge variant="outline">
                待审核
              </Badge>
            )}
          </div>
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>作业要求</CardTitle>
            <CardDescription>
              {assignment.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.file_name_template && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-medium text-blue-900 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  文件名模板：
                </p>
                <code className="bg-white px-2 py-1 rounded text-blue-800">
                  {assignment.file_name_template}
                </code>
                <p className="text-sm text-blue-700 mt-2">
                  示例：2021001_张三_第一章练习题.docx
                </p>
              </div>
            )}

            {assignment.due_date && (
              <div className="text-sm text-gray-600">
                <p>截止日期：{new Date(assignment.due_date).toLocaleString()}</p>
                {new Date(assignment.due_date) < new Date() && existingSubmission?.status === 'pending_review' && (
                  <p className="text-red-600 font-medium mt-1">⚠️ 迟交作业</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {existingSubmission && existingSubmission.status === 'rejected' && (
          <Card className="mb-6 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700">驳回原因</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{existingSubmission.file_name_error || existingSubmission.feedback}</p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>提交作业</CardTitle>
            <CardDescription>
              {existingSubmission ? '修改并提交' : '上传您的作业文件'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {existingSubmission && existingSubmission.status === 'rejected' ? (
              <div className="mb-4">
                <Label>重新提交作业</Label>
              </div>
            ) : existingSubmission && existingSubmission.status === 'reviewed' ? (
              <Alert className="mb-4 bg-green-50">
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>
                  您的作业已通过班长审核，等待老师评分。
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="files">选择文件 *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="files"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <label htmlFor="files" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">点击选择文件或拖拽文件到此处</p>
                      <p className="text-xs text-gray-400 mt-1">支持多种文件格式</p>
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">已选择 {files.length} 个文件：</p>
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isLoading}
                          >
                            移除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">提交说明（可选）</Label>
                  <Textarea
                    id="content"
                    placeholder="添加一些关于您作业的说明..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || files.length === 0}
                >
                  {isLoading ? '提交中...' : '提交作业'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
