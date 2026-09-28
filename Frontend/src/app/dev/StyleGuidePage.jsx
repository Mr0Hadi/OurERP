import { Undo2 } from "lucide-react";

import Notice from "@/shared/components/feedback/Notice";
import ProgressStat from "@/shared/components/feedback/ProgressStat";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import PurchaseStatusBadge from "@/shared/components/status/PurchaseStatusBadge";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import StatusBadge from "@/shared/components/status/StatusBadge";
import StatusText from "@/shared/components/status/StatusText";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import { useTheme } from "@/shared/components/theme/themeContext";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { TONES, toneRow } from "@/shared/lib/tone";

const THEMES = ["light", "dark", "theme-accessible", "theme-rose", "theme-forest"];

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">{children}</CardContent>
    </Card>
  );
}

/**
 * راهنمای زنده‌ی استایل — فقط در حالت توسعه (`/dev/ui`).
 *
 * هر کامپوننتِ پایه‌ی مشترک با همه‌ی حالت‌هایش این‌جا دیده می‌شود تا
 * تغییرِ توکن‌ها یا tone در همه‌ی تم‌ها یک‌جا بررسی شود. در build تولید
 * اصلاً وارد باندل نمی‌شود (مسیرش با `import.meta.env.DEV` ثبت می‌شود).
 */
export default function StyleGuidePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div dir="rtl" className="min-h-svh bg-background p-6 text-foreground">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="me-auto text-xl font-bold">راهنمای استایل</h1>
          {THEMES.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={theme === name ? "default" : "outline"}
              onClick={() => setTheme(name)}
            >
              {name}
            </Button>
          ))}
        </div>

        <Section title="tone ها — StatusBadge">
          {TONES.map((tone) => (
            <StatusBadge key={tone} tone={tone}>{tone}</StatusBadge>
          ))}
          {TONES.map((tone) => (
            <StatusBadge key={`sm-${tone}`} tone={tone} size="sm" icon={Undo2}>{tone}</StatusBadge>
          ))}
        </Section>

        <Section title="StatusText">
          {TONES.map((tone) => (
            <StatusText key={tone} tone={tone} icon={Undo2}>{tone}</StatusText>
          ))}
        </Section>

        <Section title="وضعیت خرید">
          {Object.values(PurchaseStatusEnum).map((status) => (
            <PurchaseStatusBadge key={status} status={status} withIcon />
          ))}
        </Section>

        <Section title="وضعیت فروش">
          {Object.values(SaleStatusEnum).map((status) => (
            <SaleStatusBadge key={status} status={status} withIcon />
          ))}
        </Section>

        <Section title="نوع پرداخت">
          {Object.values(PaymentTypeEnum).map((type) => (
            <PaymentTypeBadge key={type} type={type} />
          ))}
        </Section>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["info", "success", "warning", "caution", "danger"].map((tone) => (
              <Notice key={tone} tone={tone}>
                باکس {tone}: با تغییر واحد، نقشِ فعلیِ این کارمند در جای قبلی آزاد می‌شود.
              </Notice>
            ))}
            <Notice tone="warning" dashed>ناحیه‌ی خط‌چین</Notice>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ردیف‌ها، پیشرفت و مبلغ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TONES.map((tone) => (
              <div key={tone} className={`rounded-md border px-3 py-1.5 text-sm ${toneRow(tone)}`}>
                ردیف {tone}
              </div>
            ))}
            <ProgressStat label="پیشرفت دریافت" done={12} total={20} />
            <AmountInWords rial={12500000} />
            <AmountInWords rial={12345} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
