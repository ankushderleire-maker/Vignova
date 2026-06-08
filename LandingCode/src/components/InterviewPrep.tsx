'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function InterviewPrep() {
  return (
    <section className="py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-20">
          
          <motion.div 
            initial={{ opacity: 0, x: -40, rotateY: 10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="w-full lg:w-1/2 relative perspective-[1000px]"
          >
            <div className="absolute inset-0 bg-blue-500 blur-[100px] rounded-full opacity-10 transform -translate-x-10 translate-y-10"></div>
            <div className="relative rounded-2xl border border-border/60 bg-white shadow-2xl overflow-hidden aspect-[4/3] max-w-lg mx-auto lg:ml-0 ring-1 ring-black/5">
              <Image 
                src="/images/ai_chat_assistant.png" 
                alt="AI Chat Assistant" 
                fill
                className="object-cover"
              />
            </div>
          </motion.div>

          <div className="w-full lg:w-1/2 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground mb-6 leading-tight">
                Simulate the interview. <br />
                <span className="text-gradient-brand">Secure the offer.</span>
              </h2>
              
              <p className="text-xl text-muted font-light leading-relaxed">
                Practice with a hyper-realistic AI copilot. It dynamically adapts its questioning based on the specific role, company culture, and your unique background.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20, delay: 0.2 }}
              className="grid grid-cols-2 gap-8 pt-6 border-t border-border/50"
            >
              <div>
                <h4 className="text-5xl font-bold tracking-tighter text-foreground mb-2">200+</h4>
                <p className="text-sm text-muted font-medium uppercase tracking-widest">Targeted Tracks</p>
              </div>
              <div>
                <h4 className="text-5xl font-bold tracking-tighter text-foreground mb-2">94%</h4>
                <p className="text-sm text-muted font-medium uppercase tracking-widest">Success Rate</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
