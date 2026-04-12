-- Add extended profile fields for personal and HR information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS citizen_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(120),
ADD COLUMN IF NOT EXISTS department VARCHAR(120),
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(120),
ADD COLUMN IF NOT EXISTS city VARCHAR(120),
ADD COLUMN IF NOT EXISTS district VARCHAR(120),
ADD COLUMN IF NOT EXISTS ward VARCHAR(120),
ADD COLUMN IF NOT EXISTS address_line TEXT,
ADD COLUMN IF NOT EXISTS temporary_address TEXT;
