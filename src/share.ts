import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { dateRange, dayString, daySummary, getPalette, intensity, today, type Snapshot } from './domain';
import { badges, earnedThisMonth, pixels } from './badges';

export async function heatmapImage(data: Snapshot, from: string, to: string, title: string): Promise<Blob> {
  const canvas = document.createElement('canvas'), start = startOfWeek(parseISO(from), { weekStartsOn: data.settings.weekStart });
  const columns = Math.floor(differenceInCalendarDays(parseISO(to), start) / 7) + 1, cell = 28, gap = 8, startX = 56, startY = 142;
  const current = today(data.settings.rolloverHour), stamps = earnedThisMonth(data, current);
  canvas.width = Math.max(720, columns * (cell + gap) + 112);
  const stampsPerRow = Math.floor((canvas.width - 112) / 200);
  canvas.height = 490 + (stamps.length ? 32 + Math.ceil(stamps.length / stampsPerRow) * 66 : 0);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image export is unavailable.');
  const dark = data.settings.mode !== 'light', colors = getPalette(data.settings);
  ctx.fillStyle = dark ? '#0B0D12' : '#FBF9F6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? '#E8EAF0' : '#1A1814';
  let size = 28; ctx.font = `600 ${size}px system-ui`;
  while (ctx.measureText(title).width > canvas.width - 112 && size > 12) { size--; ctx.font = `600 ${size}px system-ui`; }
  ctx.fillText(title, 56, 66);
  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E'; ctx.font = '18px system-ui'; ctx.fillText(`${format(parseISO(from), 'd MMM yyyy')} – ${format(parseISO(to), 'd MMM yyyy')}`, 56, 101);
  for (const date of dateRange(from, to)) {
    const index = differenceInCalendarDays(parseISO(date), start), column = Math.floor(index / 7), row = index % 7, level = intensity(daySummary(date, data).ratio);
    ctx.fillStyle = level < 0 || date > current ? dark ? '#12151C' : '#FFFFFF' : colors[level];
    ctx.beginPath(); ctx.roundRect(startX + column * (cell + gap), startY + row * (cell + gap), cell, cell, 5); ctx.fill();
    if (date.endsWith('-01') || date === from) { ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E'; ctx.font = '14px system-ui'; ctx.fillText(format(parseISO(date), 'MMM'), startX + column * (cell + gap), startY - 13); }
  }
  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E'; ctx.font = '17px system-ui'; ctx.fillText(`${data.completions.filter(c => c.date >= from && c.date <= to).length} check-ins · DailyCommit`, 56, 452);
  if (stamps.length) {
    ctx.font = '14px system-ui'; ctx.fillText(`Earned in ${format(parseISO(current), 'MMMM yyyy')}`, 56, 491);
    stamps.forEach((stamp, i) => {
      const badge = badges.find(b => b.id === stamp.id)!, x = 56 + i % stampsPerRow * 200, y = 506 + Math.floor(i / stampsPerRow) * 66;
      ctx.strokeStyle = colors[badge.rarity]; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 188, 54, 9); ctx.stroke();
      [...(pixels[badge.icon] ?? pixels.commit)].forEach((pixel, index) => { ctx.fillStyle = pixel === '1' ? colors[index % 3 === 0 ? 4 : Math.max(2, badge.rarity)] : colors[0]; ctx.fillRect(x + 10 + index % 5 * 6, y + 12 + Math.floor(index / 5) * 6, 5, 5); });
      ctx.fillStyle = dark ? '#E8EAF0' : '#1A1814'; ctx.font = '12px system-ui';
      let name = badge.name; while (ctx.measureText(name).width > 127) name = name.slice(0, -1); if (name !== badge.name) name = name.slice(0, -1) + '…';
      ctx.fillText(name, x + 48, y + 25); ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E'; ctx.font = '10px system-ui'; ctx.fillText(format(parseISO(stamp.date), 'd MMM'), x + 48, y + 40);
    });
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create image.')), 'image/png'));
}

export async function weeklyReviewImage(
  data: Snapshot,
  from: string,
  to: string,
  review: { percent: number | null; delta: number | null; strongest?: { date: string; done: number; total: number }; totalDone?: number; totalDue?: number }
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable.');

  const dark = data.settings.mode !== 'light';
  const colors = getPalette(data.settings);
  const accentColor = colors[4] ?? '#FF8A3D';

  // Background
  ctx.fillStyle = dark ? '#0B0D12' : '#FBF9F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer card frame
  ctx.strokeStyle = dark ? '#1F2430' : '#E2DDD4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(32, 32, canvas.width - 64, canvas.height - 64, 20);
  ctx.stroke();

  // Header: Brand & Title
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('DAILYCOMMIT', 56, 76);

  ctx.fillStyle = dark ? '#E8EAF0' : '#1A1814';
  ctx.font = 'bold 30px system-ui';
  ctx.fillText('Weekly Review', 56, 116);

  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E';
  ctx.font = '15px system-ui';
  ctx.fillText(`${format(parseISO(from), 'd MMM yyyy')} – ${format(parseISO(to), 'd MMM yyyy')}`, 56, 142);

  // Big Stat Box 1: Completion Rate
  ctx.fillStyle = dark ? '#131720' : '#EDE8E0';
  ctx.beginPath();
  ctx.roundRect(56, 174, 250, 150, 16);
  ctx.fill();

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 54px system-ui';
  const percentText = review.percent !== null ? `${Math.round(review.percent)}%` : '—';
  ctx.fillText(percentText, 80, 245);

  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E';
  ctx.font = '600 13px system-ui';
  ctx.fillText('COMPLETION RATE', 80, 275);
  ctx.font = '13px system-ui';
  const doneDueText = review.totalDue ? `${review.totalDone} of ${review.totalDue} check-ins` : 'Scheduled habits';
  ctx.fillText(doneDueText, 80, 298);

  // Stat Box 2: Momentum
  ctx.fillStyle = dark ? '#131720' : '#EDE8E0';
  ctx.beginPath();
  ctx.roundRect(334, 174, 250, 150, 16);
  ctx.fill();

  ctx.fillStyle = review.delta !== null && review.delta > 0 ? '#10B981' : review.delta !== null && review.delta < 0 ? '#EF4444' : (dark ? '#E8EAF0' : '#1A1814');
  ctx.font = 'bold 36px system-ui';
  const deltaText = review.delta !== null ? (review.delta > 0 ? `+${Math.round(review.delta)}%` : `${Math.round(review.delta)}%`) : 'Steady';
  ctx.fillText(deltaText, 358, 235);

  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E';
  ctx.font = '600 13px system-ui';
  ctx.fillText('MOMENTUM', 358, 275);
  ctx.font = '13px system-ui';
  ctx.fillText('vs. previous 7 days', 358, 298);

  // Stat Box 3: Best / Peak Day
  ctx.fillStyle = dark ? '#131720' : '#EDE8E0';
  ctx.beginPath();
  ctx.roundRect(56, 348, 528, 90, 16);
  ctx.fill();

  ctx.fillStyle = dark ? '#E8EAF0' : '#1A1814';
  ctx.font = 'bold 20px system-ui';
  const peakDayName = review.strongest ? format(parseISO(review.strongest.date), 'EEEE') : 'Every day counts';
  ctx.fillText(`Peak Day: ${peakDayName}`, 80, 388);

  ctx.fillStyle = dark ? '#A3AAB9' : '#5B564E';
  ctx.font = '14px system-ui';
  const peakSub = review.strongest && review.strongest.total > 0
    ? `${review.strongest.done} of ${review.strongest.total} habits completed (${Math.round((review.strongest.done / review.strongest.total) * 100)}%)`
    : 'Keep showing up every day';
  ctx.fillText(peakSub, 80, 414);

  // 7-day Mini Dot Row
  const startDay = parseISO(from);
  const dotY = 490;
  const dotSpacing = 72;
  const startDotX = 104;
  for (let i = 0; i < 7; i++) {
    const d = dayString(addDays(startDay, i));
    const s = daySummary(d, data);
    const x = startDotX + i * dotSpacing;

    // Day letter
    ctx.fillStyle = dark ? '#717888' : '#888277';
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(format(parseISO(d), 'EEEEE'), x, dotY - 14);

    // Circle
    ctx.beginPath();
    ctx.arc(x, dotY + 10, 14, 0, Math.PI * 2);
    if (s.total > 0 && s.done === s.total) {
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText('✓', x, dotY + 14);
    } else if (s.total > 0 && s.done > 0) {
      ctx.fillStyle = dark ? '#283040' : '#D0C8BC';
      ctx.fill();
      ctx.fillStyle = dark ? '#E8EAF0' : '#1A1814';
      ctx.font = '600 10px system-ui';
      ctx.fillText(`${s.done}`, x, dotY + 14);
    } else {
      ctx.fillStyle = dark ? '#151922' : '#E8E2D6';
      ctx.fill();
    }
  }
  ctx.textAlign = 'left';

  // Footer branding
  ctx.fillStyle = dark ? '#5D6475' : '#999285';
  ctx.font = '13px system-ui';
  ctx.fillText('Built with DailyCommit · dailycommit.app', 56, 576);

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create image.'))), 'image/png')
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 60000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function exportOrShareFile(
  blob: Blob,
  filename: string,
  title: string = 'DailyCommit'
): Promise<'shared' | 'downloaded'> {
  // 1. Native Capacitor (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text: `${title} - ${filename}`,
        url: writeResult.uri,
        dialogTitle: `Export ${filename}`,
      });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && (e.name === 'AbortError' || e.message?.toLowerCase().includes('cancel'))) {
        return 'shared';
      }
    }
  }

  // 2. Web Share API with file support (Android Chrome, iOS Safari)
  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `${title} (${filename})`,
        });
        return 'shared';
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return 'shared';
      }
    }
  }

  // 3. Fallback to anchor click download
  downloadBlob(blob, filename);
  return 'downloaded';
}
