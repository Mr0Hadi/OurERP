import { workQueuesFor } from "./workQueues";
import { quickActionsFor } from "./quickActions";

/**
 * فهرستِ همه‌ی ویجت‌های داشبورد — فقط *تعریف*، بدونِ کامپوننت.
 *
 * داشبوردِ هر کاربر از سه لایه ساخته می‌شود:
 *
 *   ۱. **در دسترس** (`isAvailable`) — از روی نقشِ سازمانی و دسترسی‌ها.
 *      ویجتی که داده‌اش را سرور به این کاربر نمی‌دهد اصلاً وجود ندارد؛ نه
 *      در صفحه و نه در پنلِ شخصی‌سازی.
 *   ۲. **پیش‌فرض** (`defaultLayout`) — ترتیب و روشن/خاموش برای کسی که
 *      هنوز چیزی را عوض نکرده، باز از روی نقش.
 *   ۳. **انتخابِ خودِ کاربر** — در `dashboardLayoutStore`، جدا برای هر
 *      کاربر.
 *
 * `span` عرضِ ویجت در گریدِ سه‌ستونه‌ی دسکتاپ است؛ روی موبایل همه
 * تمام‌عرض‌اند. `periodic` یعنی ویجت به بازه‌ی تاریخِ نوارِ بالا گوش
 * می‌دهد — نوار فقط وقتی دیده می‌شود که دست‌کم یکی از این‌ها روشن باشد.
 * `locked` یعنی کاربر نمی‌تواند خاموشش کند.
 */

export const WIDGET_GROUPS = Object.freeze({
  DAILY: "کار روزانه",
  PERSONAL: "عملکرد من",
  TEAM: "تیم من",
  DEPARTMENT: "واحد من",
  ORG: "نمای کل سازمان",
});

export const WIDGETS = [
  {
    id: "welcome",
    title: "خوش‌آمد",
    description: "نام، نقش، واحد و تیم شما",
    group: WIDGET_GROUPS.DAILY,
    span: "full",
    locked: true,
    isAvailable: () => true,
  },
  {
    id: "workQueues",
    title: "کارهای منتظر",
    description: "صف‌های دریافت، ارسال، پیش‌فاکتورها و مرجوعی‌های باز",
    group: WIDGET_GROUPS.DAILY,
    span: "wide",
    isAvailable: (ctx) => workQueuesFor(ctx).length > 0,
  },
  {
    id: "quickActions",
    title: "دسترسی سریع",
    description: "شروعِ کارهایی که اجازه‌اش را دارید",
    group: WIDGET_GROUPS.DAILY,
    span: "narrow",
    isAvailable: (ctx) => quickActionsFor(ctx).length > 0,
  },
  {
    id: "myPerformance",
    title: "عملکرد من",
    description: "فروش و خریدی که خودتان ثبت کرده‌اید",
    group: WIDGET_GROUPS.PERSONAL,
    span: "full",
    periodic: true,
    // انباردار یا حسابداری که هیچ‌وقت فاکتور ثبت نمی‌کند، «عملکردِ» فروش و
    // خرید ندارد؛ چهار کارتِ صفر فقط جای کارِ واقعی‌اش را می‌گرفت.
    isAvailable: (ctx) => ctx.sells || ctx.buys,
  },
  {
    id: "teamPerformance",
    title: "عملکرد تیم",
    description: "جمعِ تیم و سهمِ هر عضو",
    group: WIDGET_GROUPS.TEAM,
    span: "full",
    periodic: true,
    isAvailable: (ctx) => ctx.isTeamLead,
  },
  {
    id: "departmentPerformance",
    title: "عملکرد واحد",
    description: "جمعِ واحد و سهمِ هر عضو",
    group: WIDGET_GROUPS.DEPARTMENT,
    span: "full",
    periodic: true,
    isAvailable: (ctx) => ctx.isDepartmentLead,
  },
  {
    id: "orgKpis",
    title: "شاخص‌های سازمان",
    description: "درآمد، سود خالص، حاشیه سود و کالای دریافتی",
    group: WIDGET_GROUPS.ORG,
    span: "full",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
  {
    id: "orgSalesVsPurchase",
    title: "فروش در برابر خرید",
    description: "مبلغ فاکتورهای فروش و خرید در هر بازه",
    group: WIDGET_GROUPS.ORG,
    span: "wide",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
  {
    id: "orgRevenueBreakdown",
    title: "ترکیب درآمد",
    description: "سهم بهای تمام‌شده، اسقاط و سود از درآمد",
    group: WIDGET_GROUPS.ORG,
    span: "narrow",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
  {
    id: "topSellers",
    title: "پرفروش‌ترین کارمندان",
    description: "پنج کارمند با بیشترین مبلغ فروش در بازه",
    group: WIDGET_GROUPS.ORG,
    span: "narrow",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
  {
    id: "orgSalesTrend",
    title: "روند درآمد و سود",
    description: "درآمد، بهای تمام‌شده و سود خالص در طول زمان",
    group: WIDGET_GROUPS.ORG,
    span: "wide",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
  {
    id: "orgPeriodTable",
    title: "جزئیات بازه‌ها",
    description: "ارقام کامل هر بازه در یک جدول",
    group: WIDGET_GROUPS.ORG,
    span: "full",
    periodic: true,
    isAvailable: (ctx) => ctx.canSeeOrg,
  },
];

export const WIDGETS_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

export const availableWidgetIds = (ctx) =>
  WIDGETS.filter((widget) => widget.isAvailable(ctx)).map((widget) => widget.id);

/**
 * چیدمانِ پیش‌فرض.
 *
 * منطقش «هرکس اول چیزی را ببیند که مسئولش است»:
 *   - مسئول/جانشینِ واحد → واحدش قبل از خودش؛
 *   - مسئول/جانشینِ تیم → تیمش قبل از خودش؛
 *   - بقیه → صف‌های کاری و عملکردِ خودشان.
 *
 * «جزئیات بازه‌ها» پیش‌فرض خاموش است: همان عددهای نمودارهاست با دقتِ
 * کامل، و فقط کسی که دنبالش است سراغش می‌رود — صفحه برای بقیه کوتاه
 * می‌ماند و یک کلیک در پنلِ شخصی‌سازی روشنش می‌کند.
 */
export function defaultLayout(ctx) {
  const personal = ["myPerformance"];
  if (ctx.isTeamLead) personal.unshift("teamPerformance");
  if (ctx.isDepartmentLead) personal.unshift("departmentPerformance");

  const order = [
    "welcome",
    "workQueues",
    "quickActions",
    ...personal,
    "orgKpis",
    "orgSalesVsPurchase",
    "orgRevenueBreakdown",
    "orgSalesTrend",
    "topSellers",
    "orgPeriodTable",
  ];

  const available = new Set(availableWidgetIds(ctx));
  return {
    order: order.filter((id) => available.has(id)),
    hidden: ["orgPeriodTable"].filter((id) => available.has(id)),
  };
}

/**
 * چیدمانِ ذخیره‌شده + آنچه امروز در دسترس است → چیدمانِ نهایی.
 *
 * دو اتفاق بینِ دو بازدید ممکن است بیفتد و هیچ‌کدام نباید چیدمانِ
 * کاربر را خراب کند:
 *   - دسترسی یا نقشی گرفته شود → ویجتش بی‌صدا حذف می‌شود (ولی در
 *     ذخیره می‌ماند، تا اگر برگشت سرِ جای قبلی‌اش بیاید)؛
 *   - دسترسی یا ویجتِ تازه‌ای اضافه شود → سرِ جایِ پیش‌فرضش، کنارِ
 *     همسایه‌ی قبلی‌اش می‌نشیند، نه تهِ صفحه.
 */
export function resolveLayout(ctx, saved) {
  const fallback = defaultLayout(ctx);
  if (!saved) return fallback;

  const available = new Set(availableWidgetIds(ctx));
  const order = (saved.order ?? []).filter((id) => available.has(id));

  fallback.order.forEach((id, index) => {
    if (order.includes(id)) return;
    const previous = fallback.order
      .slice(0, index)
      .reverse()
      .find((neighbour) => order.includes(neighbour));
    const at = previous ? order.indexOf(previous) + 1 : 0;
    order.splice(at, 0, id);
  });

  const known = new Set(saved.order ?? []);
  const hidden = [
    ...(saved.hidden ?? []),
    // تازه‌واردی که پیش‌فرض خاموش است، خاموش هم می‌آید.
    ...fallback.hidden.filter((id) => !known.has(id)),
  ].filter((id) => available.has(id) && !WIDGETS_BY_ID[id].locked);

  return { order, hidden: [...new Set(hidden)] };
}

const SPAN_COLUMNS = { full: 3, wide: 2, narrow: 1 };

/**
 * عرضِ نهاییِ هر ویجت در گریدِ سه‌ستونه، بعد از چیدنِ ردیف‌ها.
 *
 * `span` فقط *خواسته‌ی* ویجت است. وقتی کاربر همسایه‌ای را خاموش یا
 * جابه‌جا می‌کند، ویجتِ «دوسوم» تنها در ردیف می‌ماند و یک‌سومِ خالی کنارش؛
 * پس آخرین ویجتِ هر ردیفی که پر نشده، کشیده می‌شود تا ردیف را پر کند.
 */
export function packRows(ids) {
  const columns = {};
  let row = [];
  let used = 0;

  const closeRow = () => {
    if (row.length) columns[row[row.length - 1]] += 3 - used;
    row = [];
    used = 0;
  };

  for (const id of ids) {
    const width = SPAN_COLUMNS[WIDGETS_BY_ID[id]?.span] ?? 3;
    if (used + width > 3) closeRow();
    columns[id] = width;
    row.push(id);
    used += width;
    if (used === 3) closeRow();
  }
  closeRow();
  return columns;
}
