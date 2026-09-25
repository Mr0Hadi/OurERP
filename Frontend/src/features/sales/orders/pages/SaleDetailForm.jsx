import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Save, X, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useUpdateSaleMutation,
  useRemoveSaleMutation,
  useSalePaymentMutations,
} from "@/features/sales/orders/services/mutations";
import { useCustomersQuery } from "@/features/customers/services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { ROUTES } from "@/shared/constants/routes";

import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import SalePaymentsCard from "../components/forms/SalePaymentsCard";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { usePermission } from "@/features/auth/hooks/usePermission";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * ویرایشِ فروشی که هنوز **پیش‌فاکتور** است — تنها وضعیتی که `UpdateSale`
 * می‌پذیرد. فروشِ صادرشده در `SaleIssuedView` باز می‌شود.
 *
 * وضعیت دستی انتخاب نمی‌شود: اولین دریافت از کارتِ «پرداخت‌ها» فاکتور را
 * صادر می‌کند و صفحه خودش به نمای فاکتورِ صادرشده می‌رود. تغییرِ نذخیره‌شده‌ی
 * اقلام را پیش از ثبتِ پرداخت ذخیره کنید، چون بعد از صدور ویرایش ممکن نیست.
 */
export default function SaleDetailForm({ saleData }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  const allow = (permission) => permissionsUnknown || can(permission);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    setFormData,
    setItems,
    resetForm,
    formData,
    initializeFromSale,
    initializedForId,
  } = useSaleFormStore();

  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

  /**
   * ضمیمه‌های همین فروش. `UpdateSale` آرایه را *جایگزین* می‌کند نه اضافه
   * (بند ۲.۲ سندِ ضمیمه)، پس همیشه فهرستِ نهایی فرستاده می‌شود؛
   * `commit()` بعد از ذخیره‌ی موفق، کلیدهای بی‌صاحب را از باکت پاک می‌کند.
   */
  const attachments = useInvoiceAttachments(saleData.attachments || []);

  const updateMutation = useUpdateSaleMutation(saleData.id);
  const deleteMutation = useRemoveSaleMutation();
  const payments = useSalePaymentMutations(saleData.id);

  const items = formData.items || [];

  // initializeFromSale باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromSale(saleData);
  }, [saleData.id, saleData.updatedAt, initializeFromSale]);

  // ضمیمه‌ها هم با همان کلیدِ فرم تازه می‌شوند — وگرنه بعد از ذخیره،
  // لیست روی نسخه‌ی قبلیِ سرور می‌ماند.
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(saleData.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleData.id, saleData.updatedAt, attachmentsReset]);

  if (initializedForId !== `${saleData.id}:${saleData.updatedAt}`) {
    return null;
  }

  // پیش‌نمایش با قاعده‌ی سرور؛ عددِ نهایی همان است که سرور پس از ذخیره برمی‌گرداند.
  const computedTotal = invoiceTotals(items).totalAmount;

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      setShowErrors(true);
      return;
    }

    // آپلودِ نیمه‌کاره کلید ندارد و در payload نمی‌آید؛ ذخیره در این
    // لحظه یعنی ضمیمه‌ی گم‌شده.
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }

    const payload = {
      customerId: formData.customerId,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
      description: formData.description || "",
      items,
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      attachments: attachments.filesPayload,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        attachments.commit();
        resetForm();
        navigate(ROUTES.SALES);
      },
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(saleData.id, {
      onSuccess: () => {
        resetForm();
        navigate(ROUTES.SALES);
      },
    });
  };

  const isBusy =
    updateMutation.isPending || deleteMutation.isPending || attachments.isUploading;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <SaleItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={setItems}
            />
            <OrderInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={{}}
              invoiceNumberDisabled
            />
          </div>

          <div className="space-y-4">
            <SaleCustomerSection
              customers={customers}
              isLoading={customersLoading}
              selectedId={formData.customerId}
              onSelect={(id, name) => {
                setFormData({ customerId: id, customerName: name });
                setShowErrors(false);
              }}
              onClear={() => setFormData({ customerId: "", customerName: "" })}
              error={
                showErrors && !formData.customerId
                  ? "انتخاب مشتری الزامی است"
                  : null
              }
            />

            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={computedTotal}
              errors={{}}
              termsOnly
            />

            <SalePaymentsCard
              sale={saleData}
              payments={payments}
              canManage={allow("SalePayment")}
              notice="اولین دریافت فاکتور رسمی را صادر می‌کند و فروش دیگر ویرایش نمی‌شود؛ تغییرهای اقلام را پیش از آن ذخیره کنید."
            />

            <InvoiceDocumentSection
              title="پیش‌فاکتور فروش"
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind="sale"
              documentId={saleData.id}
              attachmentLabel="پیش‌فاکتور ارسال‌شده برای مشتری"
            />

            {allow("SaleUpdate") && (
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isBusy}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending
                    ? "در حال ذخیره..."
                    : "به‌روزرسانی پیش‌فاکتور"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    attachments.discard();
                    navigate(-1);
                  }}
                  disabled={isBusy}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  انصراف
                </Button>
              </div>
            )}

            {allow("SaleDelete") && (
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                حذف پیش‌فاکتور
              </Button>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پیش‌فاکتور فروش</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این پیش‌فاکتور اطمینان دارید؟ سندِ حذف‌شده دیگر در
              فهرست فروش‌ها دیده نمی‌شود.
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
