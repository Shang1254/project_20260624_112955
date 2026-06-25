'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, XCircle, FileText, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ReviewSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignment, setAssignment] = useState<{
    id: string;
    title: string;
    description: string;
    file_name_template: string;
    due_date: string;
    class_id: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [assignmentId]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      
      // 获取作业信息
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();
      
      if (assignmentData) {
        setAssignment(assignmentData);
      }

      // 获取所有提交记录
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      // 加载用户信息
      const submissionsWithUsers = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email, student_number')
            .eq('id', submission.user_id)
            .single();

          return {
            ...submission,
            users: userData || { name: '未知', email: '' },
          };
        })
      );

      setSubmissions(submissionsWithUsers);
    } catch (err: unknown) {
      console.error('Load submissions error:', err);
      setError('加载提交记录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (submission: Submission) => {
    const studentName = submission.users.name;

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('用户未登录');
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
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      toast.success(`已通过 "${studentName}" 的提交`);
      await loadSubmissions();
    } catch (err: unknown) {
      console.error('Approve error:', err);
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleReject = (submission: Submission) => {
    setSelectedSubmission(submission);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const submitReject = async () => {
    if (!selectedSubmission || !rejectReason.trim()) {
      toast.error('请输入驳回原因');
      return;
    }

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('用户未登录');
        return;
      }

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          file_name_valid: false,
          file_name_error: rejectReason,
          feedback: rejectReason,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw new Error(error.message);

      toast.success('已驳回提交');
      setRejectDialogOpen(false);
      await loadSubmissions();
    } catch (err: unknown) {
      console.error('Reject error:', err);
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="outline">待审核</Badge>;
      case 'reviewed':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            通过
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            驳回
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusCount = (status: string) => {
    return submissions.filter(s => s.status === status).length;
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          
          <h1 className="text-3xl font-bold">{assignment.title} - 作业审核</h1>
        </div>

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

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{getStatusCount('pending_review')}</div>
              <div className="text-sm text-gray-600">待审核</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{getStatusCount('reviewed')}</div>
              <div className="text-sm text-gray-600">已通过</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{getStatusCount('rejected')}</div>
              <div className="text-sm text-gray-600">已驳回</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{submissions.length}</div>
              <div className="text-sm text-gray-600">总提交数</div>
            </CardContent>
          </Card>
        </div>

        {/* 文件名模板提示 */}
        {assignment.file_name_template && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="font-medium text-blue-900 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                文件名模板：
              </p>
              <code className="bg-white px-2 py-1 rounded text-blue-800">
                {assignment.file_name_template}
              </code>
            </CardContent>
          </Card>
        )}

        {/* 提交列表 */}
        <Card>
          <CardHeader>
            <CardTitle>学生提交列表</CardTitle>
            <CardDescription>
              审核学生的文件名是否符合要求
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无提交记录</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>学号</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>文件</TableHead>
                    <TableHead>文件名合规</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.users.name}
                      </TableCell>
                      <TableCell>
                        {(submission.users.student_number || '-')}
                      </TableCell>
                      <TableCell>
                        {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                        {submission.is_late && (
                          <span className="text-red-600 text-xs ml-2">迟交</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {submission.files ? submission.files.length : 0} 个文件
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.file_name_valid === true && (
                          <Badge variant="default" className="bg-green-600">合规</Badge>
                        )}
                        {submission.file_name_valid === false && (
                          <Badge variant="destructive">不合规</Badge>
                        )}
                        {submission.file_name_valid === null && (
                          <Badge variant="outline">未检查</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {submission.status === 'pending_review' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(submission)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(submission)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                驳回
                              </Button>
                            </>
                          )}
                          {submission.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 驳回确认对话框 */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>驳回提交</DialogTitle>
              <DialogDescription>
                请说明驳回原因，学生将看到此信息并需要重新提交。
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">学生：</p>
                  <p className="font-medium">{selectedSubmission.users.name}</p>
                  
                  <p className="text-sm text-gray-600 mt-2">文件名：</p>
                  <code className="text-xs bg-white px-2 py-1 rounded block max-w-md overflow-x-auto">
                    {selectedSubmission.files?.[0]?.name || '无文件'}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejectReason">驳回原因 *</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="例如：文件名不符合模板要求，应为「学号_姓名_作业名称.docx」格式"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={submitReject}
                disabled={!rejectReason.trim()}
              >
                确认驳回
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 查看驳回详情对话框 */}
        <Dialog open={!!selectedSubmission && selectedSubmission.status === 'rejected'} 
                onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>驳回详情</DialogTitle>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="font-medium text-red-900 mb-2">学生：{selectedSubmission.users.name}</p>
                  <p className="text-sm text-gray-600 mb-2">文件名：</p>
                  <code className="text-xs bg-white px-2 py-1 rounded block max-w-md overflow-x-auto mb-3">
                    {selectedSubmission.files?.[0]?.name || '无文件'}
                  </code>
                  <p className="font-medium text-red-900 mb-1">驳回原因：</p>
                  <p className="text-red-700">{selectedSubmission.file_name_error || selectedSubmission.feedback}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setSelectedSubmission(null)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
