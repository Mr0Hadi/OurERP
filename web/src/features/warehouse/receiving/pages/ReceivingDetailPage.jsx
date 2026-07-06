// src/features/warehouse/receiving/pages/ReceivingDetailPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { useHeaderStore } from '@/shared/store/headerStore';
import { usePurchaseQuery } from '@/features/purchases/services/queries';
import { useProductsQuery } from '@/features/warehouse/products/services/queries';
import { useConfirmReceivingMutation } from '../services/mutations';
import { useReceivingForm } from '../hooks/useReceivingForm';
import ReceivingItemsSection from '../components/forms/ReceivingItemsSection';
import ReceivingSummaryCard from '../components/forms/ReceivingSummaryCard';
import ReceivingMismatchList from '../components/forms/ReceivingMismatchList';
import ReceivingTransporterSection from '../components/forms/ReceivingTransporterSection';
import ReceivingDetailLoading from '../components/forms/ReceivingDetailLoading';
import { ROUTES } from '@/shared/constants/routes';

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: 'name', desc: false };

function ReceivingDetailForm({ purchase }) {
  const navigate = useNavigate();
  const receivingMutation = useConfirmReceivingMutation();

  // آیتم‌های خرید فقط productId/productName/productCode/qty/unitPrice/discount دارند؛
  // تصویر و برند کالا وجود ندارد و باید از لیست محصولات انبار گرفته شود.
  const { data: productsData } = useProductsQuery(ALL_FILTERS, PAGINATION, SORTING);
  const productMap = useMemo(() => {
    const map = new Map();
    (productsData?.items || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [productsData]);

  const {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    isPartially,
    isTransporterValid,
    buildPayload,
    resetForm,
  } = useReceivingForm(purchase);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState(null); // 'complete' | 'partial'
  const [showTransporterError, setShowTransporterError] = useState(false);

  useEffect(() => {
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = formData.items || [];

  // فقط برای نمایش: تصویر و برند از روی productId به هر ردیف اضافه می‌شود
  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          ...item,
          imageUrl: product?.imageUrl || '',
          brand: product?.brand || '',
        };
      }),
    [items, productMap]
  );

  const hasShortage = items.some((item) => (item.receivedQty || 0) < item.expectedQty);
  const isBusy = receivingMutation.isPending;

  const handleAction = (type) => {
    if (!isTransporterValid) {
      setShowTransporterError(true);
      return;
    }
    setShowTransporterError(false);
    setActionType(type);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    receivingMutation.mutate(
      { purchaseId: payload.id, receivingData: payload },
      {
        onSuccess: () => {
          resetForm();
          setShowConfirmDialog(false);
          // useConfirmReceivingMutation خودش پس از موفقیت به لیست دریافت‌ها هدایت می‌کند
        },
      }
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ستون اصلی – جدول اقلام */}
        <div className="lg:col-span-2 space-y-4">
          <ReceivingItemsSection items={displayItems} onItemChange={handleItemChange} />
          <ReceivingMismatchList purchaseId={purchase.id} items={displayItems} />
        </div>

        {/* ستون کناری – خلاصه و دکمه‌ها */}
        <div className="space-y-4">
          <ReceivingSummaryCard formData={formData} onFormChange={setFormData} />

          <ReceivingTransporterSection
            formData={formData}
            onFormChange={(patch) => {
              setFormData(patch);
              if (showTransporterError) setShowTransporterError(false);
            }}
            error={
              showTransporterError
                ? 'برای ثبت دریافت، نام تحویل‌دهنده و حداقل یکی از کد ملی یا شماره پلاک الزامی است'
                : null
            }
          />

          <Card>
            <CardContent className="pt-4 space-y-2">
              <Button
                className="w-full gap-2"
                disabled={isBusy || items.length === 0}
                onClick={() => handleAction('complete')}
              >
                <CheckCircle className="h-4 w-4" />
                تأیید دریافت کامل
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                disabled={isBusy || !hasShortage}
                onClick={() => handleAction('partial')}
              >
                <AlertTriangle className="h-4 w-4" />
                ثبت تحویل ناقص
              </Button>

              {!hasShortage && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  همه اقلام کامل ثبت شده‌اند
                </p>
              )}

              <Button
                variant="ghost"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* دیالوگ تأیید نهایی */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'complete' ? 'ثبت دریافت کامل' : 'ثبت تحویل ناقص'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'complete'
                ? 'آیا مطمئن هستید که همه اقلام به‌طور کامل دریافت شده‌اند؟'
                : 'با تأیید، وضعیت خرید به «تحویل ناقص» تغییر می‌کند و کمبودهای ثبت‌شده در فهرست مغایرت‌ها ذخیره می‌شود.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              onClick={handleSubmit}
              className={actionType === 'partial' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {isBusy ? 'در حال ثبت...' : 'تأیید'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ReceivingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: purchase, isLoading, isError } = usePurchaseQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading ? 'در حال بارگذاری...' : purchase ? 'دریافت کالا' : 'خطا',
      showBack: true,
      onBack: () => navigate(ROUTES.WAREHOUSE_RECEIVING),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchase, isLoading]);

  if (isLoading) return <ReceivingDetailLoading />;

  if (isError || !purchase) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">خرید مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <ReceivingDetailForm key={purchase.id} purchase={purchase} />;
}