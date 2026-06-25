'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Eye, EyeOff, User } from 'lucide-react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  // 个人信息
  const [name, setName] = useState('');
  const [qqNumber, setQqNumber] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initPage() {
    const supabase = await getSupabaseBrowserClientWithRetry();
    await checkAuth(supabase);
    await loadProfile(supabase);
    await loadApiKey(supabase);
  }

  async function checkAuth(supabase: SupabaseClient) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser({ id: session.user.id, email: session.user.email || '' });
  }

  async function loadProfile(supabase: SupabaseClient) {
    setProfileLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from('users')
        .select('name, qq_number')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userData) {
        setName(userData.name || '');
        setQqNumber(userData.qq_number || '');
      }
    } catch (error) {
      console.error('加载个人信息失败:', error);
    } finally {
      setProfileLoading(false);
    }
  }

  async function saveProfile() {
    if (!name.trim()) {
      setProfileMessage({ type: 'error', text: '姓名不能为空' });
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          qq_number: qqNumber.trim() || null,
        })
        .eq('id', authUser.id);

      if (error) {
        setProfileMessage({ type: 'error', text: '保存失败：' + error.message });
        return;
      }

      setProfileMessage({ type: 'success', text: '个人信息已保存！' });
    } catch (error) {
      setProfileMessage({ type: 'error', text: '保存时发生错误' });
    } finally {
      setProfileSaving(false);
    }
  }

  async function loadApiKey(supabase: SupabaseClient) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/settings/api-key', {
        headers: {
          'x-session': session.access_token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      }
    } catch (error) {
      console.error('加载API密钥失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveApiKey() {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: '请输入API密钥' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': session.access_token
        },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'API密钥已保存成功！' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存时发生错误' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
            <p className="text-gray-600 mt-2">配置您的API密钥和其他系统参数</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            返回控制台
          </Button>
        </div>

        {/* 个人信息 */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              个人信息
            </CardTitle>
            <CardDescription>
              修改您的姓名和联系方式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                  <span className="font-medium">邮箱：</span>{user?.email}
                  <span className="text-gray-400 ml-2">（邮箱不可修改）</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    placeholder="请输入姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qq">QQ号码</Label>
                  <Input
                    id="qq"
                    placeholder="用于接收文件通知"
                    value={qqNumber}
                    onChange={(e) => setQqNumber(e.target.value)}
                  />
                </div>

                {profileMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    profileMessage.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {profileMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-sm">{profileMessage.text}</span>
                  </div>
                )}

                <Button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {profileSaving ? '保存中...' : '保存个人信息'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* API密钥配置 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              DeepSeek API 配置
            </CardTitle>
            <CardDescription>
              配置您的DeepSeek API密钥，用于启用AI助手功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">加载中...</p>
              </div>
            ) : (
              <>
                {/* API密钥输入 */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API密钥</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    您可以在 
                    <a 
                      href="https://platform.deepseek.com/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline ml-1"
                    >
                      DeepSeek平台
                    </a>
                    获取API密钥
                  </p>
                </div>

                {/* 消息提示 */}
                {message && (
                  <div className={`flex items-center gap-2 p-4 rounded-lg ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                {/* 保存按钮 */}
                <div className="flex gap-4">
                  <Button 
                    onClick={saveApiKey} 
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? '保存中...' : '保存密钥'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setApiKey('');
                      setMessage(null);
                    }}
                  >
                    清除
                  </Button>
                </div>

                {/* 使用说明 */}
                <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">💡 使用说明</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• API密钥将安全存储在您的账户中</li>
                    <li>• 密钥仅用于AI助手功能，不会泄露给其他用户</li>
                    <li>• 配置完成后，AI助手将自动使用您的密钥</li>
                    <li>• 您可以随时更新或删除密钥</li>
                  </ul>
                </div>

                {/* 安全提示 */}
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 安全提示</h4>
                  <p className="text-sm text-yellow-800">
                    请妥善保管您的API密钥，不要分享给他人。密钥存储在数据库中，
                    使用加密保护，但仍建议定期更换密钥以确保安全。
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 修改密码 */}
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>更新您的登录密码</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              修改密码需要重新验证身份，请前往 Supabase 控制台或通过邮箱重置密码。
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const supabase = await getSupabaseBrowserClientWithRetry();
                  const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '');
                  if (error) {
                    toast.error('发送失败：' + error.message);
                  } else {
                    toast.success('重置密码邮件已发送到您的邮箱，请查收！');
                  }
                } catch {
                  toast.error('发送失败，请稍后重试');
                }
              }}
            >
              发送重置密码邮件
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}