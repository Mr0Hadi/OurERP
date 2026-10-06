import { Save, X } from "lucide-react";

import { useReturnTo } from "@/shared/hooks/useReturnTo";
import { ROUTES } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { useCreateProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

export default function ProductNewPage() {
  // از فرمِ خرید/فروش آمده باشیم (`state.returnTo`) به همان‌جا برمی‌گردیم و شناسه‌ی
  // رکوردِ تازه را می‌فرستیم تا همان‌جا انتخاب شود؛ وگرنه به لیستِ خودش. برگشتِ ساده در
  // تاریخچه به هر صفحه‌ای که قبلاً باز بود می‌رفت و شناسه را گم می‌کرد.
  const { goBack } = useReturnTo(ROUTES.WAREHOUSE_PRODUCTS);
  const createMutation = useCreateProductMutation();

  usePageHeader({
    title: "افزودن کالای جدید",
    showBack: true,
  });

  const {
    formMethods,
    imageUpload,
    buildProductPayload,
  } = useProductForm();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildProductPayload(data), {
      onSuccess: (created) => {
        // کلید حالا مالِ یک کالای واقعی است؛ آپلودهای میانی یتیم‌اند.
        imageUpload.commit();
        goBack({ newProductId: created?.id });
      },
    });
  };

  const handleCancel = () => {
    // تصویری که آپلود شد ولی کالایی برایش ثبت نشد، فقط زباله است.
    imageUpload.discard();
    goBack();
  };

  // تا پایانِ آپلود، کلیدی برای گذاشتن در payload وجود ندارد.
  const isBusy = isSubmitting || createMutation.isPending || imageUpload.isUploading;

  return (
    <div className="container mx-auto animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <ProductBasicInfoForm
              register={register}
              control={control}
              errors={errors}
              showGeneratedCodes={false}
            />
            <ProductPricingForm
              register={register}
              control={control}
              errors={errors}
              isNew
              requirePrices
            />
          </div>
          <div className="flex flex-col gap-4 md:gap-3">
            <ProductImageUpload imageUpload={imageUpload} />
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
                {isBusy ? "در حال ذخیره..." : "ذخیره کالا"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
