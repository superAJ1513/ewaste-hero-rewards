ALTER TABLE public.ewaste_submissions
ADD COLUMN IF NOT EXISTS image_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ewaste_submissions_image_hash
ON public.ewaste_submissions(image_hash)
WHERE image_hash IS NOT NULL;