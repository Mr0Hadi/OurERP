// src/features/inventory/products/pages/ProductNewPage.jsx
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "#/shared/components/ui/button";
import { useCreateProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import { useHeaderStore } from "#/shared/store/headerStore";

export default function ProductNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateProductMutation();

  const setHeader = useHeaderStore((state) => state.setHeader);
  const clearHeader = useHeaderStore((state) => state.clearHeader);

  useEffect(() => {
    setHeader({
      title: "افزودن کالا جدید",
      showBack: true,
      onBack: () => navigate(-1),
    });

    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  const {
    formMethods,
    imagePreview,
    barcodeValue,
    categories,
    handleImageChange,
    handleImageRemove,
    buildProductPayload,
  } = useProductForm();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = async (data) => {
    const payload = buildProductPayload(data);
    createMutation.mutate(payload);
  };

  const isBusy = isSubmitting || createMutation.isPending;

  return (
    <div className="container mx-auto animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <ProductBasicInfoForm
              register={register}
              control={control}
              errors={errors}
              categories={categories}
            />
            <ProductPricingForm register={register} />
          </div>
          <div className="flex flex-col gap-4 md:gap-3">
            <ProductImageUpload
              preview={imagePreview}
              onImageChange={handleImageChange}
              onImageRemove={handleImageRemove}
            />
            <ProductBarcodeDisplay value={barcodeValue} />
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                disabled={isBusy}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button 
                type="submit" 
                disabled={isBusy}
                className="gap-2"
              >
                {isBusy ? (
                  "در حال ثبت..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    ثبت کالا
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
