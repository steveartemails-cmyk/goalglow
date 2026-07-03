import React, { useEffect, useRef, useState } from 'react';

// A big friendly rounded button with a satisfying press animation.
export function Button({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }) {
  const variants = {
    primary:
      'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30',
    success:
      'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30',
    soft: 'bg-white text-violet-700 border-2 border-violet-100 shadow-sm',
    ghost: 'bg-transparent text-violet-700',
    danger: 'bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg shadow-rose-500/30',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`gg-press rounded-2xl px-5 py-3.5 font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// Rounded card.
export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-3xl bg-white shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

// Confetti burst — drops a bunch of colourful pieces from the top.
export function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!fire) return;
    const colors = ['#a78bfa', '#f472b6', '#fb923c', '#34d399', '#38bdf8', '#fbbf24'];
    const next = Array.from({ length: 80 }).map((_, i) => ({
      id: i + '-' + Date.now(),
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.4,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [fire]);

  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `ggConfettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

// A toast that slides up from the bottom and auto-dismisses.
export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.duration || 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const tones = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-violet-500',
    danger: 'bg-rose-500',
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div
        className={`gg-slide-up pointer-events-auto max-w-sm rounded-2xl px-5 py-3 text-center font-display font-bold text-white shadow-xl ${tones[toast.tone] || tones.info}`}
      >
        {toast.message}
      </div>
    </div>
  );
}

// A reusable modal sheet.
export function Sheet({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-violet-950/40 backdrop-blur-sm" />
      <div
        className="gg-slide-up relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 font-display text-xl font-extrabold text-violet-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// Animated number that counts toward its target.
export function CountUp({ value, format = (v) => v.toFixed(2), className = '' }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    const dur = 500;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{format(display)}</span>;
}
