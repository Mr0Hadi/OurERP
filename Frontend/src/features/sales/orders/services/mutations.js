
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  createSale,
  updateSale,
  updateSaleStatus,
  updateSalePayment,
  removeSale
} from './api-v1';
import { saleKeys } from './queryKeys';
import { ROUTES } from '@/shared/constants/routes';
import { useSaleFormStore } from '../store/saleFormStore';
import { invalidateSalesEcosystem } from './sharedInvalidation';
import { outgoingQueueKeys } from '@/features/warehouse/shipping/services/queryKeys';

export const useCreateSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSale,
    onSuccess: (created) => {
      toast.success('فروش با موفقیت ثبت شد');
      invalidateSalesEcosystem(queryClient, created.id);
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ثبت فروش');
    },
  });
};

export const useUpdateSaleMutation = (id) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (saleData) => updateSale(id, saleData),
    onSuccess: () => {
      invalidateSalesEcosystem(queryClient, id);
      toast.success('فروش با موفقیت ویرایش شد');
      navigate(ROUTES.SALES);
      useSaleFormStore.getState().resetForm();
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ویرایش فروش');
    },
  });
};

export const useUpdateSaleStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updateSaleStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: saleKeys.detail(id) });
      const previousSale = queryClient.getQueryData(saleKeys.detail(id));
      if (previousSale) {
        queryClient.setQueryData(saleKeys.detail(id), { ...previousSale, status });
      }
      return { previousSale };
    },
    onSuccess: (updatedSale) => {
      queryClient.setQueryData(saleKeys.detail(updatedSale.id), updatedSale);
      // تغییر دستی وضعیت فروش می‌تواند واجدشرایط‌بودنِ آن برای «ارسال
      // انبار» یا «مرجوعی فروش» را هم تغییر دهد.
      invalidateSalesEcosystem(queryClient, updatedSale.id);
      toast.success('وضعیت فروش به‌روزرسانی شد');
    },
    onError: (error, variables, context) => {
      if (context?.previousSale) {
        queryClient.setQueryData(saleKeys.detail(variables.id), context.previousSale);
      }
      toast.error(error?.message || 'خطا در به‌روزرسانی وضعیت');
    },
  });
};

export const useRecordSalePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentData }) => updateSalePayment(id, paymentData),
    onMutate: async ({ id, paymentData }) => {
      await queryClient.cancelQueries({ queryKey: saleKeys.detail(id) });
      const previousSale = queryClient.getQueryData(saleKeys.detail(id));
      if (previousSale) {
        queryClient.setQueryData(saleKeys.detail(id), {
          ...previousSale,
          paidAmount: previousSale.paidAmount + paymentData.amount,
        });
      }
      return { previousSale };
    },
    onSuccess: (updatedSale) => {
      queryClient.setQueryData(saleKeys.detail(updatedSale.id), updatedSale);
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
      // صفِ ارسال مبلغ فاکتور را در ستون «مبلغ» نشان می‌دهد — قرینه‌ی
      // همین مسیر در سمت خرید.
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.all });
      toast.success('دریافت وجه با موفقیت ثبت شد');
    },
    onError: (error, variables, context) => {
      if (context?.previousSale) {
        queryClient.setQueryData(saleKeys.detail(variables.id), context.previousSale);
      }
      toast.error(error?.message || 'خطا در ثبت دریافت وجه');
    },
  });
};

export const useRemoveSaleMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: removeSale,
    onSuccess: (removedSale) => {
      queryClient.removeQueries({ queryKey: saleKeys.detail(removedSale.id) });
      invalidateSalesEcosystem(queryClient, removedSale.id);
      toast.success("خرید با موفقیت حذف شد");
      navigate(ROUTES.SALES);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف خرید");
    },
  });
};
