// src/features/inventory/products/pages/ProductDetailPage.jsx
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useProductQuery } from "../services/queries";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import ProductDetailLoading from "../components/forms/ProductDetailLoading";

import { useHeaderStore } from "#/shared/store/headerStore";
import { useEffect } from "react";

function ProductDetailForm({ productData }) {
  const navigate = useNavigate();

  const {
    formMethods,
    imagePreview,
    barcodeValue,
    categories,
    handleAddCategory,
    handleImageChange,
  } = useProductForm(productData);

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
      console.log("Product Data to update:", payload);
      toast.success("کالا با موفقیت ویرایش شد!");
      navigate("/products");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("خطا در ویرایش کالا");
    }
  };

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
              onAddCategory={handleAddCategory}
            />
            <ProductPricingForm register={register} />
          </div>
          <div className="flex flex-col gap-4 md:gap-3">
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
              "در حال به‌روزرسانی..."
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                به‌روزرسانی کالا
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const setHeader = useHeaderStore((state) => state.setHeader);
  const clearHeader = useHeaderStore((state) => state.clearHeader);

  useEffect(() => {
    setHeader({
      title: "جزئیات و ویرایش کالا",
      showBack: true,
      onBack: () => navigate(-1),
    });

    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  const { data: productData, isLoading: isProductLoading } =
    useProductQuery(id);

  // loading page
  if (isProductLoading || !productData) {
    // console.log(productData);

    return <ProductDetailLoading />;
  }

  return <ProductDetailForm key={productData.id} productData={productData} />;
}
