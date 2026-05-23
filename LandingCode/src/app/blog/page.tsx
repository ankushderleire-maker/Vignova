import { getAllPosts } from '@/lib/markdown';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Blog - Vignova AI Career Copilot',
  description: 'Read the latest insights, strategies, and updates on accelerating your career with AI.',
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-[#F5F8FA]">
      <Header />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0A192F] tracking-tight mb-4">
            Vignova <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Blog</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Insights and strategies to navigate the modern job market, optimize your resume, and land your dream role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col">
                <div className="text-sm font-medium text-blue-600 mb-2">
                  {new Date(post.meta.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <h2 className="text-2xl font-bold text-[#0A192F] mb-3 leading-tight">
                  {post.meta.title}
                </h2>
                <p className="text-slate-500 leading-relaxed mb-6 flex-grow">
                  {post.meta.description}
                </p>
                <div className="font-semibold text-[#0A192F] text-sm mt-auto flex items-center gap-2">
                  Read Article &rarr;
                </div>
              </div>
            </Link>
          ))}

          {posts.length === 0 && (
            <div className="col-span-2 text-center py-20 text-slate-500">
              Check back soon for new articles!
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
