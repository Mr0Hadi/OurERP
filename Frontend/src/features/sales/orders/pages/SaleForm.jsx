import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { PackageOpen, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  isSaleCoreChanged,
  isSaleDueDateChanged,
  isSaleInfoChanged,
  useSaleFormStore,
} from "@/features/sales/orders/store/saleFormStore";
import {
  useApproveSaleProformaMutation,
  useCompleteInPersonMutation,
  useCreateSaleMutation,
  useIssueInstallmentSaleMutation,
  useReleaseReservationMutation,
  useRemoveSaleMutation,
  useSaleChangesSaver,
  useSalePosActions,
  ensureProformaPaymentType,
} from "@/features/sales/orders/services/mutations";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { saleFormProblem, scannedBarcodesOf } from "@/features/sales/orders/domain/saleRules";
import {
  ProformaAction,
  isInPersonProforma,
  proformaAction,
  proformaPaymentType,
} from "@/features/sales/orders/domain/proformaFlow";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { salePriceOf } from "@/features/sales/orders/domain/salePricing";
import { useSaleFormPos } from "../hooks/useSaleFormPos";
import { useReservationCountdown } from "../hooks/useReservationCountdown";
import ProformaStageCard from "../components/proforma/ProformaStageCard";
import PriceListPrint from "../components/proforma/PriceListPrint";
import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import DocumentFormLayout, {
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { useDocumentAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { isDocumentFormChanged } from "@/shared/store/createDocumentFormStore";
import { useUpdateGuard } from "@/shared/services/updateSafety";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import SectionCard from "@/shared/components/forms/SectionCard";
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
 * فرمِ فروش — ثبتِ تازه (`sale` خالی) و پیش‌فاکتور (تنها وضعیتی که `UpdateSale` می‌پذیرد).
 * فروشِ صادرشده در `SaleIssuedView` باز می‌شود.
 *
 * چیدمان همان نمای فاکتورِ صادرشده است: مشتری ← اقلام ← دریافت‌ها در ستونِ اصلی؛
 * جمع و دکمه‌ی اصلی ← اطلاعاتِ فاکتور ← سند و پیوست در ستونِ کناری.
 *
 *  - پیش از تأییدِ مشتری چیزی ذخیره نمی‌شود: اقلام وارد و پیش‌نویس چاپ می‌شود («لیست قیمت‌ها»، `PriceListPrint`،
 *    بی‌مشتری). پس از تأیید، فرم کامل و با یک دکمه ثبت و به انبار فرستاده می‌شود.
 *  - چرخه‌ی تأیید (بخش ۱۱ سند): پیش‌نویس ← مشتری تأیید کرد (به انبار) ← انبار تأیید کرد (رزرو) ←
 *    دریافت (فاکتور) یا حذف. **یک دکمه‌ی اصلی** که کارش را `proformaAction` می‌گوید؛
 *    `ProformaStageCard` فقط وضعیت را نشان می‌دهد.
 *  - `UpdateSale` با تغییرِ مشتری، اقلام، قیمت/تخفیف یا سررسید تأییدها را برمی‌گرداند (شیوه‌ی پرداخت فقط هنگامِ دریافت انتخاب و با `ensureProformaPaymentType` ثبت می‌شود)؛
 *    پس هنگامِ دریافت فقط تغییرهای بی‌اثر (توضیح، پیوست) پیش از آن و سررسیدِ تازه بعد از صدور
 *    ذخیره می‌شوند، و `paymentType` همیشه همان مقدارِ ذخیره‌شده است (`proformaPaymentType`).
 *  - تاریخِ فاکتور را سرور هنگامِ صدور می‌گذارد؛ فرم آن را نمی‌پرسد.
 *  - فروشِ حضوری: اگر در فروشِ تازه دانه‌ها جلوی مشتری اسکن شوند، ثبت همان‌ها را بی صفِ انبار رزرو
 *    می‌کند (تا مهلتِ تنظیمات)؛ پرداخت بعد، همین‌جا یا در صندوق. روی چنین پیش‌فاکتوری دریافتِ کامل
 *    کالا را همان‌جا تحویل می‌دهد (`useCompleteInPersonMutation`). رزرو را می‌شود دستی آزاد کرد.
 *  - پس از ارسال به انبار، مشتری و اقلام فقط‌خواندنی‌اند تا «ویرایش پیش‌فاکتور» زده شود (هر تغییرِ
 *    آن‌ها تأییدها را برمی‌گرداند).
 *  - کارتخوان: `useSaleFormPos`.
 *  - اقساطی: به‌جای دریافت‌ها قرارداد اقساط (`InstallmentPlanDraftCard`)؛ فاکتور با
 *    پیش‌پرداختِ قرارداد صادر می‌شود.
 *
 * قاعده‌ها (پیش از ثبت چه کم است، فروشِ حضوری) در `domain/saleRules.js`.
 */
export default function SaleForm({ sale }) {
  const isNew = !sale;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [printingPriceList, setPrintingPriceList] = useState(false);
  // پس از ارسال به انبار، مشتری و اقلام قفل‌اند تا کاربر آگاهانه «ویرایش» بزند.
  const [unlocked, setUnlocked] = useState(false);

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
  const approveMutation = useApproveSaleProformaMutation();
  const completeMutation = useCompleteInPersonMutation(sale?.id);
  const releaseMutation = useReleaseReservationMutation();
  const posActions = useSalePosActions();
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [switchingType, setSwitchingType] = useState(false);
  // کارت‌کشیدنِ پیش‌پرداختِ قرارداد اقساط در جریان است.
  const [planPosLocked, setPlanPosLocked] = useState(false);

  const coreChanged = useSaleFormStore(isSaleCoreChanged);
  const dueDateChanged = useSaleFormStore(isSaleDueDateChanged);
  const infoChanged = useSaleFormStore(isSaleInfoChanged);
  const anythingChanged = useSaleFormStore(isDocumentFormChanged);
  const secondsLeft = useReservationCountdown(sale);
  const stage = Number(sale?.proformaStage ?? SaleProformaStageEnum.DRAFT);
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
  // فروشِ تازه با دانه‌ی اسکن‌شده = فروشِ حضوری (کالا جلوی مشتری است).
  const scannedBarcodes = isNew ? scannedBarcodesOf(items) : {};
  const isInPerson = Object.keys(scannedBarcodes).length > 0;
  // پیش‌فاکتورِ ذخیره‌شده‌ی حضوری: دریافتِ کامل همان‌جا تحویل می‌دهد.
  const inPersonReady = isInPersonProforma(sale);
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

  // کارِ دکمه‌ی اصلی، از مرحله و تغییرهای ذخیره‌نشده.
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

  /** فرم → بدنه‌ی `CreateSale`/`UpdateSale` (بی ردیف‌های پرداخت). */
  const buildPayload = () => ({
    customerId: formData.customerId,
    customerName: formData.customerName,
    invoiceDate: sale?.invoiceDate || null,
    paymentDate: formData.paymentDate || null,
    description: formData.description || "",
    items,
    paymentType: proformaPaymentType(isInstallment, sale),
    attachments: attachments.filesPayload,
  });

  /**
   * تغییرهای بی‌اثر بر چرخه که همراهِ دریافت ذخیره می‌شوند: توضیح با `UpdateSale` (با سررسیدِ
   * ذخیره‌شده تا تأییدها برنگردند؛ پیوست‌ها هم در همان بدنه)، یا فقط پیوست‌ها.
   */
  const infoChanges = () =>
    infoChanged
      ? { update: { ...buildPayload(), paymentDate: sale.paymentDate || null } }
      : { attachments: attachmentsDirty ? attachments.filesPayload : undefined };

  const openSaved = (id) => {
    attachments.commit();
    resetForm();
    navigate(id ? routeWithId(ROUTES.SALES_DETAIL, id) : ROUTES.SALES, { replace: true });
  };

  const { posPayment, posLocked } = useSaleFormPos({
    // پولِ فروشِ اقساطی فقط از قرارداد می‌آید؛ کارتخوان روی دریافت‌های عادی است.
    enabled: allows("PosCharge") && !isInstallment,
    sale,
    blockedReason: dueDateChanged
      ? "سررسیدِ تازه را با دکمه‌ی اصلی (همراهِ دریافت) ثبت کنید، یا آن را برگردانید."
      : payments.hasChanges
        ? "دریافت‌های ثبت‌نشده را اول ذخیره کنید؛ بعد از صفحه‌ی فاکتور با کارتخوان دریافت کنید."
        : undefined,
    // پیش از کارت‌کشیدن: اگر فرم را نمی‌شود ثبت کرد، به دستگاه چیزی نمی‌رود.
    takeSnapshot: () => {
      // کارتخوان فقط روی فاکتور است (کارتِ دریافت در پیش‌فاکتور نیست).
      const problem = saleFormProblem({
        ...problemBase,
        isInvoice: true,
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
      return { paymentType: proformaPaymentType(isInstallment, sale), infoChanges: infoChanges() };
    },
    onIssued: () => {
      attachments.commit();
      resetForm();
    },
  });

  // کارتِ دریافت/قرارداد: فقط وقتی پول گرفته می‌شود. وسطِ کارتخوان نباید از صفحه برود.
  const isInvoice = posLocked || isPay;
  // حضوری و کلِ مبلغ (یا قرارداد با پیش‌پرداخت) ⇒ تحویلِ همین‌جا؛ کمتر ⇒ فاکتور و ارسالِ انبار.
  const deliverNow = isPay && inPersonReady && (isInstallment || paid === Number(sale?.totalAmount));

  const isBusy =
    createMutation.isPending ||
    approveMutation.isPending ||
    switchingType ||
    planPosLocked ||
    completeMutation.isPending ||
    releaseMutation.isPending ||
    installmentIssueMutation.isPending ||
    saver.isPending ||
    deleteMutation.isPending ||
    attachments.isUploading ||
    posLocked;
  // نسخه‌ی تازه‌ی برنامه نباید فاکتورِ نیمه‌کاره یا ثبتِ در جریان را از بین ببرد. فرمِ پیش‌فاکتور
  // فقط با تغییرهای واقعی (نه فیلدهای نمایشی که انتخابگرها می‌نشانند) «ذخیره‌نشده» است.
  const dirty = isNew
    ? anythingChanged
    : coreChanged || dueDateChanged || infoChanged || attachmentsDirty || payments.hasChanges;
  useUpdateGuard({ dirty, busy: isBusy, reason: "فاکتورِ فروش در حال ثبت یا ذخیره‌نشده است" });

  if (!ready) return null;

  const afterSave = (latest) => {
    attachments.commit();
    resetForm();
    if (latest) store.initializeFrom(latest);
  };

  // کارت‌کشیدنِ پیش‌پرداختِ قرارداد اقساط (روشِ «انتقال بانکی»): پیش از کارت قرارداد سنجیده، شیوه‌ی
  // «اقساطی» و تغییرهای بی‌اثر ثبت می‌شوند؛ با تأییدِ دستگاه قرارداد با شماره‌ی پیگیریِ دستگاه ثبت می‌شود.
  const downPaymentPos = {
    prepare: async () => {
      if (planErrors && Object.keys(planErrors).length > 0) {
        setShowErrors(true);
        throw new Error("plan");
      }
      try {
        await ensureProformaPaymentType(sale, proformaPaymentType(true, sale));
        await posActions.saveInfo(sale.id, infoChanges());
      } catch (error) {
        toast.error(getErrorMessage(error, "آماده‌سازیِ پیش‌فاکتور انجام نشد"));
        throw error;
      }
    },
    record: (_result, { transferRef }) => {
      const plan = toApiCreatePlan({ ...planDraft, paymentType: PaymentTypeEnum.TRANSFER, transferRef, paidAt: "" });
      return deliverNow
        ? completeMutation.mutateAsync({ installmentPlan: plan })
        : installmentIssueMutation.mutateAsync({ plan });
    },
    onDone: () => afterSave(null),
    onLockChange: setPlanPosLocked,
    reference: () => newPosReference(`sale-${sale.id}`),
    doneLabel: "مشاهده‌ی فاکتور",
  };

  /** دریافت (یا قرارداد) روی پیش‌فاکتورِ «آماده‌ی پرداخت» — فاکتور را صادر می‌کند. */
  const submitPayment = async () => {
    // شیوه‌ی پرداختِ انتخاب‌شده، پیش از هر دریافتی (سرور قرارداد/دریافت را با آن می‌سنجد).
    setSwitchingType(true);
    try {
      await ensureProformaPaymentType(sale, proformaPaymentType(isInstallment, sale));
    } catch (error) {
      toast.error(getErrorMessage(error, "ثبتِ شیوه‌ی پرداخت انجام نشد"));
      return;
    } finally {
      setSwitchingType(false);
    }
    const { update, attachments: attachmentFiles } = infoChanges();
    if (deliverNow) {
      // تحویلِ همان‌جا (اتمیک)؛ تغییرهای بی‌اثر پیش از آن. سررسید برای فروشِ تمام‌پرداخت معنایی ندارد.
      try {
        await posActions.saveInfo(sale.id, { update, attachments: attachmentFiles });
      } catch {
        return;
      }
      completeMutation.mutate(
        isInstallment
          ? { installmentPlan: toApiCreatePlan(planDraft) }
          : { paymentRows: payments.rows.filter((row) => row.pending === "add") },
        { onSuccess: () => afterSave(null) },
      );
      return;
    }
    // سررسید روی پیش‌فاکتور تأییدها را برمی‌گرداند؛ بعد از صدور روی فاکتور ذخیره می‌شود.
    const paymentDate = dueDateChanged ? formData.paymentDate || null : undefined;
    if (isInstallment) {
      installmentIssueMutation.mutate(
        { update, attachments: attachmentFiles, plan: toApiCreatePlan(planDraft), paymentDate },
        { onSuccess: () => afterSave(null) },
      );
      return;
    }
    saver.mutate(
      { update, attachments: attachmentFiles, paymentDraft: payments, paymentDate },
      { onSuccess: afterSave },
    );
  };

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

  const onSubmit = (e) => {
    e.preventDefault();
    if (posLocked || isBusy) return;
    if (action === ProformaAction.SEND_TO_WAREHOUSE) {
      approveMutation.mutate({ saleId: sale.id, revision: sale.revision });
      return;
    }
    if (action === ProformaAction.AWAIT_WAREHOUSE) {
      navigate(routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, sale.id));
      return;
    }
    if (action === ProformaAction.EXPIRED) return;

    const problem = saleFormProblem({ ...problemBase, isInvoice });
    if (problem) {
      setShowErrors(true);
      return reportFormProblem(problem);
    }
    if (attachments.isUploading) return toast.error(UPLOADING_MESSAGE);

    if (action === ProformaAction.CREATE || action === ProformaAction.RESERVE_IN_PERSON) {
      createMutation.mutate(
        { payload: buildPayload(), send: allows("SaleUpdate"), scannedBarcodes },
        {
          onSuccess: (created) => openSaved(created.id),
          onError: (error) => error?.partiallySaved && openSaved(error.saleId),
        },
      );
      return;
    }
    if (isPay) submitPayment();
    else submitSave();
  };

  const leave = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const ACTION_BUTTONS = {
    [ProformaAction.CREATE]: {
      label: allows("SaleUpdate") ? "مشتری تأیید کرد؛ ثبت و ارسال به انبار" : "ثبت پیش‌فاکتور",
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
    [ProformaAction.PAY]: {
      label: deliverNow
        ? "دریافت و تحویل"
        : isInstallment
          ? "صدور فاکتور اقساطی"
          : "دریافت و صدور فاکتور",
      allowed: allows(isInstallment ? "SaleInstallmentManage" : "SalePayment"),
    },
    [ProformaAction.EXPIRED]: { label: "مهلت رزرو تمام شد", allowed: true, disabled: true },
  };
  const primary = ACTION_BUTTONS[action];

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
        payments={
          <>
            {/* شیوه‌ی پرداخت فقط هنگامِ دریافت انتخاب می‌شود (پیش از آن تأییدها را برمی‌گرداند). */}
            {isInvoice && (isInstallment || allows("SaleInstallmentManage")) && (
              <SectionCard title="شیوه‌ی پرداخت">
                <StatusChoice
                  label="شیوه‌ی پرداخت"
                  options={PAYMENT_TERMS_OPTIONS}
                  value={isInstallment}
                  onChange={setInstallment}
                  // قراردادِ موجود و دریافتِ کارتخوانِ در جریان شیوه را قفل می‌کنند.
                  disabled={Boolean(existingPlan) || posLocked || isBusy}
                />
              </SectionCard>
            )}
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
                    posPayment={isPay && allows("PosCharge") ? downPaymentPos : undefined}
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
                    inPersonReady
                      ? "کالا جلوی مشتری است: با دریافتِ کلِ مبلغ همین‌جا تحویل می‌شود؛ با دریافتِ کمتر فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند."
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
                // تاریخِ فاکتور را سرور با صدور می‌گذارد؛ سررسید جزوِ شرایطِ پیش‌فاکتور است.
                showInvoiceDate={false}
                showDueDate
                formData={formData}
                onFormChange={setFormData}
              >
              </OrderInfoCard>
            </FormSection>
            <InvoiceDocumentSection
              title={isInvoice ? "فاکتور" : "پیش‌فاکتور"}
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
              title={isInvoice ? "فاکتور فروش" : "پیش‌فاکتور فروش"}
              itemCount={items.length}
              totals={totals}
              canSubmit={primary.allowed}
              submitLabel={primary.label}
              submitDisabled={Boolean(primary.disabled)}
              isBusy={isBusy}
              onCancel={leave}
              footer={
                !isNew && (
                  <>
                    {stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && allows("SaleUpdate") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setConfirmRelease(true)}
                        disabled={isBusy}
                      >
                        <PackageOpen className="size-3.5" />
                        آزاد کردن رزرو
                      </Button>
                    )}
                    {allows("SaleDelete") && (
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
                    )}
                  </>
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

      {!isNew && (
        <ConfirmDialog
          open={confirmRelease}
          onOpenChange={setConfirmRelease}
          title="آزاد کردن رزرو"
          description="دانه‌های رزروشده به موجودیِ قابلِ فروش برمی‌گردند و پیش‌فاکتور با همان اقلام به پیش‌نویس برمی‌گردد. برای فروش دوباره باید رزرو یا بررسیِ انبار شود."
          confirmLabel="آزاد کن"
          pendingLabel="در حال آزادسازی..."
          destructive={false}
          isPending={releaseMutation.isPending}
          onConfirm={() => releaseMutation.mutate(sale, { onSuccess: () => setConfirmRelease(false) })}
        />
      )}

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
