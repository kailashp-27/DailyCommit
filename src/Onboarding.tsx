import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Sparkles, Upload, Check, CheckSquare, ListFilter, SlidersHorizontal, ArrowRight, Calendar, User, FileCheck, Droplets, BookOpen, Dumbbell, Flower2 } from 'lucide-react';
import { parseBackup } from './repository';
import type { Habit, Settings, Snapshot, TodayViewMode } from './domain';

type Props = {
  initialSettings: Settings;
  existingHabitsCount: number;
  busy: boolean;
  onFinish: (settings: Partial<Settings>, starterHabits: Habit[]) => Promise<boolean>;
  onRestore: (data: Snapshot, overrides: Partial<Settings>) => Promise<boolean>;
  onMessage: (msg: string) => void;
};

type StarterHabitOption = {
  id: string;
  name: string;
  icon: string;
  color: string;
  group: string;
  schedule: Habit['schedule'];
  description: string;
};

const starterHabitsList: StarterHabitOption[] = [
  { id: 'water', name: 'Drink water', icon: 'water', color: '#6AA8FF', group: 'Morning', schedule: { kind: 'daily' }, description: 'Stay hydrated throughout the day' },
  { id: 'read', name: 'Read for 15 mins', icon: 'book', color: '#FFB65C', group: 'Evening', schedule: { kind: 'daily' }, description: 'Build a daily reading habit' },
  { id: 'workout', name: 'Workout or walk', icon: 'fitness', color: '#FF8A3D', group: 'Fitness', schedule: { kind: 'weekly', target: 4 }, description: '4 times a week' },
  { id: 'mind', name: 'Mindfulness / stretch', icon: 'mind', color: '#4FD39A', group: 'Morning', schedule: { kind: 'daily' }, description: '5-10 mins morning pause' },
];

export default function Onboarding({ initialSettings, existingHabitsCount, busy, onFinish, onRestore, onMessage }: Props) {
  const [step, setStep] = useState<'profile' | 'path' | 'fresh' | 'restored'>('profile');
  const [userName, setUserName] = useState(initialSettings.userName ?? '');
  const [birthday, setBirthday] = useState(initialSettings.birthday ?? '');
  const [selectedUI, setSelectedUI] = useState<TodayViewMode>(initialSettings.todayViewMode ?? 'minimal');
  const [weekStart, setWeekStart] = useState<0 | 1>(initialSettings.weekStart ?? 1);
  const [chosenStarters, setChosenStarters] = useState<string[]>(['water']);
  const [restoredData, setRestoredData] = useState<Snapshot | null>(null);
  const [restoringFile, setRestoringFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setStep('path');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoringFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const data = parseBackup(text);
        setRestoredData(data);
        if (data.settings.todayViewMode) {
          setSelectedUI(data.settings.todayViewMode);
        }
        setStep('restored');
      } catch (err) {
        onMessage(err instanceof Error ? err.message : 'Invalid backup file.');
      } finally {
        setRestoringFile(false);
      }
    };
    reader.onerror = () => {
      onMessage('Failed to read the backup file.');
      setRestoringFile(false);
    };
    reader.readAsText(file);
    // Reset file input value so selecting the same file triggers onChange if needed
    e.target.value = '';
  };

  const toggleStarter = (id: string) => {
    setChosenStarters(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const completeFresh = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const createdHabits: Habit[] = starterHabitsList
      .filter(item => chosenStarters.includes(item.id))
      .map((item, index) => ({
        id: crypto.randomUUID(),
        name: item.name,
        group: item.group,
        icon: item.icon,
        color: item.color,
        schedule: item.schedule,
        createdAt: todayStr,
        archivedAt: null,
        order: index,
        revisions: [{ from: todayStr, schedule: item.schedule }],
      }));

    const settingsOverrides: Partial<Settings> = {
      userName: userName.trim(),
      birthday: birthday || undefined,
      todayViewMode: selectedUI,
      weekStart,
      onboarded: true,
      specialDates: birthday && !initialSettings.specialDates?.includes(birthday)
        ? [...(initialSettings.specialDates ?? []), birthday].sort()
        : initialSettings.specialDates,
    };

    await onFinish(settingsOverrides, createdHabits);
  };

  const completeRestored = async () => {
    if (!restoredData) return;
    const overrides: Partial<Settings> = {
      userName: userName.trim(),
      birthday: birthday || restoredData.settings.birthday,
      todayViewMode: selectedUI,
      onboarded: true,
      specialDates: birthday && !restoredData.settings.specialDates?.includes(birthday)
        ? [...(restoredData.settings.specialDates ?? []), birthday].sort()
        : restoredData.settings.specialDates,
    };
    await onRestore(restoredData, overrides);
  };

  const completeKeepExisting = async () => {
    const settingsOverrides: Partial<Settings> = {
      userName: userName.trim(),
      birthday: birthday || undefined,
      todayViewMode: selectedUI,
      onboarded: true,
    };
    await onFinish(settingsOverrides, []);
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Step 1: Profile & Greeting */}
        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="onboarding-form">
            <div className="onboarding-header">
              <span className="brand-mark" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
              </span>
              <h2>Welcome to DailyCommit</h2>
              <p>Small habits. A year of progress. Let’s get to know you.</p>
            </div>

            <div className="onboarding-field">
              <label htmlFor="user-name">
                <User size={15} />
                <span>What should we call you?</span>
              </label>
              <input
                id="user-name"
                type="text"
                required
                maxLength={60}
                placeholder="e.g. Alex"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="onboarding-field">
              <label htmlFor="user-birthday">
                <Calendar size={15} />
                <span>Your birthday or special date <small>(optional)</small></span>
              </label>
              <input
                id="user-birthday"
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
              <span className="field-hint">We’ll light up a celebration on your heatmap and award a special milestone badge.</span>
            </div>

            <button type="submit" className="primary full-width" disabled={!userName.trim()}>
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2: Path Selection */}
        {step === 'path' && (
          <div className="onboarding-flow">
            <div className="onboarding-header">
              <h2>Nice to meet you, {userName}!</h2>
              <p>How would you like to set up DailyCommit?</p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div className="path-options">
              <button
                type="button"
                className="path-card"
                onClick={() => setStep('fresh')}
              >
                <div className="path-icon accent">
                  <Sparkles size={22} />
                </div>
                <div className="path-info">
                  <strong>Start fresh</strong>
                  <span>Pick your layout and choose your first habits.</span>
                </div>
                <ArrowRight size={18} className="path-arrow" />
              </button>

              <button
                type="button"
                className="path-card"
                disabled={restoringFile}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="path-icon secondary">
                  <Upload size={22} />
                </div>
                <div className="path-info">
                  <strong>Restore previous backup</strong>
                  <span>{restoringFile ? 'Reading backup…' : 'Import your habits, history & badges from JSON.'}</span>
                </div>
                <ArrowRight size={18} className="path-arrow" />
              </button>

              {existingHabitsCount > 0 && (
                <button
                  type="button"
                  className="path-card"
                  onClick={() => completeKeepExisting()}
                >
                  <div className="path-icon green">
                    <CheckSquare size={22} />
                  </div>
                  <div className="path-info">
                    <strong>Keep existing habits</strong>
                    <span>Continue with {existingHabitsCount} habits already in storage.</span>
                  </div>
                  <ArrowRight size={18} className="path-arrow" />
                </button>
              )}
            </div>

            <button type="button" className="text-button" onClick={() => setStep('profile')}>
              ← Back to name
            </button>
          </div>
        )}

        {/* Step 3A: Restored Confirmation & UI Selection */}
        {step === 'restored' && restoredData && (
          <div className="onboarding-flow">
            <div className="success-banner">
              <FileCheck size={26} />
              <div>
                <h3>Successfully restored!</h3>
                <p>
                  Found <strong>{restoredData.habits.length}</strong> habits,{' '}
                  <strong>{restoredData.completions.length}</strong> check-ins
                  {restoredData.badges?.length ? `, and ${restoredData.badges.length} badges` : ''}.
                </p>
              </div>
            </div>

            <div className="ui-selection-section">
              <h3>Choose your Today view style</h3>
              <p className="subtle">Select how you want your daily habits presented. You can always change this in Settings.</p>

              <div className="ui-style-options">
                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'minimal' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('minimal')}
                >
                  <CheckSquare size={20} />
                  <div>
                    <strong>Minimal Checklist</strong>
                    <span>Clean list with checkboxes only. Zero clutter.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'swipe' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('swipe')}
                >
                  <Sparkles size={20} />
                  <div>
                    <strong>Zen Swipe Flow</strong>
                    <span>Uncompleted tasks one-by-one. Swipe to complete.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'grouped' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('grouped')}
                >
                  <ListFilter size={20} />
                  <div>
                    <strong>Grouped Dashboard</strong>
                    <span>Organized by categories (Morning, Evening, etc.).</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="primary full-width"
              disabled={busy}
              onClick={() => void completeRestored()}
            >
              <span>Let’s Go</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 3B: Start Fresh Setup */}
        {step === 'fresh' && (
          <div className="onboarding-flow">
            <div className="onboarding-header">
              <h2>Setup Your Daily Space</h2>
              <p>Choose your layout and starter habits.</p>
            </div>

            {/* UI Style Selection */}
            <div className="ui-selection-section">
              <label className="section-label">Today Screen Style</label>
              <div className="ui-style-options">
                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'minimal' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('minimal')}
                >
                  <CheckSquare size={18} />
                  <div>
                    <strong>Minimal Checklist</strong>
                    <span>Clean list with checkboxes only.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'swipe' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('swipe')}
                >
                  <Sparkles size={18} />
                  <div>
                    <strong>Zen Swipe Flow</strong>
                    <span>Focus on uncompleted tasks one-by-one.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`ui-style-card ${selectedUI === 'grouped' ? 'selected' : ''}`}
                  onClick={() => setSelectedUI('grouped')}
                >
                  <ListFilter size={18} />
                  <div>
                    <strong>Grouped Dashboard</strong>
                    <span>Organized categories with group headers.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Week Starts On */}
            <div className="onboarding-field">
              <label className="section-label">Week Starts On</label>
              <div className="segmented">
                <button
                  type="button"
                  className={weekStart === 1 ? 'active' : ''}
                  onClick={() => setWeekStart(1)}
                >
                  Monday
                </button>
                <button
                  type="button"
                  className={weekStart === 0 ? 'active' : ''}
                  onClick={() => setWeekStart(0)}
                >
                  Sunday
                </button>
              </div>
            </div>

            {/* Starter Habits */}
            <div className="onboarding-field">
              <label className="section-label">Start with a Habit <small>(tap to select)</small></label>
              <div className="starter-habits-grid">
                {starterHabitsList.map(item => {
                  const isSelected = chosenStarters.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`starter-habit-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleStarter(item.id)}
                    >
                      <span className="starter-icon" style={{ color: item.color }}>
                        {item.id === 'water' && <Droplets size={16} />}
                        {item.id === 'read' && <BookOpen size={16} />}
                        {item.id === 'workout' && <Dumbbell size={16} />}
                        {item.id === 'mind' && <Flower2 size={16} />}
                      </span>
                      <span className="starter-name">{item.name}</span>
                      {isSelected && <Check size={14} className="starter-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="onboarding-actions">
              <button type="button" className="secondary" onClick={() => setStep('path')}>
                Back
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void completeFresh()}
              >
                <span>Let’s Go</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
