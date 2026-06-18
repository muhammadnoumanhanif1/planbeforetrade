import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

type SitemapBlogPost = {
  slug: string;
  created_at: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.planbeforetrade.tech";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${appUrl}/faq`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/trading-lists`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/sitemap`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from("blog_posts").select("slug,created_at");

    if (error || !data) {
      return staticEntries;
    }

    const postEntries: MetadataRoute.Sitemap = (data as SitemapBlogPost[]).map((post) => ({
      url: `${appUrl}/blog/${post.slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticEntries, ...postEntries];
  } catch {
    return staticEntries;
  }
}
