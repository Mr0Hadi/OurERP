// src/features/inventory/products/pages/ProductNewPage.jsx
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

import { Button } from "#/shared/components/ui/button";

import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";

import { useHeaderStore } from "#/shared/store/headerStore";
import { useEffect } from "react";

export default function ProductNewPage() {
  const navigate = useNavigate();

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
    handleAddCategory,
    handleImageChange,
  } = useProductForm();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const payload = { ...data, image: imagePreview };
      console.log("Product Data to submit:", payload);

      toast.success("کالا با موفقیت ثبت شد!");
      navigate("/products");
    } catch (error) {
      toast.error("خطا در ثبت کالا");
    }
  };

  return (
    <div className="container mx-auto animate-in fade-in zoom-in-95 duration-300">


      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <ProductBasicInfoForm
              register={register}
              control={control}
              errors={errors}
              categories={categories}
              onAddCategory={handleAddCategory}
            />

            <ProductPricingForm register={register} />
          </div>

          <div className="flex flex-row md:flex-col gap-4 md:gap-6">
            <ProductImageUpload
              preview={imagePreview}
              onImageChange={handleImageChange}
            />

            <ProductBarcodeDisplay value={barcodeValue} />
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            className="w-full h-12 text-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "در حال ذخیره..."
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                ذخیره کالا
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
