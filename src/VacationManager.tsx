import { useState, type FormEvent } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { dayString, validDay, type Snapshot, type Vacation } from './domain';
import Modal from './Modal';

type Props = {
  data: Snapshot;
  current: string;
  busy: boolean;
  onAdd: (vacation: Vacation) => Promise<boolean>;
  onEnd: (id: string) => Promise<boolean>;
};

export default function VacationManager({ data, current, busy, onAdd, onEnd }: Props) {
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState<Vacation | null>(null);
  const [from, setFrom] = useState(current);
  const [to, setTo] = useState(current);
  const [all, setAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const vacations = [...(data.settings.vacations ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  const active = data.habits.filter(h => !h.archivedAt);
  const upcoming = vacations.filter(v => v.to >= current);
  const past = vacations.filter(v => v.to < current);

  const label = (v: Vacation) => `${format(parseISO(v.from), 'd MMM yyyy')} – ${format(parseISO(v.to), 'd MMM yyyy')}`;
  const members = (v: Vacation) =>
    v.habitIds === null
      ? 'All habits'
      : v.habitIds.map(id => data.habits.find(h => h.id === id)?.name ?? 'Archived habit').join(' · ');

  const valid = validDay(from) && validDay(to) && from >= current && to >= from && (all || selected.length > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy || saving) return;
    setSaving(true);
    try {
      if (await onAdd({ id: crypto.randomUUID(), from, to, habitIds: all ? null : selected })) {
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vacation-manager-box">
      <div className="vacation-header-row">
        <p className="vacation-lead-text">
          Pause habits for a date range without losing your streak.
        </p>
        <button
          type="button"
          className="secondary vacation-plan-btn"
          disabled={busy}
          onClick={() => {
            setFrom(current);
            setTo(dayString(addDays(parseISO(current), 6)));
            setAll(true);
            setSelected([]);
            setOpen(true);
          }}
        >
          <Plus size={14} /> Plan break
        </button>
      </div>

      {upcoming.length > 0 ? (
        upcoming.map(v => (
          <div className="vacation-row" key={v.id}>
            <div>
              <strong>{v.from > current ? 'Upcoming' : 'On vacation'}</strong>
              <span>{label(v)}</span>
              <small>{members(v)}</small>
            </div>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setEnding(v)}
            >
              {v.from > current ? 'Cancel' : 'End now'}
            </button>
          </div>
        ))
      ) : (
        <p className="field-hint" style={{ margin: '6px 0 0' }}>No breaks currently planned.</p>
      )}

      {past.length > 0 && (
        <details className="past-vacations">
          <summary>Past vacations ({past.length})</summary>
          {past.map(v => (
            <div className="vacation-row" key={v.id}>
              <div>
                <span>{label(v)}</span>
                <small>{members(v)}</small>
              </div>
            </div>
          ))}
        </details>
      )}

      {open && (
        <Modal title="Plan a vacation" onClose={() => { if (!saving) setOpen(false); }}>
          <form onSubmit={event => void submit(event)}>
            <div className="form-pair">
              <div>
                <label htmlFor="vacation-from">From</label>
                <input
                  id="vacation-from"
                  type="date"
                  required
                  min={current}
                  value={from}
                  disabled={saving}
                  onChange={e => {
                    setFrom(e.target.value);
                    if (e.target.value > to) setTo(e.target.value);
                  }}
                />
              </div>
              <div>
                <label htmlFor="vacation-to">Through</label>
                <input
                  id="vacation-to"
                  type="date"
                  required
                  min={from || current}
                  value={to}
                  disabled={saving}
                  onChange={e => setTo(e.target.value)}
                />
              </div>
            </div>

            <label htmlFor="vacation-scope">Pause</label>
            <select
              id="vacation-scope"
              value={all ? 'all' : 'selected'}
              disabled={saving}
              onChange={e => setAll(e.target.value === 'all')}
            >
              <option value="all">All habits</option>
              <option value="selected">Selected habits</option>
            </select>

            {!all && (
              <div className="vacation-habits">
                {active.length ? (
                  active.map(h => (
                    <label className="checklist-task" key={h.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(h.id)}
                        disabled={saving}
                        onChange={e =>
                          setSelected(ids => (e.target.checked ? [...ids, h.id] : ids.filter(id => id !== h.id)))
                        }
                      />
                      <span>{h.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="field-hint">Add a habit first, or choose All habits.</p>
                )}
              </div>
            )}

            <p className="field-hint">
              Dates are inclusive. Existing check-ins stay saved. Habits return automatically after the last day.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" disabled={saving} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy || saving || !valid}>
                Save vacation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {ending && (
        <Modal title={ending.from > current ? 'Cancel vacation?' : 'End vacation?'} onClose={() => setEnding(null)}>
          <p className="field-hint">
            {ending.from > current
              ? 'Remove this planned break.'
              : 'Resume these habits today. Previous vacation days stay paused.'}
          </p>
          <div className="modal-actions">
            <button className="secondary" disabled={busy} onClick={() => setEnding(null)}>
              Keep vacation
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void onEnd(ending.id).then(saved => {
                  if (saved) setEnding(null);
                })
              }
            >
              {ending.from > current ? 'Cancel vacation' : 'End now'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
