import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { usePurchaseFormStore } from '#/features/purchases/store/purchaseFormStore';

export function usePurchaseForm() {
  const { formData, setFormData, setItems } = usePurchaseFormStore();
  const isFirstMount = useRef(true);

  const formMethods = useForm({
    defaultValues: {
      supplierId: formData.supplierId || '',
      supplierName: formData.supplierName || '',
      invoiceNumber: formData.invoiceNumber || '',
      invoiceDate: formData.invoiceDate || '',
      description: formData.description || '',
      paymentType: formData.paymentType || 'cash',
      paidAmount: formData.paidAmount || '',
    },
  });

  const { watch } = formMethods;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const sub = watch((values) => {
      // فقط فیلدهای فرم را آپدیت می‌کنیم، نه supplierId/supplierName
      setFormData({
        invoiceNumber: values.invoiceNumber,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        description: values.description,
        paymentType: values.paymentType,
        paidAmount: values.paidAmount,
      });
    });
    return () => sub.unsubscribe();
  }, [watch, setFormData]);

  const items = formData.items || [];

  const handleItemsChange = (newItems) => {
    setItems(newItems);
  };

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  const buildPurchasePayload = (formValues) => ({
    supplierId: formData.supplierId,
    supplierName: formData.supplierName,
    invoiceNumber: formValues.invoiceNumber,
    invoiceDate: formValues.invoiceDate,
    description: formValues.description,
    paymentType: formValues.paymentType,
    paidAmount: Number(formValues.paidAmount) || 0,
    items: items.map((item) => ({
      ...item,
      lineTotal: (item.qty * item.unitPrice) * (1 - (item.discount || 0) / 100),
    })),
    totalAmount: computedTotal,
  });

  return {
    formMethods,
    items,
    handleItemsChange,
    computedTotal,
    buildPurchasePayload,
  };
}