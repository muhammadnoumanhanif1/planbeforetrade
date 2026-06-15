ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

CREATE OR REPLACE FUNCTION public.blog_slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NULLIF(
    REGEXP_REPLACE(
      LOWER(TRIM(REGEXP_REPLACE(COALESCE(input, ''), '[^a-zA-Z0-9]+', '-', 'g'))),
      '(^-|-$)',
      '',
      'g'
    ),
    ''
  );
$$;

WITH generated AS (
  SELECT
    id,
    COALESCE(public.blog_slugify(title), 'post') AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(public.blog_slugify(title), 'post') ORDER BY created_at, id) AS slug_rank
  FROM public.blog_posts
)
UPDATE public.blog_posts posts
SET slug = CASE WHEN generated.slug_rank = 1 THEN generated.base_slug ELSE generated.base_slug || '-' || generated.slug_rank END
FROM generated
WHERE generated.id = posts.id
  AND (posts.slug IS NULL OR posts.slug = '');

UPDATE public.blog_posts
SET excerpt = LEFT(REGEXP_REPLACE(COALESCE(content, ''), '<[^>]*>', '', 'g'), 200)
WHERE excerpt IS NULL OR excerpt = '';

ALTER TABLE public.blog_posts
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN excerpt SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_unique ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING GIN (tags);

CREATE OR REPLACE FUNCTION public.ensure_blog_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER := 1;
BEGIN
  base_slug := COALESCE(public.blog_slugify(NEW.slug), public.blog_slugify(NEW.title), 'post');
  candidate_slug := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE slug = candidate_slug
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) LOOP
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix;
  END LOOP;

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_slug ON public.blog_posts;

CREATE TRIGGER trg_blog_posts_slug
BEFORE INSERT OR UPDATE OF title, slug
ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_blog_slug();
