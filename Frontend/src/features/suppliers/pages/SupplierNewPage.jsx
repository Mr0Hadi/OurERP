import { useReturnTo } from "@/shared/hooks/useReturnTo";
import { ROUTES } from "@/shared/constants/routes";
import { Save, X } from "lucide-react";
import { useCreateSupplierMutation } from "../services/mutations";
import { useSupplierForm } from "../hooks/useSupplierForm";
import { Button } from "@/shared/components/ui/button";
import SupplierIdentityForm from "../components/forms/SupplierIdentityForm";
import SupplierFinanceForm from "../components/forms/SupplierFinanceForm";
import PartyAddressForm from "@/features/partyAccount/components/PartyAddressForm";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

export default function SupplierNewPage() {
  // از فرمِ خرید/فروش آمده باشیم (`state.returnTo`) به همان‌جا برمی‌گردیم و شناسه‌ی
  // رکوردِ تازه را می‌فرستیم تا همان‌جا انتخاب شود؛ وگرنه به لیستِ خودش. برگشتِ ساده در
  // تاریخچه به هر صفحه‌ای که قبلاً باز بود می‌رفت و شناسه را گم می‌کرد.
  const { goBack } = useReturnTo(ROUTES.SUPPLIERS);
  const createMutation = useCreateSupplierMutation();

  usePageHeader({
    title: "اضافه کردن تامین کننده جدید",
    showBack: true,
  });

const {
    formMethods,
    balanceType,
    imageUpload,
    buildSupplierPayload,
  } = useSupplierForm();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildSupplierPayload(data), {
      onSuccess: (created) => {
        // کلیدِ تصویر حالا مالِ یک تامین‌کننده‌ی واقعی است؛ آپلودهای
        // میانی یتیم‌اند و پاک می‌شوند.
        imageUpload.commit();
        // TODO(بکند): `Create...` هنوز شناسه برنمی‌گرداند (بندِ ۹.۲)؛ فرمِ مبدأ حفظ می‌شود ولی خودکار انتخاب نمی‌شود.
        goBack({ newSupplierId: created?.id });
      },
    });
  };

  const handleCancel = () => {
    imageUpload.discard();
    goBack();
  };

  const isBusy = createMutation.isPending || imageUpload.isUploading;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          {/* ستون راست - اطلاعات اصلی */}
          <div className="lg:col-span-1 space-y-4">
<SupplierIdentityForm
              register={register}
              control={control}
              errors={errors}
              imageUpload={imageUpload}
            />

            <SupplierFinanceForm
              register={register}
              errors={errors}
              balanceType={balanceType}
              control={control}
            />
          </div>

          {/* ستون چپ - آدرس و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <PartyAddressForm
              register={register}
              control={control}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />

            {/* دکمه‌های عملیات */}
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
                {isBusy ? "در حال ثبت..." : "ثبت تامین کننده"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}