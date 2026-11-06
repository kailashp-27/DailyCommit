import { useEffect, useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { AlertCircle, ArrowLeft, ArrowRight, Award, Calendar, Check, CheckCircle2, Download, Flame, Minus, Share2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { dayString, weeklyReview, type Snapshot } from './domain';
import { downloadBlob, exportOrShareFile, weeklyReviewImage } from './share';
import Modal from './Modal';

export default function WeeklyReview({ data, current }: { data: Snapshot; current: string }) {
  const [anchor, setAnchor] = useState(current);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [exporting, setExporting] = useState(false);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);

  const start = startOfWeek(parseISO(anchor), { weekStartsOn: data.settings.weekStart });
  const end = dayString(addDays(start, 6)), through = end < current ? end : current;
  const review = weeklyReview(data, dayString(start), through), next = dayString(addDays(start, 7));

  const exportReview = async () => {
    setExporting(true);
    try {
      const blob = await weeklyReviewImage(data, dayString(start), end, review);
      setImage({ blob, url: URL.createObjectURL(blob) });
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const share = async () => {
    if (!image) return;
    try {
      await exportOrShareFile(image.blob, `weekly-review-${dayString(start)}.png`, 'DailyCommit Weekly Review');
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) downloadBlob(image.blob, 'weekly-review.png');
    }
  };

  // 7 full days of the selected week for the mini-strip
  const fullWeek = Array.from({ length: 7 }, (_, i) => {
    const date = dayString(addDays(start, i));
    const isFuture = date > current;
    const isCurrent = date === current;
    const dayData = review.days?.find(d => d.date === date);
    return {
      date,
      isFuture,
      isCurrent,
      dayData,
    };
  });

  return (
    <section className="weekly-review-modern" aria-label="Weekly review details">
      {/* Week Navigator */}
      <div className="review-period-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous review week"
          onClick={() => setAnchor(dayString(addDays(start, -7)))}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="review-period-title">
          {format(start, 'd MMM')} – {format(parseISO(end), 'd MMM yyyy')}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Next review week"
          disabled={next > current}
          onClick={() => setAnchor(next)}
        >
          <ArrowRight size={16} />
        </button>
        {anchor !== current && (
          <button
            type="button"
            className="text-button review-today-btn"
            onClick={() => setAnchor(current)}
          >
            This week
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label="Share weekly review"
          title="Share weekly review"
          disabled={exporting}
          onClick={() => void exportReview()}
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* 7-Day Mini Strip */}
      <div className="weekly-days-strip" aria-label="Daily progress this week">
        {fullWeek.map(({ date, isFuture, isCurrent, dayData }) => {
          const dayDate = parseISO(date);
          const dayName = format(dayDate, 'EEEEE'); // M, T, W, T, F, S, S
          const dayNum = dayDate.getDate();
          const total = dayData?.total ?? 0;
          const done = dayData?.done ?? 0;
          const isComplete = total > 0 && done === total;
          const isPartial = total > 0 && done > 0 && done < total;
          const isMissed = total > 0 && done === 0 && !isFuture;
          const isRest = total === 0 && !isFuture;

          return (
            <div
              key={date}
              className={`weekly-strip-day ${isFuture ? 'is-future' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              <span className="strip-day-name">{dayName}</span>
              <div
                className={`strip-day-indicator ${
                  isFuture
                    ? 'future'
                    : isRest
                    ? 'rest'
                    : isComplete
                    ? 'complete'
                    : isPartial
                    ? 'partial'
                    : isMissed
                    ? 'missed'
                    : ''
                }`}
                title={`${format(dayDate, 'EEE, d MMM')}: ${
                  isFuture ? 'Upcoming' : isRest ? 'Rest day' : `${done}/${total} done`
                }`}
              >
                {isComplete ? (
                  <Check size={12} strokeWidth={3} />
                ) : isRest ? (
                  <span className="strip-rest-dot" />
                ) : (
                  <span>{dayNum}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2x2 Metric Cards Grid */}
      <div className="review-metrics-grid">
        {/* Metric 1: Completion */}
        <div className="review-metric-card">
          <div className="review-metric-header">
            <span className="metric-icon-wrap completion">
              <CheckCircle2 size={16} />
            </span>
            <span className="review-metric-label">Completion</span>
          </div>
          <div className="review-metric-value">
            {review.percent === null ? '—' : `${Math.round(review.percent)}%`}
          </div>
          <p className="review-metric-sub">
            {review.totalDue > 0
              ? `${review.totalDone} of ${review.totalDue} check-ins`
              : 'No scheduled habits'}
          </p>
        </div>

        {/* Metric 2: Momentum / vs Last Week */}
        <div className="review-metric-card">
          <div className="review-metric-header">
            <span className="metric-icon-wrap momentum">
              {review.delta === null ? (
                <Sparkles size={16} />
              ) : review.delta > 0 ? (
                <TrendingUp size={16} />
              ) : review.delta < 0 ? (
                <TrendingDown size={16} />
              ) : (
                <Minus size={16} />
              )}
            </span>
            <span className="review-metric-label">Momentum</span>
          </div>
          <div className="review-metric-value">
            {review.delta === null ? (
              <span className="delta-pill neutral">First week</span>
            ) : review.delta > 0 ? (
              <span className="delta-pill positive">+{Math.round(review.delta)}%</span>
            ) : review.delta < 0 ? (
              <span className="delta-pill negative">{Math.round(review.delta)}%</span>
            ) : (
              <span className="delta-pill neutral">Steady</span>
            )}
          </div>
          <p className="review-metric-sub">vs. previous 7 days</p>
        </div>

        {/* Metric 3: Peak Day */}
        <div className="review-metric-card">
          <div className="review-metric-header">
            <span className="metric-icon-wrap peak">
              <Flame size={16} />
            </span>
            <span className="review-metric-label">Peak Day</span>
          </div>
          <div className="review-metric-value peak-day-name">
            {review.strongest ? format(parseISO(review.strongest.date), 'EEEE') : '—'}
          </div>
          <p className="review-metric-sub">
            {review.strongest && review.strongest.total > 0
              ? `${review.strongest.done}/${review.strongest.total} completed (${Math.round(
                  (review.strongest.done / review.strongest.total) * 100
                )}%)`
              : 'No completed habits'}
          </p>
        </div>

        {/* Metric 4: Habit Focus / Most Missed */}
        <div className="review-metric-card">
          <div className="review-metric-header">
            <span className="metric-icon-wrap focus">
              {review.missed ? <AlertCircle size={16} /> : <Award size={16} />}
            </span>
            <span className="review-metric-label">Focus Area</span>
          </div>
          <div className="review-metric-value habit-focus-name">
            {review.missed ? (
              review.missed.habit.name
            ) : review.percent !== null ? (
              <span className="focus-perfect">All on track! 🎉</span>
            ) : (
              '—'
            )}
          </div>
          <p className="review-metric-sub">
            {review.missed
              ? `${review.missed.count} missed of ${review.missed.due} due`
              : review.percent !== null
              ? 'Zero missed habits this week'
              : 'No scheduled habits'}
          </p>
        </div>
      </div>

      <p className="weekly-review-footnote">
        Compared with the same weekdays last week. Scheduled habits only; rest days excluded.
        {end > current ? ' Current week is still in progress.' : ''}
      </p>

      {image && (
        <Modal title="Share Weekly Review" onClose={() => setImage(null)}>
          <div className="share-dialog">
            <img src={image.url} alt="Weekly Review summary" className="share-preview" />
            <div className="dialog-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => downloadBlob(image.blob, `weekly-review-${dayString(start)}.png`)}
              >
                <Download size={16} /> Download
              </button>
              <button type="button" className="primary" onClick={() => void share()}>
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
