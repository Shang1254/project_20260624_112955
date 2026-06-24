-- ============================================
-- 数据库更新脚本 - 添加班长作业审核功能
-- ============================================
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本

-- 1. 为 assignments 表添加文件名模板字段
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS file_name_template VARCHAR(255);

-- 2. 为 submissions 表添加审核相关字段
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(36) REFERENCES users(id),
ADD COLUMN IF NOT EXISTS file_name_valid BOOLEAN DEFAULT null,
ADD COLUMN IF NOT EXISTS file_name_error TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 3. 更新默认状态
ALTER TABLE submissions 
ALTER COLUMN status SET DEFAULT 'pending_review';

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS submissions_file_name_valid_idx ON submissions(file_name_valid);
CREATE INDEX IF NOT EXISTS submissions_reviewer_id_idx ON submissions(reviewer_id);

-- 5. 更新 RLS 策略，允许班长审核作业
CREATE POLICY "Class monitors can review submissions"
ON submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = submissions.class_id
        AND cm.user_id = auth.uid()::text
        AND cm.role = 'monitor'
        AND cm.is_active = true
    )
);

CREATE POLICY "Class monitors can update review status"
ON submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = submissions.class_id
        AND cm.user_id = auth.uid()::text
        AND cm.role = 'monitor'
        AND cm.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = submissions.class_id
        AND cm.user_id = auth.uid()::text
        AND cm.role = 'monitor'
        AND cm.is_active = true
    )
);

-- 完成！
SELECT '数据库更新完成！新增字段：file_name_template, reviewer_id, file_name_valid, file_name_error, reviewed_at' AS message;
