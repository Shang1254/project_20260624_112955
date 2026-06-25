-- ============================================
-- 智能班级管理系统 - 生产环境补充脚本
-- ============================================
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- 用于补充 init.sql 中缺少的字段、触发器和索引

-- 1. 为 users 表添加 student_number 字段（学号）
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_number VARCHAR(50);
CREATE INDEX IF NOT EXISTS users_student_number_idx ON users(student_number);

-- 2. 自动更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 为需要 updated_at 的表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 补充：允许教师查看自己班级所有学生的提交
CREATE POLICY "Teachers can view submissions in their assignments"
ON submissions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE a.id = submissions.assignment_id
        AND c.teacher_id = auth.uid()::text
    )
);

-- 5. 补充：学生可以查看同班级成员（用于协作）
CREATE POLICY "Students can view classmates"
ON class_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()::text
        AND cm.is_active = true
    )
);

-- 6. 补充：学生可以查看同班级成员的 users 信息（用于查看同学）
CREATE POLICY "Users can view classmates info"
ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm1
        JOIN class_members cm2 ON cm2.class_id = cm1.class_id
        WHERE cm1.user_id = auth.uid()::text
        AND cm1.is_active = true
        AND cm2.user_id = users.id
        AND cm2.is_active = true
    )
);

-- ============================================
-- 完成！
-- ============================================
