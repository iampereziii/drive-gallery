import { useState, type FormEvent } from 'react';
import { MAX_LIKE_GOAL } from '../../types';
import { goalMet, likesLabel } from '../lib/cull';

interface Props {
  like: number;
  goal?: number;
  /** Save a new goal (null clears it). Rejects with a message on failure. */
  onSave: (goal: number | null) => Promise<void>;
}

/**
 * The big ♥ count on the All Likes page. Tap it to set or clear a goal you are
 * trimming toward; the goal is saved on the host so every device shows it.
 */
export default function LikeGoal({ like, goal, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setValue(goal === undefined ? '' : String(goal));
    setError(null);
    setEditing(true);
  };

  const save = async (next: number | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') return void save(null);
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIKE_GOAL) {
      setError(`Enter a whole number from 1 to ${MAX_LIKE_GOAL.toLocaleString()}, or leave it blank.`);
      return;
    }
    void save(n);
  };

  const met = goalMet(like, goal);
  const toGo = goal !== undefined && !met ? like - goal : 0;

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="flex w-full flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-neutral-300">
          <span className="text-2xl font-semibold text-emerald-300">♥ {like}</span>
          <span>goal</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LIKE_GOAL}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 300"
            className="w-24 rounded-md bg-neutral-900 px-2 py-1.5 text-base text-neutral-100 ring-1 ring-neutral-700 focus:outline-none focus:ring-emerald-500"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          Save
        </button>
        {goal !== undefined && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(null)}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 disabled:opacity-50"
          >
            Clear goal
          </button>
        )}
        <button type="button" onClick={() => setEditing(false)} className="px-2 py-1.5 text-sm text-neutral-400">
          Cancel
        </button>
        {error && <p className="w-full text-sm text-red-300">{error}</p>}
      </form>
    );
  }

  return (
    <button type="button" onClick={open} className="text-left" title="Tap to set a Like goal">
      <span className={`text-2xl font-semibold ${goal !== undefined && !met ? 'text-amber-300' : 'text-emerald-300'}`}>
        {likesLabel(like, goal)}
        {met && ' ✓'}
      </span>{' '}
      <span className="text-neutral-400">
        {goal === undefined
          ? 'liked across all folders · set a goal'
          : met
            ? 'goal reached'
            : `${toGo.toLocaleString()} to go`}
      </span>
    </button>
  );
}
