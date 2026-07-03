// ---------------------------------------------------------------------------
// GoalGlow persistent storage layer
// A tiny localStorage-backed key-value store so all data survives sessions.
// No login, no backend — everything lives on this device.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'goalglow.state.v1';

// The single source of truth for the shape of saved data.
export function defaultState() {
  return {
    version: 1,
    onboarded: false,

    // Profile
    profile: {
      childName: '',
      parentPin: '', // 4-digit string, parent-locked
    },

    // Parent-locked settings
    settings: {
      allowanceAmount: 10,        // money per period
      frequency: 'weekly',        // 'weekly' | 'fortnightly' | 'monthly'
      savePercent: 0.5,           // 0..1
      spendPercent: 0.5,          // 0..1  (savePercent + spendPercent = 1)
      currency: '£',
    },

    // Savings goal
    goal: {
      name: '',
      targetCost: 0,
      photo: '',                  // base64 data URL
      parentApproved: false,
    },

    // Spending log
    transactions: [],             // { id, amount, category, note, timestamp, editedByParent }

    // One entry per closed day
    healthLog: [],                // { date:'YYYY-MM-DD', status:'under'|'zero'|'over', score, spend }

    // Current committed health (closed days only). Today is "live", not committed.
    health: 100,
    lastEvaluatedDate: null,      // 'YYYY-MM-DD' of last CLOSED day we scored

    // Parent records when allowance is actually handed over
    allowancePayments: [],        // { id, amount, timestamp }

    // Custom encouragement from the parent
    parentMessage: '',

    // Progress / gamification
    badges: [],                   // array of badge ids earned
    startDate: null,              // timestamp onboarding finished

    // Last health threshold band we celebrated crossing up through (60 / 85)
    lastCelebratedBand: 0,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields don't break old saves.
    return deepMerge(defaultState(), parsed);
  } catch (e) {
    console.warn('GoalGlow: failed to load state, starting fresh.', e);
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('GoalGlow: failed to save state.', e);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

// Shallow-ish deep merge: defaults provide the skeleton, saved overrides values.
function deepMerge(base, override) {
  if (Array.isArray(base)) return override ?? base;
  if (typeof base === 'object' && base !== null) {
    const out = { ...base };
    for (const key of Object.keys(base)) {
      if (override && key in override) {
        out[key] = deepMerge(base[key], override[key]);
      }
    }
    // carry over any extra keys present in override
    if (override) {
      for (const key of Object.keys(override)) {
        if (!(key in out)) out[key] = override[key];
      }
    }
    return out;
  }
  return override ?? base;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
