-- ============================================
-- 生产环境部署配置脚本
-- ============================================

-- 1. 添加教师管理相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100); -- 院系/部门
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(50); -- 职称

-- 2. 添加系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_assignment_size', '{"value": 100, "unit": "MB"}', '单个作业最大文件大小'),
('enable_email_confirmation', '{"value": true}', '是否启用邮箱确认'),
('max_classes_per_teacher', '{"value": 10}', '每位教师最多创建的班级数'),
('file_retention_days', '{"value": 365}', '文件保留天数')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. 添加操作日志表
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- create, update, delete, login, upload
    resource_type VARCHAR(50), -- assignment, submission, class
    resource_id VARCHAR(36),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at);

-- 4. 添加班级归档功能
ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_by VARCHAR(36) REFERENCES users(id);

-- 5. 性能优化索引
CREATE INDEX IF NOT EXISTS assignments_class_created_idx ON assignments(class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_assignment_status_idx ON submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS class_members_class_role_idx ON class_members(class_id, role);

-- 6. 创建视图用于统计
CREATE OR REPLACE VIEW teacher_statistics AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT c.id) as class_count,
    COUNT(DISTINCT a.id) as assignment_count,
    COUNT(DISTINCT s.id) as submission_count
FROM users u
LEFT JOIN classes c ON c.teacher_id = u.id AND c.is_active = true
LEFT JOIN assignments a ON a.class_id = c.id
LEFT JOIN submissions s ON s.assignment_id = a.id
WHERE u.role = 'teacher'
GROUP BY u.id, u.name, u.email;

-- 完成
SELECT '生产环境配置完成！' as message;
