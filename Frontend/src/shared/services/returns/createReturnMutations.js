import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import { routeWithId } from "@/shared/constants/routes";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * mutationهای مرجوعی — یک تعریف برای هر دو سمت (خرید و فروش). فایل‌های
 * `mutations.js`ِ مرجوعیِ خرید و فروش جز نامِ تابع‌های API، کلیدهای کش و مسیرها
 * خط‌به‌خط یکی بودند.
 *
 * هر عملیاتِ نوشتن *سندِ کاملِ به‌روزشده‌ی مرجوعی* را برمی‌گرداند: همان در کشِ
 * جزئیات می‌نشیند و بقیه‌ی اکوسیستمِ همان سمت (خرید/دریافت یا فروش/ارسال، کالاها،
 * دانه‌ها) باطل می‌شود. عملیاتِ تجمعی (ثبتِ مرجوعی، تصمیم، دورِ کالا، پرداخت) کلیدِ
 * ایدمپوتنسی می‌گیرد: تکرارِ یک درخواست یعنی دو بار جابه‌جاییِ کالا یا پول.
 *
 * @param config.api         `{ create, addResolution, removeResolution, executeGoodsRound,
 *                           executeMoneyEffect, reject, cancel, reopen, remove, updateAttachments }`
 * @param config.detailKey   `(id) => queryKey`ِ جزئیاتِ مرجوعی
 * @param config.invalidate  `(queryClient, documentId, { freshReturnId }) => void`ِ اکوسیستمِ همان سمت
 * @param config.documentIdOf `(returnDoc) => id`ِ سندِ مرجع (خرید/فروش)
 * @param config.routes      `{ detail, list }`
 */
export function createReturnMutations({ api, detailKey, invalidate, documentIdOf, routes }) {
  /** پاسخِ کامل مستقیم در کش؛ `freshReturnId` جلوی fetchِ دوباره‌اش را می‌گیرد. */
  const finalize = (queryClient, updated) => {
    queryClient.setQueryData(detailKey(updated.id), updated);
    invalidate(queryClient, documentIdOf(updated), { freshReturnId: updated.id });
  };

  /** mutationی که سندِ به‌روزشده برمی‌گرداند، با پیامِ موفقیت و خطای خودش. */
  const useReturnChange = (mutationFn, success, failure) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn,
      onSuccess: (updated) => {
        finalize(queryClient, updated);
        toast.success(success);
      },
      onError: (error) => toast.error(getErrorMessage(error, failure)),
    });
  };

  return {
    useCreate() {
      const queryClient = useQueryClient();
      const navigate = useNavigate();
      return useMutation({
        mutationFn: (payload) => api.create(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
        onSuccess: (created) => {
          toast.success("درخواست مرجوعی ثبت شد؛ حالا می‌توانید برایش تصمیم بگیرید");
          invalidate(queryClient, documentIdOf(created));
          navigate(routeWithId(routes.detail, created.id));
        },
        onError: (error) => toast.error(getErrorMessage(error, "ثبت مرجوعی انجام نشد")),
      });
    },

    /** ثبتِ تصمیم اثرِ مالی/کالاییِ فوری دارد؛ دوبار-کلیک یعنی دو بار جابه‌جایی. */
    useAddResolution(returnId) {
      return useReturnChange(
        (variables) =>
          api.addResolution(returnId, variables.claim, variables.composition, {
            idempotencyKey: idempotencyKeyFor(variables),
          }),
        "تصمیم ثبت شد",
        "ثبت تصمیم انجام نشد",
      );
    },

    useRemoveResolution(returnId) {
      return useReturnChange(
        ({ claimId, resolutionId }) => api.removeResolution(returnId, claimId, resolutionId),
        "تصمیم حذف شد",
        "حذف تصمیم انجام نشد",
      );
    },

    /**
     * یک دور جابه‌جاییِ فیزیکیِ کالا — صفحه‌های «دریافت» و «ارسال»ِ انبار هر دو از آن
     * استفاده می‌کنند (یک عملیات با جهتِ مخالف). تجمعی است (`appliedQuantity` جمع می‌شود).
     */
    useExecuteGoodsRound(returnId) {
      return useReturnChange(
        (payload) => api.executeGoodsRound(returnId, payload, { idempotencyKey: idempotencyKeyFor(payload) }),
        "جابه‌جایی کالا ثبت شد",
        "ثبت جابه‌جایی کالا انجام نشد",
      );
    },

    /** ثبتِ پرداختِ یک وعده‌ی مالی — اثرِ `PENDING` را `APPLIED` می‌کند. */
    useExecuteMoneyEffect() {
      return useReturnChange(
        (payload) => api.executeMoneyEffect(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
        "پرداخت ثبت شد",
        "ثبت پرداخت انجام نشد",
      );
    },

    useReject(returnId) {
      return useReturnChange((reason) => api.reject(returnId, reason), "درخواست رد شد", "رد درخواست انجام نشد");
    },

    useCancel(returnId) {
      return useReturnChange((reason) => api.cancel(returnId, reason), "مرجوعی لغو شد", "لغو مرجوعی انجام نشد");
    },

    useReopen(returnId) {
      return useReturnChange(
        () => api.reopen(returnId),
        "مرجوعی دوباره برای بررسی باز شد",
        "بازگشایی مرجوعی انجام نشد",
      );
    },

    useRemove() {
      const queryClient = useQueryClient();
      const navigate = useNavigate();
      return useMutation({
        mutationFn: api.remove,
        onSuccess: (removed) => {
          queryClient.removeQueries({ queryKey: detailKey(removed.id) });
          invalidate(queryClient, documentIdOf(removed));
          toast.success("مرجوعی حذف شد");
          navigate(routes.list);
        },
        onError: (error) => toast.error(getErrorMessage(error, "حذف مرجوعی انجام نشد")),
      });
    },

    /** پیوست‌ها فقط سندِ مرجوعی را عوض می‌کنند. */
    useUpdateAttachments(returnId) {
      return useReturnChange(
        (attachments) => api.updateAttachments(returnId, attachments),
        "پیوست‌ها ذخیره شد",
        "ذخیره‌ی پیوست‌ها انجام نشد",
      );
    },
  };
}
