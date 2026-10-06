import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, X, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { useProductQuery } from "../services/queries";
import { useUpdateProductMutation, useDeleteProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import ProductDetailLoading from "../components/forms/ProductDetailLoading";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

function ProductDetailForm({ productData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateMutation = useUpdateProductMutation(productData.id);
  const deleteMutation = useDeleteProductMutation();

  const { formMethods, imageUpload, buildProductPayload } = useProductForm(productData);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = (data) => {
    const payload = buildProductPayload(data);
    // سرور تصویرِ قبلی را خودکار پاک نمی‌کند (بخش ۱۷ سند)؛ بعد از ثبتِ
    // موفقِ ویرایش، پاک‌کردنش امن است.
    updateMutation.mutate(payload, {
      onSuccess: () => {
        imageUpload.commit();
        navigate(ROUTES.WAREHOUSE_PRODUCTS);
      },
    });
  };

  const handleCancel = () => {
    imageUpload.discard();
    navigate(ROUTES.WAREHOUSE_PRODUCTS);
  };

  const handleDelete = () => {
    deleteMutation.mutate(productData.id, {
      onSuccess: () => {
        navigate(ROUTES.WAREHOUSE_PRODUCTS);
      },
    });
  };

  const isBusy =
    isSubmitting ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    imageUpload.isUploading;

  return (
    <div className="container mx-auto animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <ProductBasicInfoForm
              register={register}
              control={control}
              errors={errors}
              isIncomplete={Boolean(productData?.isIncomplete)}
            />
            <ProductPricingForm register={register} control={control} errors={errors} />
          </div>
          <div className="flex flex-col gap-4 md:gap-3">
            <ProductImageUpload imageUpload={imageUpload} />
            {/* بارکد را سرور می‌سازد و در فرم عوض نمی‌شود. */}
            <ProductBarcodeDisplay value={productData.barCode ?? ""} />
            <UnitsPageLink
              params={{ productId: productData.id }}
              label="دانه‌ها، قرنطینه و برچسب‌های این کالا"
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ذخیره..." : "ذخیره‌ی تغییرات"}
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف کالا
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="حذف کالا"
        description="کالا از فهرست‌ها و انتخاب‌گرها کنار می‌رود و از داخلِ برنامه برنمی‌گردد. سابقه‌ی خرید، فروش و دانه‌هایش پاک نمی‌شود."
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: productData,
    isLoading,
    isError,
    error: loadError,
    refetch: retryLoad,
  } = useProductQuery(id);

  usePageHeader({
    title: isLoading
      ? "در حال بارگذاری..."
      : productData
      ? "جزئیات و ویرایش کالا"
      : "خطا",
    showBack: true,
  });

  if (isLoading) {
    return <ProductDetailLoading />;
  }

  if (isError || !productData) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="کالای مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.WAREHOUSE_PRODUCTS)}
      />
    );
  }

  return <ProductDetailForm key={productData.id} productData={productData} />;
}
