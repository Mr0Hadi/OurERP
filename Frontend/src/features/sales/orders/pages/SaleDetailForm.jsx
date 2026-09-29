import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useUpdateSaleMutation,
  useRemoveSaleMutation,
  useSalePaymentMutations,
} from "@/features/sales/orders/services/mutations";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import { ROUTES } from "@/shared/constants/routes";

import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import SalePaymentsCard from "../components/forms/SalePaymentsCard";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import DocumentFormLayout, {
  DocumentMobileBar,
  DocumentSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useSubPageNavigation } from "@/shared/hooks/useSubPageNavigation";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { usePermission } from "@/features/auth/hooks/usePermission";

/**
 * ویرایشِ فروشی که هنوز **پیش‌فاکتور** است — تنها وضعیتی که `UpdateSale`
 * می‌پذیرد. فروشِ صادرشده در `SaleIssuedView` باز می‌شود.
 *
 * وضعیت دستی انتخاب نمی‌شود: اولین دریافت از کارتِ «پرداخت‌ها» فاکتور را
 * صادر می‌کند و صفحه خودش به نمای فاکتورِ صادرشده می‌رود. تغییرِ نذخیره‌شده‌ی
 * اقلام را پیش از ثبتِ پرداخت ذخیره کنید، چون بعد از صدور ویرایش ممکن نیست.
 *
 * بعد از ذخیره کاربر روی همین سند می‌ماند (قبلاً به فهرست پرتاب می‌شد).
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

  // ساختِ کالا/مشتریِ تازه از همین فرم؛ ویرایش‌های نذخیره‌شده در store
  // می‌مانند چون نسخه‌ی سند عوض نشده است.
  const { openSubPage, returned } = useSubPageNavigation();

  const { customers, isLoading: customersLoading } = useCustomersOptionsQuery();
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  /**
   * ضمیمه‌های همین فروش. `UpdateSale` آرایه را *جایگزین* می‌کند نه اضافه،
   * پس همیشه فهرستِ نهایی فرستاده می‌شود؛ `commit()` بعد از ذخیره‌ی موفق،
   * کلیدهای بی‌صاحب را از باکت پاک می‌کند.
   */
  const attachments = useInvoiceAttachments(saleData.attachments || []);

  const updateMutation = useUpdateSaleMutation(saleData.id);
  const deleteMutation = useRemoveSaleMutation();
  const payments = useSalePaymentMutations(saleData.id);

  // فرم فقط وقتی از داده‌ی سرور پر می‌شود که سند عوض شود یا نسخه‌ی تازه‌ای
  // از آن برسد (updatedAt). وابستگی عمداً به id/updatedAt است، نه کل آبجکت،
  // تا تغییرات در حال ویرایش کاربر فقط با تغییر واقعی سند بازنویسی شود.
  useEffect(() => {
    initializeFromSale(saleData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleData.id, saleData.updatedAt, initializeFromSale]);

  // ضمیمه‌ها هم با همان کلیدِ فرم تازه می‌شوند — وگرنه بعد از ذخیره،
  // لیست روی نسخه‌ی قبلیِ سرور می‌ماند.
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(saleData.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleData.id, saleData.updatedAt, attachmentsReset]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => useSaleFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.retailPrice ?? 0,
  });

  if (initializedForId !== `${saleData.id}:${saleData.updatedAt}`) {
    return null;
  }

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور؛ عددِ نهایی همان است که سرور پس از ذخیره برمی‌گرداند.
  const totals = invoiceTotals(items);

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      setShowErrors(true);
      toast.error("مشتری را انتخاب کنید.");
      return;
    }
    // آپلودِ نیمه‌کاره کلید ندارد و در payload نمی‌آید؛ ذخیره در این
    // لحظه یعنی ضمیمه‌ی گم‌شده.
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }
    if (items.length === 0) {
      toast.error("فروش باید دست‌کم یک قلم داشته باشد.");
      return;
    }

    const payload = {
      customerId: formData.customerId,
      invoiceDate: formData.invoiceDate,
      paymentDate: formData.paymentDate || null,
      description: formData.description || "",
      items,
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      attachments: attachments.filesPayload,
    };

    updateMutation.mutate(payload, {
      onSuccess: (updated) => {
        attachments.commit();
        // همین‌جا از پاسخِ سرور پر می‌شود؛ منتظرِ عوض‌شدنِ `updatedAt` نمی‌ماند.
        resetForm();
        if (updated) initializeFromSale(updated);
      },
    });
  };

  const handleDiscard = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const handleDelete = () => {
    deleteMutation.mutate(saleData.id, {
      onSuccess: () => {
        resetForm();
        navigate(ROUTES.SALES);
      },
    });
  };

  const canUpdate = allow("SaleUpdate");
  const isBusy =
    updateMutation.isPending || deleteMutation.isPending || attachments.isUploading;
  const submitLabel = "ذخیره‌ی پیش‌فاکتور";

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            <SaleCustomerSection
              customers={customers}
              isLoading={customersLoading}
              selectedId={formData.customerId}
              onSelect={(id, name) => {
                setFormData({ customerId: id, customerName: name });
                setShowErrors(false);
              }}
              onClear={() => setFormData({ customerId: "", customerName: "" })}
              onAddNew={() => openSubPage(ROUTES.CUSTOMERS_NEW)}
              error={showErrors && !formData.customerId ? "انتخاب مشتری الزامی است" : null}
            />
            <SaleItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={setItems}
              onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
            />
            <OrderInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={{}}
              invoiceNumberDisabled
            />
            <InvoiceDocumentSection
              title="پیش‌فاکتور فروش"
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind="sale"
              documentId={saleData.id}
              attachmentLabel="پیش‌فاکتور ارسال‌شده برای مشتری"
            />
          </>
        }
        aside={
          <>
            {canUpdate && (
              <DocumentSummaryCard
                itemCount={items.length}
                totals={totals}
                submitLabel={submitLabel}
                isBusy={isBusy}
                onCancel={handleDiscard}
              />
            )}

            <SalePaymentsCard
              sale={saleData}
              payments={payments}
              canManage={allow("SalePayment")}
              notice="اولین دریافت فاکتور رسمی را صادر می‌کند و فروش دیگر ویرایش نمی‌شود؛ تغییرهای اقلام را پیش از آن ذخیره کنید."
            />

            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={totals.totalAmount}
              errors={{}}
              termsOnly
            />

            {allow("SaleDelete") && (
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                حذف پیش‌فاکتور
              </Button>
            )}
          </>
        }
        mobileBar={
          canUpdate && (
            <DocumentMobileBar
              total={totals.totalAmount}
              submitLabel={submitLabel}
              isBusy={isBusy}
            />
          )
        }
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="حذف پیش‌فاکتور فروش"
        description="آیا از حذف این پیش‌فاکتور اطمینان دارید؟ سندِ حذف‌شده دیگر در فهرست فروش‌ها دیده نمی‌شود."
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
