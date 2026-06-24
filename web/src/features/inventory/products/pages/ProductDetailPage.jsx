// src/features/inventory/products/pages/ProductDetailPage.jsx
import { useNavigate, useParams } from "react-router-dom";
import { Save, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "#/shared/components/ui/button";
import { useProductQuery } from "../services/queries";
import { useUpdateProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import ProductDetailLoading from "../components/forms/ProductDetailLoading";
import { useHeaderStore } from "#/shared/store/headerStore";

function ProductDetailForm({ productData }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateProductMutation(productData.id);

  const {
    formMethods,
    imagePreview,
    barcodeValue,
    categories,
    handleImageChange,
    handleImageRemove,
    buildProductPayload,
  } = useProductForm(productData);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = formMethods;

  const onSubmit = (data) => {
    const payload = buildProductPayload(data);
    updateMutation.mutate(payload);
  };

  const isBusy = isSubmitting || updateMutation.isPending;

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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={()=>{navigate('/products')}}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ذخیره..." : "ویرایش کالا"}
              </Button>
            </div>
          </div>
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

  const { data: productData, isLoading } = useProductQuery(id);

  if (isLoading || !productData) {
    return <ProductDetailLoading />;
  }

  return <ProductDetailForm key={productData.id} productData={productData} />;
}
