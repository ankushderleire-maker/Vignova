import React, { createContext, useContext, useEffect as reactEffect } from 'react';
export { useState, useRef } from 'react';
export default React;
export const DEMO_SPEED = 1.6;
export const demoTimeout = (callback: (...args: any[]) => void, duration: number) => globalThis.setTimeout(callback, duration / DEMO_SPEED);
export const demoInterval = (callback: (...args: any[]) => void, duration: number) => globalThis.setInterval(callback, duration / DEMO_SPEED);

// Pause the original demonstration sequences when out of view or motion is disabled.
export const DemoPaused = createContext(false);
export function useEffect(effect: React.EffectCallback, dependencies?: React.DependencyList) {
  const paused = useContext(DemoPaused);
  reactEffect(() => paused ? undefined : effect(), [...(dependencies || []), paused]);
}

export function DemoImage({ fill, priority, sizes, ...props }: any) {
  return <img {...props} loading="lazy" decoding="async" alt={props.alt || ''} style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : {}), ...props.style }} />;
}
