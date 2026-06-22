export const dynamic = 'force-static';

import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/markdown';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://vignova.io';

  // Static Pages
  const routes = ['', '/how-it-works', '/blog', '/contact', '/privacy', '/terms', '/refund', '/about', '/shipping'].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    })
  );

  // Dynamic Blog Posts
  const posts = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.meta.date).toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...routes, ...posts];
}
