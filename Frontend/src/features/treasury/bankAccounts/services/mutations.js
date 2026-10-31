import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import {
  createBankAccount,
  deactivateBankAccount,
  transferBetweenAccounts,
  updateBankAccount,
  voidTransfer,
} from "./api-v1";
import { bankAccountKeys } from "@/shared/services/bankAccounts/queryKeys";

/**
 * هر نوشتن مانده‌ها، جمع‌ها و گردش‌ها را عوض می‌کند (مانده‌ی اول دوره همه‌ی مانده‌های بعدی را جابه‌جا
 * می‌کند)؛ همه‌ی کلیدهای این فیچر با هم باطل می‌شوند.
 */
function useBankAccountMutation({ mutationFn, success, failure }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
      toast.success(success);
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  });
}

export const useCreateBankAccountMutation = () =>
  useBankAccountMutation({
    mutationFn: createBankAccount,
    success: "حساب ثبت شد",
    failure: "ثبتِ حساب انجام نشد",
  });

export const useUpdateBankAccountMutation = () =>
  useBankAccountMutation({
    mutationFn: updateBankAccount,
    success: "حساب ویرایش شد",
    failure: "ویرایشِ حساب انجام نشد",
  });

export const useDeactivateBankAccountMutation = () =>
  useBankAccountMutation({
    mutationFn: deactivateBankAccount,
    success: "حساب غیرفعال شد",
    failure: "غیرفعال‌کردنِ حساب انجام نشد",
  });

export const useTransferBetweenAccountsMutation = () =>
  useBankAccountMutation({
    // تکرارِ درخواست بی کلید یعنی دو انتقال.
    mutationFn: (body) =>
      transferBetweenAccounts(body, { idempotencyKey: idempotencyKeyFor(body, "bank-transfer") }),
    success: "انتقال ثبت شد",
    failure: "ثبتِ انتقال انجام نشد",
  });

export const useVoidTransferMutation = () =>
  useBankAccountMutation({
    mutationFn: voidTransfer,
    success: "انتقال ابطال شد",
    failure: "ابطالِ انتقال انجام نشد",
  });
