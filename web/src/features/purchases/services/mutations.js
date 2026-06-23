import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createPurchase } from './api';
import { purchaseKeys } from './queryKeys';
import { useNavigate } from 'react-router-dom';

export const useCreatePurchaseMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      toast.success('خرید با موفقیت ثبت شد');
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      navigate(-1);
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ثبت خرید');
    },
  });
};