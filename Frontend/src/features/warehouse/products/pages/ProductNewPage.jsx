// src/features/warehouse/products/pages/ProductNewPage.jsx
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/shared/components/ui/button";
import { useCreateProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import { useHeaderStore } from "@/shared/store/headerStore";

export default function ProductNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateProductMutation();

  const setHeader = useHeaderStore((state) => state.setHeader);
  const clearHeader = useHeaderStore((state) => state.clearHeader);

  useEffect(() => {
    setHeader({
      title: "افزودن کالا جدید",
      showBack: true,
    });

    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  const {
    formMethods,
    imageUpload,
    barcodeValue,
    categories,
    handleAddCategory,
    buildProductPayload,
  } = useProductForm();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = async (data) => {
    createMutation.mutate(buildProductPayload(data), {
      onSuccess: () => {
        // کلید حالا مالِ یک کالای واقعی است؛ آپلودهای میانی یتیم‌اند.
        imageUpload.commit();
        navigate(-1);
      },
    });
  };

  const handleCancel = () => {
    // تصویری که آپلود شد ولی کالایی برایش ثبت نشد، فقط زباله است.
    imageUpload.discard();
    navigate(-1);
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
              setValue={setValue}
              errors={errors}
              categories={categories}
              onAddCategory={handleAddCategory}
            />
            <ProductPricingForm register={register} />
          </div>
          <div className="flex flex-col gap-4 md:gap-3">
            <ProductImageUpload imageUpload={imageUpload} />
            <ProductBarcodeDisplay value={barcodeValue} />
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
