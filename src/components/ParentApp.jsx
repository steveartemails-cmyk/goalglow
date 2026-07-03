import React, { useEffect, useRef, useState } from 'react';
import * as H from '../health';
import { categoryById, FREQUENCY_LABELS, CURRENCIES } from '../content';
import { Button, Card, Sheet } from './ui';
import { fileToDownscaledDataURL } from '../image';
import { hashPin } from '../storage';
import { sanitizeMoneyInput, parseMoney } from '../input';

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 30 * 1000;

export default function ParentApp({ state, actions }) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <PinGate
        state={state}
        onUnlock={() => setUnlocked(true)}
        onCancel={() => actions.setMode('kid')}
        onForgot={() => {
          if (
            confirm(
              'Forgot the PIN?\n\nThe only way back in is to erase ALL GoalGlow data on this device — goal, savings history, badges, everything — and set up again from scratch.\n\nErase everything now?'
            )
          ) {
            actions.resetEverything();
          }
        }}
      />
    );
  }
  return <ParentDashboard state={state} actions={actions} />;
}

function PinGate({ state, onUnlock, onCancel, onForgot }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, forceTick] = useState(0);
  const timerRef = useRef(null);

  // Re-render once a second while locked so the countdown stays honest.
  useEffect(() => {
    if (!lockedUntil) return;
    timerRef.current = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [lockedUntil]);

  const locked = lockedUntil > Date.now();
  const lockSecondsLeft = locked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  const check = (value) => {
    if (value.length === 4) {
      if (hashPin(value) === state.profile.parentPinHash) {
        onUnlock();
      } else {
        const n = attempts + 1;
        if (n >= MAX_PIN_ATTEMPTS) {
          setLockedUntil(Date.now() + PIN_LOCK_MS);
          setAttempts(0);
          setError('');
        } else {
          setAttempts(n);
          setError("That PIN isn't right.");
        }
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  const press = (d) => {
    if (locked) return;
    setError('');
    const next = (pin + d).slice(0, 4);
    setPin(next);
    check(next);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 px-6">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-800">Grown-up access</h1>
      <p className="mt-1 text-sm font-medium text-slate-500">Enter your 4-digit PIN</p>

      <div className="mt-6 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition ${
              pin.length > i ? 'bg-violet-500' : 'bg-slate-300'
            } ${error ? 'animate-pulse bg-rose-400' : ''}`}
          />
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
      {locked && (
        <p className="mt-3 text-sm font-bold text-amber-600">
          Too many tries — take a break for {lockSecondsLeft}s ⏳
        </p>
      )}

      <div className={`mt-8 grid grid-cols-3 gap-4 ${locked ? 'pointer-events-none opacity-40' : ''}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <PinKey key={n} onClick={() => press(String(n))}>{n}</PinKey>
        ))}
        <div />
        <PinKey onClick={() => press('0')}>0</PinKey>
        <PinKey onClick={() => setPin((p) => p.slice(0, -1))}>⌫</PinKey>
      </div>

      <button onClick={onCancel} className="mt-8 font-bold text-slate-400">
        ← Back to {state.profile.childName}'s screen
      </button>
      <button onClick={onForgot} className="mt-3 text-sm font-bold text-slate-300 underline">
        Forgot PIN?
      </button>
    </div>
  );
}

function PinKey({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="gg-press flex h-16 w-16 items-center justify-center rounded-2xl bg-white font-display text-2xl font-bold text-slate-700 shadow-sm"
    >
      {children}
    </button>
  );
}

function ParentDashboard({ state, actions }) {
  const currency = state.settings.currency;
  const [sheet, setSheet] = useState(null); // 'allowance' | 'goal' | 'message'

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Distinct parent header */}
      <div className="bg-slate-800 px-5 pb-6 pt-7 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Parent Mode</div>
            <h1 className="font-display text-2xl font-extrabold">{state.profile.childName}'s plan</h1>
          </div>
          <Button variant="success" onClick={() => actions.setMode('kid')} className="!py-2.5 !px-4 text-sm">
            Back to Kid Mode →
          </Button>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-300">
          You're here to help — everything you change is visible to {state.profile.childName}, never hidden.
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <SummaryRow state={state} />

        <SettingRow
          icon="💷"
          title="Allowance & split"
          detail={`${H.money(state.settings.allowanceAmount, currency)} ${FREQUENCY_LABELS[state.settings.frequency].toLowerCase()} · ${Math.round(state.settings.savePercent * 100)}% saved`}
          onClick={() => setSheet('allowance')}
        />
        <SettingRow
          icon="🎯"
          title="Savings goal"
          detail={`${state.goal.name} · ${H.money(state.goal.targetCost, currency)}`}
          onClick={() => setSheet('goal')}
        />
        <SettingRow
          icon="💌"
          title="Encouraging message"
          detail={state.parentMessage || 'None yet — leave a note for the kid'}
          onClick={() => setSheet('message')}
        />
        <SettingRow
          icon="🧒"
          title="Name & parent PIN"
          detail={`${state.profile.childName} · PIN ••••`}
          onClick={() => setSheet('profile')}
        />

        <PaymentCard state={state} actions={actions} />
        <ActivityFeed state={state} actions={actions} />

        <button
          onClick={() => {
            if (confirm('Reset GoalGlow completely? This erases all data on this device.')) {
              actions.resetEverything();
            }
          }}
          className="w-full py-3 text-sm font-bold text-slate-400"
        >
          Reset app
        </button>
      </div>

      {sheet === 'allowance' && <AllowanceSheet state={state} actions={actions} onClose={() => setSheet(null)} />}
      {sheet === 'goal' && <GoalSheet state={state} actions={actions} onClose={() => setSheet(null)} />}
      {sheet === 'message' && <MessageSheet state={state} actions={actions} onClose={() => setSheet(null)} />}
      {sheet === 'profile' && <ProfileSheet state={state} actions={actions} onClose={() => setSheet(null)} />}
    </div>
  );
}

function SummaryRow({ state }) {
  const currency = state.settings.currency;
  const saved = H.savedSoFar(state);
  const pct = Math.round(H.progressPercent(state) * 100);
  const days = H.daysToGoal(state);
  const avg = Math.round(H.rolling7Average(state));
  return (
    <div className="grid grid-cols-3 gap-3">
      <MiniStat label="Saved" value={H.money(saved, currency)} sub={`${pct}% of goal`} />
      <MiniStat label="Goal health" value={`${Math.round(state.health)}`} sub={`7-day avg ${avg}`} />
      <MiniStat label="Days to goal" value={days === null ? '—' : days} sub="at this pace" />
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <Card className="p-3 text-center">
      <div className="text-[11px] font-bold uppercase text-slate-400">{label}</div>
      <div className="font-display text-xl font-extrabold text-slate-800">{value}</div>
      <div className="text-[10px] font-medium text-slate-400">{sub}</div>
    </Card>
  );
}

function SettingRow({ icon, title, detail, onClick }) {
  return (
    <button
      onClick={onClick}
      className="gg-press flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-display font-extrabold text-slate-800">{title}</div>
        <div className="truncate text-sm font-medium text-slate-500">{detail}</div>
      </div>
      <span className="text-slate-300">›</span>
    </button>
  );
}

function PaymentCard({ state, actions }) {
  const currency = state.settings.currency;
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef(false); // state alone is stale within one tick — a bounce fires both taps before re-render
  const recent = state.allowancePayments.slice(0, 5);

  const markPaid = () => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setCooldown(true);
    setTimeout(() => {
      cooldownRef.current = false;
      setCooldown(false);
    }, 2500);
    actions.recordAllowancePayment(state.settings.allowanceAmount);
    actions.showToast(`Recorded ${H.money(state.settings.allowanceAmount, currency)} allowance 💛`, 'success');
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-extrabold text-slate-800">Allowance paid</div>
          <div className="text-sm font-medium text-slate-500">
            {recent.length === 0 ? 'No payments recorded yet' : 'Recent payments'}
          </div>
        </div>
        <Button variant="primary" className="!py-2.5 !px-4 text-sm" onClick={markPaid} disabled={cooldown}>
          Mark paid
        </Button>
      </div>
      {recent.length > 0 && (
        <div className="mt-3 space-y-1">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-base">{p.amount < 0 ? '🎯' : '💛'}</span>
              <div className="flex-1 text-sm font-bold text-slate-600">
                {p.amount < 0 ? 'Goal purchase' : 'Allowance'}
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {new Date(p.timestamp).toLocaleDateString()}
                </span>
              </div>
              <span className="font-display text-sm font-extrabold text-slate-700">
                {H.money(p.amount, currency)}
              </span>
              <button
                aria-label="Remove payment"
                className="gg-press px-1 text-slate-300 hover:text-rose-400"
                onClick={() => {
                  if (confirm(`Remove this ${H.money(p.amount, currency)} entry?`)) {
                    actions.deleteAllowancePayment(p.id);
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ActivityFeed({ state, actions }) {
  const currency = state.settings.currency;
  const [editing, setEditing] = useState(null);
  const tx = state.transactions.slice(0, 30);
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-display text-lg font-extrabold text-slate-800">Spending activity</h3>
      <p className="mb-3 text-xs font-medium text-slate-400">
        Read-only feed. You can correct an entry if needed — it'll be marked as edited.
      </p>
      {tx.length === 0 && <p className="text-sm font-medium text-slate-400">No spending logged yet.</p>}
      <div className="space-y-1">
        {tx.map((t) => {
          const cat = categoryById(t.category);
          return (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <span className="text-lg">{cat.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-700">
                  {t.note || cat.label}
                  {t.editedByParent && (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                      edited
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(t.timestamp).toLocaleDateString()} · {cat.label}
                </div>
              </div>
              <div className="font-display text-sm font-extrabold text-slate-700">
                {H.money(t.amount, currency)}
              </div>
              <button onClick={() => setEditing(t)} className="gg-press text-slate-300" aria-label="Edit entry">✏️</button>
            </div>
          );
        })}
      </div>

      {editing && (
        <ParentEditTx
          tx={editing}
          currency={currency}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            actions.updateTransaction(editing.id, patch, true);
            actions.showToast('Entry updated — visible to the kid as "edited by grown-up".', 'info');
            setEditing(null);
          }}
          onDelete={() => {
            actions.deleteTransaction(editing.id, true);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function ParentEditTx({ tx, onClose, onSave, onDelete, currency }) {
  const [amount, setAmount] = useState(String(tx.amount));
  const [note, setNote] = useState(tx.note || '');
  return (
    <Sheet open onClose={onClose} title="Correct entry">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Amount</span>
        <div className="flex items-center rounded-2xl border-2 border-slate-200 px-4 py-3">
          <span className="font-display text-xl text-slate-400">{currency}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Note</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none"
          maxLength={40}
        />
      </label>
      <div className="mt-5 flex gap-3">
        <Button variant="danger" onClick={onDelete}>Delete</Button>
        <Button
          className="flex-1"
          disabled={parseMoney(amount) <= 0}
          onClick={() => onSave({ amount: parseMoney(amount), note })}
        >
          Save correction
        </Button>
      </div>
    </Sheet>
  );
}

function AllowanceSheet({ state, actions, onClose }) {
  const [amount, setAmount] = useState(String(state.settings.allowanceAmount));
  const [frequency, setFrequency] = useState(state.settings.frequency);
  const [spend, setSpend] = useState(Math.round(state.settings.spendPercent * 100));
  const [currency, setCurrency] = useState(state.settings.currency);

  const amt = parseMoney(amount);
  const save = () => {
    if (amt <= 0) return;
    actions.updateSettings({
      allowanceAmount: amt,
      frequency,
      spendPercent: spend / 100,
      savePercent: 1 - spend / 100,
      currency,
    });
    actions.showToast('Allowance updated 💷', 'success');
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Allowance & split">
      <div className="mb-4">
        <span className="mb-2 block text-sm font-bold text-slate-600">Currency</span>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCurrency(c.symbol)}
              className={`gg-press rounded-xl px-3 py-2 text-sm font-bold transition ${
                currency === c.symbol ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Amount</span>
        <div className="flex items-center rounded-2xl border-2 border-slate-200 px-4 py-3">
          <span className="font-display text-xl text-slate-400">{currency}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>
      {amt <= 0 && (
        <p className="mt-2 text-xs font-bold text-rose-500">
          Allowance must be more than zero — otherwise every spend counts as over the limit.
        </p>
      )}

      <div className="mt-4">
        <span className="mb-2 block text-sm font-bold text-slate-600">Frequency</span>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FREQUENCY_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFrequency(k)}
              className={`gg-press rounded-2xl py-3 text-sm font-bold ${
                frequency === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm font-bold text-slate-600">
          <span>Save {100 - spend}%</span>
          <span>Spend {spend}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <p className="mt-2 text-xs font-medium text-slate-500">
          Daily spend limit becomes {H.money((amt * (spend / 100)) / H.daysInPeriod(frequency), currency)}.
        </p>
      </div>

      <Button className="mt-6 w-full" onClick={save} disabled={amt <= 0}>Save changes</Button>
    </Sheet>
  );
}

function GoalSheet({ state, actions, onClose }) {
  const [name, setName] = useState(state.goal.name);
  const [cost, setCost] = useState(String(state.goal.targetCost));
  const [photo, setPhoto] = useState(state.goal.photo);
  const [busy, setBusy] = useState(false);
  const [newGoalMode, setNewGoalMode] = useState(false);
  const goalReached = H.progressPercent(state) >= 1;
  const currency = state.settings.currency;

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToDownscaledDataURL(file);
      setPhoto(dataUrl);
    } catch {
      /* ignore unreadable files */
    } finally {
      setBusy(false);
    }
  };

  const ready = name.trim() && parseMoney(cost) > 0;
  const save = () => {
    if (!ready) return;
    if (newGoalMode) {
      actions.startNewGoal({
        name: name.trim(),
        targetCost: parseMoney(cost),
        photo,
        previousCost: state.goal.targetCost,
      });
      actions.showToast(`New goal started: ${name.trim()} 🌟`, 'success');
    } else {
      actions.updateGoal({
        name: name.trim(),
        targetCost: parseMoney(cost),
        photo,
        parentApproved: true,
      });
      actions.showToast('Goal updated 🎯', 'success');
    }
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={newGoalMode ? 'New goal 🌟' : 'Savings goal'}>
      {goalReached && !newGoalMode && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-700">
            🏆 Goal reached! Once {state.profile.childName} has {state.goal.name}, start the next
            one — {H.money(state.goal.targetCost, currency)} comes out of the savings pot and the
            leftovers roll over.
          </p>
          <Button
            variant="primary"
            className="mt-3 w-full !py-2.5 text-sm"
            onClick={() => {
              setNewGoalMode(true);
              setName('');
              setCost('');
              setPhoto('');
            }}
          >
            🎉 Bought it — start a new goal
          </Button>
        </div>
      )}
      {newGoalMode && (
        <p className="mb-4 rounded-2xl bg-violet-50 p-3 text-xs font-bold text-violet-600">
          Saving this records the {H.money(state.goal.targetCost, currency)} goal purchase and
          starts fresh with the goal below.
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Goal name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-display text-lg outline-none"
          maxLength={30}
          placeholder={newGoalMode ? 'e.g. Lego set' : undefined}
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Target cost</span>
        <div className="flex items-center rounded-2xl border-2 border-slate-200 px-4 py-3">
          <span className="font-display text-xl text-slate-400">{state.settings.currency}</span>
          <input
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(sanitizeMoneyInput(e.target.value))}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>
      <div className="mt-3">
        <span className="mb-1 block text-sm font-bold text-slate-600">Photo</span>
        <label className="gg-press flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-3">
          {busy ? (
            <span className="py-6 text-sm font-bold text-slate-400">✨ Optimising photo…</span>
          ) : photo ? (
            <img src={photo} alt="goal" className="h-32 w-full rounded-xl bg-slate-50 object-contain" />
          ) : (
            <span className="py-6 text-sm font-bold text-slate-400">📸 Tap to add a photo</span>
          )}
          <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
        </label>
      </div>
      <Button className="mt-6 w-full" onClick={save} disabled={!ready}>
        {newGoalMode ? 'Start new goal 🌟' : 'Save goal'}
      </Button>
    </Sheet>
  );
}

function ProfileSheet({ state, actions, onClose }) {
  const [name, setName] = useState(state.profile.childName);
  const [newPin, setNewPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const pinEntered = newPin.length > 0 || pinConfirm.length > 0;
  const pinValid = /^\d{4}$/.test(newPin) && newPin === pinConfirm;
  const canSave = name.trim() && (!pinEntered || pinValid);

  const save = () => {
    if (!canSave) return;
    actions.updateProfile({
      childName: name.trim(),
      ...(pinEntered && pinValid ? { parentPinHash: hashPin(newPin) } : {}),
    });
    actions.showToast(pinEntered ? 'Name and PIN updated 🔒' : 'Name updated ✨', 'success');
    onClose();
  };

  const pinField = (label, value, onChange) => (
    <label className="mt-3 block">
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <input
        inputMode="numeric"
        pattern="\d*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-center font-display text-xl tracking-[0.5em] outline-none"
        placeholder="••••"
      />
    </label>
  );

  return (
    <Sheet open onClose={onClose} title="Name & parent PIN">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-600">Child's name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-display text-lg outline-none"
          maxLength={20}
        />
      </label>
      <p className="mt-5 text-sm font-bold text-slate-600">Change PIN (optional)</p>
      {pinField('New 4-digit PIN', newPin, setNewPin)}
      {pinField('Confirm new PIN', pinConfirm, setPinConfirm)}
      {pinEntered && !pinValid && (
        <p className="mt-2 text-xs font-bold text-rose-500">
          PIN must be exactly 4 digits and match in both boxes.
        </p>
      )}
      <Button className="mt-6 w-full" onClick={save} disabled={!canSave}>
        Save
      </Button>
    </Sheet>
  );
}

function MessageSheet({ state, actions, onClose }) {
  const [msg, setMsg] = useState(state.parentMessage);
  return (
    <Sheet open onClose={onClose} title="Encouraging message">
      <p className="mb-3 text-sm font-medium text-slate-500">
        A short note {state.profile.childName} will see on their home screen.
      </p>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        maxLength={120}
        placeholder="e.g. So proud of how you're saving! Keep going 💛"
        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-violet-400"
      />
      <Button
        className="mt-4 w-full"
        onClick={() => {
          actions.setParentMessage(msg);
          actions.showToast('Message saved 💌', 'success');
          onClose();
        }}
      >
        Save message
      </Button>
    </Sheet>
  );
}
