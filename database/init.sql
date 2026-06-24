-- ============================================
-- 智能班级管理系统 - 数据库初始化脚本
-- ============================================
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本

-- 1. 用户表（教师和学生）
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'student', -- teacher 或 student
    qq_number VARCHAR(20), -- QQ号用于发送文件
    api_key TEXT, -- DeepSeek API密钥
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- 2. 班级表
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    teacher_id VARCHAR(36) NOT NULL REFERENCES users(id),
    code VARCHAR(20) NOT NULL UNIQUE, -- 班级邀请码
    is_active BOOLEAN DEFAULT true NOT NULL,
    settings JSONB, -- 班级设置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_code_idx ON classes(code);

-- 3. 班级成员表
CREATE TABLE IF NOT EXISTS class_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(50), -- 学号
    role VARCHAR(20) NOT NULL DEFAULT 'student', -- 在班级中的角色
    is_active BOOLEAN DEFAULT true NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS class_members_class_id_idx ON class_members(class_id);
CREATE INDEX IF NOT EXISTS class_members_user_id_idx ON class_members(user_id);
CREATE INDEX IF NOT EXISTS class_members_class_user_idx ON class_members(class_id, user_id);

-- 4. 作业表
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements JSONB, -- 作业要求（文件格式、大小限制等）
    file_name_template VARCHAR(255), -- 文件名模板，例如：学号_姓名_作业名称.docx
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, closed, archived
    total_score INTEGER DEFAULT 100,
    allow_late_submission BOOLEAN DEFAULT false,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS assignments_class_id_idx ON assignments(class_id);
CREATE INDEX IF NOT EXISTS assignments_status_idx ON assignments(status);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON assignments(due_date);
CREATE INDEX IF NOT EXISTS assignments_class_status_idx ON assignments(class_id, status);

-- 5. 作业提交表
CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    content TEXT, -- 提交的内容（文本描述）
    files JSONB, -- 提交的文件列表
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review', -- pending_review, reviewed, rejected, graded, late
    score INTEGER,
    feedback TEXT, -- 教师或班长反馈
    reviewer_id VARCHAR(36) REFERENCES users(id), -- 审核人（班长）
    is_late BOOLEAN DEFAULT false,
    file_name_valid BOOLEAN DEFAULT null, -- 文件名是否合规
    file_name_error TEXT, -- 文件名错误信息
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE -- 审核时间
);

CREATE INDEX IF NOT EXISTS submissions_assignment_id_idx ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS submissions_user_id_idx ON submissions(user_id);
CREATE INDEX IF NOT EXISTS submissions_class_id_idx ON submissions(class_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status);
CREATE INDEX IF NOT EXISTS submissions_assignment_user_idx ON submissions(assignment_id, user_id);
CREATE INDEX IF NOT EXISTS submissions_file_name_valid_idx ON submissions(file_name_valid);

-- 6. AI对话记录表
CREATE TABLE IF NOT EXISTS ai_conversations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    context JSONB, -- 对话上下文
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);

-- 7. AI消息表
CREATE TABLE IF NOT EXISTS ai_messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(36) NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user 或 assistant
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);

-- ============================================
-- 启用 Row Level Security (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 创建 RLS 策略
-- ============================================

-- users 表策略
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
USING (auth.uid()::text = id);

CREATE POLICY "Teachers can view all users in their classes"
ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE cm.user_id = auth.uid()::text
        AND c.teacher_id = users.id
    )
);

-- classes 表策略
CREATE POLICY "Teachers can view their own classes"
ON classes FOR SELECT
USING (teacher_id = auth.uid()::text);

CREATE POLICY "Students can view classes they belong to"
ON classes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members
        WHERE class_id = classes.id
        AND user_id = auth.uid()::text
        AND is_active = true
    )
);

CREATE POLICY "Teachers can create classes"
ON classes FOR INSERT
WITH CHECK (teacher_id = auth.uid()::text);

CREATE POLICY "Teachers can update their own classes"
ON classes FOR UPDATE
USING (teacher_id = auth.uid()::text);

-- class_members 表策略
CREATE POLICY "Class members can view active members"
ON class_members FOR SELECT
USING (is_active = true);

CREATE POLICY "Teachers can manage class members"
ON class_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_members.class_id
        AND classes.teacher_id = auth.uid()::text
    )
);

-- assignments 表策略
CREATE POLICY "Anyone in class can view assignments"
ON assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members
        WHERE class_id = assignments.class_id
        AND user_id = auth.uid()::text
        AND is_active = true
    )
);

CREATE POLICY "Teachers can create assignments"
ON assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = assignments.class_id
        AND classes.teacher_id = auth.uid()::text
    )
);

CREATE POLICY "Teachers can update assignments"
ON assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = assignments.class_id
        AND classes.teacher_id = auth.uid()::text
    )
);

-- submissions 表策略
CREATE POLICY "Students can view their own submissions"
ON submissions FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Teachers can view all submissions in their classes"
ON submissions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE a.id = submissions.assignment_id
        AND c.teacher_id = auth.uid()::text
    )
);

CREATE POLICY "Students can create submissions"
ON submissions FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Students can update their own submissions"
ON submissions FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "Teachers can grade submissions"
ON submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE a.id = submissions.assignment_id
        AND c.teacher_id = auth.uid()::text
    )
);

-- ai_conversations 表策略
CREATE POLICY "Users can view their own conversations"
ON ai_conversations FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create conversations"
ON ai_conversations FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own conversations"
ON ai_conversations FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own conversations"
ON ai_conversations FOR DELETE
USING (user_id = auth.uid()::text);

-- ai_messages 表策略
CREATE POLICY "Users can view messages in their conversations"
ON ai_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM ai_conversations
        WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can create messages in their conversations"
ON ai_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM ai_conversations
        WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()::text
    )
);

-- ============================================
-- 完成！
-- ============================================
