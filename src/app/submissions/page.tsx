'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, CheckCircle2, XCircle, Clock, Star, AlertCircle, ClockIcon } from 'lucide-react';

interface SubmissionRecord {
  id: string;
  assignment_id: string;
  status: string;
  score: number | null;
  feedback: string;
  is_late: boolean;
  file_name_valid: boolean | null;
  file_name_error: string;
  submitted_at: string;
  reviewed_at: string;
  files: { name: string; size: number }[];
  assignments: {
    id: string;
    title: string;
    due_date: string;
    total_score: number;
    classes: {
      name: string;
    };
  };
}

export default function MySubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubmissions = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select('*, assignments(id, title, due_date, total_score, classes(name))')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (fetchError) {
        setError('加载提交记录失败：' + fetchError.message);
        return;
      }

      setSubmissions((data || []) as unknown as SubmissionRecord[]);
    } catch (err) {
      console.error('Load submissions error:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (sub: SubmissionRecord) => {
    switch (sub.status) {
      case 'pending_review':
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            待审核
          </Badge>
        );
      case 'reviewed':
        return (
          <Badge className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            审核通过
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            已驳回
          </Badge>
        );
      case 'graded':
        return (
          <Badge className="bg-purple-600">
            <Star className="w-3 h-3 mr-1" />
            已评分: {sub.score}分
          </Badge>
        );
      default:
        return <Badge variant="secondary">{sub.status}</Badge>;
    }
  };

  const graded = submissions.filter(s => s.status === 'graded');
  const pending = submissions.filter(s => s.status === 'pending_review' || s.status === 'reviewed');
  const rejected = submissions.filter(s => s.status === 'rejected');
  const avgScore = graded.length > 0
    ? (graded.reduce((sum, s) => sum + (s.score || 0), 0) / graded.length).toFixed(1)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">我的提交记录</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 统计概览 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{submissions.length}</div>
              <div className="text-sm text-gray-600">总提交</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{pending.length}</div>
              <div className="text-sm text-gray-600">待审核</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-red-600">{rejected.length}</div>
              <div className="text-sm text-gray-600">已驳回</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{avgScore}</div>
              <div className="text-sm text-gray-600">平均分</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">全部 ({submissions.length})</TabsTrigger>
            <TabsTrigger value="pending">待审核 ({pending.length})</TabsTrigger>
            <TabsTrigger value="graded">已评分 ({graded.length})</TabsTrigger>
            <TabsTrigger value="rejected">已驳回 ({rejected.length})</TabsTrigger>
          </TabsList>

          {[
            { key: 'all', data: submissions },
            { key: 'pending', data: pending },
            { key: 'graded', data: graded },
            { key: 'rejected', data: rejected },
          ].map(({ key, data }) => (
            <TabsContent key={key} value={key}>
              {data.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无记录</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.map((sub) => {
                    const isOverdue = sub.assignments.due_date && new Date(sub.assignments.due_date) < new Date(sub.submitted_at);
                    return (
                      <Card key={sub.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{sub.assignments.title}</h3>
                                {getStatusBadge(sub)}
                                {sub.is_late && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    迟交
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>{sub.assignments.classes?.name}</span>
                                <span>提交时间: {new Date(sub.submitted_at).toLocaleString('zh-CN')}</span>
                                <span>{sub.files?.length || 0} 个文件</span>
                              </div>

                              {/* 驳回原因 */}
                              {sub.status === 'rejected' && sub.file_name_error && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 border border-red-200">
                                  <strong>驳回原因：</strong>{sub.file_name_error}
                                </div>
                              )}

                              {/* 教师评语 */}
                              {sub.status === 'graded' && sub.feedback && (
                                <div className="mt-2 p-2 bg-purple-50 rounded text-sm text-purple-700 border border-purple-200">
                                  <strong>教师评语：</strong>{sub.feedback}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/assignments/${sub.assignment_id}/submit`)}
                            >
                              查看详情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
