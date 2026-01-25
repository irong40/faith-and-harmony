-- Fix RLS: Allow admins to view all profiles (needed for Pilot Management)
-- Previous policy "Users can view own profile" was too restrictive for admins
CREATE POLICY "Admins can view all profiles" ON profiles FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM user_roles
            WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
        )
    );
-- Also ensure admins can update profiles (to set Part 107 info for others)
CREATE POLICY "Admins can update all profiles" ON profiles FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM user_roles
            WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
        )
    );