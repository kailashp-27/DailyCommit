import { useState, useRef, useEffect, type FormEvent, type TouchEvent } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Calendar, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Leaf, Minus, Moon, MoreHorizontal, Plus, StickyNote, Sparkles, CheckSquare, RotateCcw } from 'lucide-react';
import { daySummary, groupsFor, greetingFor, measurementOn, weeklyHabitStatus, monthlyHabitStatus, type DayNote, type Habit, type Mood, type Snapshot } from './domain';
import { HabitIcon } from './HabitEditor';
import Modal from './Modal';

const moods: [Mood, string, string][] = [['great', '😄', 'Great'], ['good', '🙂', 'Good'], ['okay', '😐', 'Okay'], ['low', '😔', 'Low'], ['rough', '😣', 'Rough']];

type Props = {
  data: Snapshot;
  date: string;
  current: string;
  busy: boolean;
  onDate: (date: string) => void;
  onAdd: () => void;
  onGroup: (habits: Habit[]) => Promise<boolean>;
  onState: (habit: Habit, state: 'done' | 'skip' | 'open') => Promise<boolean>;
  onValue: (habit: Habit, value: number) => Promise<boolean>;
  onStep: (habit: Habit, stepId: string, checked: boolean) => Promise<boolean>;
  onVacation: () => void;
  onDetails: (habit: Habit) => void;
  onToggleGroup: (group: string) => void;
  onNote: (note: DayNote) => Promise<boolean>;
};

export default function DayCard({
  data, date, current, busy, onDate, onAdd, onGroup, onState, onValue, onStep, onVacation, onDetails, onToggleGroup, onNote
}: Props) {
  const summary = daySummary(date, data);
  const [options, setOptions] = useState<Habit | null>(null);
  const [numeric, setNumeric] = useState<Habit | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [showDoneInSwipe, setShowDoneInSwipe] = useState(false);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipingHabitId, setSwipingHabitId] = useState<string | null>(null);

  const note = data.notes?.find(n => n.date === date);
  const active = data.habits.some(h => !h.archivedAt);
  const viewMode = data.settings.todayViewMode ?? 'minimal';

  const greeting = date === current
    ? greetingFor(data.settings.userName, new Date(), data.settings.birthday)
    : format(parseISO(date), 'EEEE, d MMMM');

  // Active weekly and monthly habits
  const activeHabits = data.habits.filter(h => !h.archivedAt && h.createdAt <= date && (!h.goalDate || date <= h.goalDate));
  const weeklyHabits = activeHabits.filter(h => h.schedule.kind === 'weekly');
  const monthlyHabits = activeHabits.filter(h => h.schedule.kind === 'monthly');

  const weeklyStatuses = weeklyHabits.map(h => ({
    habit: h,
    status: weeklyHabitStatus(h, date, data)!,
    doneOnDate: data.completions.some(c => c.habitId === h.id && c.date === date),
  }));

  const monthlyStatuses = monthlyHabits.map(h => ({
    habit: h,
    status: monthlyHabitStatus(h, date, data)!,
    doneOnDate: data.completions.some(c => c.habitId === h.id && c.date === date),
  }));

  // Daily eligible habits (daily or weekdays, or any weekly/monthly habit completed today)
  const dailyEligible = summary.eligible.filter(h => h.schedule.kind === 'daily' || h.schedule.kind === 'weekdays' || summary.completed.has(h.id));

  const groups = [...groupsFor(data), ''].filter(group => dailyEligible.some(h => (h.group ?? '') === group)).map(key => ({
    key,
    name: key || 'Your tasks',
    habits: dailyEligible.filter(h => (h.group ?? '') === key)
  }));

  const isDragging = useRef(false);
  const mouseStartX = useRef<number | null>(null);

  const vibrate = () => {
    if (data.settings.haptics === false) return;
    try { navigator.vibrate?.([15]); } catch { /* ignore */ }
  };

  // Touch & mouse handlers for swipe mode
  const handleTouchStart = (e: TouchEvent, habitId: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingHabitId(habitId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = (habit: Habit) => {
    if (touchStartX.current === null) return;
    if (swipeOffset > 70) {
      vibrate();
      const measure = measurementOn(habit, date);
      if (measure.kind === 'numeric') setNumeric(habit);
      else void onState(habit, 'done');
    } else if (swipeOffset < -70) {
      vibrate();
      void onState(habit, 'skip');
    }
    touchStartX.current = null;
    setSwipeOffset(0);
    setSwipingHabitId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, habitId: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    mouseStartX.current = e.clientX;
    setSwipingHabitId(habitId);
    setSwipeOffset(0);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || mouseStartX.current === null) return;
      setSwipeOffset(e.clientX - mouseStartX.current);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (swipingHabitId) {
        const habit = dailyEligible.find(h => h.id === swipingHabitId);
        if (habit) {
          if (swipeOffset > 70) {
            vibrate();
            const measure = measurementOn(habit, date);
            if (measure.kind === 'numeric') setNumeric(habit);
            else void onState(habit, 'done');
          } else if (swipeOffset < -70) {
            vibrate();
            void onState(habit, 'skip');
          }
        }
      }
      mouseStartX.current = null;
      setSwipeOffset(0);
      setSwipingHabitId(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [swipingHabitId, swipeOffset, dailyEligible, date]);

  return (
    <>
      {summary.paused.size > 0 && (
        <div className="vacation-banner">
          <Leaf size={17} />
          <span>{summary.vacationDay ? 'Vacation day' : 'Vacation mode'} · {summary.paused.size} paused</span>
          <button className="text-button" onClick={onVacation}>Manage</button>
        </div>
      )}

      <section className={`card daily-card task-card mode-${viewMode}`}>
        <div className="task-card-heading">
          <div>
            <span className="task-greeting">{greeting}</span>
            <h2>
              {summary.total === 0 ? 'Your tasks' : summary.done === summary.total ? 'All done' : `${summary.total - summary.done} to do`}
            </h2>
            {summary.total > 0 && <span className="task-count">{summary.done} of {summary.total} completed</span>}
          </div>
          <div className="task-day-controls">
            <button className="icon-button" aria-label="Previous day" onClick={() => onDate(format(addDays(parseISO(date), -1), 'yyyy-MM-dd'))}>
              <ChevronLeft size={17} />
            </button>
            <button className="task-date" aria-label="Choose day" onClick={() => setDateOpen(true)}>
              <CalendarDays size={14} />
              {date === current ? 'Today' : format(parseISO(date), 'd MMM')}
            </button>
            <button className="icon-button" aria-label="Next day" disabled={date >= current} onClick={() => onDate(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}>
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {dailyEligible.length ? (
          <>
            {/* VIEW MODE 1: MINIMAL CHECKLIST */}
            {viewMode === 'minimal' && (
              <div className="minimal-checklist">
                {dailyEligible.map(h => {
                  const done = summary.completed.has(h.id);
                  const skipped = summary.skipped.has(h.id);
                  const measure = measurementOn(h, date);
                  const value = summary.values.get(h.id) ?? 0;
                  return (
                    <div
                      key={h.id}
                      className={`minimal-row ${done ? 'is-done' : ''} ${skipped ? 'is-skipped' : ''}`}
                      onClick={() => {
                        vibrate();
                        if (measure.kind === 'numeric') setNumeric(h);
                        else void onState(h, done ? 'open' : 'done');
                      }}
                    >
                      <span className="minimal-name">
                        {h.name}
                        {measure.kind === 'numeric' && <small> ({value}/{measure.target} {measure.unit})</small>}
                        {skipped && <small> (rest)</small>}
                      </span>
                      <button
                        type="button"
                        className={`check-button ${done ? 'checked' : ''}`}
                        aria-label={`${done ? 'Undo' : 'Complete'} ${h.name}`}
                        aria-pressed={done}
                        disabled={busy}
                        onClick={e => {
                          e.stopPropagation();
                          vibrate();
                          if (measure.kind === 'numeric') setNumeric(h);
                          else void onState(h, done ? 'open' : 'done');
                        }}
                      >
                        {done && <Check size={17} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 2: ZEN SWIPE FLOW */}
            {viewMode === 'swipe' && (
              <div className="swipe-flow">
                {(() => {
                  const uncompleted = dailyEligible.filter(h => !summary.completed.has(h.id) && !summary.skipped.has(h.id));
                  if (uncompleted.length === 0) {
                    return (
                      <div className="swipe-empty">
                        <Sparkles size={36} className="accent-sparkle" />
                        <h3>All done for today!</h3>
                        <p>You’ve checked off every habit for today. Great job keeping your streak alive!</p>
                        {summary.done > 0 && (
                          <button className="secondary" onClick={() => setShowDoneInSwipe(!showDoneInSwipe)}>
                            {showDoneInSwipe ? 'Hide completed' : `Show completed (${summary.done})`}
                          </button>
                        )}
                      </div>
                    );
                  }

                  const currentHabit = uncompleted[0];
                  const measure = measurementOn(currentHabit, date);
                  const isSwiping = swipingHabitId === currentHabit.id;
                  const cardOffset = isSwiping ? swipeOffset : 0;

                  return (
                    <div className="swipe-deck-container">
                      <div className="swipe-progress-indicator">
                        <span>Task {summary.done + 1} of {dailyEligible.length}</span>
                        <span className="swipe-remaining-chip">{uncompleted.length} left</span>
                      </div>

                      <div className="swipe-cards-stack">
                        {uncompleted.length > 1 && (
                          <div className="swipe-card stacked-peek-card" aria-hidden="true">
                            <div className="swipe-card-top">
                              <span className="habit-icon"><HabitIcon name={uncompleted[1].icon} /></span>
                              <span className="swipe-group">{uncompleted[1].group || 'Habit'}</span>
                            </div>
                            <strong className="swipe-name">{uncompleted[1].name}</strong>
                          </div>
                        )}

                        <div
                          key={currentHabit.id}
                          className={`swipe-card current-card ${cardOffset > 40 ? 'swiping-right' : cardOffset < -40 ? 'swiping-left' : ''}`}
                          style={cardOffset ? { transform: `translateX(${cardOffset}px) rotate(${cardOffset * 0.04}deg)` } : undefined}
                          onTouchStart={e => handleTouchStart(e, currentHabit.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(currentHabit)}
                          onMouseDown={e => handleMouseDown(e, currentHabit.id)}
                        >
                          <div className="swipe-card-top">
                            <span className="habit-icon"><HabitIcon name={currentHabit.icon} /></span>
                            <span className="swipe-group">{currentHabit.group || 'Habit'}</span>
                          </div>

                          <strong className="swipe-name">{currentHabit.name}</strong>

                          <p className="swipe-hint">
                            {measure.kind === 'numeric'
                              ? `Target: ${measure.target} ${measure.unit}`
                              : measure.kind === 'checklist'
                              ? `Checklist · ${measure.items.length} items`
                              : 'Swipe right to complete → · ← Swipe left to rest'}
                          </p>

                          <div className="swipe-actions">
                            <button
                              type="button"
                              className="secondary swipe-btn skip"
                              disabled={busy}
                              onClick={e => {
                                e.stopPropagation();
                                vibrate();
                                void onState(currentHabit, 'skip');
                              }}
                            >
                              <Moon size={16} /> Rest / Skip
                            </button>
                            <button
                              type="button"
                              className="primary swipe-btn done"
                              disabled={busy}
                              onClick={e => {
                                e.stopPropagation();
                                vibrate();
                                if (measure.kind === 'numeric') setNumeric(currentHabit);
                                else void onState(currentHabit, 'done');
                              }}
                            >
                              <Check size={16} /> Complete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {showDoneInSwipe && summary.done > 0 && (
                  <div className="swipe-done-list">
                    <h4>Completed today</h4>
                    {dailyEligible.filter(h => summary.completed.has(h.id)).map(h => (
                      <div key={h.id} className="swipe-done-row">
                        <span>✓ {h.name}</span>
                        <button className="text-button" onClick={() => void onState(h, 'open')}>Undo</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 3: GROUPED DASHBOARD */}
            {viewMode === 'grouped' && (
              <div className="habit-list">
                {groups.map(group => (
                  <div className="habit-group" key={group.key}>
                    <div className="group-heading">
                      <h3>
                        <button
                          className="group-toggle"
                          aria-expanded={!(data.settings.collapsedTodayGroups ?? []).includes(group.key)}
                          aria-controls={`today-group-${encodeURIComponent(group.key)}`}
                          disabled={busy}
                          onClick={() => onToggleGroup(group.key)}
                        >
                          <ChevronDown size={14} />
                          <span>{group.name}</span>
                          <small>{group.habits.filter(h => summary.completed.has(h.id)).length}/{group.habits.length}</small>
                        </button>
                      </h3>
                      <button
                        className="text-button"
                        aria-label={`Complete ${group.name} group`}
                        disabled={busy || group.habits.every(h => summary.completed.has(h.id) || summary.skipped.has(h.id))}
                        onClick={() => {
                          vibrate();
                          void onGroup(group.habits);
                        }}
                      >
                        <Check size={14} />Complete group
                      </button>
                    </div>

                    {!(data.settings.collapsedTodayGroups ?? []).includes(group.key) && (
                      <div id={`today-group-${encodeURIComponent(group.key)}`}>
                        {group.habits.map(h => {
                          const row = data.completions.find(c => c.habitId === h.id && c.date === date);
                          const measure = measurementOn(h, date);
                          const value = summary.values.get(h.id) ?? 0;
                          const done = summary.completed.has(h.id);
                          const skipped = summary.skipped.has(h.id);
                          return (
                            <div key={h.id} className={`habit-item ${done ? 'is-done' : ''} ${skipped ? 'is-skipped' : ''}`}>
                              <div className="habit-row">
                                <span className="habit-icon"><HabitIcon name={h.icon} /></span>
                                <button
                                  className="habit-name"
                                  disabled={busy}
                                  onClick={() => {
                                    vibrate();
                                    if (measure.kind === 'numeric') setNumeric(h);
                                    else if (measure.kind === 'checklist') document.getElementById(`checklist-${h.id}`)?.focus();
                                    else void onState(h, done ? 'open' : 'done');
                                  }}
                                >
                                  <strong>{h.name}</strong>
                                  <small>
                                    {skipped ? summary.paused.has(h.id) ? 'On vacation' : 'Rest day' : measure.kind === 'checklist' ? `${value}/${measure.items.length} steps` : measure.kind === 'numeric' ? `${value}/${measure.target} ${measure.unit}` : h.schedule.kind === 'weekly' ? `${h.schedule.target} times a week` : h.schedule.kind === 'weekdays' ? 'Selected weekdays' : ''}
                                  </small>
                                </button>
                                <button className="skip-button" aria-label={`Options for ${h.name}`} onClick={() => setOptions(h)}>
                                  <MoreHorizontal size={19} />
                                </button>
                                <button
                                  className={`check-button ${done ? 'checked' : ''}`}
                                  aria-label={`${done ? 'Undo' : 'Complete'} ${h.name}`}
                                  aria-pressed={done}
                                  disabled={busy}
                                  onClick={() => {
                                    vibrate();
                                    void onState(h, done ? 'open' : 'done');
                                  }}
                                >
                                  {done && <Check size={17} />}
                                </button>
                              </div>
                              {measure.kind === 'checklist' && (
                                <div className="checklist-tasks" id={`checklist-${h.id}`} tabIndex={-1} role="group" aria-label={`${h.name} steps`}>
                                  {measure.items.map(step => (
                                    <label className="checklist-task" key={step.id}>
                                      <input
                                        type="checkbox"
                                        checked={row?.checked?.includes(step.id) ?? false}
                                        disabled={busy}
                                        onChange={e => {
                                          vibrate();
                                          void onStep(h, step.id, e.target.checked);
                                        }}
                                      />
                                      <span>{step.text}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {measure.kind === 'numeric' && !skipped && (
                                <div className="number-controls">
                                  <button className="icon-button" disabled={busy || value === 0} aria-label={`Decrease ${h.name}`} onClick={() => void onValue(h, Math.max(0, value - 1))}>
                                    <Minus size={17} />
                                  </button>
                                  <button className="value-button" disabled={busy} aria-label={`Set value for ${h.name}`} onClick={() => setNumeric(h)}>
                                    {value} <span>/ {measure.target} {measure.unit}</span>
                                  </button>
                                  <button className="icon-button" disabled={busy || value >= 1_000_000} aria-label={`Increase ${h.name}`} onClick={() => void onValue(h, value + 1)}>
                                    <Plus size={17} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Leaf size={26} />
            <h3>{summary.vacationDay ? 'Enjoy your break' : (weeklyHabits.length > 0 || monthlyHabits.length > 0) ? 'No daily tasks scheduled' : active ? 'No habits today' : 'No habits yet'}</h3>
            {!active && <button className="primary" onClick={onAdd}><Plus size={16} />Add habit</button>}
          </div>
        )}
      </section>

      {/* THIS WEEK'S TARGETS */}
      {weeklyHabits.length > 0 && (
        <details className="card cadence-card weekly-targets-card">
          <summary className="cadence-summary">
            <div className="cadence-heading-left">
              <Calendar size={16} />
              <strong>This Week's Targets</strong>
            </div>
            <span className="cadence-count">
              {weeklyStatuses.filter(s => s.status.reached).length}/{weeklyStatuses.length} met
            </span>
          </summary>
          <div className="cadence-list">
            {weeklyStatuses.filter(s => !s.status.reached).map(({ habit, status, doneOnDate }) => (
              <div key={habit.id} className="cadence-item">
                <span className="habit-icon"><HabitIcon name={habit.icon} /></span>
                <div className="cadence-info">
                  <strong>{habit.name}</strong>
                  <small>
                    {status.done}/{status.target} completed this week
                    {habit.schedule.kind === 'weekly' && habit.schedule.dueDay !== undefined
                      ? ` · Due ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][habit.schedule.dueDay]}`
                      : ''}
                  </small>
                </div>
                <button
                  type="button"
                  className={`check-button ${doneOnDate ? 'checked' : ''}`}
                  aria-label={`${doneOnDate ? 'Undo' : 'Check in'} ${habit.name} today`}
                  disabled={busy}
                  onClick={() => {
                    vibrate();
                    void onState(habit, doneOnDate ? 'open' : 'done');
                  }}
                >
                  {doneOnDate && <Check size={16} />}
                </button>
              </div>
            ))}

            {weeklyStatuses.filter(s => s.status.reached).length > 0 && (
              <div className="cadence-reached-section">
                <span className="cadence-reached-label">Completed this week</span>
                {weeklyStatuses.filter(s => s.status.reached).map(({ habit, status, doneOnDate }) => (
                  <div key={habit.id} className="cadence-item is-reached">
                    <span className="habit-icon"><HabitIcon name={habit.icon} /></span>
                    <div className="cadence-info">
                      <strong>{habit.name}</strong>
                      <small className="success-text">✓ Goal met ({status.done}/{status.target})</small>
                    </div>
                    <button
                      type="button"
                      className={`check-button ${doneOnDate ? 'checked' : ''}`}
                      aria-label={`${doneOnDate ? 'Undo' : 'Check in'} ${habit.name} today`}
                      disabled={busy}
                      onClick={() => {
                        vibrate();
                        void onState(habit, doneOnDate ? 'open' : 'done');
                      }}
                    >
                      {doneOnDate && <Check size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {/* THIS MONTH'S TARGETS */}
      {monthlyHabits.length > 0 && (
        <details className="card cadence-card monthly-targets-card">
          <summary className="cadence-summary">
            <div className="cadence-heading-left">
              <CalendarDays size={16} />
              <strong>This Month's Targets</strong>
            </div>
            <span className="cadence-count">
              {monthlyStatuses.filter(s => s.status.reached).length}/{monthlyStatuses.length} met
            </span>
          </summary>
          <div className="cadence-list">
            {monthlyStatuses.filter(s => !s.status.reached).map(({ habit, status, doneOnDate }) => (
              <div key={habit.id} className="cadence-item">
                <span className="habit-icon"><HabitIcon name={habit.icon} /></span>
                <div className="cadence-info">
                  <strong>{habit.name}</strong>
                  <small>
                    {status.done}/{status.target} this month
                    {habit.schedule.kind === 'monthly' && habit.schedule.dueDayOfMonth !== undefined
                      ? ` · Due ${habit.schedule.dueDayOfMonth}th`
                      : ''}
                  </small>
                </div>
                <button
                  type="button"
                  className={`check-button ${doneOnDate ? 'checked' : ''}`}
                  aria-label={`${doneOnDate ? 'Undo' : 'Check in'} ${habit.name} today`}
                  disabled={busy}
                  onClick={() => {
                    vibrate();
                    void onState(habit, doneOnDate ? 'open' : 'done');
                  }}
                >
                  {doneOnDate && <Check size={16} />}
                </button>
              </div>
            ))}

            {monthlyStatuses.filter(s => s.status.reached).length > 0 && (
              <div className="cadence-reached-section">
                <span className="cadence-reached-label">Completed this month</span>
                {monthlyStatuses.filter(s => s.status.reached).map(({ habit, status, doneOnDate }) => (
                  <div key={habit.id} className="cadence-item is-reached">
                    <span className="habit-icon"><HabitIcon name={habit.icon} /></span>
                    <div className="cadence-info">
                      <strong>{habit.name}</strong>
                      <small className="success-text">✓ Goal met ({status.done}/{status.target})</small>
                    </div>
                    <button
                      type="button"
                      className={`check-button ${doneOnDate ? 'checked' : ''}`}
                      aria-label={`${doneOnDate ? 'Undo' : 'Check in'} ${habit.name} today`}
                      disabled={busy}
                      onClick={() => {
                        vibrate();
                        void onState(habit, doneOnDate ? 'open' : 'done');
                      }}
                    >
                      {doneOnDate && <Check size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      <button className="day-note-button" onClick={() => setNoteOpen(true)}>
        <StickyNote size={17} />
        <span>{note?.text ? note.text : 'Day note'}{note?.mood && ` ${moods.find(m => m[0] === note.mood)?.[1]}`}</span>
        <span>{note ? 'Edit' : '+'}</span>
      </button>

      {dateOpen && (
        <Modal title="Choose day" onClose={() => setDateOpen(false)}>
          <label htmlFor="review-day">Date</label>
          <input id="review-day" type="date" max={current} value={date} onChange={e => { if (e.target.value && e.target.value <= current) onDate(e.target.value); }} />
          <div className="modal-actions">
            <button className="secondary" onClick={() => { onDate(current); setDateOpen(false); }}>Today</button>
            <button className="primary" onClick={() => setDateOpen(false)}>Done</button>
          </div>
        </Modal>
      )}

      {options && (
        <Modal title={options.name} onClose={() => setOptions(null)}>
          <div className="action-list">
            <button onClick={() => { onDetails(options); setOptions(null); }}>Habit details</button>
            <button disabled={busy} onClick={() => void onState(options, summary.skipped.has(options.id) ? 'open' : 'skip').then(saved => { if (saved) setOptions(null); })}>
              {summary.skipped.has(options.id) ? 'Remove rest day' : 'Skip day'}
            </button>
            <button disabled={busy} onClick={() => void onState(options, 'open').then(saved => { if (saved) setOptions(null); })}>
              Clear check-in
            </button>
          </div>
        </Modal>
      )}

      {numeric && (
        <ValueEditor key={`${numeric.id}:${date}`} habit={numeric} date={date} value={summary.values.get(numeric.id) ?? 0} onClose={() => setNumeric(null)} onSave={value => onValue(numeric, value)} />
      )}
      {noteOpen && (
        <NoteEditor key={date} date={date} note={note} onClose={() => setNoteOpen(false)} onSave={onNote} />
      )}
    </>
  );
}

function ValueEditor({ habit, date, value, onClose, onSave }: { habit: Habit; date: string; value: number; onClose: () => void; onSave: (value: number) => Promise<boolean> }) {
  const [input, setInput] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const measure = measurementOn(habit, date);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { if (await onSave(Number(input))) onClose(); } finally { setSaving(false); }
  };
  return (
    <Modal title={habit.name} onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor="progress-value">{measure.kind === 'numeric' ? measure.unit : 'Value'}</label>
        <input data-autofocus id="progress-value" type="number" inputMode="decimal" min="0" max="1000000" step="any" value={input} onChange={e => setInput(e.target.value)} required />
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving || input === '' || Number(input) < 0 || Number(input) > 1_000_000}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

function NoteEditor({ date, note, onClose, onSave }: { date: string; note?: DayNote; onClose: () => void; onSave: (note: DayNote) => Promise<boolean> }) {
  const [text, setText] = useState(note?.text ?? '');
  const [mood, setMood] = useState<Mood | null>(note?.mood ?? null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { if (await onSave({ date, text: text.trim(), mood, updatedAt: new Date().toISOString() })) onClose(); } finally { setSaving(false); }
  };
  return (
    <Modal title={`${format(parseISO(date), 'd MMM')} · Day note`} onClose={onClose}>
      <form onSubmit={submit}>
        <label>Mood</label>
        <div className="mood-options">
          {moods.map(([value, emoji, label]) => (
            <button type="button" key={value} aria-label={label} aria-pressed={mood === value} className={mood === value ? 'selected' : ''} onClick={() => setMood(previous => previous === value ? null : value)}>
              {emoji}
            </button>
          ))}
        </div>
        <label htmlFor="day-note">Note</label>
        <textarea data-autofocus id="day-note" rows={5} maxLength={2000} placeholder="A few words about today…" value={text} onChange={e => setText(e.target.value)} />
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
