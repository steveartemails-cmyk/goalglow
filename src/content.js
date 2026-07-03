// Categories, tips, badges and other friendly content.

export const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍔', color: '#fb923c' },
  { id: 'games', label: 'Games', emoji: '🎮', color: '#a78bfa' },
  { id: 'clothes', label: 'Clothes', emoji: '👕', color: '#38bdf8' },
  { id: 'fun', label: 'Fun', emoji: '🎉', color: '#f472b6' },
  { id: 'other', label: 'Other', emoji: '✨', color: '#34d399' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// Short, friendly, no-jargon tips. Rotated on the home screen.
export const TIPS = [
  'Wait a day before buying something you really want. If you still want it tomorrow, it might be worth it!',
  'Every pound you don\'t spend today is a pound closer to your goal. 💪',
  'Try a "no-spend day" — see how far your money stretches when you skip one treat.',
  'Big goals are just small savings stacked up. Keep stacking! 🧱',
  'Snacks add up fast. A drink here, a sweet there… little spends are sneaky.',
  'Ask yourself: do I want it, or do I just want it right now?',
  'Saving isn\'t missing out — it\'s choosing something bigger later.',
  'Spotted something cheaper somewhere else? That\'s a win for your goal.',
  'Round down what you can spend, round up what you save. Future-you says thanks.',
  'Staying under your limit even once today keeps your goal nice and bright. ✨',
  'Money you save quietly grows into something loud and awesome later.',
  'You don\'t have to spend it just because you have it.',
];

export function tipForDay(dateKey) {
  // Deterministic per day so it feels stable, not random on every render.
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  return TIPS[hash % TIPS.length];
}

// Badges — earned and celebrated.
export const BADGES = {
  firstLog: { id: 'firstLog', emoji: '📝', name: 'First Step', desc: 'Logged your first spend' },
  streak3: { id: 'streak3', emoji: '🔥', name: '3-Day Streak', desc: '3 days on track' },
  streak7: { id: 'streak7', emoji: '⭐', name: 'Week Warrior', desc: '7 days on track' },
  streak14: { id: 'streak14', emoji: '🏆', name: 'Two-Week Titan', desc: '14 days on track' },
  half: { id: 'half', emoji: '🌗', name: 'Halfway Hero', desc: 'Halfway to your goal' },
  goal: { id: 'goal', emoji: '🎯', name: 'Goal Getter', desc: 'Reached your goal!' },
  brightStart: { id: 'brightStart', emoji: '🌟', name: 'Bright Spark', desc: 'Kept your goal glowing at full health' },
};

export const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

// Currencies the app can display. `symbol` is what we prefix amounts with.
export const CURRENCIES = [
  { symbol: '£', code: 'GBP', label: 'Pound' },
  { symbol: '$', code: 'USD', label: 'Dollar' },
  { symbol: '€', code: 'EUR', label: 'Euro' },
  { symbol: '¥', code: 'JPY', label: 'Yen' },
  { symbol: '₹', code: 'INR', label: 'Rupee' },
  { symbol: 'A$', code: 'AUD', label: 'Aus $' },
  { symbol: 'C$', code: 'CAD', label: 'Can $' },
  { symbol: 'R', code: 'ZAR', label: 'Rand' },
  { symbol: '฿', code: 'THB', label: 'Baht' },
];
