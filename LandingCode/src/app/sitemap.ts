export const dynamic = 'force-static';

import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/markdown';
import { canonical } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // canonical() adds the trailing slash the export serves, so these URLs no
  // longer 301 on the way in.
  const routes: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/how-it-works', priority: 0.9 },
    { path: '/blog', priority: 0.8 },
    { path: '/about', priority: 0.7 },
    { path: '/contact', priority: 0.5 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
    { path: '/refund', priority: 0.3 },
    { path: '/shipping', priority: 0.3 },
  ];

  const staticPages = routes.map(({ path, priority }) => ({
    url: canonical(path),
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority,
  }));

  const posts = getAllPosts().map((post) => ({
    url: canonical(`/blog/${post.slug}`),
    lastModified: new Date(post.meta.date).toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...posts];
}
