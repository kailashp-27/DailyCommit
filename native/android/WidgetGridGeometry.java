package app.dailycommit.mobile;

// Pure geometry: keep every selected week, wrap strips to maximize readable cells.
public final class WidgetGridGeometry {
    public final int weeks, columns, blocks;
    public final float pitch, cell, left, top;
    public WidgetGridGeometry(int weeks, float width, float height) {
        this.weeks = Math.max(1, weeks);
        int best = 1; float bestPitch = 0;
        for (int cols = 1; cols <= this.weeks; cols++) {
            int strips = (this.weeks + cols - 1) / cols;
            float candidate = Math.min(Math.max(1, width) / cols, Math.max(1, height) / (strips * 7 + (strips - 1) * 2));
            if (candidate > bestPitch) { bestPitch = candidate; best = cols; }
        }
        columns = best; blocks = (this.weeks + columns - 1) / columns; pitch = bestPitch; cell = pitch * .78f;
        left = (width - columns * pitch) / 2 + (pitch - cell) / 2;
        top = (height - (blocks * 7 + (blocks - 1) * 2) * pitch) / 2 + (pitch - cell) / 2;
    }
    public float x(int day) { return left + ((day / 7) % columns) * pitch; }
    public float y(int day) { return top + (((day / 7) / columns) * 9 + day % 7) * pitch; }
}
