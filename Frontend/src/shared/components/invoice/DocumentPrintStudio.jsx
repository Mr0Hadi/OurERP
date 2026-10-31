import { useEffect, useState } from "react";
import { FileText, Images, Printer, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

import {
  DEFAULT_PAPER_SETTINGS,
  MARGIN_PRESETS,
  ORIENTATIONS,
  PAPER_KEYS,
  fixedPagePrintOptions,
  pageGeometryOf,
} from "@/shared/components/print/paper";
import PaperSettings from "@/shared/components/print/studio/PaperSettings";
import PrintSettingsSection, { PrintSettingLabel } from "@/shared/components/print/studio/PrintSettingsSection";
import PrintStudio from "@/shared/components/print/studio/PrintStudio";
import SegmentedControl from "@/shared/components/print/studio/SegmentedControl";
import { usePrint } from "@/shared/components/print/usePrint";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { Switch } from "@/shared/components/ui/switch";
import { formatNumber } from "@/shared/lib/numberFormat";
import { loadDocuments, printPdfBlob } from "@/shared/services/invoice/documentOutput";
import { usePrintSettings } from "@/shared/store/printSettingsStore";

const PRINT_KIND = "document-images";

const PAPER_KEYS_ALLOWED = [PAPER_KEYS.A4, PAPER_KEYS.A5, PAPER_KEYS.A3, PAPER_KEYS.LETTER];

const IMAGE_FIT = Object.freeze({ CONTAIN: "contain", COVER: "cover" });

const DOCUMENT_IMAGE_DEFAULTS = Object.freeze({
  ...DEFAULT_PAPER_SETTINGS,
  marginPreset: MARGIN_PRESETS.NARROW,
  perPage: 1,
  fit: IMAGE_FIT.CONTAIN,
  showCaption: false,
});

const PER_PAGE_OPTIONS = [
  { value: 1, label: "۱ در صفحه" },
  { value: 2, label: "۲ در صفحه" },
  { value: 4, label: "۴ در صفحه" },
];

const FIT_OPTIONS = [
  { value: IMAGE_FIT.CONTAIN, label: "کامل در کادر" },
  { value: IMAGE_FIT.COVER, label: "پر کردنِ کادر" },
];

/** فاصله‌ی بینِ تصویرهای یک صفحه (میلی‌متر). */
const GAP_MM = 4;

/** ستون و ردیفِ هر صفحه: دو تصویر روی کاغذِ افقی کنارِ هم، روی عمودی زیرِ هم. */
const gridOf = (perPage, orientation) => {
  if (perPage === 4) return { columns: 2, rows: 2 };
  if (perPage === 2) return orientation === ORIENTATIONS.LANDSCAPE ? { columns: 2, rows: 1 } : { columns: 1, rows: 2 };
  return { columns: 1, rows: 1 };
};

const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, index) => list.slice(index * size, (index + 1) * size));

/** صفحه‌ها صریح ساخته می‌شوند (مثلِ `LabelSheet`)، نه با شکستِ خودکارِ مرورگر. */
function ImagePages({ images, geometry, settings }) {
  const perPage = Number(settings.perPage) || 1;
  const { columns, rows } = gridOf(perPage, geometry.orientation);

  return (
    <div data-print-root className="flex flex-col items-center gap-4">
      {chunk(images, perPage).map((pageImages, pageIndex) => (
        <div
          key={pageIndex}
          className="print-page bg-white text-black shadow-sm"
          style={{
            width: `${geometry.widthMm}mm`,
            height: `${geometry.heightMm}mm`,
            padding: `${geometry.marginMm}mm`,
          }}
        >
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              gap: `${GAP_MM}mm`,
            }}
          >
            {pageImages.map((image) => (
              <figure key={image.id} className="flex min-h-0 min-w-0 flex-col gap-1">
                <img
                  src={image.url}
                  alt={image.name}
                  className="min-h-0 w-full flex-1"
                  style={{ objectFit: settings.fit === IMAGE_FIT.COVER ? "cover" : "contain" }}
                />
                {settings.showCaption && (
                  <figcaption dir="auto" className="truncate text-center text-[8pt] text-black/60">
                    {image.name}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** بایت‌ها یک بار گرفته و آدرسِ blobِ تصویرها تا بسته‌شدنِ پوسته نگه داشته می‌شود. */
function useLoadedDocuments(documents) {
  const [state, setState] = useState({ status: "loading", images: [], pdfs: [] });

  useEffect(() => {
    let cancelled = false;
    let urls = [];

    loadDocuments(documents).then(({ loaded, failures }) => {
      if (cancelled) return;
      if (failures.length) toast.error(`دریافت این فایل‌ها ممکن نشد: ${failures.join("، ")}`);
      const images = loaded
        .filter((item) => !item.isPdf)
        .map((item) => ({ id: item.id, name: item.name, url: URL.createObjectURL(item.blob) }));
      urls = images.map((image) => image.url);
      setState({ status: "ready", images, pdfs: loaded.filter((item) => item.isPdf) });
    });

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documents]);

  return state;
}

function Settings({ settings, geometry, update, reset, pdfs }) {
  return (
    <>
      {pdfs.length > 0 && (
        <PrintSettingsSection
          title="سندهای PDF"
          icon={FileText}
          description="PDF با اندازه و چیدمانِ خودش چاپ می‌شود؛ مقیاس و کاغذش را در پنجره‌ی چاپِ مرورگر انتخاب کنید."
        >
          <ul className="space-y-1.5">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span dir="auto" className="min-w-0 flex-1 truncate" title={pdf.name}>
                  {pdf.name}
                </span>
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => printPdfBlob(pdf.blob)}>
                  <Printer />
                  چاپ
                </Button>
              </li>
            ))}
          </ul>
        </PrintSettingsSection>
      )}

      <PrintSettingsSection title="چیدمانِ تصویرها" icon={Images}>
        <div className="space-y-1.5">
          <PrintSettingLabel>تعداد در هر صفحه</PrintSettingLabel>
          <SegmentedControl
            ariaLabel="تعداد در هر صفحه"
            value={Number(settings.perPage)}
            options={PER_PAGE_OPTIONS}
            onChange={(perPage) => update({ perPage })}
          />
        </div>
        <div className="space-y-1.5">
          <PrintSettingLabel>اندازه‌ی تصویر</PrintSettingLabel>
          <SegmentedControl
            ariaLabel="اندازه‌ی تصویر"
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(fit) => update({ fit })}
          />
          {settings.fit === IMAGE_FIT.COVER && (
            <p className="text-xs text-muted-foreground">لبه‌های تصویری که با نسبتِ کادر جور نیست بریده می‌شود.</p>
          )}
        </div>
        <label htmlFor="document-caption" className="flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm">
          نامِ فایل زیرِ هر تصویر
          <Switch
            id="document-caption"
            checked={settings.showCaption}
            onCheckedChange={(showCaption) => update({ showCaption })}
          />
        </label>
      </PrintSettingsSection>

      <PaperSettings settings={settings} geometry={geometry} onChange={update} paperKeys={PAPER_KEYS_ALLOWED} />

      <Button type="button" variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={reset}>
        <RotateCcw className="size-3.5" />
        بازگشت به تنظیماتِ پیش‌فرض
      </Button>
    </>
  );
}

/**
 * چاپِ سندهای یک سفارش که تصویرند (عکسِ فاکتورِ تامین‌کننده، برگه‌ی امضاشده…)
 * با پوسته‌ی مشترکِ `PrintStudio`: کاغذ، جهت، حاشیه، تعداد در هر صفحه و
 * اندازه‌ی تصویر، و پیش‌نمایشِ دقیقِ صفحه‌ها. PDFهای همان انتخاب کنارِ
 * تنظیمات می‌آیند و هر کدام با دکمه‌ی خودش چاپ می‌شود.
 *
 * فقط وقتی باز می‌شود که دست‌کم یک تصویر انتخاب شده باشد؛ چاپِ فقط-PDF
 * مستقیم است (`printPdfDocuments`).
 *
 * @param documents سندهای انتخاب‌شده (`{ id, name, isPdf, getBlob }`)؛ مرجعِ پایدار بدهید
 */
export default function DocumentPrintStudio({ title, documents, onClose }) {
  const print = usePrint();
  const { settings, update, reset } = usePrintSettings(PRINT_KIND, DOCUMENT_IMAGE_DEFAULTS);
  const { status, images, pdfs } = useLoadedDocuments(documents);

  const geometry = pageGeometryOf(settings);
  const pageCount = Math.ceil(images.length / (Number(settings.perPage) || 1));
  const isLoading = status === "loading";

  return (
    <PrintStudio
      title={`چاپِ سند ${title}`}
      summary={
        isLoading
          ? "در حالِ دریافتِ فایل‌ها…"
          : `${formatNumber(images.length)} تصویر، ${formatNumber(pageCount)} صفحه${
              pdfs.length ? ` — ${formatNumber(pdfs.length)} PDF جدا` : ""
            }`
      }
      settings={<Settings settings={settings} geometry={geometry} update={update} reset={reset} pdfs={pdfs} />}
      previewWidthMm={geometry.widthMm}
      preview={
        isLoading ? (
          <div className="flex h-60 w-80 items-center justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
        ) : images.length ? (
          <ImagePages images={images} geometry={geometry} settings={settings} />
        ) : (
          <p className="w-80 p-8 text-center text-sm text-muted-foreground">هیچ تصویری دریافت نشد.</p>
        )
      }
      onPrint={() => print(fixedPagePrintOptions(geometry))}
      printLabel={images.length ? `چاپِ ${formatNumber(images.length)} تصویر` : "چاپ"}
      printDisabled={isLoading || images.length === 0}
      onClose={onClose}
    />
  );
}
