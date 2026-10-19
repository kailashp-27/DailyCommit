export function widgetGrid(weeks: number, width: number, height: number) {
  weeks = Math.max(1, Math.floor(weeks));
  let columns = 1, pitch = 0;
  for (let cols = 1; cols <= weeks; cols++) {
    const blocks = Math.ceil(weeks / cols), candidate = Math.min(Math.max(1, width) / cols, Math.max(1, height) / (blocks * 7 + (blocks - 1) * 2));
    if (candidate > pitch) { pitch = candidate; columns = cols; }
  }
  const blocks = Math.ceil(weeks / columns), cell = pitch * .78;
  const left = (width - columns * pitch) / 2 + (pitch - cell) / 2, top = (height - (blocks * 7 + (blocks - 1) * 2) * pitch) / 2 + (pitch - cell) / 2;
  return { columns, blocks, cell, x: (day: number) => left + Math.floor(day / 7) % columns * pitch, y: (day: number) => top + (Math.floor(Math.floor(day / 7) / columns) * 9 + day % 7) * pitch };
}
