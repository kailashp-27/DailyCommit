import { parseISO, startOfWeek, differenceInCalendarDays, format } from 'date-fns';
import { dateRange, daySummary, getPalette, intensity, today, type Snapshot } from './domain';
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
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
