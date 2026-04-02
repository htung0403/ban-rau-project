-- Add UNIQUE constraint to role_name to prevent duplicate role names
ALTER TABLE public.role_salaries ADD CONSTRAINT role_salaries_role_name_unique UNIQUE (role_name);
