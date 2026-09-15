import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { SALES_RETURN_PROBLEMS } from "../domain/salesReturnVocabulary";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_ON_INVOICE_PROBLEM = SALES_RETURN_PROBLEMS.DEFECTIVE;
const DEFAULT_EXCESS_PROBLEM = SALES_RETURN_PROBLEMS.OVER_SHIPPED;
const DEFAULT_UNLISTED_PROBLEM = SALES_RETURN_PROBLEMS.UNLISTED_ITEM;

/**
 * فرم ثبت ادعای مرجوعی.
 *
 * سه دسته ادعا با قواعد متفاوت:
 *
 *  • روی فاکتور — روی یک خط فروش، سقفش مقدارِ تحویل‌شده.
 *  • مازاد      — بیش از مقدارِ یک خط ارسال شده؛ روی همان خط و با قیمت
 *                 همان خط. سقفش دانه‌های مازادِ ارسال‌شده است.
 *  • نامرتبط    — کالایی که در فاکتور نیست؛ بدون خط و با قیمت دستی.
 */
export function useSalesReturnForm() {
  const { formData, setFormData, setLines, setOffInvoiceClaims, resetForm } =
    useSalesReturnFormStore();

  const lines = formData.lines || [];
  const orderLines = formData.orderLines || [];
  const offInvoiceClaims = formData.offInvoiceClaims || [];

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
            newClaim(DEFAULT_ON_INVOICE_PROBLEM, remaining),
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

  /** مازاد روی یک خطِ فاکتور و با قیمتِ آن؛ نامرتبط بدون خط و با قیمتِ دستی. */
  const handleAddOffInvoiceClaim = (product, kind) => {
    const isExcess = kind === OFF_SCOPE_KINDS.EXCESS;
    const existing = offInvoiceClaims.find((c) =>
      c.offScopeKind === kind && isExcess
        ? c.orderLineId === product.orderLineId
        : c.offScopeKind === kind && c.productId === product.productId,
    );
    if (existing) {
      setOffInvoiceClaims(
        offInvoiceClaims.map((c) =>
          c.id === existing.id
            ? { ...c, quantity: (Number(c.quantity) || 0) + 1 }
            : c,
        ),
      );
      return;
    }
    setOffInvoiceClaims([
      ...offInvoiceClaims,
      {
        ...newClaim(isExcess ? DEFAULT_EXCESS_PROBLEM : DEFAULT_UNLISTED_PROBLEM, 1),
        offScopeKind: kind,
        orderLineId: isExcess ? product.orderLineId : null,
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        unitPrice: product.unitPrice,
      },
    ]);
  };

  const handleUpdateOffInvoiceClaim = (claimId, field, value) => {
    setOffInvoiceClaims(
      offInvoiceClaims.map((claim) => {
        if (claim.id !== claimId) return claim;
        // قیمتِ مازاد از خطِ فاکتور است و سرور مقدارِ دیگری را رد می‌کند.
        if (field === "unitPrice" && claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS) {
          return claim;
        }
        if (field === "quantity" || field === "unitPrice") {
          const num = Number(value);
          return { ...claim, [field]: Number.isNaN(num) || num < 0 ? 0 : num };
        }
        return { ...claim, [field]: value };
      }),
    );
  };

  const handleRemoveOffInvoiceClaim = (claimId) => {
    setOffInvoiceClaims(offInvoiceClaims.filter((c) => c.id !== claimId));
  };

  // ─── خروجی ─────────────────────────────────────────────────────────

  const onInvoiceClaims = lines.flatMap((line) =>
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

  const preparedOffInvoiceClaims = offInvoiceClaims
    .filter((claim) => (Number(claim.quantity) || 0) > 0)
    .map((claim) => ({
      scope: CLAIM_SCOPES.OFF_ORDER,
      offScopeKind: claim.offScopeKind,
      orderLineId:
        claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS ? claim.orderLineId : null,
      productId: claim.productId,
      productCode: claim.productCode,
      productName: claim.productName,
      unit: claim.unit,
      unitPrice: Number(claim.unitPrice) || 0,
      quantity: Number(claim.quantity) || 0,
      problem: claim.problem,
      note: claim.note || "",
    }));

  const allClaims = [...onInvoiceClaims, ...preparedOffInvoiceClaims];

  const computedTotal = allClaims.reduce(
    (sum, claim) => sum + claim.quantity * claim.unitPrice,
    0,
  );

  const buildPayload = () => ({
    saleId: formData.saleId,
    saleInvoiceNumber: formData.saleInvoiceNumber,
    customerId: formData.customerId,
    customerName: formData.customerName,
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
    offInvoiceClaims,
    allClaims,
    computedTotal,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffInvoiceClaim,
    handleUpdateOffInvoiceClaim,
    handleRemoveOffInvoiceClaim,
    buildPayload,
    resetForm,
  };
}

