import { themes, canUseTheme } from './themes';
import { useMemo, useState, type CSSProperties } from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { completedActiveDays, badges, badgeDateLabel, pixels, rarityNames, type Badge, type BadgeUnlock } from './badges';
import { dateRange, daySummary, type Snapshot } from './domain';
import Modal from './Modal';

export function PixelBadge({ badge }: { badge: Badge }) {
  return <span className="pixel-badge" aria-hidden="true"><svg viewBox="0 0 34 34">{[...(pixels[badge.icon] ?? pixels.commit)].map((pixel, i) => <rect key={i} x={i % 5 * 7} y={Math.floor(i / 5) * 7} width="6" height="6" rx="1" fill={pixel === '1' ? `var(--heat-${i % 3 === 0 ? 4 : Math.max(2, badge.rarity)})` : 'var(--heat-0)'}/>)}</svg></span>;
}
export const badgeStyle = (badge: Badge) => ({ '--rarity': `var(--heat-${badge.rarity})` } as CSSProperties);

export default function BadgeShelf({ data, current, onDate, onColors }: { data: Snapshot; current: string; onColors: () => void; onDate: (date: string) => void }) {
  const [filter, setFilter] = useState<'earned' | 'all'>('earned'), [expanded, setExpanded] = useState(false), [selected, setSelected] = useState<Badge | null>(null);
  const earned = new Map((data.badges ?? []).map(b => [b.id, b.date]));
  const collection = badges.filter(b => !b.unavailable && (filter === 'earned' ? earned.has(b.id) : !b.secret && !earned.has(b.id))).sort((a, b) => filter === 'earned' ? (earned.get(b.id) ?? '').localeCompare(earned.get(a.id) ?? '') || a.rarity - b.rarity : a.rarity - b.rarity);
  const visible = collection.slice(0, filter === 'earned' && expanded ? collection.length : 6);
  const activeDays = useMemo(() => completedActiveDays(data, current).length, [data, current]);
  const count = badges.filter(b => earned.has(b.id)).length;
  const perfectDays = useMemo(() => {
    const first = data.habits.reduce((min, h) => h.createdAt < min ? h.createdAt : min, current);
    return dateRange(first, current).filter(date => { const s = daySummary(date, data); return s.total >= 5 && s.done === s.total && !s.skipped.size && !s.paused.size; }).length;
  }, [data, current]);
  return <section className="card badge-shelf" aria-label="Badge collection">
    <div className="card-heading"><h2>Badges <span className="count-chip">{count} earned</span></h2><Sparkles size={17}/></div>
    <div className="badge-tabs" aria-label="Badge filter"><button aria-pressed={filter === 'earned'} onClick={() => { setFilter('earned'); setExpanded(false); }}>Earned</button><button aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setExpanded(false); }}>Up next</button></div>
    {visible.length ? <div className="badge-grid">{visible.map(b => <button className={`badge-tile ${earned.has(b.id) ? 'earned' : 'locked'}`} style={badgeStyle(b)} key={b.id} onClick={() => setSelected(b)} aria-label={`${b.name}, ${rarityNames[b.rarity - 1]}, ${earned.has(b.id) ? 'earned' : b.unavailable ? 'unavailable' : 'locked'}`}>
      <PixelBadge badge={b}/><strong>{b.name}</strong><span>{rarityNames[b.rarity - 1]}</span><small>{earned.has(b.id) ? badgeDateLabel(earned.get(b.id)!) : b.unavailable ? 'Unavailable' : <><LockKeyhole size={10}/>Locked</>}</small>
    </button>)}</div> : <p className="badge-empty">{filter === 'earned' ? 'Your first completed task earns First Commit.' : 'More badges will reveal themselves as you go.'}</p>}
    {filter === 'earned' && collection.length > 6 && <button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer' : `View all ${collection.length} earned`}</button>}
    <p className="badge-footnote">Secret badges reveal themselves when earned.</p>
    <div className="color-rewards"><div className="card-heading"><h3>Color rewards</h3><button className="text-button" onClick={onColors}>App colors</button></div><div className="color-reward-grid">{themes.filter(t => t.days > 0).map(theme => { const unlocked = canUseTheme(theme.id, data.badges ?? []); return <button key={theme.id} className="color-reward" onClick={onColors}><span className="theme-dots" aria-hidden="true">{theme[data.settings.mode ?? 'dark'].slice(1).map(color => <i key={color} style={{ background: color }}/>)}</span><strong>{theme.name}</strong><small>{unlocked ? 'Unlocked · choose color' : `${Math.min(activeDays, theme.days)} / ${theme.days} active days`}</small>{!unlocked && <progress aria-label={`${theme.name} unlock progress`} value={Math.min(activeDays, theme.days)} max={theme.days}/>}</button>; })}</div><p className="badge-footnote">An active day has a completed habit. Days needn’t be consecutive.</p></div>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><div className="badge-detail" style={badgeStyle(selected)}><PixelBadge badge={selected}/><span className="rarity-label">{rarityNames[selected.rarity - 1]} · {selected.category}</span><p>{selected.rule}</p>{selected.id === 'clean' && <p>{perfectDays} perfect {perfectDays === 1 ? 'day' : 'days'} with 5+ habits</p>}{selected.unavailable && <p className="field-hint">{selected.unavailable}</p>}{earned.has(selected.id) && <><small>Earned {badgeDateLabel(earned.get(selected.id)!)}</small><button className="primary" onClick={() => { onDate(earned.get(selected.id)!); setSelected(null); }}>Show day on heatmap</button></>}</div></Modal>}
  </section>;
}

export function BadgeCelebration({ unlock, remaining, onClose }: { unlock: BadgeUnlock; remaining: number; onClose: () => void }) {
  const badge = badges.find(b => b.id === unlock.id)!;
  return <Modal title="Badge unlocked" onClose={onClose}><div className={`badge-celebration rarity-${badge.rarity}`} style={badgeStyle(badge)}>
    <div className="badge-burst" aria-hidden="true">{Array.from({ length: badge.rarity * 2 + 2 }, (_, i) => <span key={i} style={{ '--angle': `${i * 360 / (badge.rarity * 2 + 2)}deg`, '--delay': `${i * 45}ms` } as CSSProperties}>✦</span>)}<PixelBadge badge={badge}/></div>
    <span className="rarity-label">{rarityNames[badge.rarity - 1]}</span><h3>{badge.name}</h3><p>{badge.rule}</p><small>{badgeDateLabel(unlock.date)}</small>
    <button className="primary" onClick={onClose}>{remaining > 1 ? `Next badge · ${remaining - 1} more` : 'Keep going'}</button>
  </div></Modal>;
}
