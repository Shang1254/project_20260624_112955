'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, FileText, Copy, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface ClassInfo {
  id: string;
  name: string;
  description: string;
  code: string;
  teacher_id: string;
  is_active: boolean;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  student_number: string;
  role: string;
  joined_at: string;
  users: {
    name: string;
    email: string;
    qq_number?: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  status: string;
  description: string;
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadData = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 获取班级信息
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (!classData) {
        setError('班级不存在');
        return;
      }

      setClassInfo(classData);
      setIsTeacher(classData.teacher_id === user.id);

      // 获取班级成员
      const { data: memberData } = await supabase
        .from('class_members')
        .select('*, users(name, email, qq_number)')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('role', { ascending: false });

      setMembers((memberData || []) as Member[]);

      // 获取班级作业
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      setAssignments(assignmentData || []);

    } catch (err) {
      console.error('Load class detail error:', err);
      setError('加载班级信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const copyClassCode = async () => {
    if (!classInfo) return;
    try {
      await navigator.clipboard.writeText(classInfo.code);
      setCopied(true);
      toast.success('班级码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = classInfo.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('班级码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase
        .from('class_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) {
        toast.error('移除成员失败：' + error.message);
        return;
      }

      setMembers(members.filter(m => m.id !== memberId));
      toast.success(`已移除成员 "${memberName}"`);
    } catch (err) {
      console.error('Remove member error:', err);
      toast.error('移除成员失败');
    }
  };

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

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error || '班级不存在'}</p>
            <Button onClick={() => router.push('/dashboard')}>返回控制台</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentCount = members.filter(m => m.role === 'student').length;

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

        {/* 班级信息卡片 */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{classInfo.name}</CardTitle>
                  <CardDescription>{classInfo.description || '暂无描述'}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                  {classInfo.code}
                </Badge>
                <Button variant="outline" size="sm" onClick={copyClassCode}>
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{studentCount} 名学生</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{assignments.length} 次作业</span>
              </div>
              <div>
                <Badge variant={classInfo.is_active ? 'default' : 'secondary'}>
                  {classInfo.is_active ? '活跃' : '已停用'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              成员 ({studentCount})
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <FileText className="w-4 h-4 mr-2" />
              作业 ({assignments.length})
            </TabsTrigger>
          </TabsList>

          {/* 成员列表 */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>班级成员</CardTitle>
                <CardDescription>
                  {isTeacher ? '管理班级成员，可以移除学生' : '查看班级成员列表'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无成员</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>学号</TableHead>
                        <TableHead>QQ号</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>加入时间</TableHead>
                        {isTeacher && <TableHead>操作</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.users?.name || '未知'}
                          </TableCell>
                          <TableCell>{member.users?.email || '-'}</TableCell>
                          <TableCell>{member.student_number || '-'}</TableCell>
                          <TableCell>{member.users?.qq_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={member.role === 'teacher' ? 'default' : 'outline'}>
                              {member.role === 'teacher' ? '教师' : '学生'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          {isTeacher && member.role === 'student' && (
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeMember(member.id, member.users?.name || '')}
                              >
                                移除
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 作业列表 */}
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>班级作业</CardTitle>
                    <CardDescription>查看本班级发布的所有作业</CardDescription>
                  </div>
                  {isTeacher && (
                    <Button onClick={() => router.push('/assignments/create')}>
                      发布作业
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无作业</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => {
                      const isExpired = assignment.due_date && new Date(assignment.due_date) < new Date();
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{assignment.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {assignment.due_date && (
                                <span className={isExpired ? 'text-red-500' : ''}>
                                  截止: {new Date(assignment.due_date).toLocaleString('zh-CN')}
                                </span>
                              )}
                              <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {assignment.status === 'active' ? '进行中' : assignment.status === 'closed' ? '已关闭' : '已归档'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isTeacher && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/assignments/${assignment.id}/review`)}
                                >
                                  审核
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/assignments/${assignment.id}/statistics`)}
                                >
                                  统计
                                </Button>
                              </>
                            )}
                            {!isTeacher && (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/assignments/${assignment.id}/submit`)}
                              >
                                提交
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
