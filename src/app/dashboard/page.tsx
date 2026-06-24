'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  MessageSquare,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  qq_number?: string;
}

interface Class {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacher_id: string;
  member_count?: number;
}

interface Assignment {
  id: string;
  title: string;
  class_id: string;
  due_date?: string;
  status: string;
  submitted_count?: number;
  total_count?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      
      // 获取用户信息
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/login');
        return;
      }

      // 从数据库获取用户详细信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) {
        console.error('Failed to fetch user:', userError);
      }

      const currentUser = userData || {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || '未设置',
        role: authUser.user_metadata?.role || 'student',
        qq_number: authUser.user_metadata?.qq_number,
      };

      setUser(currentUser);

      // 加载班级数据
      if (currentUser.role === 'teacher') {
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', currentUser.id)
          .eq('is_active', true);
        setClasses(classData || []);
      } else {
        const { data: memberData } = await supabase
          .from('class_members')
          .select('class_id, classes(*)')
          .eq('user_id', currentUser.id)
          .eq('is_active', true);
        
        const studentClasses = memberData?.map(m => {
          const classData = m.classes;
          return classData as unknown as Class;
        }) || [];
        setClasses(studentClasses);
      }

      // 加载作业数据
      if (classes.length > 0) {
        const classIds = classes.map(c => c.id);
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('*')
          .in('class_id', classIds)
          .eq('status', 'active')
          .order('due_date', { ascending: true });
        setAssignments(assignmentData || []);
      }

    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getSubmissionStats = (assignment: Assignment) => {
    const submitted = assignment.submitted_count || 0;
    const total = assignment.total_count || 0;
    const pending = total - submitted;
    return { submitted, pending, total };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">智能班级管理系统</h1>
              <p className="text-sm text-gray-500">
                {user?.role === 'teacher' ? '教师端' : '学生端'} · {user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user?.qq_number && (
              <Badge variant="outline" className="text-gray-600">
                QQ: {user.qq_number}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">
              <BookOpen className="w-4 h-4 mr-2" />
              总览
            </TabsTrigger>
            <TabsTrigger value="classes">
              <Users className="w-4 h-4 mr-2" />
              班级
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <FileText className="w-4 h-4 mr-2" />
              作业
            </TabsTrigger>
            <TabsTrigger value="ai">
              <MessageSquare className="w-4 h-4 mr-2" />
              AI助手
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">班级数量</CardTitle>
                  <Users className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classes.length}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {user?.role === 'teacher' ? '管理的班级' : '加入的班级'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">活跃作业</CardTitle>
                  <FileText className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignments.length}</div>
                  <p className="text-xs text-gray-500 mt-1">待处理作业</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">即将截止</CardTitle>
                  <Clock className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {assignments.filter(a => {
                      if (!a.due_date) return false;
                      const due = new Date(a.due_date);
                      const now = new Date();
                      const diff = due.getTime() - now.getTime();
                      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7天内
                    }).length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">7天内截止</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">未提交统计</CardTitle>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {user?.role === 'teacher' ? 
                      assignments.reduce((sum, a) => sum + (a.total_count || 0) - (a.submitted_count || 0), 0) :
                      assignments.filter(a => {
                        // 检查学生是否已提交
                        return true; // 暂时显示为待检查
                      }).length
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {user?.role === 'teacher' ? '学生未提交总数' : '待提交作业'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
                <CardDescription>常用功能入口</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {user?.role === 'teacher' && (
                  <>
                    <Button 
                      className="h-auto py-4 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => router.push('/classes/create')}
                    >
                      <Users className="w-6 h-6" />
                      <span>创建班级</span>
                    </Button>
                    <Button 
                      className="h-auto py-4 flex flex-col gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => router.push('/assignments/create')}
                    >
                      <FileText className="w-6 h-6" />
                      <span>发布作业</span>
                    </Button>
                    <Button 
                      className="h-auto py-4 flex flex-col gap-2 bg-orange-600 hover:bg-orange-700"
                      onClick={() => router.push('/assignments/statistics')}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>查看统计</span>
                    </Button>
                  </>
                )}
                <Button 
                  className="h-auto py-4 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700"
                  onClick={() => router.push('/ai-assistant')}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span>AI助手</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">班级列表</h2>
              {user?.role === 'teacher' && (
                <Button onClick={() => router.push('/classes/create')}>
                  创建班级
                </Button>
              )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {classItem.name}
                      <Badge variant="outline">{classItem.code}</Badge>
                    </CardTitle>
                    <CardDescription>{classItem.description || '暂无描述'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{classItem.member_count || 0} 名成员</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => router.push(`/classes/${classItem.id}`)}
                    >
                      查看详情
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {classes.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">暂无班级</p>
                  {user?.role === 'teacher' ? (
                    <Button onClick={() => router.push('/classes/create')}>
                      创建第一个班级
                    </Button>
                  ) : (
                    <Button onClick={() => router.push('/classes/join')}>
                      加入班级
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">作业列表</h2>
              {user?.role === 'teacher' && (
                <Button onClick={() => router.push('/assignments/create')}>
                  发布作业
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              {assignments.map((assignment) => {
                const stats = getSubmissionStats(assignment);
                const isNearDue = assignment.due_date && 
                  new Date(assignment.due_date).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
                
                return (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{assignment.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {assignment.due_date && (
                              <span className={`flex items-center gap-1 ${isNearDue ? 'text-orange-600' : ''}`}>
                                <Clock className="w-4 h-4" />
                                截止: {new Date(assignment.due_date).toLocaleDateString('zh-CN')}
                              </span>
                            )}
                            <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                              {assignment.status === 'active' ? '进行中' : '已结束'}
                            </Badge>
                          </div>
                        </div>
                        
                        {user?.role === 'teacher' && (
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              已提交：<span className="text-green-600 font-semibold">{stats.submitted}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              未提交：<span className="text-red-600 font-semibold">{stats.pending}</span>
                            </div>
                            <div className="flex gap-2 mt-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/assignments/${assignment.id}/review`)}
                              >
                                审核文件名
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/assignments/${assignment.id}/statistics`)}
                              >
                                查看详情
                              </Button>
                            </div>
                          </div>
                        )}

                        {user?.role === 'student' && (
                          <Button 
                            onClick={() => router.push(`/assignments/${assignment.id}/submit`)}
                          >
                            提交作业
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {assignments.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无作业</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  AI 智能助手
                </CardTitle>
                <CardDescription>
                  基于DeepSeek的智能助手，可帮助您解答教学相关问题、生成教案、分析作业数据等
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => router.push('/ai-assistant')}
                >
                  进入AI助手
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}