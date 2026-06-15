import Link from "next/link";
import { redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { AdminAccessRestricted } from "@/components/AdminAccessRestricted";
import { ClientToast } from "@/components/ClientToast";
import { createServerClient } from "@/lib/supabase-server";
import styles from "../../page.module.css";
import { AdminBlogPostActions } from "./AdminBlogPostActions";

export const dynamic = "force-dynamic";

type AdminBlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  tags: string[] | null;
  featured_image: string | null;
  created_at: string;
  views: number | null;
  clicks: number | null;
};

type AdminPostWithMetrics = AdminBlogPostListItem & {
  views: number;
  clicks: number;
  ctr: number;
};

async function getPosts() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id,title,slug,tags,featured_image,created_at,views,clicks")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminBlogPostListItem[];
}

function topBy(
  posts: AdminPostWithMetrics[],
  metric: (post: AdminPostWithMetrics) => number,
  limit = 3
) {
  const top: AdminPostWithMetrics[] = [];

  for (const post of posts) {
    const score = metric(post);
    let inserted = false;

    for (let i = 0; i < top.length; i += 1) {
      if (score > metric(top[i])) {
        top.splice(i, 0, post);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      top.push(post);
    }

    if (top.length > limit) {
      top.pop();
    }
  }

  return top;
}

type AdminBlogPageProps = {
  searchParams: Promise<{ toast?: string }>;
};

export default async function AdminBlogPage({ searchParams }: AdminBlogPageProps) {
  const queryParams = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminAccessRestricted message="Please sign in with an admin account to access this area." />;
  }

  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  const posts = await getPosts();
  const postsWithMetrics = posts.map((post) => {
    const views = Math.max(0, Number(post.views ?? 0));
    const clicks = Math.max(0, Number(post.clicks ?? 0));
    const ctr = views > 0 ? Math.min((clicks / views) * 100, 100) : 0;

    return { ...post, views, clicks, ctr };
  });
  const topViewedPosts = topBy(postsWithMetrics, (post) => post.views);
  const topCtrPosts = topBy(postsWithMetrics, (post) => post.ctr);

  return (
    <div className={styles.page}>
      {queryParams.toast === "deleted" ? <ClientToast message="Post deleted successfully" /> : null}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
            <p className={styles.kicker}>Plan Before Trade</p>
              <h1>BLOG CMS</h1>
              <p className={styles.subtitle}>Create, edit, and manage all blog posts from one place.</p>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.card}>
          <h2>Posts</h2>
          <p style={{ marginTop: 0, marginBottom: 16 }}>
            <Link href="/admin/blog/new" className={styles.navLink}>
              Create New Post
            </Link>
          </p>

          {postsWithMetrics.length === 0 ? (
            <p style={{ color: "#94a3b8", margin: 0 }}>No posts yet.</p>
          ) : (
            <>
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <article style={{ border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 12, padding: 12 }}>
                  <h3 style={{ margin: "0 0 8px 0", background: "transparent", color: "#e2e8f0", padding: 0 }}>
                    Top Viewed Posts
                  </h3>
                  <p style={{ margin: 0, color: "#cbd5e1" }}>
                    {topViewedPosts.map((post) => `${post.title} (${post.views} views)`).join(" · ") || "No data yet"}
                  </p>
                </article>
                <article style={{ border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 12, padding: 12 }}>
                  <h3 style={{ margin: "0 0 8px 0", background: "transparent", color: "#e2e8f0", padding: 0 }}>
                    Top Performing Posts (CTR)
                  </h3>
                  <p style={{ margin: 0, color: "#cbd5e1" }}>
                    {topCtrPosts.map((post) => `${post.title} (${post.ctr.toFixed(1)}%)`).join(" · ") || "No data yet"}
                  </p>
                </article>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {postsWithMetrics.map((post) => (
                <article
                  key={post.id}
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 12,
                    padding: 14,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={`${post.title} featured`}
                      style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }}
                    />
                  ) : null}
                  <div>
                    <h3 style={{ margin: 0, background: "transparent", color: "#e2e8f0", padding: 0 }}>{post.title}</h3>
                    <p style={{ margin: "8px 0", color: "#94a3b8" }}>
                      /blog/{post.slug} · {new Date(post.created_at).toLocaleDateString()}
                    </p>
                    <p style={{ margin: "8px 0", color: "#cbd5e1" }}>
                      Views: {post.views} · Clicks: {post.clicks} · CTR: {post.ctr.toFixed(1)}%
                    </p>
                    {Array.isArray(post.tags) && post.tags.length > 0 ? (
                      <p style={{ margin: "8px 0", color: "#cbd5e1" }}>
                        {post.tags.map((tag) => `#${tag}`).join(" ")}
                      </p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/admin/blog/${post.id}`} className={styles.navLink}>
                      Edit
                    </Link>
                    <Link href={`/blog/${post.slug}`} className={styles.navLink}>
                      View
                    </Link>
                    <AdminBlogPostActions postId={post.id} />
                  </div>
                </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
