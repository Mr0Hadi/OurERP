import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import SaleCustomerSection from "@/features/sales/orders/components/forms/SaleCustomerSection";
import SaleItemsSection from "@/features/sales/orders/components/forms/SaleItemsSection";
import PriceListPrint from "@/features/sales/orders/components/proforma/PriceListPrint";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { salePriceOf } from "@/features/sales/orders/domain/salePricing";
import { saleFormProblem, scannedBarcodesOf } from "@/features/sales/orders/domain/saleRules";
import { useSaleFormPos } from "@/features/sales/orders/hooks/useSaleFormPos";
import { useInPersonSaleMutation } from "@/features/sales/orders/services/mutations";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import DocumentFormLayout, { FormSection, OrderSummaryCard } from "@/shared/components/forms/DocumentFormLayout";
import Notice from "@/shared/components/feedback/Notice";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { paymentTypeOf } from "@/shared/domain/payments/paymentRows";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import { isDocumentFormChanged } from "@/shared/store/createDocumentFormStore";
import { useUpdateGuard } from "@/shared/services/updateSafety";
import { Printer } from "lucide-react";
import { useCounterSaleStore } from "../store/counterSaleStore";

/**
 * فروشِ پیشخوان (حضوری، خرده): یک نفر کالا را می‌آورد، دانه‌ها را اسکن می‌کند، پول را می‌گیرد و
 * همان‌جا تحویل می‌دهد — بی صفِ انبار و صندوق. پشتِ صحنه همان چرخه‌ی پیش‌فاکتور پشتِ هم اجرا می‌شود
 * (`useInPersonSaleMutation`: ثبت ← تأییدِ مشتری ← بررسیِ انبار با همین دانه‌ها ← `CompleteInPersonSale`).
 *
 * قاعده‌ها: همه‌ی دانه‌های همه‌ی اقلام اسکن (`CheckSaleWarehouse` بارکدِ هر دانه را می‌خواهد) و کلِ
 * مبلغ دریافت شود. فروشِ اقساطی و فروشی که انبار باید ارسالش کند از «فروش جدید» است.
 */
export default function CounterSalePage() {
  usePageHeader({ title: "فروش پیشخوان", showBack: true });
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [printingPriceList, setPrintingPriceList] = useState(false);

  const store = useCounterSaleStore();
  const { formData, setFormData, setItems, setPaymentDraft, resetForm } = store;
  const { openSubPage, returned, ready } = useDocumentFormDraft(undefined, store);
  const payments = usePaymentDraft([], SALE_PAYMENT_SIDE.direction, [formData.paymentDraft, setPaymentDraft]);
  const mutation = useInPersonSaleMutation();

  const newCustomerId = returned?.newCustomerId;
  useEffect(() => {
    if (newCustomerId) setFormData({ customerId: newCustomerId, customerName: "" });
  }, [newCustomerId, setFormData]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => useCounterSaleStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => salePriceOf(useCounterSaleStore.getState().formData.priceMode)(product),
  });

  const items = formData.items || [];
  const totals = invoiceTotals(items);
  const scannedBarcodes = scannedBarcodesOf(items);
  const { productMap } = useDocumentProducts(items.map((item) => item.productId));

  const problemBase = {
    formData,
    items,
    // پیشخوان همیشه حضوری است: اسکنِ کامل و دریافتِ کامل.
    isInPerson: true,
    isInvoice: true,
    scannedBarcodes,
    paid: payments.netPaid,
    total: totals.totalAmount,
  };

  const buildPayload = (rows) => ({
    customerId: formData.customerId,
    invoiceDate: null,
    paymentDate: null,
    description: formData.description || "",
    items,
    paymentType: paymentTypeOf(rows),
    attachments: [],
  });

  const finish = (created) => {
    resetForm();
    navigate(created?.id ? routeWithId(ROUTES.SALES_DETAIL, created.id) : ROUTES.SALES, { replace: true });
  };

  const { posPayment, posLocked } = useSaleFormPos({
    enabled: allows("PosCharge"),
    isInPerson: true,
    takeSnapshot: () => {
      const problem = saleFormProblem({ ...problemBase, forPos: true });
      if (problem) {
        setShowErrors(true);
        reportFormProblem(problem);
        throw new Error(problem[0]);
      }
      return { payload: buildPayload(payments.rows), draftRows: payments.rows, scannedBarcodes, total: totals.totalAmount };
    },
    onCreated: finish,
  });

  const isBusy = mutation.isPending || posLocked;
  // زنجیره‌ی پشتِ صحنه هر کدام دسترسیِ خودش را می‌خواهد؛ کمبودش بعد از ثبت شکست می‌خورد.
  const missingPermissions = [
    ["SaleCreate", "ثبت فروش"],
    ["SaleUpdate", "ویرایش فروش (تأیید مشتری)"],
    ["SaleWarehouseCheck", "بررسی انبار"],
  ].filter(([name]) => !allows(name));
  const dirty = useCounterSaleStore(isDocumentFormChanged);
  useUpdateGuard({ dirty, busy: isBusy, reason: "فروشِ پیشخوان ثبت نشده است" });

  if (!ready) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    if (isBusy) return;
    const problem = saleFormProblem(problemBase);
    if (problem) {
      setShowErrors(true);
      return reportFormProblem(problem);
    }
    mutation.mutate(
      { payload: buildPayload(payments.rows), scannedBarcodes, paymentRows: payments.rows },
      {
        onSuccess: finish,
        // پیش‌فاکتور ساخته شد ولی چرخه کامل نشد: از صفحه‌ی خودش ادامه.
        onError: (error) => {
          if (!error?.partiallySaved) return;
          resetForm();
          navigate(routeWithId(ROUTES.SALES_DETAIL, error.saleId), { replace: true });
        },
      },
    );
  };

  const leave = () => {
    resetForm();
    navigate(ROUTES.SALES);
  };

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            {missingPermissions.length > 0 && (
              <Notice tone="caution">
                فروشِ پیشخوان این دسترسی‌ها را هم می‌خواهد: {missingPermissions.map(([, label]) => label).join("، ")}.
              </Notice>
            )}
            <FormSection name="party">
              <SaleCustomerSection
                selectedId={formData.customerId}
                selectedName={formData.customerName}
                onSelect={(id, name) => setFormData({ customerId: id, customerName: name })}
                onClear={() => setFormData({ customerId: "", customerName: "" })}
                onAddNew={() => openSubPage(ROUTES.CUSTOMERS_NEW)}
                error={showErrors && !formData.customerId ? "مشتری را انتخاب کنید" : null}
              />
            </FormSection>
            <FormSection name="items">
              <SaleItemsSection
                items={items}
                onItemsChange={setItems}
                products={[...productMap.values()]}
                priceMode={formData.priceMode}
                onPriceModeChange={(priceMode) => setFormData({ priceMode })}
                onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
                trackUnits
              />
            </FormSection>
          </>
        }
        payments={
          <FormSection name="payment">
            <PaymentsCard
              title="دریافت‌ها"
              draft={payments}
              side={SALE_PAYMENT_SIDE}
              total={totals.totalAmount}
              canManage
              allowRefund={false}
              posPayment={posPayment}
              emptyText="هنوز دریافتی ثبت نشده است."
              notice="کلِ مبلغ باید دریافت شود؛ کالا همین‌جا تحویل می‌شود."
            />
          </FormSection>
        }
        aside={
          <OrderSummaryCard
            title="فروش پیشخوان"
            badge={<StatusBadge tone="info">تحویل حضوری</StatusBadge>}
            itemCount={items.length}
            totals={totals}
            submitLabel="ثبت و تحویل"
            isBusy={isBusy}
            onCancel={leave}
            footer={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setPrintingPriceList(true)}
                disabled={items.length === 0}
              >
                <Printer className="size-3.5" />
                لیست قیمت‌ها
              </Button>
            }
          />
        }
      />
      {printingPriceList && (
        <PriceListPrint items={items} customerName={formData.customerName} onClose={() => setPrintingPriceList(false)} />
      )}
    </>
  );
}
