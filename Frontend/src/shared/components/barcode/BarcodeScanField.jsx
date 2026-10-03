import { useCallback, useRef, useState } from "react";

import { Input } from "@/shared/components/ui/input";
import CameraScanButton from "./CameraScanButton";

/**
 * فیلد اسکن بارکد — قابل‌جاسازی در هر فرمی که باید با یک اسکن، خودکار
 * چیزی را پیدا کند؛ خودِ منطقِ «پیدا کردن و انتخاب» به عهده‌ی فراخوان
 * است (onScan).
 *
 * اسکنر دستیِ انبار مثل صفحه‌کلید عمل می‌کند: کد را می‌نویسد و Enter
 * می‌زند — پس گوش‌دادن به کلید Enter روی خودِ input دقیقاً همان چیزی
 * است که برای اسکنِ پشتِ‌سرهم لازم است. دوربین هم برای دستگاه‌های
 * بدون اسکنر (موبایل/تبلت) است — و چون دوربین هر دو نماد را می‌خواند،
 * برچسبی که QR دارد هم از همین‌جا اسکن می‌شود.
 *
 * عمداً از تگ <form> استفاده نشده: این کامپوننت معمولاً داخلِ فرمِ
 * بزرگ‌ترِ صفحه (ثبت فروش/خرید) جاسازی می‌شود و تودرتو کردنِ <form>
 * در HTML نامعتبر است و submit را می‌شکند.
 *
 * این همان الگویی است که UnitScanBar برای اسکن واحدها دارد، اینجا به
 * شکلِ یک فیلدِ ساده و مشترک بیرون کشیده شده تا در فیلترِ لیست کالاها
 * و همه‌ی جاهایی که کالا برای افزودن انتخاب می‌شود (خرید، فروش،
 * مرجوعی) یکسان استفاده شود.
 */
export default function BarcodeScanField({
  onScan,
  placeholder = "اسکن بارکد یا کد QR کالا...",
  className = "",
  inputClassName = "",
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const submit = useCallback(
    (code) => {
      const trimmed = String(code ?? "").trim();
      if (!trimmed) return;
      onScan(trimmed);
      setValue("");
      inputRef.current?.focus();
    },
    [onScan],
  );

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit(value);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex-1 font-mono input-rtl-placeholder ${inputClassName}`}
        autoComplete="off"
        spellCheck={false}
      />
      <CameraScanButton className="shrink-0" onDetected={submit} />
    </div>
  );
}
