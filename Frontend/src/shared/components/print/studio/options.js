/** `{ value: label }` (مثلِ `*_LABELS`ِ enumها) → گزینه‌های `SegmentedControl`. */
export const optionsFromLabels = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
