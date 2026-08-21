'use client';

// Applicant tracking systems the resume templates are built to parse cleanly in.
// This is a statement about our own export format, NOT an endorsement by these
// vendors and NOT a customer list.
const atsPlatforms = [
  { name: 'Workday', color: '#0875E1' },
  { name: 'Greenhouse', color: '#24A47F' },
  { name: 'Lever', color: '#5766D6' },
  { name: 'Taleo', color: '#C74634' },
  { name: 'iCIMS', color: '#D6001C' },
  { name: 'SmartRecruiters', color: '#0F7BC4' },
  { name: 'Ashby', color: '#4E5BF2' },
  { name: 'Workable', color: '#4A90D9' },
  { name: 'Jobvite', color: '#7B2CBF' },
  { name: 'BambooHR', color: '#73C41D' },
  { name: 'SuccessFactors', color: '#0070F2' },
  { name: 'JazzHR', color: '#F26C21' },
  { name: 'Recruitee', color: '#FF4B4B' },
  { name: 'Teamtailor', color: '#2E3A47' },
  { name: 'Breezy HR', color: '#2FB8AC' },
  { name: 'Zoho Recruit', color: '#E42527' },
];

function PlatformItem({ name, color }: { name: string; color: string }) {
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
          Resumes formatted to parse cleanly in the applicant tracking systems employers actually use
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
              {atsPlatforms.map((c, i) => (
                <PlatformItem key={`${copy}-${i}`} name={c.name} color={c.color} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
