import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSaleFormStore } from '#/features/sales/store/saleFormStore';

export function useSaleForm(initialData = {}) {
  const { formData, setFormData, setItems } = useSaleFormStore();
  const isFirstMount = useRef(true);

  const formMethods = useForm({
    defaultValues: {
      invoiceNumber: initialData.invoiceNumber || '',
      invoiceDate: initialData.invoiceDate || '',
      description: initialData.description || '',
      paymentType: initialData.paymentType || 'cash',
      paidAmount: initialData.paidAmount?.toString() || '',
      checkNumber: initialData.checkNumber || '',
      transferRef: initialData.transferRef || '',
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

  // قیمت فروش از salePrice استفاده می‌کند نه purchasePrice
  const buildSalePayload = (formValues) => ({
    customerId: formData.customerId,
    customerName: formData.customerName,
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
    buildSalePayload,
  };
}
