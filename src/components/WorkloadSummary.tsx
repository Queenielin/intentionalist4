// src/components/WorkloadSummary.tsx
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Task, CATEGORY_TO_BUCKET } from '@/types/task';
import { AlertCircle, BarChart2 } from 'lucide-react';

interface WorkloadSummaryProps {
  tasks: Task[];
}

/** ----------------- Policy & Visual Settings ----------------- */
// Simple limits you described (kept)
const PRODUCTIVITY_LIMITS = {
  deep: { beginner: { min: 1, max: 2 }, trained: { min: 3, max: 4 }, ceiling: 5 },
  light: { daily: { min: 4, max: 6 }, ceiling: 6 },
  total: { daily: { min: 5, max: 7 }, ceiling: 7 },
};

// Recommended zones (for slider highlighting + helper copy)
const RECS = {
  deep: { min: 4, max: 6, cautionBelow: 3 },     // <3h turns orange
  sleep: { min: 7, max: 9, cautionAt: 6 },       // 6h is orange
  nutrition: { min: 1, max: 3 },                  // advisory, no strict warning
};

// Colors
const COLORS = {
  deep: { base: 'bg-blue-500', tint: 'bg-blue-500/25' },
  light: { base: 'bg-emerald-500', tint: 'bg-emerald-500/25' },
  admin: { base: 'bg-amber-500', tint: 'bg-amber-500/25' },
  sleep: { base: 'bg-zinc-400', tint: 'bg-zinc-400/40' },
  nutrition: { base: 'bg-violet-500', tint: 'bg-violet-500/25' },
  remainder: { base: 'bg-muted/40' },
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const to1 = (n: number) => +n.toFixed(1);
const pctOfDay = (hrs: number) => clamp((hrs / 24) * 100, 0, 100);

/** =======================================================================
 * WorkloadSummary
 * - Adds sliders for Deep / Sleep / Nutrition targets
 * - Commit sets the translucent (baseline) portions of the 24h bar
 * - Solid overlays show actuals for Deep/Light/Admin/Nutrition (if present)
 * ======================================================================= */
export default function WorkloadSummary({ tasks }: WorkloadSummaryProps) {
  /** ----------------- Aggregate actuals from open tasks ----------------- */
  const { hours } = useMemo(() => {
    const open = tasks.filter(t => !t.completed && t.duration);

    // Support nutrition if you have such a category (safe even if not used)
    const mins = { deep: 0, light: 0, admin: 0, nutrition: 0, total: 0 };
    for (const t of open) {
      if (!t.category) continue;
      const bucket = CATEGORY_TO_BUCKET[t.category] ?? t.category; // fallback
      const key = (['deep', 'light', 'admin', 'nutrition'] as const).includes(bucket as any)
        ? (bucket as 'deep' | 'light' | 'admin' | 'nutrition')
        : undefined;
      if (!key) continue;
      mins[key] += t.duration;
      mins.total += t.duration;
    }

    const hours = {
      deep: to1(mins.deep / 60),
      light: to1(mins.light / 60),
      admin: to1(mins.admin / 60),
      nutrition: to1(mins.nutrition / 60),
      total: to1(mins.total / 60),
    };
    return { hours };
  }, [tasks]);

  /** ----------------- Slider state (draft vs committed) ----------------- */
  // Defaults (feel free to lift to props or user profile)
  const [draft, setDraft] = useState({
    deep: 4.5,        // within 4–6
    sleep: 8,         // within 7–9
    nutrition: 1.5,   // within 1–3
  });
  const [targets, setTargets] = useState({
    deep: 4.5,
    sleep: 8,
    nutrition: 1.5,
  });

  // Commit button saves current draft to be used in the translucent baseline
  const commitTargets = () => setTargets({ ...draft });

  /** ----------------- Derived deltas & warnings (yours kept) ------------- */
  const deltas = {
    deep: to1(hours.deep - targets.deep),
    light: 0, // you can add target for light later if you wish
    admin: 0,
    nutrition: to1(hours.nutrition - targets.nutrition),
    totalWork: to1(hours.total - (targets.deep + targets.nutrition)), // rough comparator
  };

  const warnings: Array<{ type: 'deep' | 'light' | 'total'; message: string; severity: 'warning' | 'error' }> = [];

  if (hours.deep > PRODUCTIVITY_LIMITS.deep.ceiling) {
    warnings.push({ type: 'deep', message: `Deep: ${hours.deep}h exceeds ceiling (${PRODUCTIVITY_LIMITS.deep.ceiling}h)`, severity: 'error' });
  } else if (hours.deep > PRODUCTIVITY_LIMITS.deep.trained.max) {
    warnings.push({ type: 'deep', message: `Deep: ${hours.deep}h exceeds trained limit (${PRODUCTIVITY_LIMITS.deep.trained.max}h)`, severity: 'warning' });
  }
  if (hours.light > PRODUCTIVITY_LIMITS.light.ceiling) {
    warnings.push({ type: 'light', message: `Light: ${hours.light}h exceeds ceiling (${PRODUCTIVITY_LIMITS.light.ceiling}h)`, severity: 'error' });
  }
  if (hours.total > PRODUCTIVITY_LIMITS.total.ceiling) {
    warnings.push({ type: 'total', message: `Total: ${hours.total}h exceeds daily ceiling (${PRODUCTIVITY_LIMITS.total.ceiling}h)`, severity: 'error' });
  }

  /** ----------------- 24h bar layout numbers ----------------- */
  const baseline = {
    sleep: targets.sleep,
    deep: targets.deep,
    light: 0,          // not targeted yet; you can add later
    admin: 0,          // not targeted yet; you can add later
    nutrition: targets.nutrition,
  };
  const planned =
    baseline.sleep + baseline.deep + baseline.nutrition + baseline.light + baseline.admin;
  const remainderTarget = Math.max(0, 24 - planned);

  // Absolute starts for baseline segments
  const start = {
    sleep: 0,
    deep: baseline.sleep,
    nutrition: baseline.sleep + baseline.deep,
    // If you add light/admin targets later, insert them here before nutrition or after—your call
  };

  // Actual overlays (position them roughly where their targets sit)
  const actual = {
    deep: Math.max(0, hours.deep),
    light: Math.max(0, hours.light),
    admin: Math.max(0, hours.admin),
    nutrition: Math.max(0, hours.nutrition),
  };

  /** ----------------- Slider helpers (bands + coloring) ----------------- */
  const thumbToneDeep =
    draft.deep < RECS.deep.cautionBelow ? 'ring-amber-500' : 'ring-primary';
  const thumbToneSleep =
    draft.sleep === RECS.sleep.cautionAt ? 'ring-amber-500' : 'ring-primary';
  const thumbToneNutrition = 'ring-primary';

  return (
    <Card className="p-4 bg-muted/30 border-0 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">Workload Summary (24h)</h4>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {/* Deep */}
        <SliderRow
          label="Deep Work"
          value={draft.deep}
          onValueChange={(v) => setDraft((s) => ({ ...s, deep: v }))}
          min={0}
          max={10}
          step={0.5}
          recMin={RECS.deep.min}
          recMax={RECS.deep.max}
          cautionText={draft.deep < RECS.deep.cautionBelow ? 'Below focus-supporting threshold (<3h)' : undefined}
          color={COLORS.deep.base}
          thumbTone={thumbToneDeep}
        />

        {/* Sleep */}
        <SliderRow
          label="Sleep"
          value={draft.sleep}
          onValueChange={(v) => setDraft((s) => ({ ...s, sleep: v }))}
          min={0}
          max={12}
          step={0.5}
          recMin={RECS.sleep.min}
          recMax={RECS.sleep.max}
          cautionText={draft.sleep === RECS.sleep.cautionAt ? 'Caution: 6h is suboptimal' : undefined}
          color={COLORS.sleep.base}
          thumbTone={thumbToneSleep}
        />

        {/* Nutrition */}
        <SliderRow
          label="Nutrition"
          value={draft.nutrition}
          onValueChange={(v) => setDraft((s) => ({ ...s, nutrition: v }))}
          min={0}
          max={6}
          step={0.5}
          recMin={RECS.nutrition.min}
          recMax={RECS.nutrition.max}
          color={COLORS.nutrition.base}
          thumbTone={thumbToneNutrition}
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={commitTargets}>Commit targets</Button>
          <div className="text-xs text-muted-foreground self-center">
            Commit saves the translucent baseline in the bar below.
          </div>
        </div>
      </div>

      {/* Single 24h stacked bar with baseline (translucent) + actual overlays (solid) */}
      <div className="space-y-2">
        <div className="relative w-full h-4 rounded-lg overflow-hidden bg-muted/30 ring-1 ring-border/50">
          {/* Baseline (targets) */}
          <div className="flex w-full h-full">
            {/* Sleep */}
            <div className={`${COLORS.sleep.tint}`} style={{ width: `${pctOfDay(baseline.sleep)}%` }} title={`Sleep target: ${targets.sleep}h`} />
            {/* Deep */}
            <div className={`${COLORS.deep.tint}`} style={{ width: `${pctOfDay(baseline.deep)}%` }} title={`Deep target: ${targets.deep}h`} />
            {/* Nutrition */}
            <div className={`${COLORS.nutrition.tint}`} style={{ width: `${pctOfDay(baseline.nutrition)}%` }} title={`Nutrition target: ${targets.nutrition}h`} />
            {/* Remainder */}
            <div className={`${COLORS.remainder.base}`} style={{ width: `${pctOfDay(remainderTarget)}%` }} title={`Unallocated: ${to1(24 - planned)}h`} />
          </div>

          {/* Actual overlays (aligned to their counterpart targets) */}
          {/* Sleep: we usually don't track as tasks; omit overlay intentionally */}

          {/* Deep actual */}
          <div
            className={`absolute top-0 h-4 ${COLORS.deep.base}`}
            style={{ left: `${pctOfDay(start.deep)}%`, width: `${pctOfDay(actual.deep)}%` }}
            title={`Deep actual: ${hours.deep}h`}
          />
          {/* Nutrition actual */}
          <div
            className={`absolute top-0 h-4 ${COLORS.nutrition.base}`}
            style={{ left: `${pctOfDay(start.nutrition)}%`, width: `${pctOfDay(actual.nutrition)}%` }}
            title={`Nutrition actual: ${hours.nutrition}h`}
          />
          {/* Light/Admin actuals: show after nutrition for now; tweak positions if you add targets */}
          <div
            className={`absolute top-0 h-4 ${COLORS.light.base}`}
            style={{ left: `${pctOfDay(start.nutrition + baseline.nutrition)}%`, width: `${pctOfDay(actual.light)}%` }}
            title={`Light actual: ${hours.light}h`}
          />
          <div
            className={`absolute top-0 h-4 ${COLORS.admin.base}`}
            style={{ left: `${pctOfDay(start.nutrition + baseline.nutrition + actual.light)}%`, width: `${pctOfDay(actual.admin)}%` }}
            title={`Admin actual: ${hours.admin}h`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <LegendSwatch className="bg-zinc-400" label="Sleep (target)" />
          <LegendSwatch className="bg-blue-500/25" label="Deep (target)" />
          <LegendSwatch className="bg-blue-500" label="Deep (actual)" />
          <LegendSwatch className="bg-violet-500/25" label="Nutrition (target)" />
          <LegendSwatch className="bg-violet-500" label="Nutrition (actual)" />
          <LegendSwatch className="bg-emerald-500" label="Light (actual)" />
          <LegendSwatch className="bg-amber-500" label="Admin (actual)" />
        </div>
      </div>

      {/* Quick numbers */}
      <div className="grid grid-cols-5 gap-3 text-sm">
        <Tile label="Sleep (target)" value={`${targets.sleep}h`} />
        <Tile label="Deep (target)" value={`${targets.deep}h`} />
        <Tile label="Nutrition (target)" value={`${targets.nutrition}h`} />
        <Tile label="Deep (actual)" value={`${hours.deep}h`} />
        <Tile label="Total Work (actual)" value={`${hours.total}h`} />
      </div>

      {/* Helper messages under the bar */}
      <div className="space-y-1 text-xs">
        <HelperLine
          label="Deep"
          delta={deltas.deep}
          target={targets.deep}
          caution={targets.deep < RECS.deep.cautionBelow ? 'Deep target is below 3h; flow may be harder to reach.' : undefined}
        />
        <HelperLine
          label="Sleep"
          delta={0}
          target={targets.sleep}
          caution={targets.sleep === RECS.sleep.cautionAt ? '6h is a caution zone; most adults benefit from 7–9h.' : undefined}
        />
        <HelperLine
          label="Nutrition"
          delta={deltas.nutrition}
          target={targets.nutrition}
        />
        <HelperLine
          label="Total Work"
          delta={deltas.totalWork}
          target={to1(targets.deep + targets.nutrition)}
          subtle
        />
      </div>

      {/* Your original warning chips */}
      {warnings.length > 0 && (
        <div className="space-y-2 pt-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${
                w.severity === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** =================== Presentational bits =================== */
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md p-3 bg-background/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function HelperLine({
  label,
  delta,
  target,
  caution,
  subtle,
}: {
  label: string;
  delta: number;
  target: number;
  caution?: string;
  subtle?: boolean;
}) {
  const over = delta > 0;
  const tone = subtle ? 'text-muted-foreground' : over ? 'text-amber-700' : delta < 0 ? 'text-emerald-700' : 'text-muted-foreground';
  return (
    <div className={tone}>
      {label}: {delta === 0 ? 'on target' : `${over ? '+' : ''}${delta}h ${over ? 'above' : 'below'} target`} ({target}h).
      {caution ? <span className="ml-1 text-amber-700">{caution}</span> : null}
    </div>
  );
}

/** Slider row with recommended-zone band behind the track */
function SliderRow({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  recMin,
  recMax,
  cautionText,
  color,
  thumbTone = 'ring-primary',
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  recMin: number;
  recMax: number;
  cautionText?: string;
  color: string;        // e.g., 'bg-blue-500'
  thumbTone?: string;   // e.g., 'ring-amber-500'
}) {
  // Convert hours domain to % for the green band
  const recLeft = ((recMin - min) / (max - min)) * 100;
  const recWidth = ((recMax - recMin) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xs">{value}h</div>
      </div>

      <div className="relative">
        {/* Recommended band */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded"
          style={{ left: `${recLeft}%`, width: `${recWidth}%`, background: 'rgb(34 197 94 / 0.35)' /* emerald-500/35 */ }}
        />
        {/* Slider track */}
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(arr) => onValueChange(to1(arr[0]))}
          className="relative"
        />
        {/* Thumb accent (ring color) */}
        <style>{`
          /* shadcn slider thumb accent */
          .slider-thumb-accent [role="slider"] { box-shadow: 0 0 0 3px hsl(var(--primary)) }
        `}</style>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-block w-3 h-3 rounded ${color}`} />
        <span className="text-muted-foreground">
          Recommended {recMin}–{recMax}h
          {cautionText ? <span className="ml-2 text-amber-700">{cautionText}</span> : null}
        </span>
      </div>
    </div>
  );
}
