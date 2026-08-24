import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import {
  OBSERVED_PROBLEMS,
  problemLabels,
  problemSubset,
} from "@/shared/domain/returns/problems";

/**
 * واژگانِ دریافت انبار — نام‌گذاری، بدون هیچ محاسبه‌ای.
 *
 * این‌ها قبلاً داخل فایل‌های api-mock بودند و کامپوننت‌های جدول
 * مستقیم از آن‌ها import می‌کردند. یعنی UI به *پیاده‌سازی mock* وابسته
 * بود و روز مهاجرت به بکند، با رفتنِ آن فایل‌ها می‌شکست. واژگان به
 * سرور مهاجرت نمی‌کند؛ پس جایش اینجاست و دست‌نخورده می‌ماند.
 */

// ─── منبعِ هر خطِ یک رسید ───────────────────────────────────────────────────

/**
 * یک محموله‌ی فیزیکی می‌تواند هم‌زمان چند چیز بیاورد: بخشی از خودِ
 * سفارش، و کالای جایگزینی که طرف حساب بابت یک مرجوعی بدهکار است.
 * تامین‌کننده‌ای که خرید را دو سری می‌فرستد ممکن است جایگزین‌های
 * مرجوعیِ سری اول را با ماشین دوم بفرستد — یک ماشین، یک رسید.
 */
// بدون معادل مستند در بکند فعلاً — اگر روزی این تفکیک به سرور مهاجرت
// کرد، شماره‌ها همین‌جا هماهنگ می‌شوند.
export const RECEIVING_SOURCES = {
  ORDER: 0,
  RETURN: 1,
};

export const RECEIVING_SOURCE_LABELS = {
  [RECEIVING_SOURCES.ORDER]: "اقلام سفارش",
  [RECEIVING_SOURCES.RETURN]: "اقلام مرجوعی",
};

// ─── نوعِ هر ردیفِ صف دریافت ────────────────────────────────────────────────

export const INCOMING_TYPES = {
  PURCHASE: 0,
  SALES_RETURN: 1,
};

export const INCOMING_TYPE_LABELS = {
  [INCOMING_TYPES.PURCHASE]: "خرید",
  [INCOMING_TYPES.SALES_RETURN]: "مرجوعی فروش",
};

// ─── واجد شرایطِ صف ─────────────────────────────────────────────────────────

/**
 * فقط خریدهای «ارسال شده» به‌خودیِ‌خود در صف انباردار دیده می‌شوند.
 *
 * تنها تعریفِ این فهرست. پیش‌تر سه نسخه‌ی جدا داشت (constants.js،
 * incomingQueueApi.js، api-mockData.js) که تصادفاً هم‌مقدار بودند.
 */
export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];

// ─── نوعِ مشکلِ یک ردیف ──────────────────────────────────────────────────────

/**
 * نوعِ مشکل، هنگام دریافتِ *هر* محموله‌ای انتخاب می‌شود — چه ارسالِ
 * تامین‌کننده، چه کالای برگشتیِ مشتری. قبلاً `PURCHASE_ISSUE_TYPES` نام
 * داشت و در `shared/constants/` بود، به این گمان که فقط به خرید مربوط
 * است؛ در عمل صفحه‌ی دریافتِ مرجوعیِ فروش هم از روز اول از همین enum
 * استفاده می‌کرد — نامش نادرست بود، نه اینکه سمتِ فروش چیزی کم داشت.
 * جای درستش همین‌جاست، کنار بقیه‌ی واژگانِ دریافت.
 *
 * سمتِ ارسال (شیپینگ) قرینه‌اش را ندارد و نباید داشته باشد: وقتی *ما*
 * کالا را می‌فرستیم، چیزی برای «بازرسیِ ورودی» وجود ندارد که مشکلی رویش
 * گزارش شود.
 *
 * مقادیر از فضای مشترکِ `shared/domain/returns/problems.js` می‌آیند —
 * همان فضایی که ادعای مرجوعی روی آن می‌نشیند. به همین دلیل گزارشِ
 * انباردار بدون هیچ ترجمه‌ای به ادعا یا به «مشاهده‌ی بازرسی» تبدیل
 * می‌شود.
 */
export const RECEIVING_ISSUE_TYPES = problemSubset(OBSERVED_PROBLEMS);

export const RECEIVING_ISSUE_TYPE_LABELS = problemLabels(OBSERVED_PROBLEMS, {
  [RECEIVING_ISSUE_TYPES.DEFECTIVE]: "معیوب / خراب",
});

/**
 * استایل‌های این فهرست عمداً از نسخه‌ی مشترک جدا مانده‌اند: جدول‌های
 * انبار پس‌زمینه‌ی پررنگ‌تری (`-100`) می‌خواهند تا روی ردیف‌های فشرده
 * خوانا بمانند، در حالی که بج‌های صفحه‌ی مرجوعی نسخه‌ی روشن‌تر
 * (`-50`) را استفاده می‌کنند.
 */
export const RECEIVING_ISSUE_TYPE_STYLES = {
  [RECEIVING_ISSUE_TYPES.SHORT_SHIPPED]:
    "bg-amber-100 text-amber-800 border-amber-300",
  [RECEIVING_ISSUE_TYPES.DEFECTIVE]: "bg-red-100 text-red-800 border-red-300",
  [RECEIVING_ISSUE_TYPES.DAMAGED_IN_TRANSIT]:
    "bg-orange-100 text-orange-800 border-orange-300",
  [RECEIVING_ISSUE_TYPES.WRONG_ITEM_SHIPPED]:
    "bg-purple-100 text-purple-800 border-purple-300",
  [RECEIVING_ISSUE_TYPES.EXPIRED]: "bg-gray-100 text-gray-800 border-gray-300",
  [RECEIVING_ISSUE_TYPES.QUALITY_ISSUE]:
    "bg-red-100 text-red-800 border-red-300",
  [RECEIVING_ISSUE_TYPES.OTHER]:
    "bg-slate-100 text-slate-800 border-slate-300",
};

/**
 * پیش‌فرضِ خطِ *سفارش* وقتی نوعِ مشکل مشخص نشده باشد.
 *
 * برای خطِ مرجوعی پیش‌فرضِ دیگری لازم است (کالا رسیده، پس «کسری»
 * بی‌معناست) — `defaultIssueTypeFor` در issueSemantics.js.
 */
export const DEFAULT_RECEIVING_ISSUE_TYPE = RECEIVING_ISSUE_TYPES.SHORT_SHIPPED;

// ─── مازاد ───────────────────────────────────────────────────────────────────

/**
 * «مازاد»: کالایی که فیزیکاً در انبار ما هست ولی چیزی که منتظرش
 * بودیم توجیهش نمی‌کند — یا بیشتر از حد انتظار رسیده (excess) یا اصلاً
 * در سیستم ما تعریف نشده (unknown). مثلِ issue types، مالِ هر دو نوعِ
 * دریافت است، نه فقط خرید.
 *
 * این محوری *جدا* از RECEIVING_ISSUE_TYPES است و هرگز نباید با آن
 * یکی شود. مشکلات (issues) روی سفارش/مرجوعی ادعا می‌سازند و از «مقدار
 * قابل دریافت» کم می‌شوند؛ مازاد اساساً بیرون از آن سقف است و نباید
 * هیچ اثری روی آن محاسبه بگذارد. اگر مازاد داخل issues ثبت شود، هم
 * مقدار قابل دریافتِ انباردار را اشتباه کم می‌کند و هم در گزارش کسری —
 * که سقفش خودِ مقدار انتظار است — بی‌صدا حذف می‌شود.
 *
 * برای مازادِ unknown، productId وجود ندارد: انباردار فقط شرح و تعداد
 * ثبت می‌کند و اتصال به کالای واقعی تا لحظه‌ی تصمیمِ «نگهداری» به
 * تعویق می‌افتد.
 */
export const SURPLUS_KINDS = {
  EXCESS: 0,
  UNKNOWN: 1,
};

export const SURPLUS_KIND_LABELS = {
  [SURPLUS_KINDS.EXCESS]: "ارسال اضافه",
  [SURPLUS_KINDS.UNKNOWN]: "کالای ثبت‌نشده",
};

export const SURPLUS_KIND_STYLES = {
  [SURPLUS_KINDS.EXCESS]: "bg-sky-100 text-sky-800 border-sky-300",
  [SURPLUS_KINDS.UNKNOWN]: "bg-violet-100 text-violet-800 border-violet-300",
};
