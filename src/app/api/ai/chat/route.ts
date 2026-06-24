import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    // 从header中获取session token
    const sessionToken = request.headers.get('x-session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: '请先登录后再使用AI助手' },
        { status: 401 }
      );
    }

    // 验证用户身份
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户验证失败，请重新登录' },
        { status: 401 }
      );
    }

    // 从数据库中获取用户的API密钥
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('api_key')
      .eq('email', user.email || '')
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        { error: '数据库查询失败' },
        { status: 500 }
      );
    }

    const apiKey = userData?.api_key;

    if (!apiKey) {
      return NextResponse.json(
        { error: '请先在设置页面配置您的DeepSeek API密钥', needConfig: true },
        { status: 400 }
      );
    }

    // 获取请求体中的消息
    const body = await request.json();
    const { message, context, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 使用用户的API密钥创建客户端
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
    // 创建自定义配置，使用用户的API密钥
    const config = new Config();
    // 注意：coze-coding-dev-sdk可能需要特定的配置方式来使用自定义密钥
    // 这里我们假设Config可以接受apiKey参数
    
    const client = new LLMClient(config, customHeaders);

    // 构建系统提示词
    const systemPrompt = context === 'teacher_mode' 
      ? `你是智能班级管理系统的AI助手，专门为教师提供服务。
你的能力包括：
1. 生成教案和教学计划
2. 分析学生作业完成情况
3. 提供教学建议和方法
4. 解答教学相关问题
5. 生成考试题目和练习题

请用专业、简洁、友好的语言回答教师的问题。`
      : `你是智能班级管理系统的AI助手，专门为学生提供服务。
你的能力包括：
1. 解答学习相关问题
2. 提供学习方法和建议
3. 帮助理解课程内容
4. 提供复习和练习指导
5. 分析学习进度和薄弱点

请用亲切、鼓励性的语言回答学生的问题，帮助他们更好地学习。`;

    // 构建消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 添加历史消息
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message });

    // 使用流式输出
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(text));
            }
          }
          
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode('抱歉，AI助手暂时无法响应。请检查您的API密钥是否正确。'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'AI对话服务暂时不可用' },
      { status: 500 }
    );
  }
}