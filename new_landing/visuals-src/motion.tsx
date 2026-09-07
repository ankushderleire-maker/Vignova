import React, { forwardRef, useContext } from 'react';
import { motion as originalMotion } from 'framer-motion';
import { DemoPaused, DEMO_SPEED } from './runtime';
export * from 'framer-motion';

const elements = new Map();
function faster(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    if (['duration', 'delay', 'repeatDelay', 'staggerChildren', 'delayChildren'].includes(key) && typeof child === 'number') return [key, child / DEMO_SPEED];
    return [key, child && typeof child === 'object' ? faster(child) : child];
  }));
}
function still(target: any) {
  if (!target || typeof target !== 'object') return target;
  return Object.fromEntries(Object.entries(target).map(([key, value]) => [key, key === 'transition' ? { duration: 0, delay: 0, repeat: 0 } : Array.isArray(value) ? value[value.length - 1] : value]));
}

// Keep the existing motion code, while giving the landing's pause control priority.
export const motion: any = new Proxy({}, {
  get(_target, tag: string) {
    if (!elements.has(tag)) {
      const Original = (originalMotion as any)[tag];
      elements.set(tag, forwardRef(function DemoMotion(props: any, ref: any) {
        const paused = useContext(DemoPaused);
        if (!paused) return <Original {...props} ref={ref} animate={props.animate || props.whileInView} whileInView={undefined} transition={faster(props.transition)} variants={faster(props.variants)} />;
        const target = props.animate || props.whileInView;
        const resolved = typeof target === 'string' ? (props.variants?.[target] || target) : target;
        return <Original {...props} ref={ref} initial={false} animate={still(resolved)} whileInView={undefined} exit={undefined} transition={{ duration: 0, delay: 0, repeat: 0 }} />;
      }));
    }
    return elements.get(tag);
  },
});
