import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Printer, Scan, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import "../print.css";
import SegmentedControl from "./SegmentedControl";

const MM_TO_PX = 96 / 25.4;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const VIEWS = Object.freeze({ PREVIEW: "preview", SETTINGS: "settings" });
const VIEW_OPTIONS = [
  { value: VIEWS.PREVIEW, label: "پیش‌نمایش" },
  { value: VIEWS.SETTINGS, label: "تنظیمات" },
];

const percent = (scale) => `${Math.round(scale * 100).toLocaleString("fa-IR")}٪`;

/**
 * پیش‌نمایشِ بزرگ‌نمایی‌پذیر. «اندازه‌ی صفحه» (`zoom = null`) ورق را در عرضِ
 * موجود جا می‌دهد؛ دکمه‌ها از همان نقطه پله‌پله کوچک/بزرگ می‌کنند. در چاپ
 * `transform` بی‌اثر می‌شود (`print.css`).
 */
function PreviewPane({ widthMm, maxFitScale, zoom, onZoomChange, children }) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [natural, setNatural] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;
    const measure = () => setNatural({ width: node.offsetWidth, height: node.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const fit = () => {
      const available = node.clientWidth - 32;
      if (available > 0) setFitScale(Math.min(maxFitScale, available / (widthMm * MM_TO_PX)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [widthMm, maxFitScale]);

  const scale = zoom ?? fitScale;
  const zoomOut = () => onZoomChange([...ZOOM_STEPS].reverse().find((step) => step < scale - 0.01) ?? ZOOM_STEPS[0]);
  const zoomIn = () => onZoomChange(ZOOM_STEPS.find((step) => step > scale + 0.01) ?? ZOOM_STEPS.at(-1));

  return (
    <div className="print-portal__stage flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="print-portal__chrome flex items-center justify-center gap-1 border-b border-border bg-card/60 px-2 py-1.5">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="کوچک‌نمایی" onClick={zoomOut}>
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {percent(scale)}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="بزرگ‌نمایی" onClick={zoomIn}>
          <Plus />
        </Button>
        <Button
          type="button"
          variant={zoom === null ? "secondary" : "ghost"}
          size="sm"
          className="gap-1"
          onClick={() => onZoomChange(null)}
        >
          <Scan />
          اندازه‌ی صفحه
        </Button>
      </div>

      <div ref={viewportRef} className="print-portal__sheet flex-1 overscroll-contain bg-muted/60 p-4">
        {/*
          `transform` جعبه‌ی چیدمان را کوچک نمی‌کند؛ قاب به اندازه‌ی *مقیاس‌خورده‌ی*
          ورق است تا ورقِ کوچک‌شده اسکرولِ اضافه نسازد. اندازه‌ی طبیعی با
          `offsetWidth/Height` خوانده می‌شود که از transform بی‌اثر است.
        */}
        <div
          className="print-preview__frame mx-auto"
          style={{ width: natural.width * scale, height: natural.height * scale }}
        >
          <div
            ref={contentRef}
            className="print-preview__scaled w-max"
            style={{ transform: `scale(${scale})`, transformOrigin: "top right" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * پوسته‌ی تمام‌صفحه‌ی چاپ برای هر برگه‌ای که در مرورگر ساخته می‌شود
 * (برچسب، لیست قیمت‌ها، تصویرِ سندها، …): تنظیمات یک طرف، پیش‌نمایشِ دقیقِ
 * کاغذ طرفِ دیگر، و دکمه‌ی چاپ پایین.
 *
 * - **دسکتاپ (lg):** پنلِ تنظیمات در ستونِ راست، پیش‌نمایش کنارش.
 * - **موبایل:** پیش‌نمایش کلِ صفحه است و «تنظیمات» رویش باز می‌شود (سوییچِ
 *   بالای صفحه). پیش‌نمایش همیشه رندر و اندازه‌گیری می‌شود، حتی پشتِ تنظیمات،
 *   تا شمارِ صفحه و طولِ رول درست بماند و چاپ از همان‌جا هم کار کند.
 *
 * پورتالِ مستقیمِ زیرِ body است، نه Dialog: چاپِ چندصفحه‌ای فقط در جریانِ
 * عادیِ صفحه درست تکه می‌شود (`print.css`). خودِ چاپ کارِ مصرف‌کننده است
 * (`usePrint` با `pageSize` درست)؛ این پوسته از محتوا بی‌خبر است.
 *
 * @param settings       پنلِ تنظیمات (معمولاً چند `PrintSettingsSection`)
 * @param preview        برگه‌ای که چاپ می‌شود؛ باید `[data-print-root]` داشته باشد
 * @param previewWidthMm عرضِ ورق برای جا دادنِ پیش‌نمایش
 * @param maxFitScale    سقفِ بزرگ‌نماییِ «اندازه‌ی صفحه» (برچسبِ ریز تا ۲ برابر)
 * @param printDisabledReason متنی که وقتی چاپ ممکن نیست کنارِ دکمه می‌آید
 * @param actions        دکمه‌های فرعیِ نوارِ پایین (کنارِ «چاپ»)
 * @param closeLocked    Escape و دکمه‌ی بستن را موقتاً غیرفعال می‌کند (مثلاً وقتی دیالوگی باز است)
 * @param children       دیالوگ‌های همین برگه (مثلاً «چاپ شد؟»)
 */
export default function PrintStudio({
  title,
  summary,
  settings,
  preview,
  previewWidthMm,
  maxFitScale = 1,
  onPrint,
  printLabel = "چاپ",
  printDisabled = false,
  printDisabledReason,
  actions,
  onClose,
  closeLocked = false,
  children,
}) {
  const titleId = useId();
  const [view, setView] = useState(VIEWS.PREVIEW);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (closeLocked) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeLocked, onClose]);

  // صفحه‌ی پشتِ پوسته نباید با اسکرولِ انگشت جابه‌جا شود.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="print-portal fixed inset-0 z-50 flex flex-col bg-background"
    >
      <header className="print-portal__chrome flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="بستن"
          onClick={onClose}
          disabled={closeLocked}
        >
          <X />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-base font-semibold">
            {title}
          </h2>
          {summary && <p className="truncate text-xs text-muted-foreground">{summary}</p>}
        </div>
        <Printer className="hidden size-5 text-muted-foreground sm:block" aria-hidden />
      </header>

      <div className="print-portal__chrome border-b border-border bg-card px-3 py-2 lg:hidden">
        <SegmentedControl ariaLabel="نما" value={view} options={VIEW_OPTIONS} onChange={setView} />
      </div>

      <div className="print-portal__body relative flex min-h-0 flex-1">
        <aside
          aria-label="تنظیماتِ چاپ"
          className={cn(
            "print-portal__chrome absolute inset-0 z-10 flex-col bg-card lg:static lg:z-auto lg:flex lg:w-96 lg:shrink-0 lg:border-l lg:border-border",
            view === VIEWS.SETTINGS ? "flex" : "hidden",
          )}
        >
          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">{settings}</div>
        </aside>

        <PreviewPane widthMm={previewWidthMm} maxFitScale={maxFitScale} zoom={zoom} onZoomChange={setZoom}>
          {preview}
        </PreviewPane>
      </div>

      <footer className="print-portal__chrome flex flex-wrap items-center gap-2 border-t border-border bg-card p-3">
        {printDisabled && printDisabledReason && (
          <p role="alert" className="w-full text-xs text-destructive sm:w-auto sm:flex-1">
            {printDisabledReason}
          </p>
        )}
        <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
          {actions}
          <Button
            type="button"
            className="h-10 flex-1 gap-1.5 sm:min-w-40 sm:flex-none"
            onClick={onPrint}
            disabled={printDisabled}
          >
            <Printer />
            {printLabel}
          </Button>
        </div>
      </footer>

      {children}
    </div>,
    document.body,
  );
}
