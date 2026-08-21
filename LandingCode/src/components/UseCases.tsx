'use client';

import { motion } from 'framer-motion';
import {
  RotateCcw,
  GraduationCap,
  Globe2,
  Briefcase,
  Scan,
  KanbanSquare,
} from 'lucide-react';

const useCases = [
  {
    icon: RotateCcw,
    title: 'Career changers',
    body: 'Switching industries means the same experience has to be framed differently for every role. Vignova reads the job description, finds the transferable skills already sitting in your Master Profile, and rewrites your bullet points in the language the new field uses — without inventing experience you do not have.',
    keyword: 'Reframe transferable skills',
  },
  {
    icon: GraduationCap,
    title: 'Students and new graduates',
    body: 'With one internship and a few projects, every word on the page counts. Vignova pulls the coursework, projects and certifications most relevant to each posting to the top, and tells you which keywords the ATS is scanning for that your resume is currently missing.',
    keyword: 'Entry-level resume optimization',
  },
  {
    icon: Briefcase,
    title: 'Experienced professionals',
    body: 'Fifteen years of history does not fit on two pages, and the right two pages change with every application. Keep the full record in your Master Profile and let AI resume tailoring select what matters for this specific job description, every time.',
    keyword: 'Cut a long career to two pages',
  },
  {
    icon: Globe2,
    title: 'International applicants',
    body: 'Resume conventions differ by market — page length, photos, personal details, date formats. Vignova produces a clean, single-column, ATS-safe document that parses correctly no matter which applicant tracking system sits behind the job posting.',
    keyword: 'ATS-safe formatting',
  },
  {
    icon: Scan,
    title: 'Anyone stuck at the ATS',
    body: 'If applications disappear without a reply, the resume may never have reached a human. Run the ATS resume checker before you apply: Vignova scores keywords, semantics, sections, impact, format and readability, and shows exactly what to fix.',
    keyword: 'ATS resume checker',
  },
  {
    icon: KanbanSquare,
    title: 'High-volume applicants',
    body: 'Applying to forty roles a month falls apart on a spreadsheet. Tailor each resume in minutes instead of an hour, then track every application on a Kanban board from Saved through Tailoring, Applied, Interviewing and Offer.',
    keyword: 'Job application tracker',
  },
];

export default function UseCases() {
  return (
    <section className="relative py-24 px-4 md:px-8 bg-[#F5F8FA] overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-blue-600">
            Who it is for
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#0A192F] tracking-tight mt-4 mb-5 leading-tight">
            One resume never fits{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">
              every job description.
            </span>
          </h2>
          <p className="text-lg text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
            Tailoring a resume by hand takes about 45 minutes per application. Vignova does
            the same work against your real experience in a few minutes — whatever stage of
            the job search you are at.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map(({ icon: Icon, title, body, keyword }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-shadow duration-300 p-7 flex flex-col"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0A192F] tracking-tight mb-3">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{body}</p>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {keyword}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
