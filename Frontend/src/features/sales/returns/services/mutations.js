import {
  createSalesReturn,
  addClaimResolution,
  removeClaimResolution,
  executeGoodsRound,
  executeMoneyEffect,
  rejectSalesReturn,
  cancelSalesReturn,
  reopenSalesReturn,
  removeSalesReturn,
  updateSalesReturnAttachments,
} from "./api-v1";
import { salesReturnKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "../../orders/services/sharedInvalidation";
import { createReturnMutations } from "@/shared/services/returns/createReturnMutations";
import { ROUTES } from "@/shared/constants/routes";

/** mutationهای مرجوعیِ فروش (`createReturnMutations`). */
const mutations = createReturnMutations({
  api: {
    create: createSalesReturn,
    addResolution: addClaimResolution,
    removeResolution: removeClaimResolution,
    executeGoodsRound,
    executeMoneyEffect,
    reject: rejectSalesReturn,
    cancel: cancelSalesReturn,
    reopen: reopenSalesReturn,
    remove: removeSalesReturn,
    updateAttachments: updateSalesReturnAttachments,
  },
  detailKey: salesReturnKeys.detail,
  invalidate: invalidateSalesEcosystem,
  documentIdOf: (doc) => doc.saleId,
  routes: { detail: ROUTES.SALES_RETURNS_DETAIL, list: ROUTES.SALES_RETURNS_LIST },
});

export const useCreateSalesReturnMutation = mutations.useCreate;
export const useExecuteGoodsRoundMutation = mutations.useExecuteGoodsRound;
export const useUpdateSalesReturnAttachmentsMutation = mutations.useUpdateAttachments;
/** همه‌ی کارهای صفحه‌ی جزئیات + `isBusy`. */
export const useSalesReturnActions = mutations.useDetailActions;
