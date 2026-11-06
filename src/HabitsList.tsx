import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import type { Habit } from './domain';
import { HabitIcon } from './HabitEditor';

export default function HabitsList({
  habits,
  busy,
  onDetails,
  onArchive,
  onResume,
  onReorder,
  onNewHabit,
}: {
  habits: Habit[];
  busy: boolean;
  onDetails: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onResume: (habit: Habit) => void;
  onReorder: (index: number, direction: -1 | 1) => void;
  onNewHabit: () => void;
}) {
  const [query, setQuery] = useState('');

  const search = query.trim().toLowerCase();
  // Always search from ALL habits (both active and archived)
  const filtered = habits
    .filter(h => !search || h.name.toLowerCase().includes(search) || (h.group ?? '').toLowerCase().includes(search))
    .sort((a, b) => {
      // Active first, then archived
      if (!!a.archivedAt !== !!b.archivedAt) return a.archivedAt ? 1 : -1;
      return a.order - b.order;
    });

  const active = habits.filter(h => !h.archivedAt).sort((a, b) => a.order - b.order);

  return (
    <div className="habits-page">
      {/* Top Header Row with Add Button */}
      <div className="habits-top-bar">
        <span className="habits-count-label">
          {active.length} active {active.length === 1 ? 'habit' : 'habits'}
        </span>
        <button type="button" className="primary add-habit-btn" onClick={onNewHabit}>
          <Plus size={16} />
          <span>Add Habit</span>
        </button>
      </div>

      {/* Clean Search Input */}
      <div className="habit-search-bar">
        <Search size={16} />
        <input
          aria-label="Search all habits"
          type="search"
          placeholder="Search habits…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Flat Habits List */}
      <div className="habit-flat-list">
        <section className="card manage-card" aria-label="Habits list">
          <div>
            {filtered.length ? (
              filtered.map(habit => {
                const activeIndex = active.indexOf(habit);
                const isArchived = !!habit.archivedAt;
                return (
                  <div className={`habit-row ${isArchived ? 'is-archived' : ''}`} key={habit.id}>
                    <span className="habit-icon"><HabitIcon name={habit.icon} /></span>
                    <button
                      type="button"
                      className="habit-name"
                      onClick={() => onDetails(habit)}
                      aria-label={`Details for ${habit.name}`}
                    >
                      <strong>{habit.name}</strong>
                      <small>
                        {habit.group && <span className="habit-group-badge">{habit.group}</span>}
                        {isArchived
                          ? 'Archived'
                          : habit.measurement?.kind === 'numeric'
                          ? `${habit.measurement.target} ${habit.measurement.unit}`
                          : habit.measurement?.kind === 'checklist'
                          ? `${habit.measurement.items.length} steps`
                          : habit.schedule.kind === 'weekly'
                          ? `${habit.schedule.target}x / week`
                          : habit.schedule.kind === 'weekdays'
                          ? 'Weekdays'
                          : 'Daily'}
                        {habit.reminder?.enabled && !isArchived ? ` · ${habit.reminder.time}` : ''}
                      </small>
                    </button>

                    {isArchived ? (
                      <button className="text-button resume-btn" disabled={busy} onClick={() => onResume(habit)}>
                        Resume
                      </button>
                    ) : (
                      <>
                        <div className="order-controls">
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Move ${habit.name} up`}
                            disabled={activeIndex <= 0 || busy || !!search}
                            onClick={() => onReorder(activeIndex, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Move ${habit.name} down`}
                            disabled={activeIndex >= active.length - 1 || activeIndex === -1 || busy || !!search}
                            onClick={() => onReorder(activeIndex, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Archive ${habit.name}`}
                          disabled={busy}
                          onClick={() => onArchive(habit)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="filter-empty" style={{ textAlign: 'center', padding: '24px 12px' }}>
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
                  {search ? `No habits match “${query}”.` : 'No habits created yet.'}
                </p>
                {search && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ marginTop: '10px' }}
                    onClick={() => setQuery('')}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
