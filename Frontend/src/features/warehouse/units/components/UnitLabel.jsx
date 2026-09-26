import Barcode from "react-barcode";

import QrCodeGraphic from "@/shared/components/print/QrCodeGraphic";
import { DEFAULT_SYMBOLOGY } from "@/shared/domain/barcode/barcodeConfig";
import { barcodeSegments, toPayload } from "@/shared/domain/barcode/productCode";
import {
  CODE_SHARE,
  DEFAULT_LABEL_TEMPLATE,
  FONT_SIZES_PT,
  LABEL_CODE_TYPES,
} from "../domain/labelTemplate";
import { fa, formatDate } from "../domain/unitVocabulary";

/** فاصله‌ی امنِ لبه‌ی برچسب؛ پرینترهای برچسب لبه را دقیق نمی‌زنند. */
const PADDING_MM = 1.5;

/**
 * تعدادِ ماژول‌های CODE128 برای payloadِ رقمی (زیرمجموعه‌ی C: دو رقم در هر
 * کاراکتر) — برای اینکه نسبتِ ابعادِ SVG با جعبه‌ی برچسب یکی شود و بارکد
 * کلِ ارتفاعِ سهمش را بگیرد، نه فقط عرض را.
 */
const code128Modules = (payload) => (Math.ceil(payload.length / 2) + 3) * 11 + 2;

/** متن‌هایی که قالب خواسته و این دانه واقعاً دارد. */
function textLinesOf(unit, fields, party) {
  const customer = party?.customerName ?? unit.customerName;
  const supplier = party?.supplierName ?? unit.supplierName;
  const document = party?.documentNumber ?? unit.saleInvoiceNumber ?? unit.purchaseInvoiceNumber;

  const meta = [
    fields.serial && `سریال ${fa(unit.serialNumber)}`,
    fields.receivedAt && unit.createdAt && formatDate(unit.createdAt),
    fields.document && document,
  ].filter(Boolean);

  return {
    title: fields.productName ? unit.productName : null,
    party: [fields.supplier && supplier, fields.customer && customer].filter(Boolean),
    meta,
  };
}

function Texts({ lines, fontPt, align = "center" }) {
  return (
    <>
      {lines.title && (
        <div
          className="line-clamp-2 font-medium leading-tight"
          style={{ fontSize: `${fontPt + 0.5}pt`, textAlign: align }}
        >
          {lines.title}
        </div>
      )}
      {lines.party.map((text) => (
        <div
          key={text}
          className="truncate leading-tight"
          style={{ fontSize: `${fontPt}pt`, textAlign: align }}
        >
          {text}
        </div>
      ))}
      {lines.meta.length > 0 && (
        <div
          className="truncate leading-tight tabular-nums"
          style={{ fontSize: `${fontPt - 0.5}pt`, textAlign: align }}
        >
          {lines.meta.join(" · ")}
        </div>
      )}
    </>
  );
}

/**
 * یک برچسبِ دانه طبقِ قالب. ابعاد به میلی‌متر است تا پیش‌نمایش و چاپ
 * دقیقاً یکی باشند.
 *
 * بارکد: متن‌ها بالا و پایینِ میله‌ها. QR: نماد کنارِ متن، چون برچسب‌ها
 * پهن‌اند و کوتاه و QRِ مربعی بالای متن جا نمی‌شود.
 *
 * هر دو نماد همان `barcodePayload` را حمل می‌کنند، پس اسکنِ برچسبِ QR و
 * خطیِ یک دانه یک رشته می‌دهد.
 *
 * @param party اختیاری — طرفِ حسابی که روی برچسب می‌رود وقتی دانه خودش آن
 *   را ندارد (مثلاً مشتریِ فروشی که الان ارسال می‌شود).
 */
export default function UnitLabel({
  unit,
  template = DEFAULT_LABEL_TEMPLATE,
  widthMm,
  heightMm,
  party,
}) {
  const payload = toPayload(unit.barcodePayload || unit.barcode);
  const fontPt = FONT_SIZES_PT[template.fontScale] ?? FONT_SIZES_PT.medium;
  const share = CODE_SHARE[template.codeScale] ?? CODE_SHARE.medium;
  const lines = textLinesOf(unit, template.fields, party);
  const innerW = widthMm - 2 * PADDING_MM;
  const innerH = heightMm - 2 * PADDING_MM;

  if (template.codeType === LABEL_CODE_TYPES.QR) {
    const side = Math.min(innerH, innerW * share);
    return (
      <div
        className="flex h-full w-full items-center gap-[1.5mm] text-black"
        style={{ padding: `${PADDING_MM}mm` }}
      >
        <div
          className="shrink-0 [&_svg]:h-full [&_svg]:w-full"
          style={{ width: `${side}mm`, height: `${side}mm` }}
        >
          <QrCodeGraphic value={payload} preset="compact" displayValue={false} className="h-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.6mm]">
          <Texts lines={lines} fontPt={fontPt} align="right" />
          {template.fields.codeText && (
            <div className="flex flex-col font-mono leading-tight" style={{ fontSize: `${fontPt - 1}pt` }} dir="ltr">
              {barcodeSegments(unit.barcode).map((segment, index) => (
                <span key={index} className="tabular-nums">
                  {segment}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const barHeightMm = innerH * share;
  const modules = payload ? code128Modules(payload) : 1;
  const svgHeight = Math.max(10, Math.round((modules * barHeightMm) / innerW));

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-[0.6mm] text-black"
      style={{ padding: `${PADDING_MM}mm` }}
    >
      {lines.title && <Texts lines={{ ...lines, party: [], meta: [] }} fontPt={fontPt} />}
      {payload && (
        <div
          className="flex w-full justify-center [&_svg]:h-full [&_svg]:w-full"
          style={{ height: `${barHeightMm}mm` }}
        >
          <Barcode
            value={payload}
            format={DEFAULT_SYMBOLOGY}
            renderer="svg"
            width={1}
            height={svgHeight}
            margin={0}
            displayValue={false}
            background="transparent"
            lineColor="#000000"
          />
        </div>
      )}
      {template.fields.codeText && (
        <div className="font-mono leading-none tabular-nums" style={{ fontSize: `${fontPt - 0.5}pt` }} dir="ltr">
          {unit.barcode}
        </div>
      )}
      <Texts lines={{ ...lines, title: null }} fontPt={fontPt} />
    </div>
  );
}
