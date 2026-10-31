import { useEffect, useState } from "react";

/**
 * کدام بخش الان در دید است (برای روشن‌کردنِ همان گروه در ناوبری). بخشی برنده است که
 * بالایش از خطِ ۳۰٪ِ بالای صفحه گذشته باشد؛ آخرین بخش وقتی به تهِ صفحه رسیدیم.
 *
 * @param ids شناسه‌ی عنصرهای بخش‌ها، به ترتیبِ صفحه
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? null);
  const key = ids.join("|");

  useEffect(() => {
    if (ids.length === 0) return undefined;
    const update = () => {
      const line = window.innerHeight * 0.3;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(atBottom ? ids[ids.length - 1] : current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // `key` جای `ids` (آرایه‌ی تازه در هر رندر).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
