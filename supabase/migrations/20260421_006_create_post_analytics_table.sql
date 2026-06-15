CREATE TABLE IF NOT EXISTS public.post_analytics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id_created_at
  ON public.post_analytics (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_analytics_event_type_created_at
  ON public.post_analytics (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.track_blog_post_view(post_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  UPDATE public.blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE slug = post_slug
  RETURNING id INTO v_post_id;

  IF v_post_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.post_analytics (post_id, event_type)
  VALUES (v_post_id, 'view');

  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_blog_post_click_by_slug(post_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  UPDATE public.blog_posts
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE slug = post_slug
  RETURNING id INTO v_post_id;

  IF v_post_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.post_analytics (post_id, event_type)
  VALUES (v_post_id, 'click');

  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_blog_post_click_by_id(target_post_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  UPDATE public.blog_posts
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = target_post_id
  RETURNING id INTO v_post_id;

  IF v_post_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.post_analytics (post_id, event_type)
  VALUES (v_post_id, 'click');

  RETURN v_post_id;
END;
$$;
