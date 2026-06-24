import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户的API密钥
export async function GET(request: NextRequest) {
  try {
    console.log('[API Key] GET request received');
    
    // 从header中获取session token
    const sessionToken = request.headers.get('x-session');
    if (!sessionToken) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证用户身份
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user) {
      console.error('[API Key] Auth error:', authError);
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    console.log('[API Key] User authenticated:', user.email);

    // 从数据库中获取用户的API密钥
    const { data, error } = await supabase
      .from('users')
      .select('api_key')
      .eq('email', user.email || '')
      .maybeSingle();

    if (error) {
      console.error('[API Key] Database query error:', error);
      return NextResponse.json({ error: '数据库查询失败', details: error.message }, { status: 500 });
    }

    console.log('[API Key] Success, returning API key');
    return NextResponse.json({ apiKey: data?.api_key || null });
  } catch (error) {
    console.error('[API Key] Unexpected error:', error);
    return NextResponse.json({ error: '服务器错误', details: String(error) }, { status: 500 });
  }
}

// 保存用户的API密钥
export async function POST(request: NextRequest) {
  try {
    // 从header中获取session token
    const sessionToken = request.headers.get('x-session');
    if (!sessionToken) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证用户身份
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user) {
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    // 获取请求体中的API密钥
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: '无效的API密钥' }, { status: 400 });
    }

    // 验证密钥格式（DeepSeek API密钥通常以sk-开头）
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'API密钥格式不正确，应以sk-开头' }, { status: 400 });
    }

    // 检查用户是否存在
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email || '')
      .maybeSingle();

    if (queryError) {
      return NextResponse.json({ error: '查询用户失败' }, { status: 500 });
    }

    if (!existingUser) {
      // 创建新用户记录
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          name: user.user_metadata?.name || user.email?.split('@')[0] || '用户',
          email: user.email || '',
          role: 'student',
          api_key: apiKey,
        });

      if (insertError) {
        return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
      }
    } else {
      // 更新现有用户的API密钥
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          api_key: apiKey,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email || '');

      if (updateError) {
        return NextResponse.json({ error: '更新密钥失败' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'API密钥已保存' });
  } catch (error) {
    console.error('保存API密钥失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除用户的API密钥
export async function DELETE(request: NextRequest) {
  try {
    // 从header中获取session token
    const sessionToken = request.headers.get('x-session');
    if (!sessionToken) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证用户身份
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user) {
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    // 删除数据库中的API密钥
    const { error } = await supabase
      .from('users')
      .update({ 
        api_key: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', user.email || '');

    if (error) {
      return NextResponse.json({ error: '删除密钥失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'API密钥已删除' });
  } catch (error) {
    console.error('删除API密钥失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}