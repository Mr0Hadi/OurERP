/**
 * «tone»: زبانِ مشترکِ رنگِ وضعیت در کل برنامه.
 *
 * قبلاً هر badge و باکسِ هشدار رنگش را مستقیم از پالتِ Tailwind می‌نوشت
 * (`bg-amber-50 text-amber-700 ...`، `bg-green-100 text-green-800 ...`) —
 * با سه شکلِ متفاوت، بدونِ dark mode در نیمی از موارد، و بی‌اعتنا به تمِ
 * دسترس‌پذیر. حالا هر جا فقط یک *معنا* انتخاب می‌کند و ظاهر از توکن‌های
 * `index.css` (`--success`، `--warning`، …) می‌آید که هر تم خودش تعریفشان
 * می‌کند.
 *
 * معناها:
 *   neutral  پیش‌نویس، غیرفعال، بی‌طرف (پیش‌فاکتور، مرجوع به تامین‌کننده)
 *   primary  رنگِ برند؛ برای برجسته‌کردنِ بی‌طرف
 *   info     در جریان، اطلاع (ارسال‌شده، چک)
 *   success  کامل، موفق، فعال (دریافت‌شده، در انبار)
 *   warning  در انتظار، نیازمند اقدام (در انتظار، فروخته‌شده)
 *   caution  ناقص یا مسئله‌دار (دریافت ناقص، قرنطینه)
 *   special  گردش‌های خاص (مرجوعی، نسیه)
 *   danger   لغو، رد، اسقاط، خطا
 *
 * کلاس‌ها باید رشته‌ی کامل و ثابت بمانند تا Tailwind پیدایشان کند.
 */

/** badge و برچسب‌های کوچک: زمینه‌ی کم‌رنگ، متن و حاشیه‌ی هم‌رنگ. */
const SOFT = {
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/25",
  info: "bg-info/12 text-info border-info/30",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/35",
  caution: "bg-caution/12 text-caution border-caution/30",
  special: "bg-special/12 text-special border-special/30",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
};

/** پس‌زمینه‌ی ردیف/ناحیه‌ای که باید دیده شود ولی متنش رنگی نیست. */
const ROW = {
  neutral: "",
  primary: "bg-primary/4",
  info: "bg-info/5",
  success: "",
  warning: "bg-warning/6",
  caution: "bg-caution/6",
  special: "bg-special/5",
  danger: "bg-destructive/4",
};

/** رنگِ پُر برای نقطه‌ها، نوار پیشرفت و نشانگرها. */
const SOLID = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  caution: "bg-caution",
  special: "bg-special",
  danger: "bg-destructive",
};

/** فقط رنگِ متن — برای عدد یا آیکنِ رنگی داخلِ متنِ معمولی. */
const TEXT = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  caution: "text-caution",
  special: "text-special",
  danger: "text-destructive",
};

export const TONES = Object.freeze(Object.keys(SOFT));

const pick = (map, tone) => map[tone] ?? map.neutral;

export const toneSoft = (tone) => pick(SOFT, tone);
export const toneRow = (tone) => pick(ROW, tone);
export const toneSolid = (tone) => pick(SOLID, tone);
export const toneText = (tone) => pick(TEXT, tone);
