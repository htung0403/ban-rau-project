-- Add check-in and check-out times to attendance table
ALTER TABLE public.attendance 
ADD COLUMN check_in_time TIME,
ADD COLUMN check_out_time TIME;
