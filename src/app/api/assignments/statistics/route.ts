import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: '作业ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取作业信息
    const { data: assignment, error: assignmentError } = await client
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '作业不存在' },
        { status: 404 }
      );
    }

    // 获取班级成员列表
    const { data: members, error: membersError } = await client
      .from('class_members')
      .select('user_id, users(name, email, qq_number)')
      .eq('class_id', assignment.class_id)
      .eq('is_active', true)
      .eq('role', 'student');

    if (membersError) {
      return NextResponse.json(
        { error: '获取班级成员失败' },
        { status: 500 }
      );
    }

    // 获取已提交的学生ID列表
    const { data: submissions, error: submissionsError } = await client
      .from('submissions')
      .select('user_id')
      .eq('assignment_id', assignmentId);

    if (submissionsError) {
      return NextResponse.json(
        { error: '获取提交记录失败' },
        { status: 500 }
      );
    }

    const submittedUserIds = new Set(submissions?.map(s => s.user_id) || []);

    // 统计未提交学生
    const unsubmittedStudents = members?.filter(m => 
      !submittedUserIds.has(m.user_id)
    ).map(m => {
      const user = m.users as unknown as { name?: string; email?: string; qq_number?: string } | null;
      return {
        id: m.user_id,
        name: user?.name || '未知',
        email: user?.email || '',
        qq_number: user?.qq_number || null,
      };
    }) || [];

    const submittedStudents = members?.filter(m => 
      submittedUserIds.has(m.user_id)
    ).map(m => {
      const user = m.users as unknown as { name?: string; email?: string; qq_number?: string } | null;
      return {
        id: m.user_id,
        name: user?.name || '未知',
        email: user?.email || '',
        qq_number: user?.qq_number || null,
      };
    }) || [];

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        due_date: assignment.due_date,
      },
      statistics: {
        total: members?.length || 0,
        submitted: submittedStudents.length,
        unsubmitted: unsubmittedStudents.length,
        submission_rate: members?.length ? 
          ((submittedStudents.length / members.length) * 100).toFixed(1) : '0',
      },
      submitted_students: submittedStudents,
      unsubmitted_students: unsubmittedStudents,
    });

  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { error: '获取统计信息失败' },
      { status: 500 }
    );
  }
}