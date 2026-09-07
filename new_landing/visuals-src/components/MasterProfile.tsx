import { motion } from '../motion';
import { Briefcase, GraduationCap, Award, FolderOpen, Zap, BadgeCheck } from 'lucide-react';

const entries = [
  { title: 'Experience', icon: Briefcase, angle: -90 },
  { title: 'Skills', icon: Zap, angle: -30 },
  { title: 'Education', icon: GraduationCap, angle: 30 },
  { title: 'Projects', icon: FolderOpen, angle: 90 },
  { title: 'Achievements', icon: Award, angle: 150 },
  { title: 'Certifications', icon: BadgeCheck, angle: 210 },
].map(entry => ({ ...entry, cx: 270 + Math.cos(entry.angle * Math.PI / 180) * 186, cy: 270 + Math.sin(entry.angle * Math.PI / 180) * 186 }));

export default function MasterProfile() {
  return <div className="profile-orbit">
    <div className="profile-orbit-halo" />
    <svg className="profile-connectors" width="540" height="540" viewBox="0 0 540 540" aria-hidden="true">
      <circle cx="270" cy="270" r="186" fill="none" stroke="#ccb0ff36" strokeDasharray="3 7" />
      {entries.map((entry, index) => <g key={entry.title}>
        <motion.line data-connector={entry.title} x1={270} y1={270} x2={entry.cx} y2={entry.cy} stroke="#be9af880" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .6, delay: .12 * index }} />
        <motion.circle r="3.5" fill={index % 2 ? '#83c0ff' : '#d6b8ff'} animate={{ cx: [entry.cx, 270], cy: [entry.cy, 270], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.8, delay: index * .25, repeat: Infinity, ease: 'linear' }} />
      </g>)}
    </svg>
    <motion.div className="profile-hub" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }}>
      <img src="assets/vignova-purple-blue.png" width="53" height="53" alt="" />
      <strong>Master Profile</strong><span>Your career details</span>
    </motion.div>
    {entries.map((entry, index) => {
      const Icon = entry.icon;
      return <motion.div data-profile-node={entry.title} className="profile-node" key={entry.title} style={{ left: entry.cx - 66, top: entry.cy - 41, width: 132, height: 82 }} initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .35, delay: .08 * index }}>
        <span><Icon size={22} /></span><strong>{entry.title}</strong>
      </motion.div>;
    })}
  </div>;
}
