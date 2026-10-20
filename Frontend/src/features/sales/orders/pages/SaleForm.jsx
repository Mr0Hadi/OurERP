import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  isSaleCoreChanged,
  isSaleDueDateChanged,
  isSaleInfoChanged,
  useSaleFormStore,
} from "@/features/sales/orders/store/saleFormStore";
import {
  useApproveSaleProformaMutation,
  useCreateSaleMutation,
  useInPersonSaleMutation,
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
import { useReservationCountdown } from "../hooks/useReservationCountdown";
import ProformaStageCard from "../components/proforma/ProformaStageCard";
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
import { isDocumentFormChanged } from "@/shared/store/createDocumentFormStore";
import { useUpdateGuard } from "@/shared/services/updateSafety";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
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
 *  - چرخه‌ی تأیید (۲۰۲۶-۱۰-۱۶): فروشِ تازه همیشه پیش‌فاکتورِ «پیش‌نویس» است و پول
 *    نمی‌گیرد؛ «مشتری تأیید کرد» ← بررسیِ انبار (رزرو) ← دریافت (`ProformaStageCard`).
 *    نوعِ «فاکتور» (دریافت و صدور) فقط در مرحله‌ی «آماده‌ی پرداخت» و پیش از پایانِ مهلتِ
 *    رزرو باز است. ذخیره‌ی خودِ پیش‌فاکتور (`UpdateSale`) فقط وقتی فرستاده می‌شود که
 *    واقعاً عوض شده، چون چرخه را به پیش‌نویس برمی‌گرداند؛ پس در حالِ دریافت ممنوع است.
 *  - فاکتور: تاریخ الزامی؛ شماره را بکند می‌سازد و با اولین دریافت صادر می‌شود.
 *  - اسکنِ دانه در اقلام یعنی «فروشِ حضوری»: یک نفر همه‌ی چرخه را پشتِ هم انجام می‌دهد
 *    (`useInPersonSaleMutation`)؛ همه‌ی دانه‌ها اسکن و کلِ مبلغ دریافت می‌شود.
 *  - کارتخوان: `useSaleFormPos`.
 *  - اقساطی: به‌جای دریافت‌ها قرارداد اقساط (`InstallmentPlanDraftCard`)؛ فاکتور با
 *    پیش‌پرداختِ قرارداد صادر می‌شود (پیش‌فاکتورِ آماده‌ی پرداخت، یا فروشِ حضوری).
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
  const installmentIssueMutation = useIssueInstallmentSaleMutation(sale?.id);
  const inPersonMutation = useInPersonSaleMutation();
  const approveMutation = useApproveSaleProformaMutation();

  // چرخه‌ی تأیید: دریافت فقط در «آماده‌ی پرداخت» و تا وقتی رزرو زنده است.
  const coreChanged = useSaleFormStore(isSaleCoreChanged);
  const dueDateChanged = useSaleFormStore(isSaleDueDateChanged);
  const infoChanged = useSaleFormStore(isSaleInfoChanged);
  const secondsLeft = useReservationCountdown(sale);
  const stage = Number(sale?.proformaStage ?? SaleProformaStageEnum.DRAFT);
  const readyForPayment = !isNew && stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && secondsLeft !== 0;
  // تغییری که ذخیره‌اش تأییدها را برمی‌گرداند. مهلتِ پرداخت در «آماده‌ی پرداخت» بعد از دریافت
  // (روی فاکتورِ صادرشده) ذخیره می‌شود، پس آن‌جا مانعِ دریافت نیست.
  const documentChanged = coreChanged || (dueDateChanged && !readyForPayment);
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
    blockedReason: documentChanged
      ? "پیش‌فاکتور تغییر کرده؛ تغییرات را برگردانید یا اول (به‌صورتِ پیش‌فاکتور) ذخیره کنید."
      : payments.hasChanges
        ? "دریافت‌های ثبت‌نشده را اول ذخیره کنید؛ بعد از صفحه‌ی فاکتور با کارتخوان دریافت کنید."
        : undefined,
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
    (readyForPayment && !documentChanged);
  const invoiceErrors = missingSaleInvoiceFields(formData, isInvoice);

  const isBusy =
    createMutation.isPending ||
    approveMutation.isPending ||
    installmentIssueMutation.isPending ||
    inPersonMutation.isPending ||
    saver.isPending ||
    deleteMutation.isPending ||
    attachments.isUploading ||
    posLocked;
  // نسخه‌ی تازه‌ی برنامه نباید فاکتورِ نیمه‌کاره یا ثبتِ در جریان را از بین ببرد.
  const changed = useSaleFormStore(isDocumentFormChanged);
  useUpdateGuard({ dirty: changed, busy: isBusy, reason: "فاکتورِ فروش در حال ثبت یا ذخیره‌نشده است" });

  if (!ready) return null;

  // کارِ دکمه‌ی اصلی؛ صفحه فقط همین یک دکمه را دارد (کارتِ مرحله فقط وضعیت را می‌گوید).
  const attachmentsDirty = !isNew && attachmentsChanged(attachments.filesPayload, sale.attachments);
  const action = isNew
    ? isInPerson
      ? "inPerson"
      : "create"
    : documentChanged || (!readyForPayment && (infoChanged || attachmentsDirty))
      ? "save"
      : stage === SaleProformaStageEnum.DRAFT
        ? "sendToWarehouse"
        : stage === SaleProformaStageEnum.CUSTOMER_APPROVED
          ? "awaitWarehouse"
          : readyForPayment
            ? "pay"
            : "expired";

  const onSubmit = (e) => {
    e.preventDefault();
    if (posLocked) return;
    if (action === "sendToWarehouse") {
      approveMutation.mutate({ saleId: sale.id, revision: sale.revision });
      return;
    }
    if (action === "awaitWarehouse") {
      navigate(routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, sale.id));
      return;
    }
    if (action === "expired") return;
    const problem = saleFormProblem({ ...problemBase, isInvoice, invoiceErrors });
    if (problem) {
      setShowErrors(true);
      return reportFormProblem(problem);
    }
    if (attachments.isUploading) return toast.error(UPLOADING_MESSAGE);

    const payload = buildPayload(isInvoice);
    const onSaved = (created) => openSaved(created?.id);
    const onPartial = (error) => error?.partiallySaved && openSaved(error.saleId);

    if (isInPerson) {
      inPersonMutation.mutate(
        {
          payload,
          scannedBarcodes,
          paymentRows: isInstallment ? [] : payments.rows,
          installmentPlan: isInstallment ? toApiCreatePlan(planDraft) : null,
        },
        { onSuccess: onSaved, onError: onPartial },
      );
      return;
    }
    if (isNew) {
      createMutation.mutate(payload, { onSuccess: onSaved });
      return;
    }
    // پیوستِ تنها راهِ جدای خودش را دارد.
    const sideAttachments = !documentChanged && !infoChanged && attachmentsDirty ? attachments.filesPayload : undefined;
    if (action === "pay") {
      // تاریخِ فاکتور/توضیح با `UpdateSale` ولی با مهلتِ پرداختِ ذخیره‌شده (تا چرخه برنگردد)؛
      // مهلتِ تازه بعد از دریافت، روی فاکتورِ صادرشده.
      const infoUpdate = infoChanged ? { ...payload, paymentDate: sale.paymentDate || null } : undefined;
      const duePatch = dueDateChanged ? formData.paymentDate || null : undefined;
      if (isInstallment) {
        installmentIssueMutation.mutate(
          { update: infoUpdate, attachments: sideAttachments, plan: toApiCreatePlan(planDraft), paymentDate: duePatch },
          {
            onSuccess: () => {
              attachments.commit();
              resetForm();
            },
          },
        );
        return;
      }
      saver.mutate(
        { update: infoUpdate, attachments: sideAttachments, paymentDraft: payments, paymentDate: duePatch },
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
    if (isInstallment && isInvoice) {
      installmentIssueMutation.mutate(
        { attachments: sideAttachments, plan: toApiCreatePlan(planDraft) },
        {
          onSuccess: () => {
            attachments.commit();
            resetForm();
          },
        },
      );
      return;
    }
    saver.mutate(
      {
        update: documentChanged || infoChanged ? payload : undefined,
        attachments: sideAttachments,
        paymentDraft: isInvoice ? payments : null,
      },
      {
        onSuccess: (latest) => {
          attachments.commit();
          resetForm();
          if (latest) store.initializeFrom(latest);
        },
      },
    );
  };

  const leave = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const canWarehouseCheck = allows("SaleWarehouseCheck");
  const ACTIONS = {
    create: { label: "ثبت پیش‌فاکتور", allowed: true },
    inPerson: { label: "ثبت و تحویل حضوری", allowed: true },
    save: { label: "ذخیره‌ی تغییرات", allowed: allows("SaleUpdate") },
    sendToWarehouse: { label: "مشتری تأیید کرد؛ ارسال به انبار", allowed: allows("SaleUpdate") },
    awaitWarehouse: canWarehouseCheck
      ? { label: "بررسی انبار", allowed: true }
      : { label: "در انتظار بررسی انبار", allowed: true, disabled: true },
    pay: {
      label: isInstallment ? "صدور فاکتور اقساطی" : "دریافت و صدور فاکتور",
      allowed: allows(isInstallment ? "SaleInstallmentManage" : "SalePayment"),
    },
    expired: { label: "مهلت رزرو تمام شد", allowed: true, disabled: true },
  };
  const primary = ACTIONS[action];

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            {!isNew && (
              <ProformaStageCard
                sale={sale}
                secondsLeft={secondsLeft}
                documentChanged={documentChanged}
              />
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
              />
            </FormSection>
          </>
        }
        payments={
          <>
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
              canSubmit={primary.allowed}
              submitLabel={primary.label}
              submitDisabled={Boolean(primary.disabled)}
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

/** پیوست‌ها نسبت به نسخه‌ی ذخیره‌شده عوض شده‌اند؟ (کلید و یادداشتِ هر فایل) */
function attachmentsChanged(current = [], saved = []) {
  const sig = (list) => list.map((file) => `${file?.objectKey}:${file?.note || ""}`).join("|");
  return sig(current) !== sig(saved);
}
