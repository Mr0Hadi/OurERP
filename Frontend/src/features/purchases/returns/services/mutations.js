import {
  createPurchaseReturn,
  addClaimResolution,
  removeClaimResolution,
  executeGoodsRound,
  executeMoneyEffect,
  rejectPurchaseReturn,
  cancelPurchaseReturn,
  reopenPurchaseReturn,
  removePurchaseReturn,
  updatePurchaseReturnAttachments,
} from "./api-v1";
import { purchaseReturnKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "../../orders/services/sharedInvalidation";
import { createReturnMutations } from "@/shared/services/returns/createReturnMutations";
import { ROUTES } from "@/shared/constants/routes";

/** mutationهای مرجوعیِ خرید (`createReturnMutations`). */
const mutations = createReturnMutations({
  api: {
    create: createPurchaseReturn,
    addResolution: addClaimResolution,
    removeResolution: removeClaimResolution,
    executeGoodsRound,
    executeMoneyEffect,
    reject: rejectPurchaseReturn,
    cancel: cancelPurchaseReturn,
    reopen: reopenPurchaseReturn,
    remove: removePurchaseReturn,
    updateAttachments: updatePurchaseReturnAttachments,
  },
  detailKey: purchaseReturnKeys.detail,
  invalidate: invalidatePurchaseEcosystem,
  documentIdOf: (doc) => doc.purchaseId,
  routes: { detail: ROUTES.PURCHASES_RETURNS_DETAIL, list: ROUTES.PURCHASES_RETURNS_LIST },
});

export const useCreatePurchaseReturnMutation = mutations.useCreate;
export const useAddClaimResolutionMutation = mutations.useAddResolution;
export const useRemoveClaimResolutionMutation = mutations.useRemoveResolution;
export const useExecuteGoodsRoundMutation = mutations.useExecuteGoodsRound;
export const useExecuteMoneyEffectMutation = mutations.useExecuteMoneyEffect;
export const useRejectPurchaseReturnMutation = mutations.useReject;
export const useCancelPurchaseReturnMutation = mutations.useCancel;
export const useReopenPurchaseReturnMutation = mutations.useReopen;
export const useRemovePurchaseReturnMutation = mutations.useRemove;
export const useUpdatePurchaseReturnAttachmentsMutation = mutations.useUpdateAttachments;
