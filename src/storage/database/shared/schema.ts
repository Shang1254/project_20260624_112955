import { pgTable, serial, timestamp, varchar, text, boolean, integer, index, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统表 - 必须保留
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表（教师和学生）
export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 128 }).notNull(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		role: varchar("role", { length: 20 }).notNull().default("student"), // teacher 或 student
		qq_number: varchar("qq_number", { length: 20 }), // QQ号用于发送文件
		api_key: text("api_key"), // DeepSeek API密钥（加密存储）
		avatar_url: text("avatar_url"),
		is_active: boolean("is_active").default(true).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("users_email_idx").on(table.email),
		index("users_role_idx").on(table.role),
	]
);

// 班级表
export const classes = pgTable(
	"classes",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		name: varchar("name", { length: 128 }).notNull(),
		description: text("description"),
		teacher_id: varchar("teacher_id", { length: 36 }).notNull().references(() => users.id),
		code: varchar("code", { length: 20 }).notNull().unique(), // 班级邀请码
		is_active: boolean("is_active").default(true).notNull(),
		settings: jsonb("settings"), // 班级设置
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("classes_teacher_id_idx").on(table.teacher_id),
		index("classes_code_idx").on(table.code),
	]
);

// 班级成员表
export const classMembers = pgTable(
	"class_members",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		class_id: varchar("class_id", { length: 36 }).notNull().references(() => classes.id, { onDelete: "cascade" }),
		user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		student_number: varchar("student_number", { length: 50 }), // 学号
		role: varchar("role", { length: 20 }).notNull().default("student"), // 在班级中的角色
		is_active: boolean("is_active").default(true).notNull(),
		joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("class_members_class_id_idx").on(table.class_id),
		index("class_members_user_id_idx").on(table.user_id),
		index("class_members_class_user_idx").on(table.class_id, table.user_id),
	]
);

// 作业表
export const assignments = pgTable(
	"assignments",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		class_id: varchar("class_id", { length: 36 }).notNull().references(() => classes.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description"),
		requirements: jsonb("requirements"), // 作业要求（文件格式、大小限制等）
		file_name_template: varchar("file_name_template", { length: 255 }), // 文件名模板，例如：学号_姓名_作业名称.docx
		due_date: timestamp("due_date", { withTimezone: true }),
		status: varchar("status", { length: 20 }).notNull().default("active"), // active, closed, archived
		total_score: integer("total_score").default(100),
		allow_late_submission: boolean("allow_late_submission").default(false),
		created_by: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("assignments_class_id_idx").on(table.class_id),
		index("assignments_status_idx").on(table.status),
		index("assignments_due_date_idx").on(table.due_date),
		index("assignments_class_status_idx").on(table.class_id, table.status),
	]
);

// 作业提交表
export const submissions = pgTable(
	"submissions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		assignment_id: varchar("assignment_id", { length: 36 }).notNull().references(() => assignments.id, { onDelete: "cascade" }),
		user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		class_id: varchar("class_id", { length: 36 }).notNull().references(() => classes.id, { onDelete: "cascade" }),
		content: text("content"), // 提交的内容（文本描述）
		files: jsonb("files"), // 提交的文件列表
		status: varchar("status", { length: 20 }).notNull().default("pending_review"), // pending_review, reviewed, rejected, graded, late
		score: integer("score"),
		feedback: text("feedback"), // 教师或班长反馈
		reviewer_id: varchar("reviewer_id", { length: 36 }).references(() => users.id), // 审核人（班长）
		is_late: boolean("is_late").default(false),
		file_name_valid: boolean("file_name_valid"), // 文件名是否合规
		file_name_error: text("file_name_error"), // 文件名错误信息
		submitted_at: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
		graded_at: timestamp("graded_at", { withTimezone: true }),
		graded_by: varchar("graded_by", { length: 36 }).references(() => users.id),
		reviewed_at: timestamp("reviewed_at", { withTimezone: true }), // 审核时间
	},
	(table) => [
		index("submissions_assignment_id_idx").on(table.assignment_id),
		index("submissions_user_id_idx").on(table.user_id),
		index("submissions_class_id_idx").on(table.class_id),
		index("submissions_status_idx").on(table.status),
		index("submissions_assignment_user_idx").on(table.assignment_id, table.user_id),
		index("submissions_file_name_valid_idx").on(table.file_name_valid),
	]
);

// AI对话记录表
export const aiConversations = pgTable(
	"ai_conversations",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 255 }),
		context: jsonb("context"), // 对话上下文
		model_used: varchar("model_used", { length: 100 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("ai_conversations_user_id_idx").on(table.user_id),
	]
);

// AI消息表
export const aiMessages = pgTable(
	"ai_messages",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		conversation_id: varchar("conversation_id", { length: 36 }).notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 20 }).notNull(), // user 或 assistant
		content: text("content").notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("ai_messages_conversation_id_idx").on(table.conversation_id),
	]
);