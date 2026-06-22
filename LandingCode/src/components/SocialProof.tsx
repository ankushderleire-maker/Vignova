'use client';

const companies = [
  { name: 'Google', color: '#4285F4' },
  { name: 'Microsoft', color: '#00A4EF' },
  { name: 'OpenAI', color: '#10A37F' },
  { name: 'Meta', color: '#0082FB' },
  { name: 'Amazon', color: '#FF9900' },
  { name: 'Apple', color: '#555555' },
  { name: 'NVIDIA', color: '#76B900' },
  { name: 'Stripe', color: '#635BFF' },
  { name: 'Anthropic', color: '#D4A574' },
  { name: 'DeepMind', color: '#4285F4' },
  { name: 'Tesla', color: '#CC0000' },
  { name: 'Netflix', color: '#E50914' },
  { name: 'Salesforce', color: '#00A1E0' },
  { name: 'Adobe', color: '#FF0000' },
  { name: 'Spotify', color: '#1DB954' },
  { name: 'Databricks', color: '#FF3621' },
  { name: 'Snowflake', color: '#29B5E8' },
  { name: 'Palantir', color: '#101113' },
];

function CompanyItem({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="mx-10 md:mx-14 text-2xl font-bold tracking-tight text-gray-500 whitespace-nowrap transition-colors duration-300 select-none cursor-default"
      style={{ ['--brand-color' as string]: color }}
      onMouseEnter={(e) => (e.currentTarget.style.color = color)}
      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
    >
      {name}
    </span>
  );
}

export default function SocialProof() {
  return (
    <section className="relative py-10 border-b border-border/50 bg-[#F5F8FA] overflow-hidden">
      {/* Abstract Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] -left-[10%] w-[30%] h-[150%] rounded-full bg-gradient-to-br from-blue-500/40 to-transparent blur-[100px] animate-orb"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[150%] rounded-full bg-gradient-to-tl from-indigo-500/30 to-transparent blur-[120px] animate-orb-slow"></div>
      </div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <p className="text-center text-xs font-semibold text-gray-400 mb-8 uppercase tracking-[0.2em]">
          Trusted by professionals from world-class companies
        </p>
      </div>

      {/* Marquee */}
      <div className="marquee-group relative w-full overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#F5F8FA] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#F5F8FA] to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {companies.map((c, i) => (
                <CompanyItem key={`${copy}-${i}`} name={c.name} color={c.color} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
