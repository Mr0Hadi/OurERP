// src/features/purchases/hooks/usePurchaseForm.js
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { usePurchaseFormStore } from '#/features/purchases/store/purchaseFormStore';

export function usePurchaseForm(initialData = {}) {
  const { formData, setFormData, setItems } = usePurchaseFormStore();
  const isFirstMount = useRef(true);

  // defaultValues از store می‌آیند (که قبلاً توسط initializeFromPurchase پر شده)
  // این باعث می‌شود وقتی کاربر برمی‌گردد، فرم مقادیر ذخیره‌شده را نشان دهد
  const formMethods = useForm({
    defaultValues: {
      invoiceNumber: formData.invoiceNumber || '',
      invoiceDate: formData.invoiceDate || '',
      dueDate: formData.dueDate || '',
      description: formData.description || '',
      paymentType: formData.paymentType || 'cash',
      paidAmount: formData.paidAmount || '',
      checkNumber: formData.checkNumber || '',
      transferRef: formData.transferRef || '',
    },
  });

  const { watch } = formMethods;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const sub = watch((values) => {
      setFormData({
        invoiceNumber: values.invoiceNumber,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        description: values.description,
        paymentType: values.paymentType,
        paidAmount: values.paidAmount,
        checkNumber: values.checkNumber,
        transferRef: values.transferRef,
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
      lineTotal:
        item.qty * item.unitPrice * (1 - (item.discount || 0) / 100),
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
