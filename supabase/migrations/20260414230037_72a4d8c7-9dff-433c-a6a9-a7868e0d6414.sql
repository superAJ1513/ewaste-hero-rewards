
-- Create ewaste_submissions table
CREATE TABLE public.ewaste_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ewaste_submissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view submissions (for leaderboard)
CREATE POLICY "Anyone can view submissions"
  ON public.ewaste_submissions FOR SELECT
  USING (true);

-- Users can insert their own submissions
CREATE POLICY "Users can create own submissions"
  ON public.ewaste_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own submissions
CREATE POLICY "Users can delete own submissions"
  ON public.ewaste_submissions FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for e-waste photos
INSERT INTO storage.buckets (id, name, public) VALUES ('ewaste-photos', 'ewaste-photos', true);

-- Storage policies
CREATE POLICY "Public can view ewaste photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ewaste-photos');

CREATE POLICY "Authenticated users can upload ewaste photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ewaste-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own ewaste photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ewaste-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create a leaderboard view for efficient querying
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(s.id) as item_count,
  COUNT(s.id) * 200 as score
FROM auth.users u
LEFT JOIN public.ewaste_submissions s ON u.id = s.user_id
GROUP BY u.id, u.email
ORDER BY item_count DESC;
