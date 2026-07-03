import React from 'react';
import * as H from '../health';
import { Card } from './ui';

// The savings-goal photo, with CSS filters driven by the health score.
export default function FadingPhoto({ state }) {
  const health = state.health;
  const f = H.photoFilter(health);
  const { left, limit } = H.moneyLeftToday(state);
  const overToday = left < 0;
  const currency = state.settings.currency;

  // Honest, gentle messaging keyed to the band.
  const message = bandMessage(state, f, overToday);

  // Sparkles for the brightest band.
  const sparkles = f.sparkle
    ? [
        { top: '8%', left: '10%', delay: '0s', size: 22 },
        { top: '14%', left: '82%', delay: '0.5s', size: 16 },
        { top: '70%', left: '6%', delay: '1s', size: 18 },
        { top: '80%', left: '88%', delay: '0.3s', size: 20 },
        { top: '40%', left: '92%', delay: '0.8s', size: 14 },
      ]
    : [];

  return (
    <Card className="gg-slide-up relative overflow-hidden p-0">
      <div className="relative h-64 w-full overflow-hidden bg-violet-950">
        {state.goal.photo ? (
          <>
            {/* Blurred backdrop fills the frame so letterboxing looks intentional */}
            <img
              src={state.goal.photo}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
              style={{ opacity: 0.5 }}
            />
            {/* The actual goal photo — shown whole, never cropped */}
            <img
              src={state.goal.photo}
              alt={state.goal.name}
              className="gg-photo-transition absolute inset-0 h-full w-full object-contain"
              style={{ filter: f.filter, opacity: f.opacity }}
            />
          </>
        ) : (
          <div
            className="gg-photo-transition flex h-64 w-full items-center justify-center bg-gradient-to-br from-violet-200 to-fuchsia-200 text-6xl"
            style={{ filter: f.filter, opacity: f.opacity }}
          >
            🎯
          </div>
        )}

        {/* Sparkle layer */}
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="gg-sparkle"
            style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}
          >
            ✨
          </span>
        ))}

        {/* Gradient overlay + goal name */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-violet-950/80 to-transparent p-4 pt-12">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-white/70">Saving for</div>
              <div className="font-display text-2xl font-extrabold text-white drop-shadow">
                {state.goal.name}
              </div>
            </div>
            <HealthRing health={health} />
          </div>
        </div>
      </div>

      {/* Messaging strip */}
      <div className={`px-4 py-3 text-sm font-semibold ${message.tone}`}>{message.text}</div>
    </Card>
  );
}

function HealthRing({ health }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, health)) / 100;
  const color = health >= 85 ? '#34d399' : health >= 60 ? '#a78bfa' : health >= 40 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 600ms ease, stroke 600ms ease' }}
        />
      </svg>
      <span className="absolute font-display text-xs font-extrabold text-white">{Math.round(health)}</span>
    </div>
  );
}

function bandMessage(state, f, overToday) {
  const name = state.goal.name;
  const currency = state.settings.currency;

  // Strongest "needs help" messaging in the lowest band.
  if (f.needsHelp) {
    return {
      tone: 'bg-rose-50 text-rose-600',
      text: `${name} really needs your help right now — it's gone blurry. A few days under your limit will bring it right back. You can do this! 💪`,
    };
  }
  if (f.band === '20-39') {
    return {
      tone: 'bg-amber-50 text-amber-700',
      text: `${name} is fading. Staying under your limit today helps it sharpen back up. ✨`,
    };
  }
  if (f.band === '40-59') {
    return {
      tone: 'bg-amber-50 text-amber-700',
      text: `${name} is getting a little blurry — go easy today and watch it brighten.`,
    };
  }
  if (f.band === '60-84') {
    return {
      tone: 'bg-violet-50 text-violet-700',
      text: `${name} is looking good! Keep it up to get it sparkling. ✨`,
    };
  }
  // 85-100
  return {
    tone: 'bg-emerald-50 text-emerald-700',
    text: `${name} is glowing bright — you're smashing it! 🌟`,
  };
}
