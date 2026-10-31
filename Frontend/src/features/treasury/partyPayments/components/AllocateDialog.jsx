import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAllocatableDocumentsQuery } from "../services/queries";
import { useAllocatePartyPaymentMutation } from "../services/mutations";
import AllocationEditor from "./AllocationEditor";
import {
  EMPTY_ALLOCATION_DRAFT,
  allocationErrors,
  hasAllocationErrors,
  toApiAllocations,
} from "../domain/partyPayment";
import DialogActions from "@/shared/components/feedback/DialogActions";

function AllocateBody({ payment, onClose }) {
  const [draft, setDraft] = useState(EMPTY_ALLOCATION_DRAFT);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useAllocatePartyPaymentMutation();
  const party = payment.supplierId ? { supplierId: payment.supplierId } : { customerId: payment.customerId };
  const documentsQuery = useAllocatableDocumentsQuery(party);
  const documents = documentsQuery.data ?? [];
  const available = Number(payment.unallocatedAmount) || 0;
  const errors = allocationErrors(documents, draft, available);
  const allocations = toApiAllocations(documents, draft);

  const submit = () => {
    if (hasAllocationErrors(errors)) return setShowErrors(true);
    mutation.mutate({ paymentDetailId: payment.id, allocations }, { onSuccess: onClose });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>تخصیص به فاکتورها</DialogTitle>
        <DialogDescription>
          فقط دفترداری است: پولی جابه‌جا نمی‌شود و حسابِ شخص و صندوق تغییر نمی‌کنند؛ پرداخت‌شده‌ی فاکتورها بالا می‌رود.
        </DialogDescription>
      </DialogHeader>
      <fieldset disabled={mutation.isPending} className="min-w-0">
        <AllocationEditor
          documents={documents}
          draft={draft}
          onChange={setDraft}
          available={available}
          errors={showErrors ? errors : { rows: {}, total: null }}
          isLoading={documentsQuery.isLoading}
        />
      </fieldset>
      <DialogActions
        onCancel={onClose}
        onSubmit={submit}
        isPending={mutation.isPending}
        disabled={allocations.length === 0}
        submitLabel="ثبتِ تخصیص"
      />
    </>
  );
}

/**
 * تخصیصِ مانده‌ی یک دریافت/پرداختِ علی‌الحساب به فاکتورهای بازِ همان شخص (`AllocatePartyPayment`، همه یا هیچ).
 *
 * @param payment `PartyPaymentDto`
 */
export default function AllocateDialog({ payment, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {open && <AllocateBody payment={payment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
