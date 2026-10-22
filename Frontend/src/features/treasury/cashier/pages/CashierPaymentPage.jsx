import {
  BookOpenText,
  CalendarClock,
  ExternalLink,
  Package,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCustomerQuery } from "@/features/customers/services/queries";
import PartyStatementCard from "@/features/partyAccount/components/PartyStatementCard";
import {
  openingBalanceOf,
  partyBalanceOf,
} from "@/features/partyAccount/domain/partyBalance";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { formatNumber } from "@/shared/lib/numberFormat";
import CustomerInstallmentsCard from "@/features/sales/installments/components/CustomerInstallmentsCard";
import InstallmentPlanDraftCard from "@/features/sales/installments/components/InstallmentPlanDraftCard";
import ProformaPlanNotice from "@/features/sales/installments/components/ProformaPlanNotice";
import {
  EMPTY_PLAN_DRAFT,
  addMonthsIso,
  planDraftErrors,
  previewInstallmentPlan,
  toApiCreatePlan,
} from "@/features/sales/installments/domain/installmentPlan";
import {
  isInPersonProforma,
  proformaPaymentType,
} from "@/features/sales/orders/domain/proformaFlow";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { useReservationCountdown } from "@/features/sales/orders/hooks/useReservationCountdown";
import {
  ensureProformaPaymentType,
  useCompleteInPersonMutation,
  useIssueInstallmentSaleMutation,
  useSaleChangesSaver,
  useSalePosActions,
} from "@/features/sales/orders/services/mutations";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import DocumentFormLayout, {
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import { savedInvoiceTotals } from "@/shared/domain/invoice/lineMath";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import UnsavedChangesDialog from "@/features/permissions/components/UnsavedChangesDialog";
import { todayIso } from "@/shared/lib/dateUtils";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import CashierCustomerCard from "../components/CashierCustomerCard";
import ReservationTimer from "../components/ReservationTimer";

/** «شیوه‌ی پرداخت» هنگامِ دریافت: یکجا (نقد/نسیه) یا اقساطی (قرارداد با پیش‌پرداخت). */
const PAYMENT_TERMS_OPTIONS = [
  { value: false, label: "نقد / نسیه" },
  {
    value: true,
    label: "اقساطی",
    hint: "پیش‌پرداخت و قرارداد اقساط همین‌جا ثبت و فاکتور صادر می‌شود.",
  },
];

/**
 * دریافتِ یک پیش‌فاکتورِ «آماده‌ی پرداخت» در صندوق. چیدمان: ستونِ پهن شیوه‌ی پرداخت و دریافت (کارِ اصلیِ
 * صندوقدار، اول)؛ ستونِ کناری خلاصه‌ی مشتری (مانده، سقف و اعتبارِ مانده) و جمع و دکمه‌ی اصلی؛ زیرِ هر دو و
 * تمام‌عرض تب‌های اقلام، گردشِ حساب و اقساطِ مشتری. صندوقدار شیوه‌ی پرداخت را همین‌جا انتخاب می‌کند (`ensureProformaPaymentType` پیش از
 * دریافت ثبتش می‌کند):
 *  - نقد/نسیه: دریافت‌ها؛ اولین دریافت فاکتور را صادر می‌کند. کارتخوان همان لحظه ثبت می‌شود.
 *  - اقساطی: قرارداد با پیش‌پرداخت، که فاکتور را صادر می‌کند.
 * فروشِ حضوری با پرداختِ کامل (یا قرارداد) همان‌جا تحویل می‌شود (`CompleteInPersonSale`).
 */
function CashierPaymentForm({ sale }) {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const payments = usePaymentDraft(
    sale.paymentDetails || [],
    SALE_PAYMENT_SIDE.direction,
  );
  const saver = useSaleChangesSaver(sale.id);
  const completeMutation = useCompleteInPersonMutation(sale.id);
  const issueMutation = useIssueInstallmentSaleMutation(sale.id);
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  const [switchingType, setSwitchingType] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState(false);
  // `null` ⇒ همان شیوه‌ی ذخیره‌شده.
  const [installmentChoice, setInstallmentChoice] = useState(null);
  const [planDraft, setPlanDraft] = useState(() => ({
    ...EMPTY_PLAN_DRAFT,
    firstDueDate: addMonthsIso(todayIso(), 1),
  }));
  const secondsLeft = useReservationCountdown(sale);
  // مانده‌ی اولیه‌ی دستیِ مشتری برای گردشِ حساب (همان کشِ کارتِ مشتری).
  const { data: customer } = useCustomerQuery(
    allows("CustomerView") ? sale.customerId : null,
  );
  const canSeeStatement = allows("PartyStatementView");

  const expired = secondsLeft === 0;
  const isInstallment =
    installmentChoice ?? sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  // قراردادِ بی‌پیش‌پرداختی که از قبل روی پیش‌فاکتور است: شیوه قفل است تا ابطالش (صفحه‌ی فروش).
  const existingPlan =
    sale.installmentSummary?.status === SaleInstallmentPlanStatusEnum.ACTIVE
      ? sale.installmentSummary
      : null;
  const canChooseTerms =
    !existingPlan && (isInstallment || allows("SaleInstallmentManage"));
  const inPerson = isInPersonProforma(sale);
  const total = Number(sale.totalAmount) || 0;
  const planPreview = isInstallment
    ? previewInstallmentPlan(total, planDraft)
    : null;
  const planErrors = isInstallment
    ? planDraftErrors(planDraft, {
        payable: planPreview?.totalAmount,
        withDownPayment: true,
      })
    : {};
  const busy =
    saver.isPending ||
    completeMutation.isPending ||
    issueMutation.isPending ||
    posLocked ||
    switchingType;
  // فروشِ حضوری (کالا جلوی مشتری) با دریافتِ کلِ مبلغ یا قرارداد همین‌جا تحویل می‌شود.
  const deliverNow = inPerson && (isInstallment || payments.netPaid === total);
  const canSubmit =
    !expired &&
    (isInstallment
      ? !existingPlan && allows("SaleInstallmentManage")
      : allows("SalePayment") && payments.hasChanges);

  const blocker = useUnsavedChangesGuard(payments.hasChanges && !done, {
    reason: "دریافتِ صندوق ثبت نشده است",
  });

  const finish = () => {
    setDone(true);
    navigate(ROUTES.TREASURY_CASHIER, { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    if (isInstallment && Object.keys(planErrors).length > 0)
      return setShowErrors(true);
    setSwitchingType(true);
    try {
      await ensureProformaPaymentType(
        sale,
        proformaPaymentType(isInstallment, sale),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "ثبتِ شیوه‌ی پرداخت انجام نشد"));
      return;
    } finally {
      setSwitchingType(false);
    }
    if (isInstallment) {
      try {
        await registerPlan(planDraft);
        finish();
      } catch {
        // پیامِ خطا را خودِ mutation داده است.
      }
      return;
    }
    if (deliverNow) {
      completeMutation.mutate(
        { paymentRows: payments.rows.filter((row) => row.pending === "add") },
        { onSuccess: finish },
      );
      return;
    }
    saver.mutate({ paymentDraft: payments }, { onSuccess: finish });
  };

  /** ثبتِ قرارداد (و تحویلِ حضوری) با پیش‌پرداختِ این پیش‌نویس — دستی یا پس از کارتخوان. */
  const registerPlan = (draft) => {
    const plan = toApiCreatePlan(draft);
    return inPerson
      ? completeMutation.mutateAsync({ installmentPlan: plan })
      : issueMutation.mutateAsync({ plan });
  };

  // کارت‌کشیدنِ پیش‌پرداخت: پیش از کارت قرارداد سنجیده و شیوه‌ی «اقساطی» ثبت می‌شود؛ با تأییدِ دستگاه
  // قرارداد با پیش‌پرداختِ «انتقال بانکی» و شماره‌ی پیگیریِ دستگاه ثبت می‌شود.
  const downPaymentPos = {
    prepare: async () => {
      if (Object.keys(planErrors).length > 0) {
        setShowErrors(true);
        throw new Error("plan");
      }
      try {
        await ensureProformaPaymentType(sale, proformaPaymentType(true, sale));
      } catch (error) {
        toast.error(getErrorMessage(error, "ثبتِ شیوه‌ی پرداخت انجام نشد"));
        throw error;
      }
    },
    record: (_result, { transferRef }) =>
      registerPlan({
        ...planDraft,
        paymentType: PaymentTypeEnum.TRANSFER,
        transferRef,
        paidAt: "",
      }),
    onDone: finish,
    onLockChange: setPosLocked,
    reference: () => newPosReference(`sale-${sale.id}`),
    doneLabel: "بازگشت به صندوق",
  };

  const submitLabel = isInstallment
    ? deliverNow
      ? "ثبت قرارداد و تحویل"
      : "ثبت قرارداد و صدور فاکتور"
    : deliverNow
      ? "دریافت و تحویل"
      : "ثبت دریافت و صدور فاکتور";

  return (
    <>
      <DocumentFormLayout
        onSubmit={submit}
        payments={
          expired ? (
            <Notice tone="danger">
              مهلتِ رزرو تمام شده و پرداخت پذیرفته نمی‌شود؛ پیش‌فاکتور باید
              دوباره رزرو یا از انبار بگذرد.
            </Notice>
          ) : (
            <>
              {canChooseTerms && (
                <SectionCard title="شیوه‌ی پرداخت">
                  <StatusChoice
                    label="شیوه‌ی پرداخت"
                    options={PAYMENT_TERMS_OPTIONS}
                    value={isInstallment}
                    onChange={(value) => {
                      setInstallmentChoice(value);
                      setShowErrors(false);
                    }}
                    disabled={busy}
                  />
                </SectionCard>
              )}
              <FormSection name="payment">
                {isInstallment ? (
                  existingPlan ? (
                    <ProformaPlanNotice plan={existingPlan} />
                  ) : (
                    <InstallmentPlanDraftCard
                      draft={planDraft}
                      onChange={(patch) =>
                        setPlanDraft((draft) => ({ ...draft, ...patch }))
                      }
                      preview={planPreview}
                      errors={showErrors ? planErrors : {}}
                      posPayment={
                        allows("PosCharge") ? downPaymentPos : undefined
                      }
                      blockedReason={
                        allows("SaleInstallmentManage")
                          ? null
                          : "ثبتِ قرارداد اقساط دسترسیِ «مدیریت قرارداد اقساطی» می‌خواهد."
                      }
                    />
                  )
                ) : (
                  <PaymentsCard
                    title="دریافت‌ها"
                    draft={payments}
                    side={SALE_PAYMENT_SIDE}
                    total={sale.totalAmount}
                    canManage={allows("SalePayment")}
                    allowRefund={false}
                    emptyText="هنوز دریافتی ثبت نشده است."
                    notice={
                      inPerson
                        ? "فروشِ حضوری: با دریافتِ کلِ مبلغ کالا همین‌جا تحویل می‌شود؛ با دریافتِ کمتر فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند."
                        : "با اولین دریافت فاکتور صادر می‌شود؛ مانده بدهیِ مشتری است."
                    }
                    posPayment={
                      allows("PosCharge")
                        ? {
                            // شیوه‌ی انتخاب‌شده پیش از کشیدنِ کارت ثبت می‌شود.
                            prepare: () =>
                              ensureProformaPaymentType(
                                sale,
                                proformaPaymentType(false, sale),
                              ),
                            record: (_result, context) =>
                              posActions.recordPayment(sale.id, context),
                            onRecorded: posActions.apply,
                            onDone: finish,
                            onLockChange: setPosLocked,
                            reference: () => newPosReference(`sale-${sale.id}`),
                            doneLabel: "بازگشت به صندوق",
                            blockedReason: payments.hasChanges
                              ? "دریافت‌های ثبت‌نشده را اول ثبت کنید؛ بعد با کارتخوان دریافت کنید."
                              : undefined,
                          }
                        : undefined
                    }
                  />
                )}
              </FormSection>
            </>
          )
        }
        aside={
          <>
            <CashierCustomerCard
              customerId={sale.customerId}
              customerName={sale.customerName}
              saleTotal={total}
              compact
            />
            <OrderSummaryCard
              title={`پیش‌فاکتور #${sale.id}`}
              badge={
                <div className="flex items-center gap-1.5">
                  {inPerson && <StatusBadge tone="info">حضوری</StatusBadge>}
                  <ReservationTimer
                    key={`${sale.id}:${sale.reservationSecondsLeft}`}
                    secondsLeft={secondsLeft}
                  />
                </div>
              }
              itemCount={sale.items.length}
              totals={savedInvoiceTotals(sale)}
              canSubmit={!expired}
              submitLabel={submitLabel}
              submitDisabled={!canSubmit}
              isBusy={busy}
              onCancel={() => navigate(ROUTES.TREASURY_CASHIER)}
              cancelLabel="بازگشت به صندوق"
              footer={
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5"
                >
                  <Link to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>
                    <ExternalLink className="size-3.5" />
                    صفحه‌ی کاملِ فروش
                  </Link>
                </Button>
              }
            />
          </>
        }
        below={
          <>
            {/* جزئیات تمام‌عرض و در تب: صفحه شلوغ نمی‌شود و گردش/اقساط فقط با بازشدنِ تب خوانده می‌شوند. */}
            <Tabs defaultValue="items" className="gap-3">
              <TabsList className="w-full sm:w-fit">
                <TabsTrigger
                  value="items"
                  className="flex-1 gap-1.5 sm:flex-none"
                >
                  <Package className="size-4" />
                  اقلام ({formatNumber(sale.items.length)})
                </TabsTrigger>
                {canSeeStatement && (
                  <TabsTrigger
                    value="statement"
                    className="flex-1 gap-1.5 sm:flex-none"
                  >
                    <BookOpenText className="size-4" />
                    گردش حساب
                  </TabsTrigger>
                )}
                {allows("SaleInstallmentView") && (
                  <TabsTrigger
                    value="installments"
                    className="flex-1 gap-1.5 sm:flex-none"
                  >
                    <CalendarClock className="size-4" />
                    اقساط
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="items">
                <OrderItemsReadOnly
                  title="اقلام پیش‌فاکتور"
                  items={sale.items}
                  totalAmount={sale.totalAmount}
                />
              </TabsContent>
              {canSeeStatement && (
                <TabsContent value="statement">
                  <PartyStatementCard
                    customerId={sale.customerId}
                    totalBalance={
                      customer ? partyBalanceOf(customer) : undefined
                    }
                    openingBalance={customer ? openingBalanceOf(customer) : 0}
                  />
                </TabsContent>
              )}
              {allows("SaleInstallmentView") && (
                <TabsContent value="installments">
                  <CustomerInstallmentsCard customerId={sale.customerId} />
                </TabsContent>
              )}
            </Tabs>
          </>
        }
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}

export default function CashierPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError, error, refetch } = useSaleQuery(id);

  usePageHeader({
    title: sale ? `صندوق — ${sale.customerName || ""}` : "صندوق",
    showBack: true,
  });

  if (isLoading) return <OrderFormSkeleton />;
  if (isError || !sale) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="پیش‌فاکتور یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.TREASURY_CASHIER)}
      />
    );
  }

  if (
    !isSaleProforma(sale.status) ||
    Number(sale.proformaStage) !== SaleProformaStageEnum.WAREHOUSE_CHECKED
  ) {
    return (
      <div className="container mx-auto max-w-2xl space-y-3">
        <Notice tone="info">
          {isSaleProforma(sale.status)
            ? "این پیش‌فاکتور دیگر آماده‌ی پرداخت نیست (ویرایش شده یا رزروش آزاد شده)."
            : `فاکتور ${sale.invoiceNumber || ""} صادر شده است.`}
        </Notice>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={ROUTES.TREASURY_CASHIER}>بازگشت به صندوق</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>
              دیدنِ فروش
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // نسخه‌ی تازه (ویرایشِ هم‌زمانِ فروش) فرم را از نو می‌سازد.
  return <CashierPaymentForm key={`${sale.id}:${sale.revision}`} sale={sale} />;
}
