import { getPostBySlug, getPostSlugs } from '@/lib/markdown';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = getPostBySlug(slug);
    return {
      title: `${post.meta.title} - Vignova Blog`,
      description: post.meta.description,
      openGraph: {
        title: post.meta.title,
        description: post.meta.description,
        type: 'article',
        url: `https://vignova.io/blog/${slug}`,
        images: post.meta.coverImage ? [post.meta.coverImage] : ['/og-image.jpg'],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.meta.title,
        description: post.meta.description,
        images: post.meta.coverImage ? [post.meta.coverImage] : ['/og-image.jpg'],
      },
    };
  } catch (e) {
    return {
      title: 'Post Not Found',
    };
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  
  let post;
  try {
    post = getPostBySlug(slug);
  } catch (e) {
    notFound();
  }

  const { meta, content } = post;

  return (
    <main className="min-h-screen bg-[#F5F8FA]">
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
