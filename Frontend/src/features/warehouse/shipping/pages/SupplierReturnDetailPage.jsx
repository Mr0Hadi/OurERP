import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import {
  usePurchaseReturnQuery,
  usePurchaseForReturnQuery,
} from "@/features/purchases/returns/services/queries";
import { useExecuteGoodsRoundMutation } from "@/features/purchases/returns/services/mutations";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { CLAIM_SCOPES } from "@/shared/domain/returns/scopes";
import { claimQuarantinedQuantity } from "@/shared/domain/returns/receivingReport";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import GoodsRoundPartySection from "@/shared/components/returns/GoodsRoundPartySection";
import GoodsRoundSummaryCard from "@/shared/components/returns/GoodsRoundSummaryCard";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { trackedLookup, withProductInfo } from "../../shared/productInfo";
import WarehouseSubmitBar from "../../shared/WarehouseSubmitBar";
import NothingPending from "../../shared/NothingPending";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

const { GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP } = EFFECT_DIRECTIONS;
const WAREHOUSE_DIRECTIONS = [GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP];

const SECTIONS = [
  {
    direction: GOODS_OUT,
    title: "عودت کالا به تامین‌کننده",
    subtitle: "کالا از همان جایی برداشته می‌شود که در تصمیمِ مرجوعی آمده است.",
  },
  {
    direction: GOODS_RELEASE,
    title: "آزادسازی از قرنطینه",
    subtitle: "این کالاها به موجودی قابل‌فروش برمی‌گردند.",
  },
  {
    direction: GOODS_SCRAP,
    title: "اسقاط",
    subtitle: "این کالاها از چرخه خارج و به‌عنوان زیان ثبت می‌شوند.",
  },
];

// از ۲۰۲۶-۰۹-۲۷ مبدأ روی خودِ تصمیم ثبت می‌شود (`effects[].source`) و انبار
// فقط اجرا می‌کند؛ فرستادنِ مقدارِ دیگر ۴۰۰ است. فقط عودتِ قدیمیِ بی‌منبع
// هنوز از انباردار پرسیده می‌شود، با همان پیشنهادِ قبلی: کالای خارج از
// سفارش هرگز وارد موجودی نشده، پس قرنطینه؛ سهمِ سفارش اگر همین مقدار در
// قرنطینه است، قرنطینه، وگرنه انتخاب با انباردار. آزادسازی مبدأ ندارد.
const sourceRequired = (line) =>
  line.source == null && (line.direction === GOODS_OUT || line.direction === GOODS_SCRAP);
const suggestSource = (line, receivingInfo) => {
  if (line.source != null) return line.source;
  if (line.direction === GOODS_SCRAP) return ProductUnitStatusEnum.QUARANTINED;
  if (line.direction !== GOODS_OUT) return null;
  if (line.scope === CLAIM_SCOPES.OFF_ORDER) return ProductUnitStatusEnum.QUARANTINED;
  const quarantined = claimQuarantinedQuantity(receivingInfo, line) ?? 0;
  return quarantined >= line.remainingQuantity ? ProductUnitStatusEnum.QUARANTINED : null;
};

/**
 * کارِ انبار روی یک مرجوعیِ خرید: عودت به تامین‌کننده، و تعیین تکلیفِ
 * کالای قرنطینه (آزادسازی / اسقاط) — همه یک دورِ `ExecuteGoodsRound`.
 *
 * `observations` اینجا فرستاده نمی‌شود — کالا از انبارِ خودمان می‌رود.
 * اسکنِ دانه‌ها فقط در عودتِ کالای ردیابی‌پذیر از موجودیِ قفسه الزامی و بقیه‌جا اختیاری است.
 */
function SupplierReturnShipmentForm({ purchaseReturn }) {
  const navigate = useNavigate();
  const goodsRoundMutation = useExecuteGoodsRoundMutation(purchaseReturn.id);
  const backToReturn = () =>
    navigate(routeWithId(ROUTES.PURCHASES_RETURNS_DETAIL, purchaseReturn.id));

  const lines = useMemo(
    () =>
      buildGoodsLines(purchaseReturn, WAREHOUSE_DIRECTIONS).filter(
        (line) => line.remainingQuantity > 0,
      ),
    [purchaseReturn],
  );

  const { productMap, isLoading: productsLoading } = useDocumentProducts(
    lines.map((line) => line.productId),
  );
  const isTracked = useMemo(() => trackedLookup(productMap), [productMap]);

  const { data: receivingInfo } = usePurchaseForReturnQuery(purchaseReturn.purchaseId);
  const defaultSource = useCallback(
    (line) => suggestSource(line, receivingInfo),
    [receivingInfo],
  );

  // اسکن فقط وقتی الزامی است که کالای ردیابی‌پذیر از *قفسه* برمی‌گردد: باید
  // معلوم شود دقیقاً کدام دانه‌ی برچسب‌خورده رفت. دانه‌ی قرنطینه هنگامِ
  // دریافت کنار گذاشته شده و ممکن است هنوز برچسب نخورده باشد؛ سرور آن را
  // از روی قرنطینه‌ی همان قلم برمی‌دارد، پس اسکنش اختیاری است.
  const barcodesRequired = useCallback(
    (line, source) =>
      line.direction === GOODS_OUT &&
      source === ProductUnitStatusEnum.IN_STOCK &&
      isTracked(line.productId),
    [isTracked],
  );

  const {
    header,
    setHeader,
    rounds,
    handleQuantityChange,
    handleSourceChange,
    handleBarcodesChange,
    isAllComplete,
    hasSomethingToRecord,
    blockingReason,
    buildCommand,
  } = useGoodsRoundForm(lines, { sourceRequired, defaultSource, barcodesRequired });

  const displayRounds = useMemo(() => withProductInfo(rounds, productMap), [rounds, productMap]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isBusy = goodsRoundMutation.isPending;

  const handleSubmit = () => {
    const willStayPending = !isAllComplete;
    goodsRoundMutation.mutate(buildCommand(), {
      onSuccess: () => {
        setShowConfirmDialog(false);
        if (willStayPending) {
          toast.success(
            "این دور ثبت شد. باقیمانده را هر وقت انجام شد، دوباره از همین صفحه ثبت کنید.",
          );
        }
        backToReturn();
      },
    });
  };

  if (rounds.length === 0) {
    return (
      <NothingPending message="برای این مرجوعی کاری در انبار باقی نمانده است." onBack={backToReturn} />
    );
  }

  const hasDispatch = rounds.some((round) => round.direction === GOODS_OUT);

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {SECTIONS.map(({ direction, title, subtitle }) => {
            const sectionRounds = displayRounds.filter(
              (round) => round.direction === direction,
            );
            if (sectionRounds.length === 0) return null;
            return (
              <GoodsRoundItemsSection
                key={direction}
                rounds={sectionRounds}
                title={title}
                subtitle={`${subtitle} · مرجوعی ${purchaseReturn.returnNumber}`}
                withBarcodes
                onQuantityChange={handleQuantityChange}
                onSourceChange={handleSourceChange}
                onBarcodesChange={handleBarcodesChange}
              />
            );
          })}

          {hasDispatch && (
            <GoodsRoundPartySection
              title="راننده‌ی تامین‌کننده (تحویل‌گیرنده‌ی کالای مرجوعی)"
              nameLabel="نام و نام خانوادگی (اختیاری)"
              namePlaceholder="مثلاً: علی رضایی"
              header={header}
              onHeaderChange={setHeader}
              plateHint="اگر کالا با پیک یا حضوری تحویل داده می‌شود و پلاکی در کار نیست، این بخش را خالی بگذارید."
            />
          )}
        </div>

        <div className="space-y-4">
          <GoodsRoundSummaryCard
            side={PURCHASE_SIDE}
            returnDoc={purchaseReturn}
            partyName={purchaseReturn.supplierName}
            rounds={rounds}
            header={header}
            onHeaderChange={setHeader}
            title="اطلاعات این دور"
            progressLabel="مقدارِ این دور از باقیمانده"
            dateLabel="تاریخ"
            noteLabel="یادداشت"
          />

          <WarehouseSubmitBar
            label={isAllComplete ? "تأیید انجام کامل" : "ثبت این دور"}
            complete={isAllComplete}
            canSubmit={hasSomethingToRecord && !productsLoading}
            blockingReason={blockingReason}
            isBusy={isBusy}
            onSubmit={() => setShowConfirmDialog(true)}
            onCancel={backToReturn}
            hint="باقیمانده برای دور بعدی نگه داشته می‌شود و دوباره در همین صفحه ظاهر می‌شود."
          />
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={isAllComplete ? "ثبت انجام کامل" : "ثبت این دور"}
        description={
          isAllComplete
            ? "همه‌ی ردیف‌ها کامل انجام شده‌اند؟ موجودی و قرنطینه همین حالا به‌روز می‌شوند."
            : "فقط مقادیری که وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند."
        }
        destructive={false}
        pendingLabel="در حال ثبت..."
        isPending={isBusy}
        onConfirm={handleSubmit}
      />
    </div>
  );
}

export default function SupplierReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: purchaseReturn,
    isLoading,
    isError,
    error,
    refetch,
  } = usePurchaseReturnQuery(Number(id));

  usePageHeader({
    title: isLoading ? "در حال بارگذاری..." : "کار انبار روی مرجوعی خرید",
    showBack: true,
  });

  if (isLoading) return <WarehouseFormSkeleton />;

  if (isError || !purchaseReturn) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="مرجوعی مورد نظر یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}
      />
    );
  }

  return (
    <SupplierReturnShipmentForm
      key={purchaseReturn.id}
      purchaseReturn={purchaseReturn}
    />
  );
}
