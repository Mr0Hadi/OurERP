import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useCreateInPersonSaleMutation,
  useCreateInstallmentSaleMutation,
  useCreateSaleMutation,
  useIssueInstallmentSaleMutation,
  useRemoveSaleMutation,
  useSaleChangesSaver,
} from "@/features/sales/orders/services/mutations";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import {
  missingSaleInvoiceFields,
  saleFormProblem,
  scannedBarcodesOf,
} from "@/features/sales/orders/domain/saleRules";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { salePriceOf } from "@/features/sales/orders/domain/salePricing";
import { useSaleFormPos } from "../hooks/useSaleFormPos";
import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import DocumentFormLayout, {
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { paymentTypeOf } from "@/shared/domain/payments/paymentRows";
import { useDocumentAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import InstallmentPlanDraftCard from "@/features/sales/installments/components/InstallmentPlanDraftCard";
import ProformaPlanNotice from "@/features/sales/installments/components/ProformaPlanNotice";
import {
  addMonthsIso,
  planDraftErrors,
  previewInstallmentPlan,
  toApiCreatePlan,
} from "@/features/sales/installments/domain/installmentPlan";
import { todayIso } from "@/shared/lib/dateUtils";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";

/** «شیوه‌ی پرداخت»ِ فروش: یکجا (نقد/نسیه، از روی دریافت‌ها) یا اقساطی (با قرارداد). */
const PAYMENT_TERMS_OPTIONS = [
  { value: false, label: "نقد / نسیه" },
  {
    value: true,
    label: "اقساطی",
    hint: "پیش‌پرداخت و قرارداد اقساط با صدورِ فاکتور ثبت می‌شوند.",
  },
];

const UPLOADING_MESSAGE = "تا پایان بارگذاری پیوست‌ها صبر کنید.";

/**
 * فرمِ فروش — ثبتِ تازه (`sale` خالی) و ویرایشِ پیش‌فاکتور (تنها وضعیتی که
 * `UpdateSale` می‌پذیرد). فروشِ صادرشده در `SaleIssuedView` باز می‌شود.
 *
 * چیدمان همان نمای فاکتورِ صادرشده است: مشتری ← اقلام ← دریافت‌ها در ستونِ اصلی؛
 * جمع و دکمه‌ی ثبت ← اطلاعاتِ فاکتور ← سند و پیوست در ستونِ کناری.
 *
 *  - پیش‌فاکتور: تاریخ، سررسید و دریافت ندارد.
 *  - فاکتور: تاریخ الزامی؛ شماره را بکند می‌سازد. بکند فروش را فقط با اولین
 *    دریافت فاکتور می‌کند، پس «نسیه»ی کامل فعلاً بسته است (بندِ ۹.۱۱).
 *  - اسکنِ دانه در اقلام یعنی «فروشِ حضوری»: ثبت، خروجِ کالا با همان کدها و
 *    «تحویل کامل» در یک درخواست؛ دریافت باید کامل باشد.
 *  - کارتخوان: `useSaleFormPos`.
 *  - اقساطی: به‌جای دریافت‌ها قرارداد اقساط (`InstallmentPlanDraftCard`)؛ فاکتور با
 *    پیش‌پرداختِ قرارداد صادر می‌شود. فروشِ تازه دو درخواست است (فروش، بعد قرارداد)
 *    و فروشِ حضوری یکی (`installmentPlan`ِ `CreateInPersonSale`).
 *
 * قاعده‌ها (پیش از ثبت چه کم است، فروشِ حضوری) در `domain/saleRules.js`.
 */
export default function SaleForm({ sale }) {
  const isNew = !sale;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const store = useSaleFormStore();
  const { formData, setFormData, setItems, setPaymentDraft, resetForm } = store;
  const { openSubPage, returned, ready } = useDocumentFormDraft(sale, store);

  /** ضمیمه‌ها؛ `UpdateSale` آرایه را *جایگزین* می‌کند، پس همیشه فهرستِ نهایی. */
  const attachments = useDocumentAttachments(sale);

  // دریافت‌ها تا دکمه‌ی ثبت در پیش‌نویس (store) می‌مانند؛ اولینش فاکتور را صادر می‌کند.
  const payments = usePaymentDraft(sale?.paymentDetails || [], SALE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  const createMutation = useCreateSaleMutation();
  const installmentCreateMutation = useCreateInstallmentSaleMutation();
  const installmentIssueMutation = useIssueInstallmentSaleMutation(sale?.id);
  const inPersonMutation = useCreateInPersonSaleMutation();
  const saver = useSaleChangesSaver(sale?.id);
  const deleteMutation = useRemoveSaleMutation();

  // مشتری‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ — عملاً اجرا نمی‌شود). نام را انتخابگر از سرور می‌خواند.
  const newCustomerId = returned?.newCustomerId;
  useEffect(() => {
    if (newCustomerId) setFormData({ customerId: newCustomerId, customerName: "" });
  }, [newCustomerId, setFormData]);

  // کالای تازه با قیمتِ حالتِ فعلی (خرده/همکار)، نه همیشه خرده.
  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => useSaleFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => salePriceOf(useSaleFormStore.getState().formData.priceMode)(product),
  });

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور؛ جمع فرستاده نمی‌شود.
  const totals = invoiceTotals(items);
  const scannedBarcodes = scannedBarcodesOf(items);
  const isInPerson = isNew && Object.keys(scannedBarcodes).length > 0;
  const { productMap } = useDocumentProducts(items.map((item) => item.productId));
  const isTracked = (productId) =>
    Boolean(productMap.get(Number(productId))?.requiresUnitTracking);
  const paid = payments.netPaid;

  const isInstallment = Boolean(formData.installment);
  const planDraft = formData.installmentPlan;
  // پیش‌نمایش با جمعِ فرم؛ عددِ نهایی را سرور از جمعِ واقعیِ فاکتور حساب می‌کند.
  const planPreview = isInstallment ? previewInstallmentPlan(totals.totalAmount, planDraft) : null;
  const planErrors = isInstallment
    ? planDraftErrors(planDraft, { payable: planPreview?.totalAmount, withDownPayment: true })
    : undefined;
  // پیش‌فاکتوری که قراردادِ بی‌پیش‌پرداخت دارد (از راهِ دیگری ساخته شده)؛ تا ابطالش،
  // صدور با قراردادِ تازه ممکن نیست و فروش باید اقساطی بماند.
  const existingPlan =
    sale?.installmentSummary?.status === SaleInstallmentPlanStatusEnum.ACTIVE ? sale.installmentSummary : null;
  // چرا قراردادِ تازه را نمی‌شود از این فرم ثبت کرد (کارت جایش پیام نشان می‌دهد):
  //  - دسترسیِ ثبتِ قرارداد نیست — وگرنه پیش‌فاکتور ذخیره و بعد ۴۰۳ می‌گرفت؛
  //  - پیش‌فاکتور از قراردادِ ابطال‌شده‌ی قبلی پول گرفته؛ سرور قراردادِ تازه را با کلِ جمعِ
  //    فاکتور می‌سازد و پولِ گرفته‌شده را حساب نمی‌کند (`frontend-requests.fa.md` ۱۷.۷).
  const planBlockedReason = !isInstallment
    ? null
    : !allows("SaleInstallmentManage")
      ? "ثبتِ قرارداد اقساط دسترسیِ «مدیریت قرارداد اقساطی» می‌خواهد."
      : Number(sale?.paidAmount) > 0
        ? "از این پیش‌فاکتور قبلاً با قراردادِ اقساطِ دیگری پول گرفته شده است و قراردادِ تازه کلِ جمعِ فاکتور را دوباره از مشتری می‌خواهد (محدودیتِ فعلیِ سرور). شیوه‌ی پرداخت را «نقد / نسیه» کنید و مانده را با دریافتِ عادی بگیرید."
        : null;
  const setPlanDraft = (patch) => setFormData({ installmentPlan: { ...planDraft, ...patch } });
  const setInstallment = (installment) =>
    setFormData({
      installment,
      // پیش‌فرضِ اولین سررسید: یک ماه بعد.
      installmentPlan:
        installment && !planDraft.firstDueDate
          ? { ...planDraft, firstDueDate: addMonthsIso(todayIso(), 1) }
          : planDraft,
    });

  // ورودیِ `saleFormProblem` جز نوعِ سند (فاکتور/پیش‌فاکتور) که به کارتخوان هم بسته است.
  const problemBase = {
    formData,
    items,
    isInPerson,
    scannedBarcodes,
    isTracked,
    paid,
    total: totals.totalAmount,
    planErrors: existingPlan
      ? { plan: "قراردادِ قبلیِ این پیش‌فاکتور را ابطال کنید" }
      : planBlockedReason
        ? { plan: planBlockedReason }
        : planErrors,
  };

  /** فرم → بدنه‌ی `CreateSale`/`UpdateSale` (بی ردیف‌های پرداخت). */
  const buildPayload = (isInvoice) => ({
    customerId: formData.customerId,
    customerName: formData.customerName,
    invoiceDate: isInvoice ? formData.invoiceDate : null,
    paymentDate: isInvoice ? formData.paymentDate || null : null,
    description: formData.description || "",
    items,
    paymentType: isInstallment
      ? PaymentTypeEnum.INSTALLMENT
      : paymentTypeOf(isInvoice ? payments.rows : []),
    attachments: attachments.filesPayload,
  });

  const openSaved = (id) => {
    attachments.commit();
    resetForm();
    navigate(id ? routeWithId(ROUTES.SALES_DETAIL, id) : ROUTES.SALES, { replace: true });
  };

  const { posPayment, posLocked } = useSaleFormPos({
    // پولِ فروشِ اقساطی فقط از قرارداد می‌آید؛ کارتخوان روی دریافت‌های عادی است.
    enabled: allows("PosCharge") && !isInstallment,
    sale,
    isInPerson,
    hasDraftPayments: payments.hasChanges,
    // پیش از کارت‌کشیدن: اگر فرم را نمی‌شود ثبت کرد، به دستگاه چیزی نمی‌رود.
    takeSnapshot: () => {
      // کارتخوان فقط روی فاکتور است (کارتِ دریافت در پیش‌فاکتور نیست).
      const problem = saleFormProblem({
        ...problemBase,
        isInvoice: true,
        invoiceErrors: missingSaleInvoiceFields(formData, true),
        forPos: true,
      });
      if (problem) {
        setShowErrors(true);
        reportFormProblem(problem);
        throw new Error(problem[0]);
      }
      if (attachments.isUploading) {
        toast.error(UPLOADING_MESSAGE);
        throw new Error(UPLOADING_MESSAGE);
      }
      return {
        payload: buildPayload(true),
        draftRows: payments.rows,
        inPerson: isInPerson,
        scannedBarcodes,
        total: totals.totalAmount,
      };
    },
    onPersisted: attachments.commit,
    onCreated: (created) => openSaved(created?.id),
    onIssued: () => {
      attachments.commit();
      resetForm();
    },
  });

  // `status` روی سیم نمی‌رود؛ فقط شکلِ فرم را تعیین می‌کند. وسطِ کارتخوان کارتِ
  // دریافت‌ها نباید با تغییرِ نوع به پیش‌فاکتور از صفحه برود.
  const isInvoice =
    posLocked ||
    isInPerson ||
    Number(formData.status || SaleStatusEnum.PROFORMA) !== SaleStatusEnum.PROFORMA;
  const invoiceErrors = missingSaleInvoiceFields(formData, isInvoice);

  if (!ready) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    if (posLocked) return;
    const problem = saleFormProblem({ ...problemBase, isInvoice, invoiceErrors });
    if (problem) {
      setShowErrors(true);
      return reportFormProblem(problem);
    }
    if (attachments.isUploading) return toast.error(UPLOADING_MESSAGE);

    const payload = buildPayload(isInvoice);
    if (isInstallment && isInvoice) return submitInstallment(payload);
    if (!isNew) {
      // اول خودِ پیش‌فاکتور، بعد دریافت‌ها — اولینش فاکتور را صادر می‌کند و
      // صفحه خودش به نمای فاکتورِ صادرشده می‌رود.
      saver.mutate(
        { update: payload, paymentDraft: isInvoice ? payments : null },
        {
          onSuccess: (latest) => {
            attachments.commit();
            resetForm();
            if (latest) store.initializeFrom(latest);
          },
        },
      );
      return;
    }

    const onSuccess = (created) => openSaved(created?.id);
    // دریافت‌ها فقط با فاکتورِ غیراقساطی؛ ردیف‌هایی که پیش از رفتن به پیش‌فاکتور/اقساطی
    // اضافه شده بودند پنهان‌اند و نباید بی‌صدا فرستاده شوند (فروشِ اقساطی با ردیف ۴۰۰ می‌گیرد).
    const body = { ...payload, paymentRows: isInvoice && !isInstallment ? payments.rows : [] };
    if (isInPerson) inPersonMutation.mutate({ payload: body, scannedBarcodes }, { onSuccess });
    else createMutation.mutate(body, { onSuccess });
  };

  /** فاکتورِ اقساطی: پیش‌پرداختِ قرارداد آن را صادر می‌کند؛ دریافتِ عادی ندارد. */
  const submitInstallment = (payload) => {
    const plan = toApiCreatePlan(planDraft);
    const body = { ...payload, paymentRows: [] };
    const onSuccess = (created) => openSaved(created?.saleId ?? created?.id);
    if (isInPerson) {
      inPersonMutation.mutate({ payload: body, scannedBarcodes, installmentPlan: plan }, { onSuccess });
    } else if (isNew) {
      installmentCreateMutation.mutate(
        { payload: body, plan },
        // فروش ثبت شد ولی قرارداد نه: به همان پیش‌فاکتور برو تا قرارداد از آن‌جا ثبت شود.
        { onSuccess, onError: (error) => error?.partiallySaved && openSaved(error.saleId) },
      );
    } else {
      installmentIssueMutation.mutate(
        { update: payload, plan },
        {
          onSuccess: () => {
            attachments.commit();
            resetForm();
          },
        },
      );
    }
  };

  const leave = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const canEdit = isNew || allows("SaleUpdate");
  const isBusy =
    createMutation.isPending ||
    installmentCreateMutation.isPending ||
    installmentIssueMutation.isPending ||
    inPersonMutation.isPending ||
    saver.isPending ||
    deleteMutation.isPending ||
    attachments.isUploading ||
    posLocked;
  const submitLabel = isInPerson
    ? "ثبت و تحویل حضوری"
    : isInstallment && isInvoice
      ? isNew
        ? "ثبت فاکتور اقساطی"
        : "صدور فاکتور اقساطی"
      : isNew
      ? isInvoice
        ? "ثبت فاکتور"
        : "ثبت پیش‌فاکتور"
      : isInvoice
        ? "ذخیره و صدور فاکتور"
        : "ذخیره‌ی پیش‌فاکتور";

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
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
                priceMode={formData.priceMode}
                onPriceModeChange={(priceMode) => setFormData({ priceMode })}
                onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
              />
            </FormSection>
            {isInvoice && isInstallment && (
              <FormSection name="payment">
                {existingPlan ? (
                  <ProformaPlanNotice plan={existingPlan} />
                ) : (
                  <InstallmentPlanDraftCard
                    draft={planDraft}
                    onChange={setPlanDraft}
                    preview={planPreview}
                    errors={showErrors ? planErrors : {}}
                    taxUnknown={totals.taxUnknown}
                    blockedReason={planBlockedReason}
                  />
                )}
              </FormSection>
            )}
            {isInvoice && !isInstallment && (
              <FormSection name="payment">
                <PaymentsCard
                  title="دریافت‌ها"
                  draft={payments}
                  side={SALE_PAYMENT_SIDE}
                  total={totals.totalAmount}
                  canManage={isNew || allows("SalePayment")}
                  allowRefund={false}
                  posPayment={posPayment}
                  emptyText="هنوز دریافتی ثبت نشده است."
                  notice={
                    isInPerson
                      ? "تحویلِ حضوری: کلِ مبلغ باید دریافت شود."
                      : "فاکتورِ فروش با اولین دریافت صادر می‌شود؛ مانده بدهیِ مشتری است."
                  }
                />
              </FormSection>
            )}
          </>
        }
        aside={
          <>
            <FormSection name="info">
              <OrderInfoCard
                kind={isInvoice ? "invoice" : "proforma"}
                onKindChange={(kind) =>
                  setFormData({
                    status: kind === "proforma" ? SaleStatusEnum.PROFORMA : SaleStatusEnum.PROCESSING,
                  })
                }
                kindNote={isInPerson ? "دانه اسکن شده؛ فروش حضوری است و فاکتور همین حالا تحویل می‌شود." : undefined}
                formData={formData}
                onFormChange={setFormData}
                errors={showErrors ? invoiceErrors ?? {} : {}}
              >
                {(isInstallment || allows("SaleInstallmentManage")) && (
                  <StatusChoice
                    label="شیوه‌ی پرداخت"
                    options={PAYMENT_TERMS_OPTIONS}
                    value={isInstallment}
                    onChange={setInstallment}
                    // قراردادِ موجود و دریافتِ کارتخوانِ در جریان شیوه را قفل می‌کنند.
                    disabled={Boolean(existingPlan) || posLocked}
                  />
                )}
              </OrderInfoCard>
            </FormSection>
            <InvoiceDocumentSection
              title={isInvoice ? "فاکتور" : "پیش‌فاکتور"}
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind={isNew ? undefined : "sale"}
              documentId={sale?.id}
              attachmentLabel="تصویر یا PDFِ برگه"
            />
            <OrderSummaryCard
              title={isInvoice ? "فاکتور فروش" : "پیش‌فاکتور فروش"}
              badge={isInPerson && <StatusBadge tone="info">تحویل حضوری</StatusBadge>}
              itemCount={items.length}
              totals={totals}
              canSubmit={canEdit}
              submitLabel={submitLabel}
              isBusy={isBusy}
              onCancel={leave}
              footer={
                !isNew &&
                allows("SaleDelete") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isBusy}
                  >
                    <Trash2 className="size-3.5" />
                    حذف پیش‌فاکتور
                  </Button>
                )
              }
            />
          </>
        }
      />

      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="حذف پیش‌فاکتور فروش"
          description="این پیش‌فاکتور حذف می‌شود و دیگر در فهرست فروش‌ها نیست. این کار برگشت‌پذیر نیست."
          confirmLabel="حذف"
          pendingLabel="در حال حذف..."
          isPending={deleteMutation.isPending}
          onConfirm={() =>
            deleteMutation.mutate(sale.id, {
              onSuccess: () => {
                resetForm();
                navigate(ROUTES.SALES);
              },
            })
          }
        />
      )}
    </>
  );
}
