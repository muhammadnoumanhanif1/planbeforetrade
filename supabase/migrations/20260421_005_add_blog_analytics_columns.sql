ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE slug = post_slug;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_blog_post_clicks_by_slug(post_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.blog_posts
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE slug = post_slug;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_blog_post_clicks_by_id(post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.blog_posts
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = post_id;

  RETURN FOUND;
END;
$$;
