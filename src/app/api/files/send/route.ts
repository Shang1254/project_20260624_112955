import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
// Note: archiver module declaration needed - install @types/archiver for full type support

// 注意：此API需要配置邮件服务才能使用
// 实际部署时需要集成SMTP服务或其他邮件发送服务

export async function POST(request: NextRequest) {
  try {
    // 身份验证
    const sessionToken = request.headers.get('x-session');
    if (!sessionToken) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const authClient = getSupabaseClient(sessionToken);
    const { data: { user }, error: authError } = await authClient.auth.getUser(sessionToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户验证失败' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assignmentId, teacherQQ, fileName } = body;

    if (!assignmentId || !teacherQQ) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取作业提交的文件列表
    const { data: submissions, error: submissionsError } = await client
      .from('submissions')
      .select('id, user_id, files, users(name)')
      .eq('assignment_id', assignmentId)
      .not('files', 'is', null);

    if (submissionsError) {
      return NextResponse.json(
        { error: '获取提交记录失败' },
        { status: 500 }
      );
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: '暂无提交文件' },
        { status: 400 }
      );
    }

    // TODO: 实际的文件压缩和发送逻辑
    // 这里需要：
    // 1. 从存储服务获取文件
    // 2. 使用archiver压缩文件
    // 3. 通过SMTP或其他服务发送邮件到QQ邮箱

    // 模拟响应（实际部署时需要替换为真实实现）
    const fileInfo = {
      assignmentId,
      submissionCount: submissions.length,
      fileList: submissions.map(s => {
        const user = s.users as unknown as { name?: string } | null;
        return {
          studentName: user?.name || '未知',
          files: s.files,
        };
      }),
    };

    // 返回文件信息，前端可以让用户下载压缩包
    return NextResponse.json({
      success: true,
      message: '已准备好文件压缩包',
      fileInfo,
      downloadUrl: `/api/files/download?assignmentId=${assignmentId}`,
      // QQ邮箱发送提示
      qqEmailHint: `${teacherQQ}@qq.com`,
    });

  } catch (error) {
    console.error('Send files error:', error);
    return NextResponse.json(
      { error: '发送文件失败' },
      { status: 500 }
    );
  }
}

// 文件下载API（实际部署时需要实现）
export async function GET(request: NextRequest) {
  // 身份验证
  const sessionToken = request.headers.get('x-session');
  if (!sessionToken) {
    return NextResponse.json(
      { error: '请先登录' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json(
      { error: '缺少作业ID' },
      { status: 400 }
    );
  }

  // TODO: 实际的文件压缩和下载逻辑
  // 这里需要：
  // 1. 获取所有提交的文件
  // 2. 创建压缩包
  // 3. 返回文件流

  return NextResponse.json({
    message: '文件下载功能需要配置存储服务后才能使用',
    hint: '请联系管理员配置文件存储服务',
  });
}