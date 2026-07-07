const ERROR_MESSAGES = {
  "database error": "خطای پایگاه داده",
  "database/sql": "خطای پایگاه داده",
  "scan error": "خطا در خواندن اطلاعات",
  "commit error": "خطا در ثبت تغییرات",
  "transaction error": "خطا در انجام تراکنش",
  "invalid request body": "درخواست نامعتبر است",
  "invalid id": "شناسه نامعتبر است",
  "invalid credentials": "نام کاربری یا رمز عبور اشتباه است",
  "invalid refresh token": "توکن تازه‌سازی نامعتبر است",
  "failed to generate token": "خطا در تولید توکن",
  "failed to generate refresh token": "خطا در تولید توکن تازه‌سازی",
  "failed to generate invoice number": "خطا در تولید شماره فاکتور",
  "failed to generate sale number": "خطا در تولید شماره فروش",
  "failed to hash password": "خطا در رمزنگاری رمز عبور",
  "failed to save file": "خطا در ذخیره فایل",
  "failed to write file": "خطا در نوشتن فایل",
  "file is required": "انتخاب فایل الزامی است",
  "failed to create check record": "خطا در ثبت چک",
  "failed to create return": "خطا در ثبت مرجوعی",
  "failed to create stock movement": "خطا در ثبت حرکت انبار",
  "failed to insert item": "خطا در ثبت آیتم",
  "failed to update item": "خطا در به‌روزرسانی آیتم",
  "failed to update status": "خطا در به‌روزرسانی وضعیت",
  "failed to log status": "خطا در ثبت تغییر وضعیت",
  "backup failed: pg_dump not available or error": "خطا در تهیه نسخه پشتیبان",
  "account_name, bank_name, account_number are required": "نام حساب، نام بانک و شماره حساب الزامی هستند",
  "code is required": "کد الزامی است",
  "name is required": "نام الزامی است",
  "status is required": "وضعیت الزامی است",
  "full_name and national_id are required": "نام و کد ملی الزامی هستند",
  "full_name, username, and password are required": "نام، نام کاربری و رمز عبور الزامی هستند",
  "internal_code and name are required": "کد داخلی و نام الزامی هستند",
  "internal_code already exists": "این کد داخلی قبلاً ثبت شده است",
  "national_id already exists": "این کد ملی قبلاً ثبت شده است",
  "customer_id and items are required": "شناسه مشتری و آیتم‌ها الزامی هستند",
  "customer_id and amount are required": "شناسه مشتری و مبلغ الزامی هستند",
  "supplier_id and items are required": "شناسه تامین‌کننده و آیتم‌ها الزامی هستند",
  "supplier_id and amount are required": "شناسه تامین‌کننده و مبلغ الزامی هستند",
  "customer not found": "مشتری یافت نشد",
  "customer not found or inactive": "مشتری یافت نشد یا غیرفعال است",
  "supplier not found": "تامین‌کننده یافت نشد",
  "product not found": "کالا یافت نشد",
  "sale not found": "فروش یافت نشد",
  "purchase order not found": "سفارش خرید یافت نشد",
  "receiving not found": "رسید انبار یافت نشد",
  "invoice not found": "فاکتور یافت نشد",
  "payment not found": "پرداخت یافت نشد",
  "bank account not found": "حساب بانکی یافت نشد",
  "vehicle not found": "وسیله نقلیه یافت نشد",
  "user not found": "کاربر یافت نشد",
  "can only update pending orders": "فقط سفارش‌های در انتظار قابل ویرایش هستند",
  "can only update proforma invoices": "فقط فاکتورهای پیش‌فاکتور قابل ویرایش هستند",
  "only proforma invoices can be confirmed": "فقط فاکتورهای پیش‌فاکتور قابل تایید هستند",
  "only confirmed invoices can be dispatched": "فقط فاکتورهای تایید‌شده قابل ارسال هستند",
  "cannot cancel delivered invoice": "فاکتور تحویل‌شده قابل لغو نیست",
  "order must be shipped or partially_received to receive": "سفارش باید ارسال‌شده یا ناقص دریافت‌شده باشد تا دریافت شود",
};

export function translateError(message) {
  if (!message) return "خطای ناشناخته‌ای رخ داده است";

  const normalized = message.trim();

  // Exact match
  if (ERROR_MESSAGES[normalized]) {
    return ERROR_MESSAGES[normalized];
  }

  // Dynamic: credit limit exceeded: balance X, limit Y
  if (normalized.startsWith("credit limit exceeded")) {
    const balanceMatch = normalized.match(/balance ([\d.]+)/);
    const limitMatch = normalized.match(/limit ([\d.]+)/);
    const balance = balanceMatch ? Number(balanceMatch[1]).toLocaleString("fa-IR") : "";
    const limit = limitMatch ? Number(limitMatch[1]).toLocaleString("fa-IR") : "";
    return `سقف اعتبار فراتر رفته است (مانده: ${balance}، سقف: ${limit})`;
  }

  // Dynamic: cannot transition from X to Y
  if (normalized.startsWith("cannot transition from")) {
    const transitionMatch = normalized.match(/from (\S+) to (\S+)/);
    if (transitionMatch) {
      return `تغییر وضعیت از «${transitionMatch[1]}» به «${transitionMatch[2]}» امکان‌پذیر نیست`;
    }
  }

  // If the message contains only latin letters/numbers (likely a backend key), return a generic Persian message
  if (/^[\x00-\x7F]+$/.test(normalized)) {
    return "خطایی در ارتباط با سرور رخ داده است";
  }

  return normalized;
}
