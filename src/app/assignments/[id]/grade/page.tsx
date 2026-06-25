'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, XCircle, FileText, AlertCircle, Star, Award } from 'lucide-react';

interface SubmissionFile {
  name: string;
  size: number;
  type: string;
}

interface Submission {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string;
  files: SubmissionFile[];
  status: string;
  score: number | null;
  feedback: string;
  is_late: boolean;
  file_name_valid: boolean | null;
  submitted_at: string;
  users: {
    name: string;
    email: string;
    student_number?: string;
  };
}

export default function GradeSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<{
    id: string;
    title: string;
    total_score: number;
    due_date: string;
    class_id: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const loadData = async () => {
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

      // 获取所有已通过审核的提交
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .in('status', ['reviewed', 'graded'])
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
    } catch (err) {
      console.error('Load data error:', err);
      setError('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score?.toString() || '');
    setFeedback(submission.feedback || '');
    setError('');
  };

  const submitGrade = async () => {
    if (!selectedSubmission) return;

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || (assignment && scoreNum > assignment.total_score)) {
      setError(`分数必须在 0-${assignment?.total_score || 100} 之间`);
      return;
    }

    setGrading(true);
    setError('');

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
          score: scoreNum,
          feedback: feedback.trim() || null,
          status: 'graded',
          graded_at: new Date().toISOString(),
          graded_by: user.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) {
        setError('评分失败：' + error.message);
        return;
      }

      setSuccess(`已为 ${selectedSubmission.users.name} 评分：${scoreNum}分`);
      setSelectedSubmission(null);

      // 刷新列表
      await loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Grade error:', err);
      setError('评分失败，请稍后重试');
    } finally {
      setGrading(false);
    }
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.status === 'graded') {
      return (
        <Badge className="bg-purple-600">
          <Star className="w-3 h-3 mr-1" />
          已评分: {submission.score}分
        </Badge>
      );
    }
    if (submission.status === 'reviewed') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          待评分
        </Badge>
      );
    }
    return <Badge variant="secondary">{submission.status}</Badge>;
  };

  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const pendingCount = submissions.filter(s => s.status === 'reviewed').length;
  const avgScore = submissions.filter(s => s.score !== null).length > 0
    ? (submissions.filter(s => s.score !== null).reduce((sum, s) => sum + (s.score || 0), 0) / submissions.filter(s => s.score !== null).length).toFixed(1)
    : '-';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">作业不存在</p>
            <Button onClick={() => router.push('/dashboard')}>返回控制台</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 作业信息 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Award className="w-6 h-6" />
                  {assignment.title} - 评分
                </CardTitle>
                <CardDescription>
                  满分 {assignment.total_score} 分 | 截止日期: {assignment.due_date ? new Date(assignment.due_date).toLocaleString('zh-CN') : '无'}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => router.push(`/assignments/${assignmentId}/review`)}>
                查看审核
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{submissions.length}</div>
              <div className="text-sm text-gray-600">可评分提交</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600">{pendingCount}</div>
              <div className="text-sm text-gray-600">待评分</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{gradedCount}</div>
              <div className="text-sm text-gray-600">已评分</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{avgScore}</div>
              <div className="text-sm text-gray-600">平均分</div>
            </CardContent>
          </Card>
        </div>

        {/* 提交列表 */}
        <Card>
          <CardHeader>
            <CardTitle>学生提交列表</CardTitle>
            <CardDescription>点击评分按钮为学生打分</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无已通过审核的提交</p>
                <p className="text-sm mt-2">请先在审核页面通过学生的文件名审核</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>学号</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>文件</TableHead>
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
                      <TableCell>{submission.users.student_number || '-'}</TableCell>
                      <TableCell>
                        {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                        {submission.is_late && (
                          <span className="text-red-600 text-xs ml-2">迟交</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {submission.files?.length || 0} 个文件
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={submission.status === 'graded' ? 'outline' : 'default'}
                          onClick={() => openGradeDialog(submission)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          {submission.status === 'graded' ? '修改评分' : '评分'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 评分对话框 */}
        <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>为学生评分</DialogTitle>
              <DialogDescription>
                为 {selectedSubmission?.users.name} 的作业打分
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4">
                {/* 提交信息 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">提交的文件：</p>
                  <div className="mt-1 space-y-1">
                    {selectedSubmission.files?.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                  {selectedSubmission.content && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">提交说明：</p>
                      <p className="text-sm">{selectedSubmission.content}</p>
                    </div>
                  )}
                </div>

                {/* 评分 */}
                <div className="space-y-2">
                  <Label htmlFor="score">分数 (满分 {assignment.total_score})</Label>
                  <Input
                    id="score"
                    type="number"
                    placeholder={`0-${assignment.total_score}`}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    min="0"
                    max={assignment.total_score}
                  />
                </div>

                {/* 评语 */}
                <div className="space-y-2">
                  <Label htmlFor="feedback">评语（可选）</Label>
                  <Textarea
                    id="feedback"
                    placeholder="给学生的反馈和建议..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                取消
              </Button>
              <Button
                onClick={submitGrade}
                disabled={grading || !score}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {grading ? '保存中...' : '保存评分'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
