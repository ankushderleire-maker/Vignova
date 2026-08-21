import { getPostBySlug, getPostSlugs } from '@/lib/markdown';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { SITE_NAME, SITE_URL, canonical } from '@/lib/seo';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = getPostBySlug(slug);
    const image = post.meta.coverImage || '/og-image.png';
    return {
      title: post.meta.title,
      description: post.meta.description,
      alternates: { canonical: canonical(`/blog/${slug}`) },
      openGraph: {
        title: post.meta.title,
        description: post.meta.description,
        type: 'article',
        publishedTime: new Date(post.meta.date).toISOString(),
        url: canonical(`/blog/${slug}`),
        images: [image],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.meta.title,
        description: post.meta.description,
        images: [image],
      },
    };
  } catch {
    return {
      title: 'Post Not Found',
      robots: { index: false, follow: true },
    };
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  
  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  const { meta, content } = post;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.title,
    description: meta.description,
    datePublished: new Date(meta.date).toISOString(),
    dateModified: new Date(meta.date).toISOString(),
    image: `${SITE_URL}${meta.coverImage || '/og-image.png'}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(`/blog/${slug}`) },
    author: { '@type': 'Organization', name: SITE_NAME, url: canonical('/') },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonical('/') },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: canonical('/blog') },
      { '@type': 'ListItem', position: 3, name: meta.title, item: canonical(`/blog/${slug}`) },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F5F8FA]">
      <JsonLd data={[articleSchema, breadcrumbSchema]} />
      <Header />
      
      <article className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <div className="text-blue-600 font-medium mb-4">
            {new Date(meta.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0A192F] tracking-tight mb-6 leading-tight">
            {meta.title}
          </h1>
          {meta.description && (
            <p className="text-xl text-slate-500 font-light leading-relaxed">
              {meta.description}
            </p>
          )}
        </header>

        <div className="prose prose-lg prose-slate max-w-none prose-headings:text-[#0A192F] prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl shadow-sm bg-white p-8 md:p-12 rounded-3xl border border-gray-100">
          <MDXRemote source={content} />
        </div>
      </article>

      <Footer />
    </main>
  );
}

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.mdx?$/, ''),
  }));
}
