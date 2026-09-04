import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import {
  CLAIM_SCOPES,
  OFF_ORDER_KINDS,
  PURCHASE_RETURN_PROBLEMS,
} from "../domain/purchaseReturnVocabulary";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_ON_ORDER_PROBLEM = PURCHASE_RETURN_PROBLEMS.DEFECTIVE;
const DEFAULT_OFF_ORDER_PROBLEM = PURCHASE_RETURN_PROBLEMS.OVER_SHIPPED;

/**
 * فرم ثبت ادعای مرجوعی.
 *
 * دو دسته ادعا مدیریت می‌شود که قواعدشان فرق دارد:
 *
 *  • روی سفارش  — روی یک خط خرید می‌نشیند و سقفش مقدارِ سفارش‌شده
 *                  است.
 *  • خارج از سفارش — سقف ندارد، چون اصلاً بیرون از سفارش است: کالای
 *                  اضافه‌ای که تامین‌کننده فرستاده یا کالایی که در سفارش
 *                  نبوده.
 *
 */
export function usePurchaseReturnForm() {
  const { formData, setFormData, setLines, setOffScopeClaims, resetForm } =
    usePurchaseReturnFormStore();

  const lines = formData.lines || [];
  const offScopeClaims = formData.offScopeClaims || [];

  const claimedQuantityOf = (line) =>
    (line.claims || []).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);

  const newClaim = (problem, quantity) => ({
    id: generateId(),
    problem,
    quantity,
    note: "",
  });

  // ─── ادعاهای روی فاکتور ───────────────────────────────────────────

  const handleAddClaim = (lineKey) => {
    setLines(
      lines.map((line) => {
        if (line.lineKey !== lineKey) return line;
        const remaining = Math.max(
          0,
          line.maxReturnableQuantity - claimedQuantityOf(line),
        );
        if (remaining <= 0) return line;
        return {
          ...line,
          claims: [
            ...(line.claims || []),
            newClaim(DEFAULT_ON_ORDER_PROBLEM, remaining),
          ],
        };
      }),
    );
  };

  const handleUpdateClaim = (lineKey, claimId, field, value) => {
    setLines(
      lines.map((line) => {
        if (line.lineKey !== lineKey) return line;
        return {
          ...line,
          claims: (line.claims || []).map((claim) => {
            if (claim.id !== claimId) return claim;
            if (field === "quantity") {
              const others = (line.claims || [])
                .filter((c) => c.id !== claimId)
                .reduce((s, c) => s + (Number(c.quantity) || 0), 0);
              const maxAllowed = Math.max(0, line.maxReturnableQuantity - others);
              const num = Number(value);
              return {
                ...claim,
                quantity: Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed),
              };
            }
            return { ...claim, [field]: value };
          }),
        };
      }),
    );
  };

  const handleRemoveClaim = (lineKey, claimId) => {
    setLines(
      lines.map((line) =>
        line.lineKey === lineKey
          ? { ...line, claims: (line.claims || []).filter((c) => c.id !== claimId) }
          : line,
      ),
    );
  };

  // ─── ادعاهای خارج از فاکتور ───────────────────────────────────────

  const handleAddOffScopeClaim = (product, kind = OFF_ORDER_KINDS.EXCESS) => {
    const existing = offScopeClaims.find(
      (c) => c.productId === product.productId,
    );
    if (existing) {
      setOffScopeClaims(
        offScopeClaims.map((c) =>
          c.id === existing.id
            ? { ...c, quantity: (Number(c.quantity) || 0) + 1 }
            : c,
        ),
      );
      return;
    }
    setOffScopeClaims([
      ...offScopeClaims,
      {
        ...newClaim(DEFAULT_OFF_ORDER_PROBLEM, 1),
        offScopeKind: kind,
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        unitPrice: product.unitPrice,
      },
    ]);
  };

  const handleUpdateOffScopeClaim = (claimId, field, value) => {
    setOffScopeClaims(
      offScopeClaims.map((claim) => {
        if (claim.id !== claimId) return claim;
        if (field === "quantity" || field === "unitPrice") {
          const num = Number(value);
          return { ...claim, [field]: Number.isNaN(num) || num < 0 ? 0 : num };
        }
        return { ...claim, [field]: value };
      }),
    );
  };

  const handleRemoveOffScopeClaim = (claimId) => {
    setOffScopeClaims(offScopeClaims.filter((c) => c.id !== claimId));
  };

  // ─── خروجی ─────────────────────────────────────────────────────────

  const onOrderClaims = lines.flatMap((line) =>
    (line.claims || [])
      .filter((claim) => (Number(claim.quantity) || 0) > 0)
      .map((claim) => ({
        scope: CLAIM_SCOPES.ON_ORDER,
        offScopeKind: null,
        orderLineId: line.orderLineId,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        unit: line.unit,
        unitPrice: line.unitPrice,
        quantity: Number(claim.quantity) || 0,
        problem: claim.problem,
        note: claim.note || "",
      })),
  );

  const preparedOffScopeClaims = offScopeClaims
    .filter((claim) => (Number(claim.quantity) || 0) > 0)
    .map((claim) => ({
      scope: CLAIM_SCOPES.OFF_ORDER,
      offScopeKind: claim.offScopeKind,
      // ادعای خارج از سفارش روی هیچ خطی نمی‌نشیند.
      orderLineId: null,
      productId: claim.productId,
      productCode: claim.productCode,
      productName: claim.productName,
      unit: claim.unit,
      unitPrice: Number(claim.unitPrice) || 0,
      quantity: Number(claim.quantity) || 0,
      problem: claim.problem,
      note: claim.note || "",
    }));

  const allClaims = [...onOrderClaims, ...preparedOffScopeClaims];

  const computedTotal = allClaims.reduce(
    (sum, claim) => sum + claim.quantity * claim.unitPrice,
    0,
  );

  const buildPayload = () => ({
    purchaseId: formData.purchaseId,
    purchaseInvoiceNumber: formData.purchaseInvoiceNumber,
    supplierId: formData.supplierId,
    supplierName: formData.supplierName,
    returnDate: formData.returnDate,
    description: formData.description || "",
    previousReturnId: formData.previousReturnId ?? null,
    claims: allClaims,
  });

  return {
    formData,
    setFormData,
    lines,
    offScopeClaims,
    allClaims,
    computedTotal,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffScopeClaim,
    handleUpdateOffScopeClaim,
    handleRemoveOffScopeClaim,
    buildPayload,
    resetForm,
  };
}

