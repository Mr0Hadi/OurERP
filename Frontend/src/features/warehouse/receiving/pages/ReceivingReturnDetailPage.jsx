import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X, Undo2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { useSalesReturnQuery } from "@/features/sales/returns/services/queries";
import { useExecuteGoodsRoundMutation } from "@/features/sales/returns/services/mutations";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import GoodsRoundPartySection from "@/shared/components/returns/GoodsRoundPartySection";
import GoodsRoundSummaryCard from "@/shared/components/returns/GoodsRoundSummaryCard";

import ReturnDetailLoading from "../components/forms/ReturnDetailLoading";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

const SALES_SIDE = sideConfig(RETURN_SIDES.SALES);

/**
 * فقط دانه‌های خودِ مشتری روی قلمِ فروش اسکن می‌شوند (ادعای روی فاکتور یا
 * مازادِ همان قلم، و همان کالا)؛ کالای دیگر دانه‌ی تازه می‌سازد و بارکدی
 * برای اسکن ندارد — همان قاعده‌ی `SaleReturn/ExecuteGoodsRound`. بی اسکن،
 * سرور قدیمی‌ترین دانه‌های فروخته‌شده‌ی همان قلم را برمی‌گرداند؛ برای کالای
 * ردیابی‌پذیر یعنی سریالِ دانه‌ای که واقعاً برگشته ثبت نمی‌شد.
 */
const restoresLineUnits = (line) =>
  line.productId === line.claimProductId &&
  line.orderLineId != null &&
  (line.scope === CLAIM_SCOPES.ON_ORDER || line.offScopeKind === OFF_SCOPE_KINDS.EXCESS);

/**
 * تحویل‌گرفتنِ کالای برگشتی از مشتری.
 *
 * برخلافِ دریافتِ خرید، این عملیات روی سندِ خرید نمی‌نشیند: یک دورِ
 * اجرای اثرهای `GOODS_IN` روی خودِ مرجوعیِ فروش است
 * (`POST api/SaleReturn/ExecuteGoodsRound`). به همین دلیل هر ردیفِ فرم
 * یک *اثر* است نه یک کالا، و انباردار می‌تواند مشاهده‌ی خودش را هم ثبت
 * کند: مقدارِ سالم را بکند از تفاضلِ همین‌ها حساب و به موجودی برمی‌گرداند.
 */
function ReceivingReturnDetailForm({ salesReturn }) {
  const navigate = useNavigate();
  const goodsRoundMutation = useExecuteGoodsRoundMutation(salesReturn.id);

  const lines = useMemo(
    () =>
      buildGoodsLines(salesReturn, EFFECT_DIRECTIONS.GOODS_IN).filter(
        (line) => line.remainingQuantity > 0,
      ),
    [salesReturn],
  );

  const {
    header,
    setHeader,
    rounds,
    handleQuantityChange,
    handleBarcodesChange,
    handleToggleObservationBarcode,
    handleAddObservation,
    handleUpdateObservation,
    handleRemoveObservation,
    isAllComplete,
    hasSomethingToRecord,
    blockingReason,
    buildCommand,
  } = useGoodsRoundForm(lines, {
    withObservations: true,
    barcodesAllowed: restoresLineUnits,
  });

  const { products: productOptions } = useProductsOptionsQuery();

  const productMap = useMemo(() => {
    const map = new Map();
    productOptions.forEach((p) => map.set(p.id, p));
    return map;
  }, [productOptions]);

  const displayRounds = useMemo(
    () =>
      rounds.map((round) => {
        const product = productMap.get(round.productId);
        return {
          ...round,
          // کلیدِ پایدار هم کنارِ URLِ امضاشده می‌آید تا اگر صفحه دیر باز
          // بماند، بندانگشتی بتواند خودش امضا را تازه کند.
          imageKey: product?.imageKey ?? null,
          imageUrl: product?.imageUrl ?? product?.image ?? null,
        };
      }),
    [rounds, productMap],
  );

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isBusy = goodsRoundMutation.isPending;

  const handleSubmit = () => {
    const willStayPending = !isAllComplete;
    goodsRoundMutation.mutate(buildCommand(), {
      onSuccess: () => {
        setShowConfirmDialog(false);
        if (willStayPending) {
          toast.success(
            "این دور ثبت شد. باقیمانده هر وقت رسید، دوباره از همین صفحه ثبت کنید.",
          );
        }
        navigate(routeWithId(ROUTES.SALES_RETURNS_DETAIL, salesReturn.id));
      },
    });
  };

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-success" />
        <p className="text-lg text-muted-foreground">
          برای این مرجوعی کالایی در انتظار تحویل نیست.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(routeWithId(ROUTES.SALES_RETURNS_DETAIL, salesReturn.id))}
        >
          بازگشت به مرجوعی
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <GoodsRoundItemsSection
            rounds={displayRounds}
            title="اقلام برگشتی از مشتری"
            subtitle="کالایی که طبق تصمیمِ مرجوعی باید از مشتری تحویل گرفته شود."
            withObservations
            withBarcodes
            onQuantityChange={handleQuantityChange}
            onBarcodesChange={handleBarcodesChange}
            onToggleObservationBarcode={handleToggleObservationBarcode}
            onAddObservation={handleAddObservation}
            onUpdateObservation={handleUpdateObservation}
            onRemoveObservation={handleRemoveObservation}
          />

          <GoodsRoundPartySection
            title="اطلاعات تحویل‌دهنده"
            headerBadge={
              <Badge
                variant="secondary"
                className="gap-1.5 text-primary bg-primary/10"
              >
                <Undo2 className="h-3.5 w-3.5" />
                نوع دریافت: مرجوعی فروش
              </Badge>
            }
            nameLabel="نام و نام خانوادگی تحویل‌دهنده"
            namePlaceholder="مثلاً: علی رضایی (پیک) یا خودِ مشتری"
            header={header}
            onHeaderChange={setHeader}
            plateHint="اگر کالا حضوری یا بدون خودرو تحویل داده شده، این بخش را خالی بگذارید."
          />
        </div>

        <div className="space-y-4">
          <GoodsRoundSummaryCard
            side={SALES_SIDE}
            returnDoc={salesReturn}
            partyName={salesReturn.customerName}
            rounds={rounds}
            header={header}
            onHeaderChange={setHeader}
            title="اطلاعات دریافت مرجوعی"
            progressLabel="مقدارِ این دور از باقیمانده"
            dateLabel="تاریخ دریافت"
            noteLabel="یادداشت دریافت"
          />

          {blockingReason && hasSomethingToRecord && (
            <p className="text-xs text-destructive px-1">{blockingReason}</p>
          )}

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete ? "bg-warning hover:bg-warning text-white" : ""
              }`}
              disabled={isBusy || !hasSomethingToRecord || Boolean(blockingReason)}
              onClick={() => setShowConfirmDialog(true)}
            >
              {isAllComplete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isAllComplete
                ? "تأیید دریافت کامل"
                : "ثبت این دور (باقیمانده هنوز نرسیده)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(routeWithId(ROUTES.SALES_RETURNS_DETAIL, salesReturn.id))}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            این صفحه چند بار قابل استفاده است — هر بار که بخشی از مرجوعی رسید،
            همین‌جا ثبتش کنید.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={isAllComplete ? "ثبت دریافت کامل مرجوعی" : "ثبت این دور از دریافت"}
        description={`${
          isAllComplete
            ? "همه‌ی اقلام باقی‌مانده در این دور رسیده‌اند؟"
            : "بخشی که در این دور وارد نکرده‌اید، برای دور بعدی نگه داشته می‌شود."
        } هر مقداری که به‌عنوان معیوب ثبت کرده‌اید به قرنطینه می‌رود؛ باقیِ کالا به موجودی قابل‌فروش برمی‌گردد.`}
        destructive={false}
        pendingLabel="در حال ثبت..."
        isPending={isBusy}
        onConfirm={handleSubmit}
      />
    </div>
  );
}

export default function ReceivingReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: salesReturn,
    isLoading,
    isError,
  } = useSalesReturnQuery(Number(id));

  usePageHeader({
    title: isLoading
      ? "در حال بارگذاری..."
      : salesReturn
        ? "دریافت کالای مرجوعی"
        : "خطا",
    showBack: true,
  });

  if (isLoading) return <ReturnDetailLoading />;

  if (isError || !salesReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.SALES_RETURNS_LIST)}
        >
          بازگشت به مرجوعی
        </Button>
      </div>
    );
  }

  return (
    <ReceivingReturnDetailForm
      key={salesReturn.id}
      salesReturn={salesReturn}
    />
  );
}
