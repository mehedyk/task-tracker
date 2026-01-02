-- =============================================
-- Task Tracker Taqaddum - Complete Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- 2. TASKS TABLE (Main Daily Tasks)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    parent_id TEXT,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    icon TEXT,
    is_parent BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks Indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_date ON public.tasks(date);
CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX idx_tasks_task_id ON public.tasks(task_id);
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_id);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks RLS Policies
CREATE POLICY "Users can view all tasks"
    ON public.tasks FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- 3. CUSTOM TASK TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    icon TEXT DEFAULT '📝',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom Task Templates Indexes
CREATE INDEX idx_custom_templates_user_id ON public.custom_task_templates(user_id);

-- Enable Row Level Security
ALTER TABLE public.custom_task_templates ENABLE ROW LEVEL SECURITY;

-- Custom Task Templates RLS Policies
CREATE POLICY "Users can view their own templates"
    ON public.custom_task_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
    ON public.custom_task_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
    ON public.custom_task_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
    ON public.custom_task_templates FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- 4. CUSTOM TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    icon TEXT DEFAULT '📝',
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    template_id UUID REFERENCES public.custom_task_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom Tasks Indexes
CREATE INDEX idx_custom_tasks_user_id ON public.custom_tasks(user_id);
CREATE INDEX idx_custom_tasks_date ON public.custom_tasks(date);
CREATE INDEX idx_custom_tasks_user_date ON public.custom_tasks(user_id, date);
CREATE INDEX idx_custom_tasks_template_id ON public.custom_tasks(template_id);

-- Enable Row Level Security
ALTER TABLE public.custom_tasks ENABLE ROW LEVEL SECURITY;

-- Custom Tasks RLS Policies
CREATE POLICY "Users can view their own custom tasks"
    ON public.custom_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom tasks"
    ON public.custom_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom tasks"
    ON public.custom_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom tasks"
    ON public.custom_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- 5. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for tasks
DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for custom_task_templates
DROP TRIGGER IF EXISTS set_updated_at_custom_templates ON public.custom_task_templates;
CREATE TRIGGER set_updated_at_custom_templates
    BEFORE UPDATE ON public.custom_task_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for custom_tasks
DROP TRIGGER IF EXISTS set_updated_at_custom_tasks ON public.custom_tasks;
CREATE TRIGGER set_updated_at_custom_tasks
    BEFORE UPDATE ON public.custom_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 6. FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. UTILITY FUNCTIONS
-- =============================================

-- Function to get user's task completion rate for a specific date
CREATE OR REPLACE FUNCTION public.get_completion_rate(
    p_user_id UUID,
    p_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
    INTO v_total, v_completed
    FROM public.tasks
    WHERE user_id = p_user_id 
    AND date = p_date
    AND (is_parent = true OR task_type = 'simple');
    
    IF v_total = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's streak
CREATE OR REPLACE FUNCTION public.get_user_streak(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_current_date DATE := CURRENT_DATE;
    v_completion_rate NUMERIC;
BEGIN
    LOOP
        v_completion_rate := public.get_completion_rate(p_user_id, v_current_date);
        
        EXIT WHEN v_completion_rate < 70;
        
        v_streak := v_streak + 1;
        v_current_date := v_current_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.custom_task_templates TO authenticated;
GRANT ALL ON public.custom_tasks TO authenticated;

-- Grant sequence permissions (for any serial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- 9. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =============================================

-- Note: This will only work after you have at least one user signed up
-- Uncomment and modify the user_id to test with your actual user

/*
-- Insert sample profile (replace with actual user_id from auth.users)
INSERT INTO public.profiles (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Test User');

-- Insert sample tasks for today
INSERT INTO public.tasks (user_id, task_id, task_name, task_type, date, completed, icon, is_parent)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'salah', 'Salah (At Least Qaza)', 'expandable', CURRENT_DATE, false, '🕌', true),
    ('00000000-0000-0000-0000-000000000000', 'addictions', 'Stop Addictions and Porn Content', 'simple', CURRENT_DATE, false, '🚫', false);

-- Insert sample custom task template
INSERT INTO public.custom_task_templates (user_id, task_name, icon)
VALUES ('00000000-0000-0000-0000-000000000000', 'Read Quran', '📖');
*/

-- =============================================
-- 10. VERIFICATION QUERIES
-- =============================================

-- Check if all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- SETUP COMPLETE!
-- =============================================

-- Next steps:
-- 1. Run this entire SQL script in your Supabase SQL Editor
-- 2. Verify all tables are created: SELECT * FROM pg_tables WHERE schemaname = 'public';
-- 3. Test authentication by signing up a user in your app
-- 4. Verify profile auto-creation works
-- 5. Test creating tasks through your app

-- For support or issues, check:
-- - Supabase Dashboard > Table Editor (view tables)
-- - Supabase Dashboard > Authentication > Users (check users)
-- - Supabase Dashboard > Database > Roles (verify permissions)