// src/features/purchases/hooks/usePurchaseForm.js
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { usePurchaseFormStore } from '#/features/purchases/store/purchaseFormStore';

export function usePurchaseForm() {
  const { formData, setFormData, setItems } = usePurchaseFormStore();
  const isFirstMount = useRef(true);

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

  const { watch, reset } = formMethods;

  // وقتی store ریست می‌شه (initializedForId برمی‌گرده به null)، فرم را هم ریست کن
  const initializedForId = usePurchaseFormStore((s) => s.initializedForId);
  const prevInitializedRef = useRef(initializedForId);

  useEffect(() => {
    const prev = prevInitializedRef.current;
    prevInitializedRef.current = initializedForId;

    // اگر از یه مقداری به null رفت، یعنی resetForm صدا زده شده
    if (prev !== null && initializedForId === null) {
      reset({
        invoiceNumber: '',
        invoiceDate: '',
        dueDate: '',
        description: '',
        paymentType: 'cash',
        paidAmount: '',
        checkNumber: '',
        transferRef: '',
      });
    }
  }, [initializedForId, reset]);

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
      lineTotal: item.qty * item.unitPrice * (1 - (item.discount || 0) / 100),
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
