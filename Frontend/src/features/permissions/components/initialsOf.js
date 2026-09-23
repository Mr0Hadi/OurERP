/** دو حرفِ اولِ نام برای آواتار. */
export const initialsOf = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
