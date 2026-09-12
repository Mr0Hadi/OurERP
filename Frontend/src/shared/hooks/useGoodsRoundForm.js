import { useCallback, useMemo, useState } from "react";
import { clampQuantity } from "@/shared/lib/quantityUtils";

/**
 * فرمِ یک «دورِ کالا» روی یک مرجوعی — بدنه‌ی `ExecuteGoodsRoundCommand`.
 *
 * یک هوک برای هر دو سمت، چون خودِ دستور هم یکی است: سمتِ فروش
 * `SaleReturn/ExecuteGoodsRound` و سمتِ خرید
 * `PurchaseReturn/ExecuteGoodsRound` بدنه‌ی یکسانی دارند و تنها فیلدِ
 * شناسه فرق می‌کند (لایه‌ی `api-v1` هر سمت خودش آن را می‌گذارد).
 *
 * `observations` فقط برای اثرِ ورودی (`GOODS_IN`) معنا دارد: مقدارِ سالم
 * را خودِ بکند از `quantity` منهای مجموعِ مشاهده‌ها حساب می‌کند، پس هرگز
 * دو عددِ ناسازگار فرستاده نمی‌شود.
 *
 * برخلافِ فرم‌های دریافت/ارسال، این فرم استورِ سراسری ندارد: عمرش دقیقاً
 * عمرِ همان صفحه است و با هر بار باز شدنِ سندِ تازه از نو ساخته می‌شود.
 *
 * @param lines خروجیِ `buildGoodsLines` (فیلترشده روی `remainingQuantity > 0`).
 * @param withObservations فرم، بخشِ مشاهده‌ی انباردار را هم نشان بدهد.
 */
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const emptyHeader = () => ({
  date: new Date().toISOString().slice(0, 10),
  partyName: "",
  partyNationalId: "",
  vehiclePlate: "",
  note: "",
});

function toRound(line) {
  return {
    effectId: line.effectId,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    remainingQuantity: line.remainingQuantity,
    // مقدارِ همین دور؛ پیش‌فرض روی کلِ باقیمانده چون حالتِ پرتکرار
    // «همه‌اش رسید/رفت» است.
    quantity: line.remainingQuantity,
    observations: [],
  };
}

export function useGoodsRoundForm(lines, { withObservations = false } = {}) {
  const [header, setHeaderState] = useState(emptyHeader);
  const [rounds, setRounds] = useState(() => (lines || []).map(toRound));

  // کلیدِ نسخه از خودِ اثرها ساخته می‌شود: بعد از ثبتِ یک دور،
  // `remainingQuantity`ها عوض می‌شوند و فرم باید از نو پر شود.
  //
  // ریست در همان رندر انجام می‌شود، نه در effect — الگوی رسمیِ «ریستِ
  // state با تغییرِ prop». داخلِ effect یک رندرِ اضافه با مقادیرِ کهنه
  // تولید می‌کرد.
  const linesVersion = (lines || [])
    .map((line) => `${line.effectId}:${line.remainingQuantity}`)
    .join(",");
  const [lastLinesVersion, setLastLinesVersion] = useState(linesVersion);
  if (lastLinesVersion !== linesVersion) {
    setLastLinesVersion(linesVersion);
    setRounds((lines || []).map(toRound));
  }

  const setHeader = useCallback(
    (patch) => setHeaderState((current) => ({ ...current, ...patch })),
    [],
  );

  const handleQuantityChange = useCallback(
    (effectId, value) => {
      setRounds((current) =>
        current.map((round) => {
          if (round.effectId !== effectId) return round;
          const quantity = clampQuantity(value, round.remainingQuantity);
          // مشاهده‌ها نمی‌توانند از مقدارِ همین دور بیشتر شوند؛ با کم‌شدنِ
          // مقدار، ردیف‌های اضافه هرس می‌شوند تا بکند درخواست را رد نکند.
          let budget = quantity;
          const observations = [];
          for (const observation of round.observations) {
            if (budget <= 0) break;
            const trimmed = Math.min(Number(observation.quantity) || 0, budget);
            if (trimmed > 0) {
              observations.push({ ...observation, quantity: trimmed });
              budget -= trimmed;
            }
          }
          return { ...round, quantity, observations };
        }),
      );
    },
    [],
  );

  const allocatedOf = (round) =>
    (round.observations || []).reduce(
      (sum, observation) => sum + (Number(observation.quantity) || 0),
      0,
    );

  const handleAddObservation = useCallback((effectId, problem) => {
    setRounds((current) =>
      current.map((round) => {
        if (round.effectId !== effectId) return round;
        const remaining = round.quantity - allocatedOf(round);
        if (remaining <= 0) return round;
        return {
          ...round,
          observations: [
            ...round.observations,
            { id: generateId(), problem, quantity: remaining, note: "" },
          ],
        };
      }),
    );
  }, []);

  const handleUpdateObservation = useCallback(
    (effectId, observationId, field, value) => {
      setRounds((current) =>
        current.map((round) => {
          if (round.effectId !== effectId) return round;
          const observations = round.observations.map((observation) => {
            if (observation.id !== observationId) return observation;
            if (field !== "quantity") return { ...observation, [field]: value };

            const otherAllocated = round.observations
              .filter((entry) => entry.id !== observationId)
              .reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
            return {
              ...observation,
              quantity: clampQuantity(value, round.quantity - otherAllocated),
            };
          });
          return { ...round, observations };
        }),
      );
    },
    [],
  );

  const handleRemoveObservation = useCallback((effectId, observationId) => {
    setRounds((current) =>
      current.map((round) =>
        round.effectId === effectId
          ? {
              ...round,
              observations: round.observations.filter(
                (observation) => observation.id !== observationId,
              ),
            }
          : round,
      ),
    );
  }, []);

  const isAllComplete = useMemo(
    () =>
      rounds.length > 0 &&
      rounds.every((round) => round.quantity >= round.remainingQuantity),
    [rounds],
  );

  const hasSomethingToRecord = useMemo(
    () => rounds.some((round) => (Number(round.quantity) || 0) > 0),
    [rounds],
  );

  /**
   * بدنه‌ی دستور، بدونِ فیلدِ شناسه‌ی مرجوعی. ردیفِ با مقدارِ صفر
   * فرستاده نمی‌شود: بکند `Quantity > 0` می‌خواهد و کلِ درخواست را
   * به‌خاطرِ یک ردیفِ صفر رد می‌کند.
   */
  const buildCommand = useCallback(
    () => ({
      date: header.date || undefined,
      partyName: header.partyName || undefined,
      partyNationalId: header.partyNationalId || undefined,
      vehiclePlate: header.vehiclePlate || undefined,
      note: header.note || undefined,
      rounds: rounds
        .filter((round) => (Number(round.quantity) || 0) > 0)
        .map((round) => ({
          effectId: round.effectId,
          quantity: Number(round.quantity) || 0,
          observations: withObservations
            ? round.observations
                .filter((observation) => (Number(observation.quantity) || 0) > 0)
                .map((observation) => ({
                  problem: observation.problem,
                  quantity: Number(observation.quantity) || 0,
                  note: observation.note || undefined,
                }))
            : [],
        })),
    }),
    [header, rounds, withObservations],
  );

  return {
    header,
    setHeader,
    rounds,
    handleQuantityChange,
    handleAddObservation,
    handleUpdateObservation,
    handleRemoveObservation,
    isAllComplete,
    hasSomethingToRecord,
    buildCommand,
  };
}
