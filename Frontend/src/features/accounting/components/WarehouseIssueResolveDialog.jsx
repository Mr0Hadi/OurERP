import { useState } from "react";

import { useResolveWarehouseIssueMutation } from "@/features/sales/orders/services/mutations";
import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  SALE_WAREHOUSE_ISSUE_RESOLUTION_LABELS,
  SaleWarehouseIssueResolutionEnum,
} from "@/shared/domain/enums/saleProforma";
import { formatRial } from "@/shared/lib/numberFormat";
import DialogActions from "@/shared/components/feedback/DialogActions";

const OPTIONS = [
  {
    value: SaleWarehouseIssueResolutionEnum.RELEASE,
    label: "بازگشت به موجودی",
    hint: "پیدا شد یا سالم بود: دانه دوباره قابلِ فروش می‌شود.",
  },
  {
    value: SaleWarehouseIssueResolutionEnum.SCRAP,
    label: "اسقاط",
    hint: "دانه از چرخه خارج و ارزشش زیان ثبت می‌شود. برگشت‌پذیر نیست؛ توضیح الزامی است.",
  },
  {
    value: SaleWarehouseIssueResolutionEnum.SUPPLIER_RETURN,
    label: "مرجوعی به تامین‌کننده",
    hint: "دانه در قرنطینه می‌ماند تا با مرجوعیِ خرید پس فرستاده شود.",
  },
];

/** تصمیمِ حسابداری روی یک گزارشِ انبار (`ResolveSaleWarehouseIssue`). `issue` خالی ⇒ بسته. */
export default function WarehouseIssueResolveDialog({ issue, onOpenChange }) {
  const mutation = useResolveWarehouseIssueMutation();
  const [resolution, setResolution] = useState(SaleWarehouseIssueResolutionEnum.RELEASE);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const close = () => {
    setResolution(SaleWarehouseIssueResolutionEnum.RELEASE);
    setNote("");
    setShowErrors(false);
    onOpenChange(false);
  };

  const noteMissing = resolution === SaleWarehouseIssueResolutionEnum.SCRAP && !note.trim();
  const submit = () => {
    if (noteMissing) return setShowErrors(true);
    mutation.mutate({ id: issue.id, resolution, note: note.trim() }, { onSuccess: close });
  };

  return (
    <Dialog open={Boolean(issue)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تصمیم درباره‌ی دانه</DialogTitle>
          {issue && (
            <DialogDescription>
              {issue.productName} · <span className="font-mono" dir="ltr">{issue.barcode}</span> · {issue.reasonTitle}
              {issue.quarantineCost != null && ` · ارزش ${formatRial(issue.quarantineCost)}`}
            </DialogDescription>
          )}
        </DialogHeader>

        {issue && (
          <div className="space-y-4">
            <p className="rounded-lg bg-muted/50 p-3 text-sm leading-6">
              <span className="text-muted-foreground">گزارشِ {issue.reportedByName || "انبار"}: </span>
              {issue.description}
            </p>
            <StatusChoice label="تصمیم" options={OPTIONS} value={resolution} onChange={setResolution} wrap />
            <FormField
              label="توضیح"
              htmlFor="resolve-note"
              required={resolution === SaleWarehouseIssueResolutionEnum.SCRAP}
              error={showErrors && noteMissing ? { message: "برای اسقاط توضیح الزامی است" } : undefined}
            >
              <Textarea id="resolve-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          </div>
        )}

        <DialogActions
          onCancel={close}
          onSubmit={submit}
          isPending={mutation.isPending}
          variant={resolution === SaleWarehouseIssueResolutionEnum.SCRAP ? "destructive" : "default"}
          submitLabel={`ثبت: ${SALE_WAREHOUSE_ISSUE_RESOLUTION_LABELS[resolution]}`}
        />
      </DialogContent>
    </Dialog>
  );
}
