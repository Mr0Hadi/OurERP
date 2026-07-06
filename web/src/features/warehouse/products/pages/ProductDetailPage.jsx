// src/features/warehouse/products/pages/ProductDetailPage.jsx
import { useNavigate, useParams } from "react-router-dom";
import { Save, X, Trash2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import { useProductQuery } from "../services/queries";
import { useUpdateProductMutation, useDeleteProductMutation } from "../services/mutations";
import { useProductForm } from "../hooks/useProductForm";
import ProductBasicInfoForm from "../components/forms/ProductBasicInfoForm";
import ProductPricingForm from "../components/forms/ProductPricingForm";
import ProductImageUpload from "../components/forms/ProductImageUpload";
import ProductBarcodeDisplay from "../components/forms/ProductBarcodeDisplay";
import ProductDetailLoading from "../components/forms/ProductDetailLoading";
import { useHeaderStore } from "#/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";

function ProductDetailForm({ productData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const updateMutation = useUpdateProductMutation(productData.id);
  const deleteMutation = useDeleteProductMutation();

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

  const handleDelete = () => {
    deleteMutation.mutate(productData.id, {
      onSuccess: () => {
        navigate(ROUTES.WAREHOUSE_PRODUCTS);
      },
    });
  };

  const isBusy = isSubmitting || updateMutation.isPending || deleteMutation.isPending;

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
                onClick={() => navigate(ROUTES.WAREHOUSE_PRODUCTS)}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کالا</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این کالا اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((state) => state.setHeader);
  const clearHeader = useHeaderStore((state) => state.clearHeader);

  const { data: productData, isLoading, isError } = useProductQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : productData
        ? "جزئیات و ویرایش کالا"
        : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });

    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, productData, isLoading]);

  if (isLoading) {
    return <ProductDetailLoading />;
  }

  if (isError || !productData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          کالا مورد نظر یافت نشد یا خطایی رخ داده است.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_PRODUCTS)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <ProductDetailForm key={productData.id} productData={productData} />;
}
