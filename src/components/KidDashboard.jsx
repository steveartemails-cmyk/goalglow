import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import * as H from '../health';
import { CATEGORIES, categoryById, BADGES } from '../content';
import { Card } from './ui';

export default function KidDashboard({ state }) {
  const currency = state.settings.currency;
  const saved = H.savedSoFar(state);
  const target = state.goal.targetCost;
  const pct = H.progressPercent(state);
  const days = H.daysToGoal(state);
  const goalDate = H.projectedGoalDate(state);

  return (
    <div className="space-y-4 pt-2">
      {/* Progress toward goal */}
      <Card className="gg-slide-up bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white/80">🐷 Saved toward {state.goal.name}</div>
          <div className="text-sm font-bold">{Math.round(pct * 100)}%</div>
        </div>
        <div className="mt-1 font-display text-4xl font-extrabold">
          {H.money(saved, currency)}
          <span className="text-lg font-bold text-white/70"> / {H.money(target, currency)}</span>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${Math.max(2, pct * 100)}%` }}
          />
        </div>
      </Card>

      {/* Days to goal */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="gg-slide-up p-4 text-center">
          <div className="text-3xl">📅</div>
          <div className="font-display text-2xl font-extrabold text-violet-700">
            {days === null ? '—' : days === 0 ? 'Done!' : days}
          </div>
          <div className="text-xs font-bold text-violet-400">
            {days === 0 ? 'goal reached' : 'days to goal'}
          </div>
        </Card>
        <Card className="gg-slide-up p-4 text-center">
          <div className="text-3xl">🎯</div>
          <div className="font-display text-base font-extrabold leading-tight text-violet-700">
            {goalDate
              ? goalDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </div>
          <div className="text-xs font-bold text-violet-400">on this pace</div>
        </Card>
      </div>

      <WeeklyChart state={state} />
      <CategoryBreakdown state={state} />
      <Badges state={state} />
    </div>
  );
}

function WeeklyChart({ state }) {
  const currency = state.settings.currency;
  const limit = H.dailyLimit(state.settings);

  const data = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = H.toDateKey(d);
      const spend = H.spendOnDate(state.transactions, key);
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
        spend: Number(spend.toFixed(2)),
        over: spend > limit,
      });
    }
    return days;
  }, [state.transactions, limit]);

  const maxSpend = Math.max(limit, ...data.map((d) => d.spend), 1);

  return (
    <Card className="gg-slide-up p-4">
      <h3 className="mb-1 font-display text-lg font-extrabold text-violet-900">This week's spending</h3>
      <p className="mb-3 text-xs font-semibold text-violet-400">
        Dashed line = daily limit ({H.money(limit, currency)})
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -20 }}>
          <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 700, fill: '#a78bfa' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#c4b5fd' }} axisLine={false} tickLine={false} domain={[0, Math.ceil(maxSpend * 1.2)]} />
          <Tooltip
            cursor={{ fill: '#f5f3ff' }}
            formatter={(v) => [H.money(v, currency), 'Spent']}
            contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.15)', fontWeight: 700 }}
          />
          {/* limit reference line drawn as a thin bar background via ReferenceLine alt */}
          <Bar dataKey="spend" radius={[8, 8, 8, 8]} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.over ? '#fb923c' : '#a78bfa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CategoryBreakdown({ state }) {
  const currency = state.settings.currency;
  const data = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const totals = {};
    for (const t of state.transactions) {
      if (t.timestamp < weekAgo) continue;
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    }
    return CATEGORIES.map((c) => ({
      name: c.label,
      value: Number((totals[c.id] || 0).toFixed(2)),
      color: c.color,
      emoji: c.emoji,
    })).filter((d) => d.value > 0);
  }, [state.transactions]);

  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="gg-slide-up p-4">
      <h3 className="mb-3 font-display text-lg font-extrabold text-violet-900">Where it went (7 days)</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={34} outerRadius={60} paddingAngle={3}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => H.money(v, currency)} contentStyle={{ borderRadius: 16, border: 'none', fontWeight: 700 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data
            .sort((a, b) => b.value - a.value)
            .map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span>{d.emoji}</span>
                <span className="flex-1 font-bold text-violet-700">{d.name}</span>
                <span className="font-display font-extrabold text-violet-500">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
}

function Badges({ state }) {
  const earned = new Set(state.badges);
  const all = Object.values(BADGES);
  return (
    <Card className="gg-slide-up p-4">
      <h3 className="mb-3 font-display text-lg font-extrabold text-violet-900">Badges</h3>
      <div className="grid grid-cols-4 gap-3">
        {all.map((b) => {
          const has = earned.has(b.id);
          return (
            <div
              key={b.id}
              className={`flex flex-col items-center rounded-2xl p-2 text-center transition ${
                has ? 'bg-amber-50' : 'opacity-40 grayscale'
              }`}
              title={b.desc}
            >
              <div className={`text-3xl ${has ? 'gg-pop' : ''}`}>{b.emoji}</div>
              <div className="mt-1 text-[10px] font-bold leading-tight text-violet-600">{b.name}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
