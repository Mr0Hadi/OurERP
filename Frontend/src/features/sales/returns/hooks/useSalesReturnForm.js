import { toast } from "react-hot-toast";
import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { SALES_RETURN_PROBLEMS } from "../domain/salesReturnVocabulary";
import { OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import {
  addLineClaim,
  addOffScopeClaim,
  claimsAmountOf,
  claimsPayloadOf,
  removeLineClaim,
  removeOffScopeClaim,
  sumClaimQuantity,
  updateLineClaim,
  updateOffScopeClaim,
} from "@/shared/domain/returns/claimDrafts";

const DEFAULT_ON_INVOICE_PROBLEM = SALES_RETURN_PROBLEMS.DEFECTIVE;
const DEFAULT_EXCESS_PROBLEM = SALES_RETURN_PROBLEMS.OVER_SHIPPED;
const DEFAULT_UNLISTED_PROBLEM = SALES_RETURN_PROBLEMS.UNLISTED_ITEM;

/**
 * فرمِ ثبتِ مرجوعی از فروش.
 *
 * سه دسته ادعا (منطقِ مشترکشان در `claimDrafts`):
 *
 *  • روی فاکتور — روی یک قلمِ فروش، سقفش مقدارِ ارسال‌شده‌ی هنوز ادعانشده.
 *  • مازاد      — بیش از فاکتور ارسال شده؛ روی همان قلم و با قیمتِ آن. سقفش
 *                 `claimableExcessQuantity`ِ همان قلم است.
 *  • خارج از فاکتور — کالایی که در فاکتور نیست؛ بی‌قلم و با قیمتِ دستی، بی سقفِ فرم.
 */
export function useSalesReturnForm() {
  const { formData, setFormData, setLines, setOffScopeClaims } = useSalesReturnFormStore();

  const lines = formData.lines || [];
  const orderLines = formData.orderLines || [];
  const offScopeClaims = formData.offScopeClaims || [];
  const excessCaps = formData.excessCaps || {};

  /** جای خالیِ مازادِ یک قلم، با کسرِ ادعاهای دیگرِ همین فرم روی همان قلم. */
  const excessRoom = (orderLineId, exceptId = null) => {
    const used = sumClaimQuantity(
      offScopeClaims.filter(
        (claim) =>
          claim.id !== exceptId &&
          claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS &&
          claim.orderLineId === orderLineId,
      ),
    );
    return Math.max(0, (excessCaps[orderLineId] ?? 0) - used);
  };

  const handleAddClaim = (lineKey) =>
    setLines(addLineClaim(lines, lineKey, DEFAULT_ON_INVOICE_PROBLEM));

  const handleUpdateClaim = (lineKey, claimId, field, value) =>
    setLines(updateLineClaim(lines, lineKey, claimId, field, value));

  const handleRemoveClaim = (lineKey, claimId) =>
    setLines(removeLineClaim(lines, lineKey, claimId));

  const handleAddOffScopeClaim = (target, kind) => {
    const isExcess = kind === OFF_SCOPE_KINDS.EXCESS;
    if (isExcess && excessRoom(target.orderLineId) <= 0) {
      toast.error("از این قلم کالای مازادی ارسال نشده، یا همه‌اش در مرجوعیِ دیگری ثبت شده است");
      return;
    }
    setOffScopeClaims(
      addOffScopeClaim(
        offScopeClaims,
        target,
        kind,
        isExcess ? DEFAULT_EXCESS_PROBLEM : DEFAULT_UNLISTED_PROBLEM,
      ),
    );
  };

  const handleUpdateOffScopeClaim = (claimId, field, value) =>
    setOffScopeClaims(
      updateOffScopeClaim(offScopeClaims, claimId, field, value, (claim) =>
        claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS
          ? excessRoom(claim.orderLineId, claim.id)
          : Infinity,
      ),
    );

  const handleRemoveOffScopeClaim = (claimId) =>
    setOffScopeClaims(removeOffScopeClaim(offScopeClaims, claimId));

  const allClaims = claimsPayloadOf(lines, offScopeClaims);

  const buildPayload = () => ({
    saleId: formData.saleId,
    returnDate: formData.returnDate,
    description: formData.description || "",
    previousReturnId: formData.previousReturnId ?? null,
    claims: allClaims,
  });

  return {
    formData,
    setFormData,
    lines,
    orderLines,
    offScopeClaims,
    allClaims,
    computedTotal: claimsAmountOf(allClaims),
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffScopeClaim,
    handleUpdateOffScopeClaim,
    handleRemoveOffScopeClaim,
    buildPayload,
  };
}
