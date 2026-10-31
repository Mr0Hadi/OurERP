import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createTeam, updateTeam, deleteTeam } from "./api-v1";
import { invalidateOrgChart } from "../../services/invalidation";
import { getErrorMessage } from "@/shared/lib/errorMessage";

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      toast.success("تیم جدید با موفقیت ثبت شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در ثبت تیم")),
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeam,
    onSuccess: () => {
      toast.success("اطلاعات تیم با موفقیت ویرایش شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در ویرایش تیم")),
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      toast.success("تیم با موفقیت حذف شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در حذف تیم")),
  });
}
