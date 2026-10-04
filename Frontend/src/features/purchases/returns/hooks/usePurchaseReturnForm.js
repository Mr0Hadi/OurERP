import toast from "react-hot-toast";
import {
  usePurchaseReturnFormStore,
  offScopeCapKey,
} from "../store/purchaseReturnFormStore";
import { PURCHASE_RETURN_PROBLEMS } from "../domain/purchaseReturnVocabulary";
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

const DEFAULT_ON_ORDER_PROBLEM = PURCHASE_RETURN_PROBLEMS.DEFECTIVE;
const DEFAULT_EXCESS_PROBLEM = PURCHASE_RETURN_PROBLEMS.OVER_SHIPPED;
const DEFAULT_UNLISTED_PROBLEM = PURCHASE_RETURN_PROBLEMS.UNLISTED_ITEM;

/**
 * فرمِ ثبتِ مرجوعی به تامین‌کننده.
 *
 * سه دسته ادعا (منطقِ مشترکشان در `claimDrafts`):
 *
 *  • روی سفارش — روی یک قلمِ خرید، سقفش مقدارِ دریافت‌شده‌ی هنوز ادعانشده.
 *  • مازاد     — بیش از مقدارِ یک قلم رسیده؛ روی همان قلم و با قیمتِ آن.
 *  • سفارش‌نداده — کالایی که در سفارش نیست؛ بی‌قلم و با قیمتِ دستی.
 *
 * سقفِ دو دسته‌ی خارج از سفارش قرنطینه‌ی آزادِ همان گروه است
 * (`offScopeCaps`، از `GetPurchaseReceivingInfo`). هر دانه‌ی آن یا عودت
 * می‌شود (ادعا) یا نگه داشته و خریده می‌شود (`excessPurchases` →
 * `AcceptPurchaseExcess`)؛ پس هر دو از یک سقف برمی‌دارند.
 */
export function usePurchaseReturnForm() {
  const {
    formData,
    setFormData,
    setLines,
    setOffScopeClaims,
    setExcessPurchases,
  } = usePurchaseReturnFormStore();

  const lines = formData.lines || [];
  const orderLines = formData.orderLines || [];
  const offScopeClaims = formData.offScopeClaims || [];
  const offScopeCaps = formData.offScopeCaps || {};
  const excessPurchases = formData.excessPurchases || {};

  /** مقدارِ ادعاهای عودتِ یک گروهِ خارج از سفارش (جز یک ادعا). */
  const returnedIn = (key, exceptId = null) =>
    sumClaimQuantity(
      offScopeClaims.filter(
        (claim) => claim.id !== exceptId && offScopeCapKey(claim.offScopeKind, claim) === key,
      ),
    );

  /** جای خالیِ یک گروه برای عودت: سقفِ سرور منهای ادعاهای دیگر و خرید. */
  const offScopeRoom = (key, exceptId = null) => {
    const bought = Number(excessPurchases[key]?.quantity) || 0;
    return Math.max(0, (offScopeCaps[key] ?? 0) - returnedIn(key, exceptId) - bought);
  };

  // ─── نگه‌داشتن و خرید (`AcceptPurchaseExcess`) ─────────────────────

  /** سقفِ خرید برای یک گروه: سقفِ سرور منهای ادعاهای عودتِ همان گروه. */
  const purchaseCap = (key) => Math.max(0, (offScopeCaps[key] ?? 0) - returnedIn(key));

  /**
   * مقدار یا قیمتِ خرید برای یک گروه (`offScopeCapKey`). `group` مشخصاتِ همان
   * قلم/کالاست؛ مازاد با قیمتِ قلم خریده می‌شود و سفارش‌نداده قیمتِ فاکتور می‌خواهد.
   */
  const setPurchase = (key, group, patch) => {
    const current = excessPurchases[key] ?? { ...group, quantity: 0, unitPrice: group.unitPrice ?? null };
    const next = { ...current, ...patch };
    if (patch.quantity != null) {
      next.quantity = Math.max(0, Math.min(Number(patch.quantity) || 0, purchaseCap(key)));
    }
    const rest = { ...excessPurchases };
    if (next.quantity > 0) rest[key] = next;
    else delete rest[key];
    setExcessPurchases(rest);
  };

  /** بدنه‌ی `AcceptPurchaseExcess`، یا `null` اگر چیزی برای خرید نیست. */
  const buildPurchasePayload = () => {
    const entries = Object.values(excessPurchases).filter((entry) => entry.quantity > 0);
    if (entries.length === 0) return null;
    return {
      items: entries.map((entry) =>
        entry.purchaseItemId != null
          ? { purchaseItemId: entry.purchaseItemId, quantity: entry.quantity }
          : {
              productId: entry.productId,
              quantity: entry.quantity,
              unitPrice: entry.unitPrice,
              discount: entry.discount || 0,
            },
      ),
    };
  };

  /** نخستین ایرادِ خرید (قیمتِ کالای سفارش‌نداده الزامی است). */
  const purchaseError = Object.values(excessPurchases).some(
    (entry) => entry.purchaseItemId == null && !(Number(entry.unitPrice) > 0),
  )
    ? "برای خریدِ کالای سفارش‌نداده، قیمتِ واحدِ فاکتورِ تامین‌کننده را وارد کنید"
    : null;

  // ─── ادعاها ────────────────────────────────────────────────────────

  const handleAddClaim = (lineKey) =>
    setLines(addLineClaim(lines, lineKey, DEFAULT_ON_ORDER_PROBLEM));

  const handleUpdateClaim = (lineKey, claimId, field, value) =>
    setLines(updateLineClaim(lines, lineKey, claimId, field, value));

  const handleRemoveClaim = (lineKey, claimId) =>
    setLines(removeLineClaim(lines, lineKey, claimId));

  /** «عودت»ِ یک دانه‌ی مازاد/سفارش‌نداده؛ `false` اگر جایی نمانده. */
  const handleAddOffScopeClaim = (target, kind) => {
    const isExcess = kind === OFF_SCOPE_KINDS.EXCESS;
    if (offScopeRoom(offScopeCapKey(kind, target)) <= 0) {
      toast.error(
        isExcess
          ? "از این قلم کالای مازادِ آزادی در قرنطینه نمانده است"
          : "از این کالا چیزی در قرنطینه‌ی این خرید نمانده است",
      );
      return false;
    }
    setOffScopeClaims(
      addOffScopeClaim(
        offScopeClaims,
        target,
        kind,
        isExcess ? DEFAULT_EXCESS_PROBLEM : DEFAULT_UNLISTED_PROBLEM,
      ),
    );
    return true;
  };

  const handleUpdateOffScopeClaim = (claimId, field, value) =>
    setOffScopeClaims(
      updateOffScopeClaim(offScopeClaims, claimId, field, value, (claim) =>
        offScopeRoom(offScopeCapKey(claim.offScopeKind, claim), claim.id),
      ),
    );

  const handleRemoveOffScopeClaim = (claimId) =>
    setOffScopeClaims(removeOffScopeClaim(offScopeClaims, claimId));

  // ─── خروجی ─────────────────────────────────────────────────────────

  const allClaims = claimsPayloadOf(lines, offScopeClaims);

  const buildPayload = () => ({
    purchaseId: formData.purchaseId,
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
    excessPurchases,
    returnedIn,
    setPurchase,
    buildPurchasePayload,
    purchaseError,
    offScopeCaps,
  };
}
