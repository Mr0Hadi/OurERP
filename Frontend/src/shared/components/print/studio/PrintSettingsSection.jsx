/**
 * یک بخشِ پنلِ تنظیماتِ چاپ (کاغذ، محتوا، ظاهر…): عنوان، توضیحِ کوتاهِ
 * اختیاری و کنترل‌ها. بخش‌ها با خطِ نازک از هم جدا می‌شوند.
 */
export default function PrintSettingsSection({ title, description, icon: Icon, children }) {
  return (
    <section className="space-y-3 border-b border-border pb-5 last:border-b-0 last:pb-0">
      <div className="space-y-0.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </h3>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** برچسبِ کوچکِ بالای یک کنترل داخلِ بخش. */
export function PrintSettingLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs text-muted-foreground">
      {children}
    </label>
  );
}
