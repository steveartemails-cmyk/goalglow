import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, clearState, uid, defaultState, hashPin } from './storage';
import * as H from './health';
import { BADGES } from './content';
import { Confetti, Toast } from './components/ui';
import Onboarding from './components/Onboarding';
import KidApp from './components/KidApp';
import ParentApp from './components/ParentApp';

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    // Run catch-up at startup so missed days get scored.
    if (loaded.onboarded) {
      const caught = H.catchUpHealth(loaded);
      return { ...loaded, ...caught };
    }
    return loaded;
  });

  const [mode, setMode] = useState('kid'); // 'kid' | 'parent'
  const [confettiKey, setConfettiKey] = useState(0);
  const [toast, setToast] = useState(null);
  const prevHealthBand = useRef(state.lastCelebratedBand || 0);

  // Persist on every change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Close out days that end while the app stays open (installed PWAs and
  // native shells can live in memory across midnights — launch-time catch-up
  // alone never fires for them).
  useEffect(() => {
    if (!state.onboarded) return;
    const tick = () => {
      setState((s) => {
        const caught = H.catchUpHealth(s);
        if (
          caught.lastEvaluatedDate === s.lastEvaluatedDate &&
          caught.healthLog.length === s.healthLog.length
        ) {
          return s; // nothing closed — keep the same object, no re-render
        }
        return { ...s, ...caught };
      });
    };
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    const id = setInterval(tick, 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.onboarded]);

  const fireConfetti = useCallback(() => setConfettiKey((k) => k + 1), []);
  const showToast = useCallback((message, tone = 'info', duration = 3200) => {
    setToast({ message, tone, duration, key: Date.now() });
  }, []);

  // --- Celebrate recovery when health crosses up through 60 / 85 ----------
  useEffect(() => {
    const band = state.health >= 85 ? 85 : state.health >= 60 ? 60 : 0;
    const prev = prevHealthBand.current;
    if (band > prev && state.onboarded) {
      if (band === 85) {
        showToast('Your goal is glowing again! ✨', 'success');
        fireConfetti();
      } else if (band === 60) {
        showToast('Your goal is coming back into focus! 🔍✨', 'success');
      }
    }
    prevHealthBand.current = band;
    if (state.lastCelebratedBand !== band) {
      setState((s) => ({ ...s, lastCelebratedBand: band }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.health, state.onboarded]);

  // --- Award milestone badges (streaks, progress, full health) -----------
  useEffect(() => {
    if (!state.onboarded) return;
    const streak = H.currentStreak(state);
    const pct = H.progressPercent(state);
    const toAdd = [];
    if (streak >= 3) toAdd.push('streak3');
    if (streak >= 7) toAdd.push('streak7');
    if (streak >= 14) toAdd.push('streak14');
    if (pct >= 0.5) toAdd.push('half');
    if (pct >= 1) toAdd.push('goal');
    // Earned, not given: a full week of closed days with health still at 100.
    if (state.health >= 100 && state.healthLog.length >= 7) toAdd.push('brightStart');

    const newOnes = toAdd.filter((b) => !state.badges.includes(b));
    if (newOnes.length > 0) {
      setState((s) => ({ ...s, badges: [...new Set([...s.badges, ...newOnes])] }));
      const first = BADGES[newOnes[0]];
      showToast(`New badge: ${first.emoji} ${first.name}!`, 'success');
      fireConfetti();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.health, state.transactions, state.allowancePayments, state.onboarded]);

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  const finishOnboarding = useCallback((data) => {
    setState((s) => ({
      ...s,
      onboarded: true,
      profile: { ...s.profile, childName: data.childName, parentPinHash: hashPin(data.parentPin) },
      settings: {
        ...s.settings,
        allowanceAmount: data.allowanceAmount,
        frequency: data.frequency,
        savePercent: data.savePercent,
        spendPercent: data.spendPercent,
        currency: data.currency || '£',
      },
      goal: {
        name: data.goalName,
        targetCost: data.targetCost,
        photo: data.photo,
        parentApproved: true,
      },
      health: H.HEALTH_START,
      // Yesterday = last closed, scored day — so today gets scored tomorrow.
      lastEvaluatedDate: H.yesterdayKey(),
      startDate: Date.now(),
      // Record the first allowance as paid so the kid has something to work with.
      allowancePayments: data.markFirstPaid
        ? [{ id: uid(), amount: data.allowanceAmount, timestamp: Date.now() }]
        : [],
    }));
    setMode('kid');
  }, []);

  // Add a spending transaction.
  const addTransaction = useCallback(
    ({ amount, category, note }) => {
      setState((s) => {
        const tx = {
          id: uid(),
          amount,
          category,
          note: note || '',
          timestamp: Date.now(),
          editedByParent: false,
        };
        const transactions = [tx, ...s.transactions];

        // Badge: first log
        const badges = [...s.badges];
        if (!badges.includes('firstLog')) badges.push('firstLog');

        return { ...s, transactions, badges };
      });
    },
    []
  );

  const updateTransaction = useCallback((id, patch, byParent = false) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...patch, editedByParent: byParent || t.editedByParent } : t
      ),
    }));
  }, []);

  const deleteTransaction = useCallback((id, byParent = false) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  // Parent-only updates
  const updateSettings = useCallback((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const updateGoal = useCallback((patch) => {
    setState((s) => ({ ...s, goal: { ...s.goal, ...patch } }));
  }, []);

  const updateProfile = useCallback((patch) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const recordAllowancePayment = useCallback((amount) => {
    if (!(amount > 0)) return;
    setState((s) => ({
      ...s,
      allowancePayments: [
        { id: uid(), amount, timestamp: Date.now() },
        ...s.allowancePayments,
      ],
    }));
  }, []);

  const deleteAllowancePayment = useCallback((id) => {
    setState((s) => ({
      ...s,
      allowancePayments: s.allowancePayments.filter((p) => p.id !== id),
    }));
  }, []);

  // The old goal was bought: deduct its cost from the savings pot (as a
  // negative "payment", so spending history and health are untouched) and
  // swap in the new goal.
  const startNewGoal = useCallback(({ name, targetCost, photo, previousCost }) => {
    setState((s) => ({
      ...s,
      goal: { name, targetCost, photo, parentApproved: true },
      allowancePayments:
        previousCost > 0
          ? [
              { id: uid(), amount: -previousCost, timestamp: Date.now(), note: 'goal-purchase' },
              ...s.allowancePayments,
            ]
          : s.allowancePayments,
      goalCelebrated: false,
      badges: s.badges.filter((b) => b !== 'half' && b !== 'goal'),
    }));
  }, []);

  const markGoalCelebrated = useCallback(() => {
    setState((s) => (s.goalCelebrated ? s : { ...s, goalCelebrated: true }));
  }, []);

  const setParentMessage = useCallback((msg) => {
    setState((s) => ({ ...s, parentMessage: msg }));
  }, []);

  const awardBadge = useCallback(
    (badgeId) => {
      setState((s) => {
        if (s.badges.includes(badgeId)) return s;
        return { ...s, badges: [...s.badges, badgeId] };
      });
    },
    []
  );

  const resetEverything = useCallback(() => {
    clearState();
    setState(defaultState());
    setMode('kid');
  }, []);

  const actions = useMemo(
    () => ({
      addTransaction,
      updateTransaction,
      deleteTransaction,
      updateSettings,
      updateGoal,
      updateProfile,
      recordAllowancePayment,
      deleteAllowancePayment,
      startNewGoal,
      markGoalCelebrated,
      setParentMessage,
      awardBadge,
      resetEverything,
      fireConfetti,
      showToast,
      setMode,
    }),
    [
      addTransaction,
      updateTransaction,
      deleteTransaction,
      updateSettings,
      updateGoal,
      updateProfile,
      recordAllowancePayment,
      deleteAllowancePayment,
      startNewGoal,
      markGoalCelebrated,
      setParentMessage,
      awardBadge,
      resetEverything,
      fireConfetti,
      showToast,
    ]
  );

  // ---------------------------------------------------------------------

  let view;
  if (!state.onboarded) {
    view = <Onboarding onFinish={finishOnboarding} />;
  } else if (mode === 'parent') {
    view = <ParentApp state={state} actions={actions} />;
  } else {
    view = <KidApp state={state} actions={actions} />;
  }

  return (
    <div className="mx-auto min-h-full max-w-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {view}
      <Confetti fire={confettiKey} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
