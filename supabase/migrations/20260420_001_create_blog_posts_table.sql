-- Create blog_posts table for admin publishing and public blog rendering
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
  ON public.blog_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id
  ON public.blog_posts (author_id);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read access for published blog posts
CREATE POLICY "Anyone can read blog posts"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert posts from authenticated sessions
CREATE POLICY "Admins can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
