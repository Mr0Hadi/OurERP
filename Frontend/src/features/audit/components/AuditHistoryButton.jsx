import { useState } from "react";
import { History } from "lucide-react";

import PageHeaderActions from "@/shared/components/layout/PageHeaderActions";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/features/auth/hooks/usePermission";
import AuditHistorySheet from "./AuditHistorySheet";

/**
 * دکمه‌ی «تاریخچه» در هدرِ صفحه‌های جزئیات + شیتش. بدونِ `AuditLogView` چیزی رندر نمی‌شود.
 *
 * هدف یکی از این دو است:
 *  - سند: `{ documentKind, documentId }` (`DocumentKindEnum`) — همه‌ی ردیف‌ها، پرداخت‌ها،
 *    پیوست‌ها و ... ی همان سند
 *  - رکوردِ بی‌سند: `{ entityType, entityKey }` — نامِ کلاسِ بکند (`Customer`) و شناسه
 *
 * @param title متنِ زیرِ عنوانِ شیت، مثلاً «فروش ۱۲۳»
 * @param inHeader `false` برای وقتی دکمه داخلِ خودِ صفحه می‌نشیند نه هدر
 */
export default function AuditHistoryButton({ title, inHeader = true, ...target }) {
  const { allows } = usePermission();
  const [open, setOpen] = useState(false);
  if (!allows("AuditLogView")) return null;

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5"
      onClick={() => setOpen(true)}
      aria-label="تاریخچه‌ی تغییرات"
    >
      <History className="size-4" />
      <span className="max-sm:hidden">تاریخچه</span>
    </Button>
  );

  return (
    <>
      {inHeader ? <PageHeaderActions>{button}</PageHeaderActions> : button}
      <AuditHistorySheet open={open} onOpenChange={setOpen} target={target} title={title} />
    </>
  );
}
