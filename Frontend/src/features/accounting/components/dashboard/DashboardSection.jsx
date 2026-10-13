/**
 * سرفصلِ هر گروه از کاشی‌ها. داشبورد دو جور عدد دارد — «همین حالا» (مستقل از بازه) و
 * «در بازه» — و بدونِ این سرفصل، کاربر انتظار داشت مانده‌ی مشتریان هم با عوضِ بازه عوض شود.
 */
export default function DashboardSection({ title, caption, children }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </div>
      {children}
    </section>
  );
}
