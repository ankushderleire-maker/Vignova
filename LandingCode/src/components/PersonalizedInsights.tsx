'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function PersonalizedInsights() {
  return (
    <section className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          <div className="w-full lg:w-1/2 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground mb-6 leading-tight">
                Data-driven <br/> career decisions.
              </h2>
              
              <p className="text-xl text-muted font-light leading-relaxed">
                Stop guessing. Get access to personalized analytics that show your exact interview success rate, skill growth trajectory, and profile visibility among top recruiters.
              </p>
            </motion.div>

            <div className="pt-8 flex flex-col gap-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 20, delay: 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="text-xs font-semibold text-gray-400 tracking-widest uppercase mt-1">01</div>
                <div>
                  <h5 className="text-lg font-bold tracking-tight text-foreground mb-1">Dynamic Job Matches</h5>
                  <p className="text-muted font-light">AI-curated based on your evolving profile and market conditions.</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 20, delay: 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="text-xs font-semibold text-gray-400 tracking-widest uppercase mt-1">02</div>
                <div>
                  <h5 className="text-lg font-bold tracking-tight text-foreground mb-1">Performance Tracking</h5>
                  <p className="text-muted font-light">Measure absolute progress across all active applications.</p>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="w-full lg:w-1/2 relative flex flex-col gap-6 perspective-[1000px]"
          >
            {/* Image stack representing analytics cards and job matching */}
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-gray-200/60 shadow-2xl ring-1 ring-black/5 transform rotate-y-[5deg] rotate-x-[2deg]">
              <Image src="/images/analytics_cards.png" alt="Analytics" fill className="object-cover" />
            </div>
            <div className="relative w-4/5 aspect-[16/9] rounded-2xl overflow-hidden border border-gray-200/60 shadow-2xl ml-auto -mt-16 z-10 bg-white ring-1 ring-black/5 transform rotate-y-[5deg] rotate-x-[2deg]">
              <Image src="/images/job_matching_interface.png" alt="Job Matching" fill className="object-cover" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
