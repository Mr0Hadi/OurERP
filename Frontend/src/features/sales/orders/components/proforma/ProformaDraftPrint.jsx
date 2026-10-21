import { Printer, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { usePrint } from "@/shared/components/print/usePrint";
import "@/shared/components/print/print.css";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { invoiceLineAmounts, invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { gregorianToPersian, todayIso } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * چاپِ پیش‌نویسِ پیش‌فاکتور برای مشتری، **بدونِ ذخیره** — همان لحظه که اقلام وارد شده‌اند. نامِ
 * مشتری اختیاری است و فقط روی برگه می‌آید (سرور فروشِ بی‌مشتری را ثبت نمی‌کند؛ اگر مشتری تأیید کرد،
 * فرم کامل و ثبت می‌شود). چاپ از مسیرِ مشترکِ `usePrint`: پورتالِ زیرِ `body` و پنهان‌شدنِ بقیه‌ی برنامه.
 *
 * @param items     اقلامِ فرم (`productName`، `productCode`، `quantity`، `unitPrice`، `discount`، نرخِ مالیات)
 * @param customerName پیش‌فرضِ نامِ مشتری (اگر در فرم انتخاب شده)
 */
export default function ProformaDraftPrint({ items, customerName = "", onClose }) {
  const print = usePrint();
  const [name, setName] = useState(customerName);
  const totals = invoiceTotals(items);

  return createPortal(
    <div dir="rtl" className="print-portal fixed inset-0 z-50 flex flex-col bg-background">
      <div className="print-portal__chrome flex flex-wrap items-end gap-3 border-b bg-card p-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="draft-customer" className="text-xs">
            نامِ مشتری (اختیاری، فقط روی برگه)
          </Label>
          <Input id="draft-customer" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        </div>
        <div className="flex gap-2">
          <Button type="button" className="gap-1.5" onClick={() => print({ pageSize: "A4", pageMarginMm: 12 })}>
            <Printer className="size-4" />
            چاپ
          </Button>
          <Button type="button" variant="outline" className="gap-1.5" onClick={onClose}>
            <X className="size-4" />
            بستن
          </Button>
        </div>
      </div>

      <div className="print-portal__sheet flex-1 bg-muted/60 p-4">
        <div className="mx-auto max-w-[210mm] space-y-5 bg-white p-8 text-sm text-black shadow">
          <header className="flex items-start justify-between gap-4 border-b border-black/20 pb-4">
            <div>
              <h1 className="text-lg font-bold">پیش‌فاکتور (پیش‌نویس)</h1>
              <p className="mt-1 text-xs text-black/60">
                قیمت‌ها و موجودی تا تأییدِ نهایی و بررسیِ انبار قطعی نیست.
              </p>
            </div>
            <div className="space-y-1 text-xs">
              <p>تاریخ: {gregorianToPersian(todayIso())}</p>
              {name.trim() && <p>مشتری: {name.trim()}</p>}
            </div>
          </header>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/30 text-right">
                <th className="py-1.5 pe-2 font-semibold">#</th>
                <th className="py-1.5 pe-2 font-semibold">کالا</th>
                <th className="py-1.5 pe-2 text-center font-semibold">تعداد</th>
                <th className="py-1.5 pe-2 text-left font-semibold">قیمتِ واحد</th>
                <th className="py-1.5 pe-2 text-center font-semibold">تخفیف</th>
                <th className="py-1.5 text-left font-semibold">مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const line = invoiceLineAmounts(item);
                return (
                  <tr key={`${item.productId}-${index}`} className="border-b border-black/10 align-top">
                    <td className="py-1.5 pe-2 tabular-nums">{formatNumber(index + 1)}</td>
                    <td className="py-1.5 pe-2">
                      {item.productName}
                      {item.productCode && <span className="block font-mono text-[10px] text-black/50">{item.productCode}</span>}
                    </td>
                    <td className="py-1.5 pe-2 text-center tabular-nums">{formatNumber(item.quantity)}</td>
                    <td className="py-1.5 pe-2 text-left tabular-nums">{formatNumber(item.unitPrice)}</td>
                    <td className="py-1.5 pe-2 text-center tabular-nums">
                      {Number(item.discount) ? `${formatNumber(item.discount)}٪` : "—"}
                    </td>
                    <td className="py-1.5 text-left tabular-nums">{formatNumber(line.netAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <dl className="ms-auto w-64 space-y-1 text-xs">
            <div className="flex justify-between">
              <dt>جمعِ پس از تخفیف</dt>
              <dd className="tabular-nums">{formatNumber(totals.netAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>مالیات بر ارزش افزوده{totals.taxUnknown && " (تقریبی)"}</dt>
              <dd className="tabular-nums">{formatNumber(totals.taxAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/30 pt-1 text-sm font-bold">
              <dt>مبلغِ قابلِ پرداخت</dt>
              <dd className="tabular-nums">{formatNumber(totals.totalAmount)} ریال</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>,
    document.body,
  );
}
