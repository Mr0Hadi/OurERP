import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnQuery } from "@/features/purchases/returns/services/queries";
import { useExecuteGoodsRoundMutation } from "@/features/purchases/returns/services/mutations";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { CLAIM_SCOPES } from "@/shared/domain/returns/scopes";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import GoodsRoundPartySection from "@/shared/components/returns/GoodsRoundPartySection";
import GoodsRoundSummaryCard from "@/shared/components/returns/GoodsRoundSummaryCard";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

const { GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP } = EFFECT_DIRECTIONS;
const WAREHOUSE_DIRECTIONS = [GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP];

const SECTIONS = [
  {
    direction: GOODS_OUT,
    title: "عودت کالا به تامین‌کننده",
    subtitle: "مبدأ هر ردیف را مشخص کنید: موجودی قابل‌فروش یا قرنطینه.",
  },
  {
    direction: GOODS_RELEASE,
    title: "آزادسازی از قرنطینه",
    subtitle: "این کالاها به موجودی قابل‌فروش برمی‌گردند.",
  },
  {
    direction: GOODS_SCRAP,
    title: "اسقاط از قرنطینه",
    subtitle: "این کالاها از چرخه خارج و به‌عنوان زیان ثبت می‌شوند.",
  },
];

// عودت روی مرجوعی خرید مبدأ می‌خواهد و سرور حدسش نمی‌زند. کالای خارج از
// سفارش هرگز وارد موجودی نشده، پس پیشنهادِ طبیعی‌اش قرنطینه است؛ برای
// کالای سهمِ سفارش هر دو ممکن است و انتخاب با انباردار می‌ماند.
const sourceRequired = (line) => line.direction === GOODS_OUT;
const defaultSource = (line) =>
  line.direction === GOODS_OUT && line.scope === CLAIM_SCOPES.OFF_ORDER
    ? ProductUnitStatusEnum.QUARANTINED
    : null;

/**
 * کارِ انبار روی یک مرجوعیِ خرید: عودت به تامین‌کننده، و تعیین تکلیفِ
 * کالای قرنطینه (آزادسازی / اسقاط) — همه یک دورِ `ExecuteGoodsRound`.
 *
 * `observations` اینجا فرستاده نمی‌شود — کالا از انبارِ خودمان می‌رود.
 * اسکنِ دانه‌ها برای کالای ردیابی‌پذیر در عودت الزامی و بقیه‌جا اختیاری است.
 */
function SupplierReturnShipmentForm({ purchaseReturn }) {
  const navigate = useNavigate();
  const goodsRoundMutation = useExecuteGoodsRoundMutation(purchaseReturn.id);
  const backToReturn = () =>
    navigate(ROUTES.PURCHASES_RETURNS_DETAIL.replace(":id", purchaseReturn.id));

  const lines = useMemo(
    () =>
      buildGoodsLines(purchaseReturn, WAREHOUSE_DIRECTIONS).filter(
        (line) => line.remainingQuantity > 0,
      ),
    [purchaseReturn],
  );

  const { data: productsData } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const productMap = useMemo(() => {
    const map = new Map();
    (productsData?.items || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [productsData]);

  const barcodesRequired = useCallback(
    (line) =>
      line.direction === GOODS_OUT &&
      Boolean(productMap.get(line.productId)?.requiresUnitTracking),
    [productMap],
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

  const displayRounds = useMemo(
    () =>
      rounds.map((round) => {
        const product = productMap.get(round.productId);
        return {
          ...round,
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
            "این دور ثبت شد. باقیمانده را هر وقت انجام شد، دوباره از همین صفحه ثبت کنید.",
          );
        }
        backToReturn();
      },
    });
  };

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">
          برای این مرجوعی کاری در انبار باقی نمانده است.
        </p>
        <Button variant="outline" onClick={backToReturn}>
          بازگشت به مرجوعی
        </Button>
      </div>
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
              title="اطلاعات تحویل‌گیرنده"
              nameLabel="نام و نام خانوادگی راننده / تحویل‌گیرنده"
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
            progressLabel="پیشرفت کار انبار"
            dateLabel="تاریخ"
            noteLabel="یادداشت"
          />

          {blockingReason && hasSomethingToRecord && (
            <p className="text-xs text-destructive px-1">{blockingReason}</p>
          )}

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
              }`}
              disabled={isBusy || !hasSomethingToRecord || Boolean(blockingReason)}
              onClick={() => setShowConfirmDialog(true)}
            >
              {isAllComplete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isAllComplete ? "تأیید انجام کامل" : "ثبت این دور"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={backToReturn}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            باقیمانده برای دور بعدی نگه داشته می‌شود و دوباره در همین صفحه ظاهر
            می‌شود.
          </p>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete ? "ثبت انجام کامل" : "ثبت این دور"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "همه‌ی ردیف‌ها کامل انجام شده‌اند؟ موجودی و قرنطینه همین حالا به‌روز می‌شوند."
                : "فقط مقادیری که وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              onClick={handleSubmit}
              className={!isAllComplete ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {isBusy ? "در حال ثبت..." : "تأیید"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SupplierReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: purchaseReturn,
    isLoading,
    isError,
  } = usePurchaseReturnQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : "کار انبار روی مرجوعی خرید",
      showBack: true,
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, isLoading]);

  if (isLoading) return <WarehouseFormSkeleton />;

  if (isError || !purchaseReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}
        >
          بازگشت به لیست مرجوعی‌ها
        </Button>
      </div>
    );
  }

  return (
    <SupplierReturnShipmentForm
      key={purchaseReturn.id}
      purchaseReturn={purchaseReturn}
    />
  );
}
