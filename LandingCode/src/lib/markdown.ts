import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content/blog');

export type BlogPostMetadata = {
  title: string;
  date: string;
  description: string;
  slug: string;
  coverImage?: string;
};

export function getPostSlugs() {
  if (!fs.existsSync(contentDirectory)) return [];
  return fs.readdirSync(contentDirectory);
}

export function getPostBySlug(slug: string) {
  const realSlug = slug.replace(/\.mdx?$/, '');
  const fullPath = path.join(contentDirectory, `${realSlug}.mdx`);
  
  let fileContents = '';
  try {
    fileContents = fs.readFileSync(fullPath, 'utf8');
  } catch {
    // try .md
    const mdPath = path.join(contentDirectory, `${realSlug}.md`);
    fileContents = fs.readFileSync(mdPath, 'utf8');
  }

  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    meta: data as BlogPostMetadata,
    content,
  };
}

export function getAllPosts(): { slug: string; meta: BlogPostMetadata; content: string }[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .filter((slug) => slug.endsWith('.md') || slug.endsWith('.mdx'))
    .map((slug) => getPostBySlug(slug))
    // sort posts by date in descending order
    .sort((post1, post2) => (post1.meta.date > post2.meta.date ? -1 : 1));
  return posts;
}
