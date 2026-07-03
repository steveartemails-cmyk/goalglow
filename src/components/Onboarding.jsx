import React, { useState } from 'react';
import { Button, Card } from './ui';
import { FREQUENCY_LABELS, CURRENCIES } from '../content';
import { money } from '../health';
import { fileToDownscaledDataURL } from '../image';

// Parent-first onboarding wizard.
export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    parentPin: '',
    pinConfirm: '',
    childName: '',
    allowanceAmount: 10,
    frequency: 'weekly',
    spendPercent: 0.5,
    savePercent: 0.5,
    goalName: '',
    targetCost: 50,
    photo: '',
    currency: '£',
    markFirstPaid: true,
  });

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const steps = [
    <Welcome key="w" onNext={next} />,
    <PinStep key="pin" data={data} set={set} onNext={next} onBack={back} />,
    <NameStep key="name" data={data} set={set} onNext={next} onBack={back} />,
    <AllowanceStep key="allow" data={data} set={set} onNext={next} onBack={back} />,
    <SplitStep key="split" data={data} set={set} onNext={next} onBack={back} />,
    <GoalStep key="goal" data={data} set={set} onNext={next} onBack={back} />,
    <HandoverStep key="hand" data={data} onNext={next} onBack={back} />,
    <KidWelcome key="kid" data={data} onFinish={() => onFinish(data)} />,
  ];

  const totalDots = steps.length - 2; // welcome + kid-welcome aren't "progress"
  const dotIndex = Math.min(Math.max(step - 1, 0), totalDots - 1);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-violet-100 via-fuchsia-50 to-white px-5 py-8">
      {step > 0 && step < steps.length - 1 && (
        <div className="mb-6 flex justify-center gap-2">
          {Array.from({ length: totalDots }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === dotIndex ? 'w-6 bg-violet-500' : 'w-2 bg-violet-200'
              }`}
            />
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col">{steps[step]}</div>
    </div>
  );
}

function StepShell({ children }) {
  return <div className="gg-slide-up flex flex-1 flex-col">{children}</div>;
}

function Welcome({ onNext }) {
  return (
    <StepShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="gg-float mb-6 text-7xl">✨</div>
        <h1 className="font-display text-4xl font-extrabold text-violet-900">GoalGlow</h1>
        <p className="mt-4 max-w-xs text-lg font-semibold text-violet-700">
          Turn allowance into the thing you really want — and watch your goal glow as you save.
        </p>
        <p className="mt-3 max-w-xs text-sm font-medium text-violet-500">
          Let's set it up together. Grown-up goes first!
        </p>
      </div>
      <Button onClick={onNext} className="w-full">Let's go 🚀</Button>
    </StepShell>
  );
}

function ParentBadge() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
      👤 Grown-up setup
    </div>
  );
}

function PinStep({ data, set, onNext, onBack }) {
  const [error, setError] = useState('');
  const pinValid = /^\d{4}$/.test(data.parentPin);
  const match = data.parentPin === data.pinConfirm;

  const go = () => {
    if (!pinValid) return setError('PIN must be exactly 4 digits.');
    if (!match) return setError('PINs don\'t match — try again.');
    setError('');
    onNext();
  };

  return (
    <StepShell>
      <ParentBadge />
      <h2 className="font-display text-2xl font-extrabold text-violet-900">Create a parent PIN</h2>
      <p className="mt-2 text-sm font-medium text-violet-600">
        This 4-digit PIN locks the grown-up settings (allowance, goal, split). Your child can use
        everything else freely.
      </p>
      <div className="mt-6 space-y-4">
        <PinInput label="New PIN" value={data.parentPin} onChange={(v) => set({ parentPin: v })} />
        <PinInput label="Confirm PIN" value={data.pinConfirm} onChange={(v) => set({ pinConfirm: v })} />
      </div>
      {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
      <div className="mt-auto flex gap-3 pt-8">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={go} className="flex-1" disabled={!pinValid || !match}>Next</Button>
      </div>
    </StepShell>
  );
}

function PinInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-violet-700">{label}</span>
      <input
        inputMode="numeric"
        pattern="\d*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-center font-display text-2xl tracking-[0.5em] outline-none focus:border-violet-400"
        placeholder="••••"
      />
    </label>
  );
}

function NameStep({ data, set, onNext, onBack }) {
  return (
    <StepShell>
      <ParentBadge />
      <h2 className="font-display text-2xl font-extrabold text-violet-900">Who's saving?</h2>
      <p className="mt-2 text-sm font-medium text-violet-600">Your child's name so we can cheer them on.</p>
      <input
        value={data.childName}
        onChange={(e) => set({ childName: e.target.value })}
        className="mt-6 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 font-display text-lg outline-none focus:border-violet-400"
        placeholder="e.g. Alex"
        maxLength={20}
      />
      <div className="mt-auto flex gap-3 pt-8">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1" disabled={!data.childName.trim()}>Next</Button>
      </div>
    </StepShell>
  );
}

function AllowanceStep({ data, set, onNext, onBack }) {
  return (
    <StepShell>
      <ParentBadge />
      <h2 className="font-display text-2xl font-extrabold text-violet-900">Allowance</h2>
      <p className="mt-2 text-sm font-medium text-violet-600">How much, and how often?</p>

      <div className="mt-6">
        <span className="mb-2 block text-sm font-bold text-violet-700">Currency</span>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => set({ currency: c.symbol })}
              className={`gg-press rounded-2xl px-3 py-2 font-display text-sm font-bold transition ${
                data.currency === c.symbol
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-violet-600 border-2 border-violet-100'
              }`}
            >
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">Amount</span>
        <div className="flex items-center rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 focus-within:border-violet-400">
          <span className="font-display text-xl text-violet-400">{data.currency}</span>
          <input
            inputMode="decimal"
            value={data.allowanceAmount}
            onChange={(e) => set({ allowanceAmount: clampMoney(e.target.value) })}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>

      <div className="mt-5">
        <span className="mb-2 block text-sm font-bold text-violet-700">How often?</span>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => set({ frequency: key })}
              className={`gg-press rounded-2xl px-2 py-3 font-display text-sm font-bold transition ${
                data.frequency === key
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-violet-600 border-2 border-violet-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex gap-3 pt-8">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1" disabled={!(data.allowanceAmount > 0)}>Next</Button>
      </div>
    </StepShell>
  );
}

function SplitStep({ data, set, onNext, onBack }) {
  const spend = Math.round(data.spendPercent * 100);
  const save = 100 - spend;
  const setSpend = (v) => {
    const sp = Math.max(0, Math.min(100, v)) / 100;
    set({ spendPercent: sp, savePercent: 1 - sp });
  };
  return (
    <StepShell>
      <ParentBadge />
      <h2 className="font-display text-2xl font-extrabold text-violet-900">Save & spend split</h2>
      <p className="mt-2 text-sm font-medium text-violet-600">
        How much of each allowance goes to the goal vs. free spending?
      </p>

      <div className="mt-8 flex items-stretch gap-3">
        <div className="flex-1 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 p-4 text-center text-white" style={{ flexGrow: Math.max(save, 12) }}>
          <div className="text-xs font-bold opacity-90">SAVE 🐷</div>
          <div className="font-display text-3xl font-extrabold">{save}%</div>
        </div>
        <div className="flex-1 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-4 text-center text-white" style={{ flexGrow: Math.max(spend, 12) }}>
          <div className="text-xs font-bold opacity-90">SPEND 🛍️</div>
          <div className="font-display text-3xl font-extrabold">{spend}%</div>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={spend}
        onChange={(e) => setSpend(Number(e.target.value))}
        className="mt-8 w-full accent-violet-500"
      />
      <p className="mt-3 text-center text-sm font-semibold text-violet-600">
        Saves {money(data.allowanceAmount * data.savePercent, data.currency)} of every{' '}
        {money(data.allowanceAmount, data.currency)} allowance.
      </p>

      <div className="mt-auto flex gap-3 pt-8">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1">Next</Button>
      </div>
    </StepShell>
  );
}

function GoalStep({ data, set, onNext, onBack }) {
  const [busy, setBusy] = useState(false);
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToDownscaledDataURL(file);
      set({ photo: dataUrl });
    } catch {
      /* ignore unreadable files */
    } finally {
      setBusy(false);
    }
  };
  const ready = data.goalName.trim() && data.targetCost > 0;
  return (
    <StepShell>
      <ParentBadge />
      <h2 className="font-display text-2xl font-extrabold text-violet-900">The big goal 🎯</h2>
      <p className="mt-2 text-sm font-medium text-violet-600">
        The thing {data.childName || 'your child'} is saving for. The photo is the magic — it glows
        when they're on track and fades when they overspend.
      </p>

      <label className="mt-5 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">What is it?</span>
        <input
          value={data.goalName}
          onChange={(e) => set({ goalName: e.target.value })}
          className="w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 font-display text-lg outline-none focus:border-violet-400"
          placeholder="e.g. New skateboard"
          maxLength={30}
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-bold text-violet-700">How much does it cost?</span>
        <div className="flex items-center rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 focus-within:border-violet-400">
          <span className="font-display text-xl text-violet-400">{data.currency}</span>
          <input
            inputMode="decimal"
            value={data.targetCost}
            onChange={(e) => set({ targetCost: clampMoney(e.target.value) })}
            className="w-full bg-transparent px-2 font-display text-xl outline-none"
          />
        </div>
      </label>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-bold text-violet-700">Photo of the goal</span>
        <label className="gg-press flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white p-4">
          {busy ? (
            <div className="flex flex-col items-center py-8 text-violet-400">
              <span className="gg-float text-4xl">✨</span>
              <span className="mt-2 text-sm font-bold">Optimising photo…</span>
            </div>
          ) : data.photo ? (
            <img src={data.photo} alt="goal" className="h-40 w-full rounded-2xl bg-violet-50 object-contain" />
          ) : (
            <div className="flex flex-col items-center py-6 text-violet-400">
              <span className="text-4xl">📸</span>
              <span className="mt-2 text-sm font-bold">Tap to add a photo</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
        </label>
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1" disabled={!ready}>Next</Button>
      </div>
    </StepShell>
  );
}

function HandoverStep({ data, onNext, onBack }) {
  return (
    <StepShell>
      <Card className="mt-2 bg-violet-50 p-5">
        <h2 className="font-display text-2xl font-extrabold text-violet-900">All set! 🎉</h2>
        <ul className="mt-4 space-y-2 text-sm font-semibold text-violet-700">
          <li>🐷 Saving {Math.round(data.savePercent * 100)}% of {money(data.allowanceAmount, data.currency)} {FREQUENCY_LABELS[data.frequency].toLowerCase()}</li>
          <li>🎯 Goal: {data.goalName} ({money(data.targetCost, data.currency)})</li>
          <li>🔒 Settings locked with your PIN</li>
        </ul>
      </Card>
      <div className="mt-4 rounded-2xl bg-fuchsia-50 p-5 text-center">
        <div className="text-4xl">🤝</div>
        <p className="mt-2 font-display text-lg font-bold text-fuchsia-700">
          Now hand the device to {data.childName}!
        </p>
        <p className="mt-1 text-sm font-medium text-fuchsia-500">
          They'll get their own bright, fun screen.
        </p>
      </div>
      <div className="mt-auto flex gap-3 pt-8">
        <Button variant="soft" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="flex-1">Hand over →</Button>
      </div>
    </StepShell>
  );
}

function KidWelcome({ data, onFinish }) {
  return (
    <StepShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="gg-float mb-4 text-7xl">👋</div>
        <h1 className="font-display text-4xl font-extrabold text-violet-900">
          Hi {data.childName}!
        </h1>
        <p className="mt-4 max-w-xs text-lg font-semibold text-violet-700">
          This is your space. You're saving for a <b>{data.goalName}</b> — and you've totally got this.
        </p>
        <p className="mt-3 max-w-xs text-sm font-medium text-violet-500">
          Keep your spending under your daily limit and watch your goal glow. ✨
        </p>
      </div>
      <Button variant="success" onClick={onFinish} className="w-full">Start saving! 🌟</Button>
    </StepShell>
  );
}

function clampMoney(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
