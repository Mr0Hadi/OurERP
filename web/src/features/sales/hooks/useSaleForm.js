import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSaleFormStore } from '#/features/sales/store/saleFormStore';

export function useSaleForm() {
  const formData = useSaleFormStore((state) => state.formData);
  const setFormData = useSaleFormStore((state) => state.setFormData);
  const setItems = useSaleFormStore((state) => state.setItems);
  const initializedForId = useSaleFormStore((state) => state.initializedForId);
  
  const isFirstMount = useRef(true);
  const prevInitializedRef = useRef(initializedForId);

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

  // وقتی resetForm صدا زده می‌شه، react-hook-form هم ریست بشه
  useEffect(() => {
    const prev = prevInitializedRef.current;
    prevInitializedRef.current = initializedForId;

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

  // sync یک‌طرفه: form → store
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const subscription = watch((values) => {
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
    return () => subscription.unsubscribe();
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

  const buildSalePayload = (formValues) => ({
    customerId: formData.customerId,
    customerName: formData.customerName,
    invoiceNumber: formValues.invoiceNumber,
    invoiceDate: formValues.invoiceDate,
    dueDate: formValues.dueDate,
    description: formValues.description,
    paymentType: formValues.paymentType,
    paidAmount: Number(formValues.paidAmount) || 0,
    status: formData.status,
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
