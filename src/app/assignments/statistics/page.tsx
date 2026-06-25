'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, FileText, Download, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  email: string;
  qq_number?: string;
}

interface Statistics {
  total: number;
  submitted: number;
  unsubmitted: number;
  submission_rate: string;
}

export default function AssignmentStatisticsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Array<{
    id: string;
    title: string;
    class_id: string;
    due_date?: string;
  }>>([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [submittedStudents, setSubmittedStudents] = useState<Student[]>([]);
  const [unsubmittedStudents, setUnsubmittedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherQQ, setTeacherQQ] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      loadStatistics(selectedAssignment);
    }
  }, [selectedAssignment]);

  const loadAssignments = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id, title, class_id, due_date')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      setAssignments(assignmentData || []);
      
      if (assignmentData && assignmentData.length > 0) {
        setSelectedAssignment(assignmentData[0].id);
      }
    } catch (err) {
      console.error('Load assignments error:', err);
    }
  };

  const loadStatistics = async (assignmentId: string) => {
    setIsLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/assignments/statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'x-session': session.access_token } : {}),
        },
        body: JSON.stringify({ assignmentId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatistics(data.statistics);
        setSubmittedStudents(data.submitted_students);
        setUnsubmittedStudents(data.unsubmitted_students);
      } else {
        console.error('Load statistics error:', data.error);
      }
    } catch (err) {
      console.error('Load statistics error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFiles = async () => {
    if (!teacherQQ) {
      toast.error('请输入QQ号');
      return;
    }

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/files/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'x-session': session.access_token } : {}),
        },
        body: JSON.stringify({
          assignmentId: selectedAssignment,
          teacherQQ,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`文件已准备好！请发送到 ${data.qqEmailHint}`);
        window.open(data.downloadUrl, '_blank');
      } else {
        toast.error('发送失败：' + data.error);
      }
    } catch (err) {
      console.error('Send files error:', err);
      toast.error('发送失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              作业提交统计
            </CardTitle>
            <CardDescription>
              查看作业完成情况，统计未提交学生
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择作业</label>
                <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择作业" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title} {a.due_date && `(截止: ${new Date(a.due_date).toLocaleDateString('zh-CN')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">加载统计数据...</p>
          </div>
        )}

        {!isLoading && statistics && (
          <>
            {/* 统计概览 */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">总学生数</div>
                  <div className="text-2xl font-bold">{statistics.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">已提交</div>
                  <div className="text-2xl font-bold text-green-600">{statistics.submitted}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">未提交</div>
                  <div className="text-2xl font-bold text-red-600">{statistics.unsubmitted}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">提交率</div>
                  <div className="text-2xl font-bold">{statistics.submission_rate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* 学生列表 */}
            <Tabs defaultValue="unsubmitted" className="space-y-4">
              <TabsList>
                <TabsTrigger value="unsubmitted">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                  未提交 ({statistics.unsubmitted})
                </TabsTrigger>
                <TabsTrigger value="submitted">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  已提交 ({statistics.submitted})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="unsubmitted">
                <Card>
                  <CardContent className="py-4">
                    {unsubmittedStudents.length > 0 ? (
                      <div className="space-y-2">
                        {unsubmittedStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.email}</div>
                              </div>
                            </div>
                            {student.qq_number && (
                              <Badge variant="outline">QQ: {student.qq_number}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p>所有学生都已提交！</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="submitted">
                <Card>
                  <CardContent className="py-4">
                    {submittedStudents.length > 0 ? (
                      <div className="space-y-2">
                        {submittedStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.email}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        暂无学生提交
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 文件发送功能 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  发送提交文件
                </CardTitle>
                <CardDescription>
                  将学生提交的文件打包发送给老师
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    此功能需要配置邮件服务才能正常使用。您可以将文件下载后，手动发送到老师的QQ邮箱。
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">老师的QQ号</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="请输入QQ号"
                      value={teacherQQ}
                      onChange={(e) => setTeacherQQ(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSendFiles}
                    disabled={!teacherQQ}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载文件包
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}