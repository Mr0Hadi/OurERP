import { OBSERVED_PROBLEMS, problemLabels, problemSubset } from "./problems";

/**
 * مشاهده‌ی انباردار هنگامِ تحویل‌گرفتنِ کالای برگشتی — همان
 * `GoodsRoundObservationDto.Problem` در بکند (`ReturnProblemEnum`).
 *
 * فقط روی اثرِ ورودی (`GOODS_IN`) معنا دارد و فقط در
 * `ExecuteGoodsRound` فرستاده می‌شود؛ `ReceivePurchaseCommand` عمداً
 * چنین چیزی ندارد — مشکلِ کالای تامین‌کننده جدا با
 * `CreatePurchaseReturn` ثبت می‌شود.
 */
export const OBSERVATION_PROBLEMS = problemSubset(OBSERVED_PROBLEMS);

export const OBSERVATION_PROBLEM_LABELS = problemLabels(OBSERVED_PROBLEMS, {
  [OBSERVATION_PROBLEMS.DEFECTIVE]: "معیوب / خراب",
});

/**
 * پیش‌فرضِ یک ردیفِ مشاهده. کالا رسیده و جلوی چشمِ انباردار است، پس
 * «کسری» بی‌معناست.
 */
export const DEFAULT_OBSERVATION_PROBLEM = OBSERVATION_PROBLEMS.DEFECTIVE;
