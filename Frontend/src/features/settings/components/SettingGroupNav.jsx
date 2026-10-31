import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/utils";
import { groupAnchor, groupIcon } from "../domain/systemSetting";

/**
 * پرش به گروه‌ها: در دسکتاپ ستونِ کناریِ چسبان، در موبایل ردیفِ افقیِ چیپ‌ها (چسبان بالای
 * صفحه، اسکرولِ بی‌نوار؛ چیپِ فعال خودش به دید می‌آید).
 * پدرِ این نوار نباید `overflow-hidden` داشته باشد، وگرنه `sticky` کار نمی‌کند.
 * عددِ کنارِ هر گروه تعدادِ تنظیم‌ها، یا اگر تغییرِ ذخیره‌نشده دارد تعدادِ آن‌هاست.
 */
export default function SettingGroupNav({ groups, dirtyCountByGroup, activeAnchor }) {
  const navRef = useRef(null);

  useEffect(() => {
    const chip = navRef.current?.querySelector('[aria-current="true"]');
    // فقط محورِ افقیِ خودِ نوار؛ `scrollIntoView` کلِ صفحه را هم تکان می‌داد.
    if (chip && navRef.current.scrollWidth > navRef.current.clientWidth) {
      const nav = navRef.current;
      nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.clientWidth) / 2, behavior: "smooth" });
    }
  }, [activeAnchor]);

  const jump = (anchor) => {
    const el = document.getElementById(anchor);
    if (!el) return;
    // جا برای نوارِ چسبانِ موبایل (ارتفاعِ خودِ ناوبری) یا کمی فاصله در دسکتاپ.
    const offset = window.matchMedia("(min-width: 768px)").matches ? 16 : (navRef.current?.offsetHeight ?? 0) + 8;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  };

  return (
    <nav
      ref={navRef}
      aria-label="گروه‌های تنظیمات"
      className="sticky top-(--app-header-offset) z-10 flex min-w-0 gap-2 overflow-x-auto bg-background py-2 transition-[top] duration-200 scrollbar-hide md:top-[calc(var(--app-header-offset)+1rem)] md:flex-col md:gap-1 md:overflow-visible md:rounded-xl md:border md:bg-card md:p-2"
    >
      {groups.map((group) => {
        const Icon = groupIcon(group.group);
        const anchor = groupAnchor(group.group);
        const dirty = dirtyCountByGroup[group.group] ?? 0;
        const isActive = activeAnchor === anchor;
        return (
          <button
            key={group.group}
            type="button"
            aria-current={isActive}
            onClick={() => jump(anchor)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors md:rounded-lg md:border-transparent",
              isActive
                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{group.groupTitle}</span>
            {dirty > 0 ? (
              <span className="ms-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-xs text-primary-foreground tabular-nums" title="تغییرِ ذخیره‌نشده">
                {dirty}
              </span>
            ) : (
              <span className="ms-auto text-xs tabular-nums text-muted-foreground">{group.settings.length}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
