import { PencilLine } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import DocumentFormLayout, { FormSection, OrderSummaryCard } from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useDocumentAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import PriceListPrint from "../components/proforma/PriceListPrint";
import ProformaFooterActions from "../components/proforma/ProformaFooterActions";
import ProformaPaymentSection from "../components/proforma/ProformaPaymentSection";
import ProformaStageCard from "../components/proforma/ProformaStageCard";
import { ProformaAction, proformaAction, proformaPaymentType } from "../domain/proformaFlow";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import { salePriceOf } from "../domain/salePricing";
import { saleFormProblem, scannedBarcodesOf } from "../domain/saleRules";
import { useProformaPayment } from "../hooks/useProformaPayment";
import { useReservationCountdown } from "../hooks/useReservationCountdown";
import { useApproveSaleProformaMutation, useCreateSaleMutation, useSaleChangesSaver } from "../services/mutations";
import {
  isSaleCoreChanged,
  isSaleDueDateChanged,
  isSaleInfoChanged,
  useSaleFormStore,
} from "../store/saleFormStore";

const UPLOADING_MESSAGE = "تا پایان بارگذاری پیوست‌ها صبر کنید.";

/** پیوست‌ها نسبت به نسخه‌ی ذخیره‌شده عوض شده‌اند؟ (کلید و یادداشتِ هر فایل) */
function attachmentsChanged(current = [], saved = []) {
  const signature = (list) => list.map((file) => `${file?.objectKey}:${file?.note || ""}`).join("|");
  return signature(current) !== signature(saved);
}

/**
 * فرمِ فروش — ثبتِ تازه (`sale` خالی) و پیش‌فاکتور (تنها وضعیتی که `UpdateSale` می‌پذیرد). فروشِ صادرشده
 * در `SaleIssuedView` باز می‌شود. چیدمان: مشتری ← اقلام ← دریافت در ستونِ اصلی؛ اطلاعاتِ فاکتور ← سند و
 * پیوست ← جمع و دکمه‌ی اصلی در ستونِ کناری.
 *
 *  - پیش از تأییدِ مشتری چیزی ذخیره نمی‌شود: اقلام وارد و «لیست قیمت‌ها» چاپ می‌شود (بی‌مشتری). پس از تأیید،
 *    فرم کامل و با یک دکمه ثبت و به انبار فرستاده می‌شود.
 *  - فروشِ حضوری: دانه‌هایی که در فروشِ تازه جلوی مشتری اسکن شوند، با ثبت بی صفِ انبار رزرو می‌شوند.
 *  - چرخه: پیش‌نویس ← تأییدِ مشتری (به انبار) ← تأییدِ انبار (رزرو) ← دریافت (فاکتور) یا حذف. **یک دکمه‌ی
 *    اصلی** که کارش را `proformaAction` می‌گوید؛ `ProformaStageCard` فقط وضعیت را نشان می‌دهد.
 *  - `UpdateSale` با تغییرِ مشتری، اقلام، قیمت/تخفیف یا سررسید تأییدها را برمی‌گرداند؛ پس از ارسال به انبار
 *    مشتری و اقلام فقط‌خواندنی‌اند تا «ویرایش پیش‌فاکتور» زده شود. دریافت (شیوه‌ی پرداخت، قرارداد، کارتخوان،
 *    تحویلِ حضوری) با `useProformaPayment`، مشترک با صندوق.
 *  - تاریخِ فاکتور را سرور هنگامِ صدور می‌گذارد؛ فرم آن را نمی‌پرسد.
 *
 * قاعده‌های ثبت در `domain/saleRules.js`؛ مرحله و کارِ دکمه در `domain/proformaFlow.js`.
 */
export default function SaleForm({ sale }) {
  const isNew = !sale;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [printingPriceList, setPrintingPriceList] = useState(false);
  // پس از ارسال به انبار، مشتری و اقلام قفل‌اند تا کاربر آگاهانه «ویرایش» بزند.
  const [unlocked, setUnlocked] = useState(false);

  const store = useSaleFormStore();
  const { formData, setFormData, setItems, setPaymentDraft, resetForm } = store;
  const { openSubPage, returned, ready } = useDocumentFormDraft(sale, store);
  /** ضمیمه‌ها؛ `UpdateSale` آرایه را *جایگزین* می‌کند، پس همیشه فهرستِ نهایی. */
  const attachments = useDocumentAttachments(sale);
  // دریافت‌ها تا دکمه‌ی اصلی در پیش‌نویس (store) می‌مانند.
  const payments = usePaymentDraft(sale?.paymentDetails || [], SALE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  const createMutation = useCreateSaleMutation();
  const approveMutation = useApproveSaleProformaMutation();
  const saver = useSaleChangesSaver(sale?.id);

  const coreChanged = useSaleFormStore(isSaleCoreChanged);
  const dueDateChanged = useSaleFormStore(isSaleDueDateChanged);
  const infoChanged = useSaleFormStore(isSaleInfoChanged);
  const secondsLeft = useReservationCountdown(sale);
  const stage = Number(sale?.proformaStage ?? SaleProformaStageEnum.DRAFT);

  // مشتری‌ای که از داخلِ همین فرم ساخته شد؛ نام را انتخابگر از سرور می‌خواند.
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
  const { productMap } = useDocumentProducts(items.map((item) => item.productId));
  // فروشِ تازه با دانه‌ی اسکن‌شده = فروشِ حضوری (کالا جلوی مشتری است).
  const scannedBarcodes = isNew ? scannedBarcodesOf(items) : {};
  const isInPerson = Object.keys(scannedBarcodes).length > 0;
  const isInstallment = Boolean(formData.installment);
  const attachmentsDirty = !isNew && attachmentsChanged(attachments.filesPayload, sale.attachments);

  const action = proformaAction({
    isNew,
    isInPerson,
    stage,
    secondsLeft,
    changes: { core: coreChanged, dueDate: dueDateChanged, info: infoChanged, attachments: attachmentsDirty },
  });
  const isPay = action === ProformaAction.PAY;
  const lockedAfterApproval = !isNew && stage !== SaleProformaStageEnum.DRAFT && !unlocked && !coreChanged;

  /** فرم → بدنه‌ی `CreateSale`/`UpdateSale` (بی دریافت‌ها). */
  const buildPayload = () => ({
    customerId: formData.customerId,
    invoiceDate: sale?.invoiceDate || null,
    paymentDate: formData.paymentDate || null,
    description: formData.description || "",
    items,
    paymentType: proformaPaymentType(isInstallment, sale),
    attachments: attachments.filesPayload,
  });

  const afterSave = (latest) => {
    attachments.commit();
    resetForm();
    if (latest) store.initializeFrom(latest);
  };

  const payment = useProformaPayment({
    sale,
    payments,
    installment: [formData.installment, (installment) => setFormData({ installment })],
    plan: [formData.installmentPlan, (installmentPlan) => setFormData({ installmentPlan })],
    // تغییرهای بی‌اثر بر چرخه، پیش از دریافت: توضیح (با سررسیدِ ذخیره‌شده تا تأییدها برنگردند) یا پیوست‌ها.
    info: () =>
      infoChanged
        ? { update: { ...buildPayload(), paymentDate: sale.paymentDate || null } }
        : { attachments: attachmentsDirty ? attachments.filesPayload : undefined },
    dueDate: dueDateChanged ? formData.paymentDate || null : undefined,
    blockedReason: attachments.isUploading ? UPLOADING_MESSAGE : undefined,
    onDone: () => afterSave(null),
    doneLabel: "مشاهده‌ی فاکتور",
  });

  const isBusy =
    createMutation.isPending ||
    approveMutation.isPending ||
    saver.isPending ||
    payment.isPending ||
    payment.posLocked ||
    attachments.isUploading;

  if (!ready) return null;

  const openSaved = (id) => {
    attachments.commit();
    resetForm();
    navigate(routeWithId(ROUTES.SALES_DETAIL, id), { replace: true });
  };

  /** ثبتِ پیش‌فاکتورِ تازه: به انبار، یا در فروشِ حضوری رزروِ همان دانه‌ها. */
  const submitCreate = () =>
    createMutation.mutate(
      { payload: buildPayload(), send: allows("SaleUpdate"), scannedBarcodes },
      {
        onSuccess: (created) => openSaved(created.id),
        onError: (error) => error?.partiallySaved && openSaved(error.saleId),
      },
    );

  /** ذخیره‌ی پیش‌فاکتور؛ `UpdateSale` فقط اگر خودِ سند عوض شده، وگرنه فقط پیوست‌ها. */
  const submitSave = () => {
    const documentEdited = coreChanged || dueDateChanged || infoChanged;
    saver.mutate(
      {
        update: documentEdited ? buildPayload() : undefined,
        attachments: !documentEdited && attachmentsDirty ? attachments.filesPayload : undefined,
      },
      { onSuccess: afterSave },
    );
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (isBusy) return;
    if (attachments.isUploading) return toast.error(UPLOADING_MESSAGE);

    switch (action) {
      case ProformaAction.SEND_TO_WAREHOUSE:
        return approveMutation.mutate({ saleId: sale.id, revision: sale.revision });
      case ProformaAction.AWAIT_WAREHOUSE:
        return navigate(routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, sale.id));
      case ProformaAction.PAY:
        return payment.submit();
      case ProformaAction.EXPIRED:
        return undefined;
      default: {
        const problem = saleFormProblem({ formData, items, isInPerson, scannedBarcodes });
        if (problem) {
          setShowErrors(true);
          return reportFormProblem(problem);
        }
        return isNew ? submitCreate() : submitSave();
      }
    }
  };

  const leave = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const ACTION_BUTTONS = {
    [ProformaAction.CREATE]: {
      label: allows("SaleUpdate") ? "ثبت و ارسال به انبار" : "ثبت پیش‌فاکتور",
      allowed: true,
    },
    [ProformaAction.RESERVE_IN_PERSON]: {
      label: "ثبت و رزرو کالا",
      allowed: allows("SaleUpdate") && allows("SaleWarehouseCheck"),
    },
    [ProformaAction.SAVE]: { label: "ذخیره‌ی تغییرات", allowed: allows("SaleUpdate") },
    [ProformaAction.SEND_TO_WAREHOUSE]: { label: "مشتری تأیید کرد؛ ارسال به انبار", allowed: allows("SaleUpdate") },
    [ProformaAction.AWAIT_WAREHOUSE]: allows("SaleWarehouseCheck")
      ? { label: "بررسی انبار", allowed: true }
      : { label: "در انتظار بررسی انبار", allowed: true, disabled: true },
    [ProformaAction.PAY]: { label: payment.submitLabel, allowed: payment.canSubmit },
    [ProformaAction.EXPIRED]: { label: "مهلت رزرو تمام شد", allowed: true, disabled: true },
  };
  const primary = ACTION_BUTTONS[action];
  // کارتِ دریافت تا پایانِ کارتخوان می‌ماند، حتی اگر مرحله وسطِ کار عوض شود.
  const showPayment = isPay || payment.posLocked;

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
                documentChanged={coreChanged || (dueDateChanged && !isPay)}
              />
            )}
            {lockedAfterApproval ? (
              <>
                <SaleCustomerSection selectedId={formData.customerId} selectedName={formData.customerName} readOnly />
                <OrderItemsReadOnly
                  title="اقلام پیش‌فاکتور"
                  items={sale.items}
                  totalAmount={sale.totalAmount}
                  headerAction={
                    allows("SaleUpdate") && (
                      <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setUnlocked(true)}>
                        <PencilLine className="size-3.5" />
                        ویرایش پیش‌فاکتور
                      </Button>
                    )
                  }
                />
              </>
            ) : (
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
                    products={[...productMap.values()]}
                    priceMode={formData.priceMode}
                    onPriceModeChange={(priceMode) => setFormData({ priceMode })}
                    onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
                    // اسکنِ دانه فقط در فروشِ تازه (حضوری)؛ بقیه را انبار اسکن می‌کند.
                    trackUnits={isNew}
                  />
                </FormSection>
              </>
            )}
          </>
        }
        payments={showPayment && <ProformaPaymentSection sale={sale} payment={payment} payments={payments} />}
        aside={
          <>
            <FormSection name="info">
              <OrderInfoCard
                kind={showPayment ? "invoice" : "proforma"}
                // تاریخِ فاکتور را سرور با صدور می‌گذارد؛ سررسید جزوِ شرایطِ پیش‌فاکتور است.
                showInvoiceDate={false}
                showDueDate
                formData={formData}
                onFormChange={setFormData}
              />
            </FormSection>
            <InvoiceDocumentSection
              title={showPayment ? "فاکتور" : "پیش‌فاکتور"}
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind={isNew ? undefined : "sale"}
              documentId={sale?.id}
              attachmentLabel="تصویر یا PDFِ برگه"
              emptyHint={isNew ? "پیش‌فاکتور پس از ثبت از همین‌جا چاپ می‌شود." : undefined}
              // پیش از تأییدِ مشتری چیزی ذخیره نمی‌شود: لیستِ قیمت‌ها از اقلامِ فرم چاپ و به مشتری داده می‌شود.
              localPrints={[
                {
                  key: "price-list",
                  label: "لیست قیمت‌ها",
                  hint: "از اقلامِ همین فرم، بدونِ ذخیره و بدونِ نیاز به مشتری",
                  onPrint: () => setPrintingPriceList(true),
                  disabled: items.length === 0,
                },
              ]}
            />
            <OrderSummaryCard
              title={showPayment ? "فاکتور فروش" : "پیش‌فاکتور فروش"}
              itemCount={items.length}
              totals={totals}
              canSubmit={primary.allowed}
              submitLabel={primary.label}
              submitDisabled={Boolean(primary.disabled)}
              isBusy={isBusy}
              onCancel={leave}
              footer={
                !isNew && (
                  <ProformaFooterActions
                    sale={sale}
                    disabled={isBusy}
                    onDeleted={() => {
                      resetForm();
                      navigate(ROUTES.SALES);
                    }}
                  />
                )
              }
            />
          </>
        }
      />

      {printingPriceList && (
        <PriceListPrint
          items={items}
          customerName={formData.customerName}
          onClose={() => setPrintingPriceList(false)}
        />
      )}
    </>
  );
}
