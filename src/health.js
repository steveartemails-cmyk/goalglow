// ---------------------------------------------------------------------------
// GoalGlow — Health-Score & Projection math
//
// Implemented EXACTLY to the Health-Score Specification. The numbers here are
// deliberate; do not "improve" them without updating the spec.
// ---------------------------------------------------------------------------

export const HEALTH_MIN = 0;
export const HEALTH_MAX = 100;
export const HEALTH_START = 100;

// --- Period helpers --------------------------------------------------------

export function daysInPeriod(frequency) {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'fortnightly':
      return 14;
    case 'monthly':
      return 30;
    default:
      return 7;
  }
}

// dailyLimit = (allowance × spendPercent) ÷ daysInPeriod
export function dailyLimit(settings) {
  const d = daysInPeriod(settings.frequency);
  if (d <= 0) return 0;
  return (settings.allowanceAmount * settings.spendPercent) / d;
}

// dailySaveRate = (allowance × savePercent) ÷ daysInPeriod
export function dailySaveRate(settings) {
  const d = daysInPeriod(settings.frequency);
  if (d <= 0) return 0;
  return (settings.allowanceAmount * settings.savePercent) / d;
}

// --- Core daily adjustment -------------------------------------------------

export function clampHealth(h) {
  return Math.max(HEALTH_MIN, Math.min(HEALTH_MAX, h));
}

// Given a single day's total spend and the daily limit, return the health
// adjustment for that day and a status label. Pure — no clamping of running
// total here; the caller clamps after applying.
export function dayAdjustment(daySpend, limit) {
  if (daySpend === 0) {
    // Saving counts — but slightly less than actively staying under on a real day.
    return { delta: 3, status: 'zero' };
  }
  if (daySpend <= limit) {
    // Under or exactly at limit.
    return { delta: 5, status: 'under' };
  }
  // Over limit — penalty scaled to how far over.
  const overspendRatio = (daySpend - limit) / limit;
  let penalty = 10 + overspendRatio * 20;
  if (penalty > 40) penalty = 40; // capped at 40 in a single day
  return { delta: -penalty, status: 'over' };
}

// --- Live preview (within the current day) ---------------------------------
// Projected penalty if today ended right now (NOT committed to stored health).
export function projectedTodayPenalty(todaySpend, limit) {
  const adj = dayAdjustment(todaySpend, limit);
  return adj.delta < 0 ? -adj.delta : 0; // positive number = points that would be lost
}

// "Extra days to goal" from an overspend amount.
//   extraDays = round( overspendAmount ÷ dailySaveRate )
export function extraDaysFromOverspend(overspendAmount, settings) {
  const rate = dailySaveRate(settings);
  if (rate <= 0 || overspendAmount <= 0) return 0;
  return Math.round(overspendAmount / rate);
}

// --- Date helpers ----------------------------------------------------------

export function toDateKey(d) {
  const dt = typeof d === 'number' || typeof d === 'string' ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

// The most recent CLOSED day — i.e. yesterday.
export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

// All date keys strictly between `fromKey` (exclusive) and `toKey` (exclusive).
export function daysBetweenExclusive(fromKey, toKey) {
  const out = [];
  const start = new Date(fromKey + 'T00:00:00');
  const end = new Date(toKey + 'T00:00:00');
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < end) {
    out.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Sum of spending logged on a given date key.
export function spendOnDate(transactions, dateKey) {
  return transactions
    .filter((t) => toDateKey(t.timestamp) === dateKey)
    .reduce((sum, t) => sum + t.amount, 0);
}

// ---------------------------------------------------------------------------
// Catch-up evaluation.
// Closes every day from lastEvaluatedDate (exclusive) up to today (exclusive),
// applying the daily adjustment for each. Today stays "live" / uncommitted.
// Returns a NEW partial state { health, healthLog, lastEvaluatedDate }.
// ---------------------------------------------------------------------------
// `lastEvaluatedDate` is the most recent CLOSED day that has been scored.
// When fully caught up it equals yesterday — never today, because today is
// still live. (Storing today here was the bug that froze health at 100 for
// anyone who opened the app daily: the open day was treated as scored, and
// the exclusive range then skipped every real day.)
export function catchUpHealth(state) {
  const today = todayKey();
  const yesterday = yesterdayKey();
  let health = state.health;
  const healthLog = [...state.healthLog];
  const limit = dailyLimit(state.settings);

  // First ever run: mark yesterday as the boundary so today gets scored
  // tomorrow. Days before onboarding are never evaluated.
  if (!state.lastEvaluatedDate) {
    return { health, healthLog, lastEvaluatedDate: yesterday };
  }

  if (state.lastEvaluatedDate >= yesterday) {
    // Every closed day is already scored (or the clock moved backwards —
    // never rewind the boundary).
    return { health, healthLog, lastEvaluatedDate: state.lastEvaluatedDate };
  }

  // daysBetweenExclusive(last, today) = last+1 … yesterday: exactly the
  // fully-closed days we haven't scored yet.
  const missed = daysBetweenExclusive(state.lastEvaluatedDate, today);
  for (const dayKey of missed) {
    if (healthLog.some((e) => e.date === dayKey)) continue; // never double-score
    const daySpend = spendOnDate(state.transactions, dayKey);
    const { delta, status } = dayAdjustment(daySpend, limit);
    health = clampHealth(health + delta);
    healthLog.push({ date: dayKey, status, score: health, spend: daySpend });
  }

  return { health, healthLog, lastEvaluatedDate: yesterday };
}

// ---------------------------------------------------------------------------
// Health → photo visual mapping.
// ---------------------------------------------------------------------------
export function photoFilter(health) {
  if (health >= 85) {
    return { filter: 'none', opacity: 1, sparkle: true, band: '85-100' };
  }
  if (health >= 60) {
    return { filter: 'none', opacity: 1, sparkle: false, band: '60-84' };
  }
  if (health >= 40) {
    return {
      filter: 'grayscale(30%) blur(1px)',
      opacity: 0.9,
      sparkle: false,
      band: '40-59',
    };
  }
  if (health >= 20) {
    return {
      filter: 'grayscale(60%) blur(2px)',
      opacity: 0.75,
      sparkle: false,
      band: '20-39',
    };
  }
  return {
    filter: 'grayscale(90%) blur(3px)',
    opacity: 0.55,
    sparkle: false,
    band: '0-19',
    needsHelp: true,
  };
}

// ---------------------------------------------------------------------------
// Rolling 7-day average → likelihood indicator.
// ---------------------------------------------------------------------------
export function rolling7Average(state) {
  const recent = state.healthLog.slice(-7);
  if (recent.length === 0) return state.health;
  const sum = recent.reduce((s, e) => s + e.score, 0);
  return sum / recent.length;
}

export function likelihood(state, goalName) {
  const avg = rolling7Average(state);
  if (avg >= 70) {
    return { level: 'good', label: 'On track! 🎯', value: avg };
  }
  if (avg >= 40) {
    return {
      level: 'tricky',
      label: 'Getting tricky — tighten up to stay on course',
      value: avg,
    };
  }
  return {
    level: 'unlikely',
    label: `Reaching ${goalName || 'your goal'} is drifting away — but you can turn it around!`,
    value: avg,
  };
}

// ---------------------------------------------------------------------------
// Streak: consecutive most-recent CLOSED days that were on-track
// (under-limit or no-spend). A single 'over' day breaks the streak.
// ---------------------------------------------------------------------------
export function currentStreak(state) {
  let streak = 0;
  for (let i = state.healthLog.length - 1; i >= 0; i--) {
    const entry = state.healthLog[i];
    if (entry.status === 'under' || entry.status === 'zero') streak++;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Savings progress & projected goal date.
// Saved-so-far = total allowance actually paid − total spent (unspent money,
// whether from the save split or unspent spending money, all counts toward the
// goal). Overspending therefore pushes the goal further away — by design.
// ---------------------------------------------------------------------------
export function totalPaid(state) {
  return state.allowancePayments.reduce((s, p) => s + p.amount, 0);
}

export function totalSpent(state) {
  return state.transactions.reduce((s, t) => s + t.amount, 0);
}

export function savedSoFar(state) {
  return Math.max(0, totalPaid(state) - totalSpent(state));
}

export function progressPercent(state) {
  const target = state.goal.targetCost;
  if (!target || target <= 0) return 0;
  return Math.min(1, savedSoFar(state) / target);
}

export function daysToGoal(state) {
  const target = state.goal.targetCost;
  const rate = dailySaveRate(state.settings);
  if (!target || target <= 0 || rate <= 0) return null;
  const remaining = target - savedSoFar(state);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / rate);
}

export function projectedGoalDate(state) {
  const d = daysToGoal(state);
  if (d === null) return null;
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt;
}

// --- Money left to spend TODAY (the hero number) ---------------------------
// Daily limit minus what's already been spent today. Can go negative (over).
export function moneyLeftToday(state) {
  const limit = dailyLimit(state.settings);
  const spentToday = spendOnDate(state.transactions, todayKey());
  return { left: limit - spentToday, limit, spentToday };
}

// --- Formatting ------------------------------------------------------------
export function money(amount, currency = '£') {
  const n = Number.isFinite(amount) ? amount : 0;
  const sign = n < 0 ? '-' : '';
  const decimals = currency === '¥' ? 0 : 2; // yen has no minor unit
  return `${sign}${currency}${Math.abs(n).toFixed(decimals)}`;
}
