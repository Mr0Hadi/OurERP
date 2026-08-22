import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import {
  CLAIM_SCOPES,
  OFF_INVOICE_KINDS,
  RETURN_PROBLEMS,
} from "../domain/returnVocabulary";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_ON_INVOICE_PROBLEM = RETURN_PROBLEMS.DEFECTIVE;
const DEFAULT_OFF_INVOICE_PROBLEM = RETURN_PROBLEMS.OVER_SHIPPED;

/**
 * فرم ثبت ادعای مرجوعی.
 *
 * دو دسته ادعا مدیریت می‌شود که قواعدشان فرق دارد:
 *
 *  • روی فاکتور  — روی یک خط فروش می‌نشیند و سقفش مقداری است که واقعاً
 *                  به مشتری تحویل شده و هنوز ادعای فعالی رویش نیست.
 *  • خارج از فاکتور — سقف ندارد، چون اصلاً بیرون از سفارش است: کالای
 *                  اضافه‌ای که انبار فرستاده یا کالایی که در فاکتور
 *                  نبوده.
 *
 */
export function useSalesReturnForm() {
  const { formData, setFormData, setLines, setOffInvoiceClaims, resetForm } =
    useSalesReturnFormStore();

  const lines = formData.lines || [];
  const offInvoiceClaims = formData.offInvoiceClaims || [];

  const claimedQtyOf = (line) =>
    (line.claims || []).reduce((sum, c) => sum + (Number(c.qty) || 0), 0);

  const newClaim = (problem, qty) => ({
    id: generateId(),
    problem,
    qty,
    note: "",
  });

  // ─── ادعاهای روی فاکتور ───────────────────────────────────────────

  const handleAddClaim = (lineKey) => {
    setLines(
      lines.map((line) => {
        if (line.lineKey !== lineKey) return line;
        const remaining = Math.max(
          0,
          line.maxReturnableQty - claimedQtyOf(line),
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
            if (field === "qty") {
              const others = (line.claims || [])
                .filter((c) => c.id !== claimId)
                .reduce((s, c) => s + (Number(c.qty) || 0), 0);
              const maxAllowed = Math.max(0, line.maxReturnableQty - others);
              const num = Number(value);
              return {
                ...claim,
                qty: Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed),
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

  const handleAddOffInvoiceClaim = (product, kind = OFF_INVOICE_KINDS.EXCESS) => {
    setOffInvoiceClaims([
      ...offInvoiceClaims,
      {
        ...newClaim(DEFAULT_OFF_INVOICE_PROBLEM, 1),
        offScopeKind: kind,
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
        if (field === "qty" || field === "unitPrice") {
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
      .filter((claim) => (Number(claim.qty) || 0) > 0)
      .map((claim) => ({
        scope: CLAIM_SCOPES.ON_INVOICE,
        offScopeKind: null,
        saleLineId: String(line.productId),
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        unit: line.unit,
        unitPrice: line.unitPrice,
        qty: Number(claim.qty) || 0,
        problem: claim.problem,
        note: claim.note || "",
      })),
  );

  const preparedOffInvoiceClaims = offInvoiceClaims
    .filter((claim) => (Number(claim.qty) || 0) > 0)
    .map((claim) => ({
      scope: CLAIM_SCOPES.OFF_INVOICE,
      offScopeKind: claim.offScopeKind,
      saleLineId: null,
      productId: claim.productId,
      productCode: claim.productCode,
      productName: claim.productName,
      unit: claim.unit,
      unitPrice: Number(claim.unitPrice) || 0,
      qty: Number(claim.qty) || 0,
      problem: claim.problem,
      note: claim.note || "",
    }));

  const allClaims = [...onInvoiceClaims, ...preparedOffInvoiceClaims];

  const computedTotal = allClaims.reduce(
    (sum, claim) => sum + claim.qty * claim.unitPrice,
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

