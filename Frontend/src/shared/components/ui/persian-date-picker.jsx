// src/shared/components/ui/persian-date-picker.jsx
import { useState, useEffect, useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

let DatePicker, DateObject, persian, persian_fa, gregorian, gregorian_en;

const loadDeps = async () => {
  const [dp, dobj, per, perFa, greg, gregEn] = await Promise.all([
    import("react-multi-date-picker"),
    import("react-multi-date-picker"),
    import("react-date-object/calendars/persian"),
    import("react-date-object/locales/persian_fa"),
    import("react-date-object/calendars/gregorian"),
    import("react-date-object/locales/gregorian_en"),
    // کتابخانه استایل پایه را خودش هنگام اجرا تزریق می‌کند؛
    // فقط override های سفارشی خودمان را لود می‌کنیم.
    import("./persian-date-picker.css"),
  ]);
  const r = (m) => m?.default ?? m;
  DatePicker = r(dp.default ?? dp.DatePicker ?? dp);
  DateObject = r(dobj.DateObject ?? dobj.default?.DateObject);
  persian = r(per);
  persian_fa = r(perFa);
  gregorian = r(greg);
  gregorian_en = r(gregEn);
};

export default function PersianDatePicker({
  value, onChange, placeholder = "انتخاب تاریخ",
  disabled = false, className, error = false, id,
}) {
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadDeps().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="relative w-full">
        <input
          id={id}
          readOnly
          placeholder={placeholder}
          disabled
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-xs",
            "placeholder:text-muted-foreground opacity-50 cursor-not-allowed",
            className
          )}
        />
        <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  }

  const dateValue = value
    ? new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorian_en })
        .convert(persian, persian_fa)
    : null;

  const handleChange = (d) => {
    if (!d) return onChange(null);
    onChange(d.convert(gregorian, gregorian_en).format("YYYY-MM-DD"));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(null);
  };

  return (
    <DatePicker
      value={dateValue}
      onChange={handleChange}
      calendar={persian}
      locale={persian_fa}
      calendarPosition="bottom-right"
      disabled={disabled}
      containerClassName="w-full"
      className="rmdp-app-calendar"
      render={(val, openCalendar) => (
        <div className="relative w-full">
          <input
            id={id}
            readOnly
            value={val}
            onClick={openCalendar}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-xs cursor-pointer",
              "outline-none transition-colors placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive/30",
              value && !disabled && "pl-14",
              className
            )}
          />
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute left-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
              aria-label="پاک کردن تاریخ"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    />
  );
}