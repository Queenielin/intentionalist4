import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type Targets = { sleep: number; deep: number; nutrition: number };

const COLORS = {
  sleep: { base: 'bg-zinc-400', tint: 'bg-zinc-400/40' },
  deep: { base: 'bg-blue-500', tint: 'bg-blue-500/25' },
  nutrition: { base: 'bg-violet-500', tint: 'bg-violet-500/25' },
  remainder: { base: 'bg-muted/40' },
};

const pct = (h: number) => Math.max(0, Math.min(100, (h / 24) * 100));
const to1 = (n: number) => +n.toFixed(1);

interface CommitmentPanelProps {
  initial?: Targets;               // optional starting values
  onCommit: (t: Targets) => void;  // returns committed targets to parent
}

export default function CommitmentPanel({ initial, onCommit }: CommitmentPanelProps) {
  const [draft, setDraft] = useState<Targets>(initial ?? { sleep: 8, deep: 5, nutrition: 2 });

  const planned = draft.sleep + draft.deep + draft.nutrition;
  const remainder = Math.max(0, 24 - planned);

  const dangerNotes = useMemo(() => {
    const notes: string[] = [];
    // Sleep: rec 7–9; 6 = orange, <=5 = red
    if (draft.sleep <= 5) notes.push('Sleep ≤5h: high risk (red).');
    else if (draft.sleep === 6) notes.push('Sleep 6h: caution (orange).');

    // Deep: rec 4–6; <3 = orange, ≤2 = red
    if (draft.deep <= 2) notes.push('Deep ≤2h: very low focus time (red).');
    else if (draft.deep < 3) notes.push('Deep <3h: suboptimal for flow (orange).');

    // Nutrition (self-care/food/meal time): rec 1–3; <1 = orange, 0 = red
    if (draft.nutrition === 0) notes.push('Nutrition 0h: unrealistic (red).');
    else if (draft.nutrition < 1) notes.push('Nutrition <1h: may be rushed (orange).');

    return notes;
  }, [draft]);

  return (
    <Card className="p-4 bg-white border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Commitment</h3>
        <div className="text-xs text-muted-foreground">
          Pick your daily targets. Total time cannot exceed 24h.
        </div>
      </div>

      {/* Choice chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChoiceGroup
          label="Sleep (rec 7–9h)"
          options={[
            { h: 9, tone: 'good' },
            { h: 8, tone: 'good' },
            { h: 7, tone: 'good' },
            { h: 6, tone: 'warn' }, // orange
            { h: 5, tone: 'danger' }, // red
          ]}
          value={draft.sleep}
          onPick={(h) => setDraft(snapTo24({ ...draft, sleep: h }))}
        />

        <ChoiceGroup
          label="Deep Work (rec 4–6h)"
          options={[
            { h: 6, tone: 'good' },
            { h: 5, tone: 'good' },
            { h: 4, tone: 'good' },
            { h: 3, tone: 'warn' },
            { h: 2, tone: 'danger' },
          ]}
          value={draft.deep}
          onPick={(h) => setDraft(snapTo24({ ...draft, deep: h }))}
        />

        <ChoiceGroup
          label="Nutrition / Meals (rec 1–3h)"
          options={[
            { h: 3, tone: 'good' },
            { h: 2, tone: 'good' },
            { h: 1, tone: 'good' },
            { h: 0.5, tone: 'warn' },
            { h: 0, tone: 'danger' },
          ]}
          value={draft.nutrition}
          onPick={(h) => setDraft(snapTo24({ ...draft, nutrition: h }))}
        />
      </div>

      {/* Live 24h preview bar */}
      <div className="space-y-2">
        <div className="relative w-full h-4 rounded-lg overflow-hidden bg-muted/30 ring-1 ring-border/50">
          <div className="flex w-full h-full">
            <div className={`${COLORS.sleep.tint}`} style={{ width: `${pct(draft.sleep)}%` }} title={`Sleep target: ${draft.sleep}h`} />
            <div className={`${COLORS.deep.tint}`} style={{ width: `${pct(draft.deep)}%` }} title={`Deep target: ${draft.deep}h`} />
            <div className={`${COLORS.nutrition.tint}`} style={{ width: `${pct(draft.nutrition)}%` }} title={`Nutrition target: ${draft.nutrition}h`} />
            <div className={`${COLORS.remainder.base}`} style={{ width: `${pct(remainder)}%` }} title={`Unallocated: ${to1(remainder)}h`} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="text-muted-foreground">
            Planned: {to1(planned)}h • Remaining: {to1(remainder)}h
          </div>
          <Legend />
        </div>
      </div>

      {/* Helper / caution lines */}
      {dangerNotes.length > 0 && (
        <div className="space-y-1">
          {dangerNotes.map((n, i) => (
            <div key={i} className={n.includes('(red)') ? 'text-red-600 text-xs' : 'text-amber-700 text-xs'}>
              {n}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onCommit(draft)} className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          Commit targets
        </Button>
        <div className="text-xs text-muted-foreground">Commits the translucent baseline used below.</div>
      </div>
    </Card>
  );
}

/** ——— Helpers ——— */
function snapTo24(t: Targets): Targets {
  // If user’s three picks overflow 24h, trim Nutrition first, then Deep, then Sleep, minimally.
  const total = t.sleep + t.deep + t.nutrition;
  if (total <= 24) return t;

  let overflow = total - 24;
  const order: Array<keyof Targets> = ['nutrition', 'deep', 'sleep'];

  const out = { ...t };
  for (const k of order) {
    if (overflow <= 0) break;
    const take = Math.min(out[k], overflow);
    out[k] = to1(out[k] - take);
    overflow = to1(overflow - take);
  }
  return out;
}

function Legend() {
  return (
    <div className="flex items-center gap-4">
      <LegendSwatch className="bg-zinc-400/40" label="Sleep (target)" />
      <LegendSwatch className="bg-blue-500/25" label="Deep (target)" />
      <LegendSwatch className="bg-violet-500/25" label="Nutrition (target)" />
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

type Tone = 'good' | 'warn' | 'danger';
function chipTone(tone: Tone) {
  if (tone === 'good') return 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/15';
  if (tone === 'warn') return 'bg-amber-500/10 text-amber-800 border border-amber-500/30 hover:bg-amber-500/15';
  return 'bg-red-500/10 text-red-700 border border-red-500/30 hover:bg-red-500/15';
}

function ChoiceGroup({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: Array<{ h: number; tone: Tone }>;
  value: number;
  onPick: (h: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.h === value;
          return (
            <button
              key={`${label}-${o.h}`}
              type="button"
              onClick={() => onPick(o.h)}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${chipTone(o.tone)} ${active ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
            >
              {o.h}h
            </button>
          );
        })}
      </div>
    </div>
  );
}
