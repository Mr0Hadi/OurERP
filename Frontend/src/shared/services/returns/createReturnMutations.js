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

  function useCreate() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
      mutationFn: (payload) => api.create(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
      onSuccess: (created) => {
        toast.success("مرجوعی ثبت شد؛ حالا برای هر ادعا تصمیم بگیرید");
        invalidate(queryClient, documentIdOf(created));
        navigate(routeWithId(routes.detail, created.id));
      },
      onError: (error) => toast.error(getErrorMessage(error, "ثبت مرجوعی انجام نشد")),
    });
  }

  /** ثبتِ تصمیم اثرِ مالی/کالاییِ فوری دارد؛ دوبار-کلیک یعنی دو بار جابه‌جایی. */
  const useAddResolution = (returnId) =>
    useReturnChange(
      (variables) =>
        api.addResolution(returnId, variables.claim, variables.composition, {
          idempotencyKey: idempotencyKeyFor(variables),
        }),
      "تصمیم ثبت شد",
      "ثبت تصمیم انجام نشد",
    );

  const useRemoveResolution = (returnId) =>
    useReturnChange(
      ({ claimId, resolutionId }) => api.removeResolution(returnId, claimId, resolutionId),
      "تصمیم حذف شد",
      "حذف تصمیم انجام نشد",
    );

  /**
   * یک دور جابه‌جاییِ فیزیکیِ کالا — صفحه‌های «دریافت» و «ارسال»ِ انبار هر دو از آن
   * استفاده می‌کنند (یک عملیات با جهتِ مخالف). تجمعی است (`appliedQuantity` جمع می‌شود).
   */
  const useExecuteGoodsRound = (returnId) =>
    useReturnChange(
      (payload) => api.executeGoodsRound(returnId, payload, { idempotencyKey: idempotencyKeyFor(payload) }),
      "جابه‌جایی کالا ثبت شد",
      "ثبت جابه‌جایی کالا انجام نشد",
    );

  /** ثبتِ پرداختِ یک وعده‌ی مالی — اثرِ `PENDING` را `APPLIED` می‌کند. */
  const useExecuteMoneyEffect = () =>
    useReturnChange(
      (payload) => api.executeMoneyEffect(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
      "پرداخت ثبت شد",
      "ثبت پرداخت انجام نشد",
    );

  const useReject = (returnId) =>
    useReturnChange((reason) => api.reject(returnId, reason), "مرجوعی رد شد", "ثبتِ رد انجام نشد");

  const useCancel = (returnId) =>
    useReturnChange((reason) => api.cancel(returnId, reason), "مرجوعی لغو شد", "لغو مرجوعی انجام نشد");

  const useReopen = (returnId) =>
    useReturnChange(
      () => api.reopen(returnId),
      "مرجوعی دوباره برای تصمیم‌گیری باز شد",
      "بازگشایی مرجوعی انجام نشد",
    );

  function useRemove() {
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
  }

  /** پیوست‌ها فقط سندِ مرجوعی را عوض می‌کنند. */
  const useUpdateAttachments = (returnId) =>
    useReturnChange(
      (attachments) => api.updateAttachments(returnId, attachments),
      "پیوست‌ها ذخیره شد",
      "ذخیره‌ی پیوست‌ها انجام نشد",
    );

  /**
   * همه‌ی کارهای صفحه‌ی جزئیات، آماده‌ی وصل‌شدن به `ReturnResolutionSection` و
   * `DeleteReturnAction`. `isBusy` یعنی یکی از آن‌ها در جریان است؛ در این فاصله
   * دکمه‌های دیگر غیرفعال‌اند تا دو تغییر روی یک سند هم‌زمان نروند.
   */
  function useDetailActions(returnId) {
    const add = useAddResolution(returnId);
    const removeResolution = useRemoveResolution(returnId);
    const executeMoney = useExecuteMoneyEffect();
    const reject = useReject(returnId);
    const cancel = useCancel(returnId);
    const reopen = useReopen(returnId);
    const remove = useRemove();

    return {
      isBusy: [add, removeResolution, executeMoney, reject, cancel, reopen, remove].some(
        (mutation) => mutation.isPending,
      ),
      onAddResolution: (claim, composition) => add.mutate({ claim, composition }),
      onRemoveResolution: (claimId, resolutionId) => removeResolution.mutate({ claimId, resolutionId }),
      onExecuteMoney: (effect) => executeMoney.mutate({ effectId: effect.id }),
      // `options.onSuccess` دیالوگِ دلیل را بعد از موفقیت می‌بندد.
      onReject: (reason, options) => reject.mutate(reason, options),
      onCancel: (reason, options) => cancel.mutate(reason, options),
      onReopen: () => reopen.mutate(),
      onDelete: () => remove.mutate(returnId),
      isDeleting: remove.isPending,
    };
  }

  return {
    useCreate,
    useExecuteGoodsRound,
    useUpdateAttachments,
    useDetailActions,
  };
}
