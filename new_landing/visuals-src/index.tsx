import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { DemoPaused } from './runtime';
import ResumeFlow from './components/ResumeFlow';
import TrackerFlow from './components/TrackerFlow';
import MasterProfile from './components/MasterProfile';
import ResumeAnalysis from './components/ResumeAnalysis';
import ExtensionFeature from './components/ExtensionFeature';
import LinkedInOptimizer from './components/LinkedInOptimizer';

function Studio({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="studio-frame"><div className="studio-header"><span className="studio-brand"><img src="assets/vignova-purple-blue.png" alt="" /> VIGNOVA</span><span className="studio-tool">{title}</span><span className="studio-sample">EXAMPLE</span></div><div className="studio-body"><div className="studio-preview" aria-hidden="true">{children}</div></div></div>;
}

function ResumePreview({ paused, scale }: { paused: boolean; scale: number }) {
  const [cycle, setCycle] = useState(0);
  const [localPause, setLocalPause] = useState(false);
  useEffect(() => {
    if (paused || localPause) return;
    const timer = setInterval(() => setCycle(value => value + 1), 5200);
    return () => clearInterval(timer);
  }, [paused, localPause]);
  return <DemoPaused.Provider value={paused || localPause}><div className="hero-tour"><div className="hero-stage"><div className="hero-stage-inner" style={{ transform: 'scale(' + scale + ')' }}><Studio title="AI resume builder"><ResumeFlow key={cycle} /></Studio></div></div><div className="resume-preview-controls"><span>Job description <b>→</b> Tailored resume</span><div><button type="button" aria-label="Replay resume preview" onClick={() => setCycle(value => value + 1)}><RotateCcw size={17} /></button><button type="button" disabled={paused} aria-pressed={localPause || paused} aria-label={localPause || paused ? 'Play resume animation' : 'Pause resume animation'} onClick={() => setLocalPause(value => !value)}>{localPause || paused ? <Play size={18} /> : <Pause size={18} />}</button></div></div></div></DemoPaused.Provider>;
}

function TrackerPreview({ paused }: { paused: boolean }) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setCycle(value => value + 1), 6500);
    return () => clearInterval(timer);
  }, [paused]);
  return <Studio title="Job application tracker"><TrackerFlow key={cycle} /></Studio>;
}

const sceneSizes: Record<string, [number, number]> = {
  hero: [760, 530], orbit: [540, 540], radar: [440, 440], extension: [400, 520], linkedin: [400, 520], tracker: [850, 570],
};

function DemoRoot({ kind, host, root }: { kind: string; host: HTMLElement; root: ShadowRoot }) {
  const [paused, setPaused] = useState(document.documentElement.classList.contains('motion-paused'));
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [visit, setVisit] = useState(0);
  const [scale, setScale] = useState(1);
  const intersects = useRef(false);
  const [width, height] = sceneSizes[kind];
  const stop = paused || !visible;
  useLayoutEffect(() => {
    if (kind === 'hero' && entered) host.style.aspectRatio = 'auto';
  }, [kind, entered, host]);
  useLayoutEffect(() => {
    setScale(host.clientWidth / width);
    const resize = new ResizeObserver(entries => setScale(entries[0].contentRect.width / width));
    resize.observe(host);
    return () => resize.disconnect();
  }, [host, width]);
  useEffect(() => {
    const preference = new MutationObserver(() => setPaused(document.documentElement.classList.contains('motion-paused')));
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const update = () => setVisible(intersects.current && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      // Start on entry. A full exit is required before the next replay.
      // Preloading styles never starts a sequence below the viewport.
      if (!intersects.current && entry.intersectionRatio >= .08) {
        intersects.current = true;
        setEntered(true);
        setVisit(value => value + 1);
      } else if (!entry.isIntersecting) intersects.current = false;
      update();
    }, { threshold: [0, .08] });
    observer.observe(host);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); preference.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [host]);
  useLayoutEffect(() => {
    root.querySelectorAll('svg').forEach(svg => { if (stop) svg.pauseAnimations?.(); else svg.unpauseAnimations?.(); });
  }, [stop, root, visit]);
  let visual;
  if (entered) {
    if (kind === 'hero') visual = <ResumePreview paused={stop} scale={scale} />;
    else if (kind === 'orbit') visual = <MasterProfile />;
    else if (kind === 'radar') visual = <ResumeAnalysis />;
    else if (kind === 'extension') visual = <ExtensionFeature />;
    else if (kind === 'linkedin') visual = <LinkedInOptimizer />;
    else visual = <TrackerPreview paused={stop} />;
  }
  return <DemoPaused.Provider value={stop}><MotionConfig reducedMotion={stop ? 'always' : 'user'}><div key={visit} className={'scene ' + (stop ? 'scene-paused' : '') + (kind === 'hero' ? ' scene-hero' : '')} style={kind === 'hero' ? undefined : { width, height, transform: 'scale(' + scale + ')' }}>{visual}</div></MotionConfig></DemoPaused.Provider>;
}

const demoStyles = new URL('visuals/demo.css?v=8', document.baseURI).href;
const initialized = new WeakSet<HTMLElement>();
function initialize(host: HTMLElement) {
  if (initialized.has(host)) return;
  const kind = host.dataset.productDemo!;
  if (!sceneSizes[kind]) return;
  initialized.add(host);
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = demoStyles;
  style.onload = () => {
    const app = document.createElement('div'); root.append(app);
    const [width, height] = sceneSizes[kind];
    // Reserve an observable area before the first sequence is mounted.
    host.style.aspectRatio = width + ' / ' + height;
    host.hidden = false;
    host.parentElement!.classList.add('visual-active');
    createRoot(app, { onUncaughtError(error) {
      host.hidden = true;
      host.parentElement!.classList.remove('visual-active');
      console.error('Showing the static product preview.', error);
    } }).render(<DemoRoot kind={kind} host={host} root={root} />);
  };
  root.append(style);
}
const loadingObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.querySelectorAll<HTMLElement>(':scope > [data-product-demo]').forEach(initialize);
  loadingObserver.unobserve(entry.target);
}), { rootMargin: '300px' });
document.querySelectorAll<HTMLElement>('[data-product-demo]').forEach(host => loadingObserver.observe(host.parentElement!));
