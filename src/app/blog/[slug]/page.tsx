import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientToast } from "@/components/ClientToast";
import { BlogPostAnalytics } from "@/components/blog/BlogPostAnalytics";
import { Navigation } from "@/components/Navigation";
import styles from "../../page.module.css";
import { BLOG_CONTENT_MAX_WIDTH, sanitizeBlogHtml } from "@/lib/blog";
import { createServerClient } from "@/lib/supabase-server";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[] | null;
  featured_image: string | null;
  created_at: string;
  views: number | null;
  clicks: number | null;
};

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id,title,slug,content,excerpt,tags,featured_image,created_at,views,clicks")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BlogPost;
}

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ toast?: string }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      images: post.featured_image ? [{ url: post.featured_image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params, searchParams }: BlogPostPageProps) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.created_at,
    keywords: post.tags ?? [],
  };

  return (
    <div className={styles.page}>
      {queryParams.toast === "updated" ? <ClientToast message="Post updated successfully" /> : null}
      <main className={styles.main} style={{ maxWidth: BLOG_CONTENT_MAX_WIDTH }}>
        <Navigation />
        
        <section style={{ marginBottom: 10 }}>
          <Link href="/blog" className={styles.navLink}>
            ← Back to Blog
          </Link>
        </section>

        <article className={styles.card}>
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={`${post.title} featured image`}
              style={{ width: "100%", maxHeight: 380, objectFit: "cover", borderRadius: 12, marginBottom: 18 }}
            />
          ) : null}
          <h1 style={{ margin: 0, marginBottom: 8 }}>{post.title}</h1>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>
            {new Date(post.created_at).toLocaleDateString()}
          </p>

          <div
            style={{ color: "#cbd5e1", lineHeight: 1.75, display: "grid", gap: 12 }}
            dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
          />
        </article>
        <BlogPostAnalytics slug={post.slug} postId={post.id} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      </main>
    </div>
  );
}
