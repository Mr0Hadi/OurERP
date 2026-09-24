import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  createSale,
  createInPersonSale,
  updateSale,
  updateSaleStatus,
  removeSale
} from './api-v1';
import { saleKeys } from './queryKeys';
import { ROUTES } from '@/shared/constants/routes';
import { useSaleFormStore } from '../store/saleFormStore';
import { invalidateSalesEcosystem } from './sharedInvalidation';
import { shippingKeys } from '@/features/warehouse/shipping/services/queryKeys';

export const useCreateSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSale,
    // `CreateSale` داده‌ای برنمی‌گرداند (فقط پیام)، پس شناسه‌ای هم در کار
    // نیست؛ خواندنِ `created.id` بعد از یک ثبتِ موفق خطا می‌داد.
    onSuccess: (created) => {
      toast.success('فروش با موفقیت ثبت شد');
      invalidateSalesEcosystem(queryClient, created?.id ?? null);
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ثبت فروش');
    },
  });
};

/** فروشِ حضوری: یک درخواستِ اتمی که ثبت، خروجِ کالا و «تحویل کامل» را انجام می‌دهد. */
export const useCreateInPersonSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, scannedBarcodes }) =>
      createInPersonSale(payload, scannedBarcodes),
    onSuccess: (created) => {
      toast.success('فروش حضوری ثبت و تحویل شد');
      invalidateSalesEcosystem(queryClient, created.id);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ثبت فروش حضوری');
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
    // `updateSaleStatus` سندِ تازه‌خوانده را برمی‌گرداند (`UpdateSale` خودش
    // `data` ندارد). شناسه از ورودی خوانده می‌شود، نه از پاسخ.
    onSuccess: (updatedSale, { id }) => {
      if (updatedSale) queryClient.setQueryData(saleKeys.detail(id), updatedSale);
      // تغییر دستی وضعیت فروش می‌تواند واجدشرایط‌بودنِ آن برای «ارسال
      // انبار» یا «مرجوعی فروش» را هم تغییر دهد.
      invalidateSalesEcosystem(queryClient, id);
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

export const useRemoveSaleMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: removeSale,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: saleKeys.detail(id) });
      invalidateSalesEcosystem(queryClient);
      toast.success("فروش با موفقیت حذف شد");
      navigate(ROUTES.SALES);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف فروش");
    },
  });
};
