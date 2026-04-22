-- Create 'expenses' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('expenses', 'expenses', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to select objects in 'expenses' bucket
CREATE POLICY "Allow authenticated users to select expenses"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expenses');

-- Policy: Allow authenticated users to insert objects into 'expenses' bucket
CREATE POLICY "Allow authenticated users to insert expenses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expenses');

-- Policy: Allow authenticated users to update objects in 'expenses' bucket
CREATE POLICY "Allow authenticated users to update expenses"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'expenses');

-- Policy: Allow authenticated users to delete objects from 'expenses' bucket
CREATE POLICY "Allow authenticated users to delete expenses"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expenses');
