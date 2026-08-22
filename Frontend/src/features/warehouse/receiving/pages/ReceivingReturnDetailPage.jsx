import { useEffect, useMemo, useState } from "react";
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
import { useSalesReturnQuery } from "@/features/sales/returns/services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";

import { useConfirmReturnIntakeMutation } from "../services/mutations";
import { useReceivingFormStore } from "../store/receivingFormStore";
import { useReceivingForm } from "../hooks/useReceivingForm";

import ReceivingItemsSection from "../components/forms/ReceivingItemsSection";
import UnknownItemsSection from "../components/forms/UnknownItemsSection";
import ReceivingMismatchList from "../components/forms/ReceivingMismatchList";
import ReturnTransporterSection from "../components/forms/ReturnTransporterSection";
import ReturnDetailLoading from "../components/forms/ReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * تحویل‌گرفتن کالای برگشتی از مشتری.
 *
 * همان فرمِ دریافت خرید است، با همان امکانات: گزارش نوع مشکل روی هر
 * ردیف، ثبت کالای اضافه، و ثبت کالای ثبت‌نشده.
 *
 * دلیلش این است که مشتری هم دقیقاً مثل تامین‌کننده ممکن است اشتباه
 * بفرستد — کمتر، بیشتر، خراب، یا کالایی که اصلاً در مرجوعی نبوده.
 * فرمِ قبلی فقط دو عدد می‌گرفت (چقدر رسید، چقدرش سالم بود) و هیچ‌کدام
 * از این حالت‌ها را نمی‌توانست ثبت کند.
 */
function ReceivingReturnDetailForm({ salesReturn }) {
  const navigate = useNavigate();
  const intakeMutation = useConfirmReturnIntakeMutation();

  const initializeFromSalesReturn = useReceivingFormStore(
    (s) => s.initializeFromSalesReturn,
  );

  const returnLines = useMemo(
    () =>
      buildGoodsLines(salesReturn, EFFECT_KINDS.GOODS_IN).filter(
        (line) => line.remainingQty > 0,
      ),
    [salesReturn],
  );

  useEffect(() => {
    initializeFromSalesReturn(salesReturn, returnLines);
  }, [salesReturn, returnLines, initializeFromSalesReturn]);

  const {
    formData,
    setFormData,
    handleItemChange,
    handleAddIssue,
    handleUpdateIssue,
    handleRemoveIssue,
    handleExcessChange,
    unknownItems,
    handleAddUnknownItem,
    handleUpdateUnknownItem,
    handleRemoveUnknownItem,
    incompleteUnknownCount,
    isAllComplete,
    isTransporterValid,
    buildPayload,
    resetForm,
  } = useReceivingForm(null);

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

  const items = formData.items || [];
  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          ...item,
          image: product?.image || "",
          brand: product?.brand || "",
        };
      }),
    [items, productMap],
  );

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTransporterError, setShowTransporterError] = useState(false);
  const [showUnknownError, setShowUnknownError] = useState(false);

  useEffect(() => () => resetForm(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusy = intakeMutation.isPending;
  const hasSomethingToRecord =
    items.some((item) => (Number(item.receivedQty) || 0) > 0) ||
    items.some((item) => (Number(item.excessQty) || 0) > 0) ||
    unknownItems.length > 0;

  const handleConfirmClick = () => {
    if (!hasSomethingToRecord) return;
    if (incompleteUnknownCount > 0) {
      setShowUnknownError(true);
      return;
    }
    if (!isTransporterValid) {
      setShowTransporterError(true);
      return;
    }
    setShowTransporterError(false);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const willStayPending = !isAllComplete;
    intakeMutation.mutate(
      { returnId: salesReturn.id, intakeData: buildPayload() },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          resetForm();
          if (willStayPending) {
            toast.success(
              "این دور ثبت شد. باقیمانده هر وقت رسید، دوباره از همین صفحه ثبت کنید.",
            );
          }
          navigate(ROUTES.WAREHOUSE_RECEIVING);
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">
          برای این مرجوعی کالایی در انتظار تحویل نیست.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
        >
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ReceivingItemsSection
            items={displayItems}
            title="اقلام برگشتی از مشتری"
            subtitle="کالایی که طبق تصمیمِ مرجوعی باید از مشتری تحویل گرفته شود."
            onItemChange={handleItemChange}
            onAddIssue={handleAddIssue}
            onUpdateIssue={handleUpdateIssue}
            onRemoveIssue={handleRemoveIssue}
            onExcessChange={handleExcessChange}
          />

          <UnknownItemsSection
            partyLabel="مشتری"
            items={unknownItems}
            incompleteCount={incompleteUnknownCount}
            showErrors={showUnknownError}
            onAdd={handleAddUnknownItem}
            onUpdate={(rowId, field, value) => {
              handleUpdateUnknownItem(rowId, field, value);
              if (showUnknownError) setShowUnknownError(false);
            }}
            onRemove={(rowId) => {
              handleRemoveUnknownItem(rowId);
              if (showUnknownError) setShowUnknownError(false);
            }}
          />

          <ReceivingMismatchList
            items={displayItems}
            unknownItems={unknownItems}
          />

          <ReturnTransporterSection
            formData={formData}
            onFormChange={(patch) => {
              setFormData(patch);
              if (showTransporterError) setShowTransporterError(false);
            }}
            error={
              showTransporterError
                ? "برای ثبت دریافت، نام تحویل‌دهنده و حداقل یکی از کد ملی یا شماره پلاک الزامی است"
                : null
            }
          />
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
              }`}
              disabled={isBusy || !hasSomethingToRecord}
              onClick={handleConfirmClick}
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
              onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete
                ? "ثبت دریافت کامل مرجوعی"
                : "ثبت این دور از دریافت"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه‌ی اقلام باقی‌مانده در این دور به‌طور کامل رسیده‌اند؟"
                : "بخشی که در این دور وارد نکرده‌اید، برای دور بعدی نگه داشته می‌شود."}
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

export default function ReceivingReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: salesReturn,
    isLoading,
    isError,
  } = useSalesReturnQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : salesReturn
          ? "دریافت کالای مرجوعی"
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, salesReturn, isLoading]);

  if (isLoading) return <ReturnDetailLoading />;

  if (isError || !salesReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
        >
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <ReceivingReturnDetailForm
      key={`${salesReturn.id}:${salesReturn.updatedAt}`}
      salesReturn={salesReturn}
    />
  );
}
