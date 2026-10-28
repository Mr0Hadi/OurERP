/**
 * `{ value: label }` (مثلِ `*_LABELS`ِ enumها) → `[{ value, label }]` برای `OptionSelect`،
 * `FilterSelect`، `SegmentedControl` و ….
 *
 * کلیدِ شیء همیشه رشته است؛ `numeric` آن را عدد می‌کند برای جایی که مقدار با enumِ عددی
 * مقایسه می‌شود (`OptionSelect` با `numeric` خودش خروجی را عدد می‌کند و این لازم ندارد).
 */
export const optionsFromLabels = (labels, { numeric = false } = {}) =>
  Object.entries(labels).map(([value, label]) => ({ value: numeric ? Number(value) : value, label }));
