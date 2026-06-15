import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";
import { createServerClient } from "@/lib/supabase-server";
import { BLOG_CONTENT_MAX_WIDTH, normalizeTags } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";

type BlogListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[] | null;
  featured_image: string | null;
  created_at: string;
};

async function getBlogPosts(selectedTag?: string): Promise<BlogListItem[]> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,tags,featured_image,created_at")
      .order("created_at", { ascending: false });

    if (selectedTag) {
      query = query.contains("tags", [selectedTag]);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data as BlogListItem[];
  } catch {
    return [];
  }
}

type BlogPageProps = {
  searchParams: Promise<{ tag?: string }>;
};

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const selectedTag = params.tag ? normalizeTags([params.tag])[0] : undefined;

  if (selectedTag) {
    return {
      title: `Blog - #${selectedTag}`,
      description: `Latest blog posts tagged with #${selectedTag}.`,
    };
  }

  return {
    title: "Blog",
    description: "Read the latest trading insights and platform updates from Plan Before Trade.",
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const queryParams = await searchParams;
  const selectedTag = queryParams.tag ? normalizeTags([queryParams.tag])[0] : undefined;
  const posts = await getBlogPosts(selectedTag);

  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ maxWidth: BLOG_CONTENT_MAX_WIDTH }}>
<header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>BLOG</h1>
              <p className={styles.subtitle}>
                Insights, updates, and educational content from the Plan Before Trade team.
              </p>
            </div>
          </div>
        </header>

        <Navigation />

        {selectedTag ? (
          <section className={styles.card} style={{ padding: 16 }}>
            <p style={{ margin: 0, color: "#cbd5e1" }}>
              Filtered by tag: <strong>#{selectedTag}</strong>{" "}
              <Link href="/blog" className={styles.navLink} style={{ marginLeft: 12 }}>
                Clear filter
              </Link>
            </p>
          </section>
        ) : null}

        {posts.length === 0 ? (
          <section className={styles.card}>
            <h2>No blog posts yet</h2>
            <p style={{ color: "#cbd5e1" }}>
              New posts will appear here once they are published by an admin.
            </p>
          </section>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: 24 }}>
            {posts.map((post) => (
              <article className={styles.card} key={post.id} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={`${post.title} featured image`}
                    style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 12, marginBottom: 16 }}
                  />
                ) : null}
                <h2 style={{ marginBottom: 10, marginTop: 0 }}>{post.title}</h2>
                <p style={{ color: "#94a3b8", marginBottom: 12, fontSize: "0.9em" }}>
                  {new Date(post.created_at).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </p>
                
                {/* Show multiple lines of excerpt to increase attraction */}
                <div style={{ color: "#cbd5e1", marginBottom: 16, lineHeight: 1.6, flex: 1 }}>
                  <p style={{ margin: "0 0 12px 0" }}>{post.excerpt}</p>
                  
                  {/* Add placeholder content lines for visual appeal - simulating more content */}
                  <p style={{ margin: "0 0 12px 0", color: "#94a3b8", fontSize: "0.95em" }}>
                    Discover key insights and strategies to improve your trading performance. Learn from detailed analysis and expert perspectives.
                  </p>
                  
                  <p style={{ margin: "0 0 12px 0", color: "#94a3b8", fontSize: "0.95em" }}>
                    Understand market dynamics and technical patterns that shape successful trades. Access in-depth guidance for informed decisions.
                  </p>
                  
                  <p style={{ margin: "0 0 12px 0", color: "#94a3b8", fontSize: "0.95em" }}>
                    Explore proven methodologies and real-world examples that demonstrate effective trading principles. Enhance your skills with practical knowledge.
                  </p>
                  
                  <p style={{ margin: "0 0 12px 0", color: "#94a3b8", fontSize: "0.95em" }}>
                    Master the art of planning before trading. Gain confidence through comprehensive analysis and strategic planning frameworks.
                  </p>
                </div>

                <Link href={`/blog/${post.slug}`} className={styles.navLink} style={{ alignSelf: "flex-start", marginTop: "auto" }}>
                  Read More →
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
