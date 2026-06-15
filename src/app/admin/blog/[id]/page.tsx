import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { AdminAccessRestricted } from "@/components/AdminAccessRestricted";
import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import styles from "../../../page.module.css";
import { AdminBlogForm } from "../AdminBlogForm";

export const dynamic = "force-dynamic";

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[] | null;
  featured_image: string | null;
};

type AdminBlogEditPageProps = {
  params: Promise<{ id: string }>;
};

async function getPost(id: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("blog_posts")
    .select("id,title,slug,content,tags,featured_image")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AdminPost;
}

export default async function AdminBlogEditPage({ params }: AdminBlogEditPageProps) {
  const { id } = await params;
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

  const post = await getPost(id);
  if (!post) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>EDIT BLOG POST</h1>
              <p className={styles.subtitle}>Update content, tags, slug, and images for this post.</p>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.card}>
          <h2>Edit Post</h2>
          <AdminBlogForm mode="edit" initialPost={post} />

          <p style={{ marginTop: 16, marginBottom: 0 }}>
            <Link href="/admin/blog" className={styles.navLink}>
              Back to CMS
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
