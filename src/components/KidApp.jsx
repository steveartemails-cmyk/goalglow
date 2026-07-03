import React, { useEffect, useMemo, useState } from 'react';
import * as H from '../health';
import { CATEGORIES, categoryById, tipForDay, BADGES } from '../content';
import { Button, Card, Sheet, CountUp } from './ui';
import FadingPhoto from './FadingPhoto';
import KidDashboard from './KidDashboard';
import { sanitizeMoneyInput, parseMoney } from '../input';

export default function KidApp({ state, actions }) {
  const [tab, setTab] = useState('home');
  const [addOpen, setAddOpen] = useState(false);

  const currency = state.settings.currency;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-fuchsia-50/40 to-white pb-28">
      <KidHeader state={state} actions={actions} />

      <div className="px-4">
        {tab === 'home' ? (
          <Home state={state} actions={actions} onAdd={() => setAddOpen(true)} />
        ) : (
          <KidDashboard state={state} />
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} onAdd={() => setAddOpen(true)} />

      <AddSpending
        open={addOpen}
        onClose={() => setAddOpen(false)}
        state={state}
        actions={actions}
        currency={currency}
      />
    </div>
  );
}

function KidHeader({ state, actions }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-violet-400">Hey there</div>
        <h1 className="font-display text-2xl font-extrabold text-violet-900">
          {state.profile.childName} ✨
        </h1>
      </div>
      <button
        onClick={() => actions.setMode('parent')}
        className="gg-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm"
        aria-label="Grown-up settings"
        title="Grown-up settings"
      >
        ⚙️
      </button>
    </div>
  );
}

function Home({ state, actions, onAdd }) {
  const currency = state.settings.currency;
  const { left, limit, spentToday } = H.moneyLeftToday(state);
  const filter = H.photoFilter(state.health);
  const streak = H.currentStreak(state);
  const like = H.likelihood(state, state.goal.name);
  const overToday = left < 0;
  const goalReached = H.progressPercent(state) >= 1;

  const tip = useMemo(() => tipForDay(H.todayKey()), []);

  // One big party the first time the goal is reached.
  useEffect(() => {
    if (goalReached && !state.goalCelebrated) {
      actions.fireConfetti();
      actions.markGoalCelebrated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalReached, state.goalCelebrated]);

  if (goalReached) {
    return (
      <div className="space-y-4">
        <Card className="gg-slide-up bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 p-6 text-center">
          <div className="gg-float text-6xl">🏆</div>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-amber-900">
            YOU DID IT{state.profile.childName ? `, ${state.profile.childName}` : ''}!
          </h2>
          <p className="mt-2 font-display text-lg font-bold text-amber-800">
            You've saved {H.money(H.savedSoFar(state), currency)} — enough for your {state.goal.name}! 🎉
          </p>
          <p className="mt-3 text-sm font-semibold text-amber-700">
            Show a grown-up! When you've got it, they can set up your next goal in Grown-up
            settings.
          </p>
        </Card>
        <FadingPhoto state={state} />
        <RecentList state={state} actions={actions} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero: money left today */}
      <Card
        className={`gg-slide-up overflow-hidden p-5 ${
          overToday
            ? 'bg-gradient-to-br from-amber-100 to-orange-100'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
        }`}
      >
        <div className={`text-sm font-bold ${overToday ? 'text-amber-700' : 'text-white/80'}`}>
          {overToday ? '😬 Over today\'s limit' : '💸 Money left to spend today'}
        </div>
        <div className={`font-display text-5xl font-extrabold ${overToday ? 'text-amber-700' : 'text-white'}`}>
          <CountUp value={Math.abs(left)} format={(v) => `${currency}${v.toFixed(2)}`} />
        </div>
        <div className={`mt-1 text-sm font-semibold ${overToday ? 'text-amber-600' : 'text-white/80'}`}>
          {overToday
            ? `${H.money(Math.abs(left), currency)} over your ${H.money(limit, currency)} daily limit`
            : `Daily limit ${H.money(limit, currency)} · spent ${H.money(spentToday, currency)}`}
        </div>
      </Card>

      {/* The fading photo — the centerpiece */}
      <FadingPhoto state={state} />

      {/* Streak + likelihood */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="gg-slide-up flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-rose-100 p-4 text-center">
          <div className="text-3xl">{streak > 0 ? '🔥' : '🌱'}</div>
          <div className="font-display text-2xl font-extrabold text-orange-600">{streak}</div>
          <div className="text-xs font-bold text-orange-500">
            {streak === 1 ? 'day on track' : 'days on track'}
          </div>
        </Card>
        <Card className="gg-slide-up flex flex-col items-center justify-center p-4 text-center">
          <LikelihoodFace level={like.level} />
          <div className="mt-1 text-xs font-bold leading-tight text-violet-600">{like.label}</div>
        </Card>
      </div>

      {/* Add spending CTA */}
      <Button variant="primary" onClick={onAdd} className="w-full gg-pulse-ring">
        + Add spending
      </Button>

      {/* Parent message */}
      {state.parentMessage && (
        <Card className="gg-slide-up border-2 border-fuchsia-100 bg-fuchsia-50 p-4">
          <div className="text-xs font-bold uppercase text-fuchsia-400">💌 A note for you</div>
          <p className="mt-1 font-display text-base font-bold text-fuchsia-700">{state.parentMessage}</p>
        </Card>
      )}

      {/* Tip of the day */}
      <Card className="gg-slide-up bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
        <div className="text-xs font-bold uppercase text-sky-400">💡 Tip of the day</div>
        <p className="mt-1 text-sm font-semibold text-sky-800">{tip}</p>
      </Card>

      {/* Recent transactions */}
      <RecentList state={state} actions={actions} />
    </div>
  );
}

function LikelihoodFace({ level }) {
  const map = { good: '🎯', tricky: '🤔', unlikely: '💪' };
  return <div className="text-3xl">{map[level] || '🎯'}</div>;
}

function RecentList({ state, actions }) {
  const currency = state.settings.currency;
  const [editing, setEditing] = useState(null);
  const recent = state.transactions.slice(0, 8);

  if (recent.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-3xl">🧾</div>
        <p className="mt-2 text-sm font-semibold text-violet-500">
          No spending yet. When you spend, log it here to keep your goal glowing.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-2 font-display text-lg font-extrabold text-violet-900">Recent spending</h3>
      <div className="space-y-1">
        {recent.map((t) => {
          const cat = categoryById(t.category);
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: cat.color + '22' }}
              >
                {cat.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-bold text-violet-900">
                  {t.note || cat.label}
                  {t.editedByParent && (
                    <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-500">
                      edited by grown-up
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-violet-400">
                  {new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {cat.label}
                </div>
              </div>
              <div className="font-display text-sm font-extrabold text-violet-700">
                -{H.money(t.amount, currency).replace('-', '')}
              </div>
              <button
                onClick={() => setEditing(t)}
                className="gg-press ml-1 text-violet-300 hover:text-violet-500"
                aria-label="Edit"
              >
                ✏️
              </button>
            </div>
          );
        })}
      </div>

      <EditTx
        tx={editing}
        onClose={() => setEditing(null)}
        currency={currency}
        onSave={(patch) => {
          actions.updateTransaction(editing.id, patch);
          setEditing(null);
        }}
        onDelete={() => {
          actions.deleteTransaction(editing.id);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function EditTx({ tx, onClose, onSave, onDelete, currency }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('other');
  useEffect(() => {
    if (tx) {
      setAmount(String(tx.amount));
      setNote(tx.note || '');
      setCategory(tx.category);
    }
  }, [tx]);
  if (!tx) return null;
  return (
    <Sheet open={!!tx} onClose={onClose} title="Edit spending">
      <CategoryPicker value={category} onChange={setCategory} />
      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">Amount</span>
        <div className="flex items-center rounded-2xl border-2 border-violet-100 px-4 py-3">
          <span className="font-display text-xl text-violet-400">{currency}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">Note</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-2xl border-2 border-violet-100 px-4 py-3 outline-none focus:border-violet-400"
          placeholder="Optional"
          maxLength={40}
        />
      </label>
      <div className="mt-5 flex gap-3">
        <Button variant="danger" onClick={onDelete}>Delete</Button>
        <Button
          className="flex-1"
          disabled={parseMoney(amount) <= 0}
          onClick={() => onSave({ amount: parseMoney(amount), note, category })}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-bold text-violet-700">Category</span>
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`gg-press flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold transition ${
              value === c.id ? 'text-white' : 'text-violet-500'
            }`}
            style={{ background: value === c.id ? c.color : c.color + '1a' }}
          >
            <span className="text-xl">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddSpending({ open, onClose, state, actions, currency }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setCategory('food');
      setNote('');
    }
  }, [open]);

  const amt = parseFloat(amount) || 0;
  const { spentToday, limit } = H.moneyLeftToday(state);
  const projectedToday = spentToday + amt;
  const wouldBeOver = projectedToday > limit && amt > 0;
  const overspendAmount = Math.max(0, projectedToday - limit);
  const extraDays = H.extraDaysFromOverspend(overspendAmount, state.settings);
  const penalty = H.projectedTodayPenalty(projectedToday, limit);

  const submit = () => {
    if (amt <= 0) return;
    actions.addTransaction({ amount: amt, category, note });
    // Immediate feedback toast
    if (projectedToday > limit) {
      const extraMsg =
        extraDays === 0 ? 'a little extra time' : `about ${extraDays} extra ${extraDays === 1 ? 'day' : 'days'}`;
      actions.showToast(
        `Logged. Heads up — if today ends here, your goal fades a bit (${extraMsg} to reach ${state.goal.name}).`,
        'warning',
        4200
      );
    } else {
      actions.showToast('Nice — still within today\'s limit! 💚', 'success');
    }
    // Milestone confetti on streak-ish wins handled in dashboard/health crossings.
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add spending 🧾">
      <CategoryPicker value={category} onChange={setCategory} />

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">How much?</span>
        <div
          className={`flex items-center rounded-2xl border-2 px-4 py-3 transition-colors ${
            wouldBeOver ? 'border-amber-300 bg-amber-50' : 'border-violet-100'
          }`}
        >
          <span className="font-display text-2xl text-violet-400">{currency}</span>
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
            className="w-full bg-transparent px-2 font-display text-2xl outline-none"
            placeholder="0.00"
          />
        </div>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-2xl border-2 border-violet-100 px-4 py-3 outline-none focus:border-violet-400"
          placeholder="e.g. cinema with friends"
          maxLength={40}
        />
      </label>

      {/* Live preview */}
      {amt > 0 && (
        <div
          className={`gg-slide-up mt-4 rounded-2xl p-3 text-sm font-semibold ${
            wouldBeOver ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {wouldBeOver ? (
            <>
              ⚠️ This puts you {H.money(overspendAmount, currency)} over today's limit. If today ends
              here, your goal fades a bit — {extraDays === 0 ? 'a little extra time' : `about ${extraDays} extra ${extraDays === 1 ? 'day' : 'days'}`} to reach {state.goal.name}.
              <div className="mt-1 text-xs opacity-80">You can still course-correct before the day ends 💪</div>
            </>
          ) : (
            <>✅ Within today's limit — {H.money(limit - projectedToday, currency)} still free to spend today.</>
          )}
        </div>
      )}

      <Button
        variant={wouldBeOver ? 'soft' : 'success'}
        onClick={submit}
        disabled={amt <= 0}
        className="mt-5 w-full"
      >
        {wouldBeOver ? 'Log it anyway' : 'Log spending'}
      </Button>
    </Sheet>
  );
}

function BottomNav({ tab, setTab, onAdd }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around rounded-3xl bg-white/90 p-2 shadow-xl backdrop-blur">
        <NavBtn active={tab === 'home'} onClick={() => setTab('home')} emoji="🏠" label="Home" />
        <button
          onClick={onAdd}
          className="gg-press -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl text-white shadow-lg shadow-violet-500/40"
          aria-label="Add spending"
        >
          +
        </button>
        <NavBtn active={tab === 'progress'} onClick={() => setTab('progress')} emoji="📈" label="Progress" />
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, emoji, label }) {
  return (
    <button
      onClick={onClick}
      className={`gg-press flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-xs font-bold transition ${
        active ? 'text-violet-600' : 'text-violet-300'
      }`}
    >
      <span className="text-xl">{emoji}</span>
      {label}
    </button>
  );
}
