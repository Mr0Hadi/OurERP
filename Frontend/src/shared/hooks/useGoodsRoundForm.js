import { useCallback, useMemo, useState } from "react";
import { clampQuantity } from "@/shared/lib/quantityUtils";
import { todayIso } from "@/shared/lib/dateUtils";
import { draftId } from "@/shared/lib/draftId";
import { formatNumber } from "@/shared/lib/numberFormat";

const emptyHeader = () => ({
  date: todayIso(),
  partyName: "",
  partyPhoneNumber: "",
  vehiclePlate: "",
  note: "",
});

const never = () => false;
const always = () => true;
const none = () => null;

/** کدهای مشاهده‌ها را به دانه‌هایی که هنوز در فهرستِ اسکنِ ردیف‌اند هرس می‌کند. */
const pruneObservationCodes = (observations, scanned) =>
  observations.map((observation) => {
    if (!observation.productUnitBarcodes) return observation;
    const kept = observation.productUnitBarcodes.filter((code) => scanned.includes(code));
    return { ...observation, productUnitBarcodes: kept, quantity: kept.length };
  });

/**
 * فرمِ یک «دورِ کالا» روی یک مرجوعی — بدنه‌ی `ExecuteGoodsRoundCommand`.
 *
 * یک هوک برای هر دو سمت، چون خودِ دستور هم یکی است: سمتِ فروش
 * `SaleReturn/ExecuteGoodsRound` و سمتِ خرید
 * `PurchaseReturn/ExecuteGoodsRound` بدنه‌ی یکسانی دارند و تنها فیلدِ
 * شناسه فرق می‌کند (لایه‌ی `api-v1` هر سمت خودش آن را می‌گذارد).
 *
 * هر ردیف علاوه بر مقدار دو فیلدِ اختیاری دارد:
 *
 *  • `source` — عودت به تامین‌کننده از موجودی (IN_STOCK) یا قرنطینه
 *    (QUARANTINED). سرور حدس نمی‌زند؛ `sourceRequired(line)` می‌گوید کدام
 *    ردیف باید آن را داشته باشد و `defaultSource(line)` پیشنهادِ اولیه است.
 *  • `productUnitBarcodes` — دانه‌های اسکن‌شده؛ یا به تعدادِ دقیقِ ردیف یا
 *    هیچ. `barcodesRequired(line, source)` می‌گوید اسکن الزامی است یا نه —
 *    مبدأ هم ورودی است، چون برداشتن از قفسه با برداشتن از قرنطینه فرق دارد.
 *
 * `observations` فقط برای اثرِ ورودی (`GOODS_IN`) معنا دارد: مقدارِ سالم
 * را خودِ بکند از `quantity` منهای مجموعِ مشاهده‌ها حساب می‌کند.
 *
 * @param lines خروجیِ `buildGoodsLines` (فیلترشده روی `remainingQuantity > 0`).
 */
export function useGoodsRoundForm(
  lines,
  {
    withObservations = false,
    sourceRequired = never,
    defaultSource = none,
    barcodesRequired = never,
    // آیا این ردیف اصلاً اسکنِ دانه می‌پذیرد (`withBarcodes` در بخشِ اقلام)؟
    barcodesAllowed = always,
    // صفحه‌ی محموله: اثرهای مرجوعی کنارِ اقلامِ خودِ سند نشان داده می‌شوند
    // و نباید بی‌آنکه انباردار دست بزند همراهِ آن‌ها ثبت شوند.
    startEmpty = false,
  } = {},
) {
  const toRound = useCallback(
    (line) => ({
      effectId: line.effectId,
      direction: line.direction,
      // فقط وقتی ردیف‌های چند مرجوعی کنار هم‌اند (صفحه‌ی محموله).
      returnId: line.returnId ?? null,
      reference: line.reference ?? "",
      problem: line.problem ?? null,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      unit: line.unit,
      remainingQuantity: line.remainingQuantity,
      // مقدارِ همین دور؛ پیش‌فرض روی کلِ باقیمانده چون حالتِ پرتکرار
      // «همه‌اش رسید/رفت» است — مگر در صفحه‌ی محموله.
      quantity: startEmpty ? 0 : line.remainingQuantity,
      observations: [],
      sourceRequired: sourceRequired(line),
      source: defaultSource(line),
      barcodesRequired: barcodesRequired(line, defaultSource(line)),
      barcodesAllowed: barcodesAllowed(line),
      productUnitBarcodes: [],
    }),
    [sourceRequired, defaultSource, barcodesRequired, barcodesAllowed, startEmpty],
  );

  const [header, setHeaderState] = useState(emptyHeader);
  const [rounds, setRounds] = useState(() => (lines || []).map(toRound));

  // کلیدِ نسخه از خودِ اثرها ساخته می‌شود: بعد از ثبتِ یک دور،
  // `remainingQuantity`ها عوض می‌شوند و فرم باید از نو پر شود. `barcodesRequired`
  // و `defaultSource` هم در کلیدند چون به داده‌ای بستگی دارند که دیرتر می‌رسد.
  //
  // ریست در همان رندر انجام می‌شود، نه در effect — الگوی رسمیِ «ریستِ
  // state با تغییرِ prop».
  const linesVersion = (lines || [])
    .map((line) => `${line.effectId}:${line.remainingQuantity}:${barcodesRequired(line, defaultSource(line))}:${defaultSource(line)}`)
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

  const patchRound = useCallback((effectId, patch) => {
    setRounds((current) =>
      current.map((round) =>
        round.effectId === effectId ? { ...round, ...patch(round) } : round,
      ),
    );
  }, []);

  const handleQuantityChange = useCallback(
    (effectId, value) => {
      patchRound(effectId, (round) => {
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
        const productUnitBarcodes = round.productUnitBarcodes.slice(0, quantity);
        return {
          quantity,
          observations: pruneObservationCodes(observations, productUnitBarcodes),
          productUnitBarcodes,
        };
      });
    },
    [patchRound],
  );

  const handleSourceChange = useCallback(
    (effectId, source) =>
      patchRound(effectId, (round) => ({
        source,
        barcodesRequired: barcodesRequired(round, source),
      })),
    [patchRound, barcodesRequired],
  );

  const handleBarcodesChange = useCallback(
    (effectId, productUnitBarcodes) =>
      patchRound(effectId, (round) => ({
        productUnitBarcodes,
        observations: pruneObservationCodes(round.observations, productUnitBarcodes),
      })),
    [patchRound],
  );

  /**
   * وقتی دانه‌های ردیف اسکن شده‌اند، هر مشاهده باید بگوید *کدام* دانه‌ها
   * معیوب‌اند (سرور دقیقاً همین را می‌خواهد: بارکدهای معیوب زیرمجموعه‌ی
   * بارکدهای ردیف و به تعدادِ مشاهده). مقدارِ مشاهده همان تعدادِ انتخاب‌شده است.
   */
  const handleToggleObservationBarcode = useCallback(
    (effectId, observationId, code) => {
      patchRound(effectId, (round) => ({
        observations: round.observations.map((observation) => {
          const codes = observation.productUnitBarcodes || [];
          if (observation.id !== observationId) {
            // یک دانه فقط در یک مشاهده.
            if (!codes.includes(code)) return observation;
            const kept = codes.filter((candidate) => candidate !== code);
            return { ...observation, productUnitBarcodes: kept, quantity: kept.length };
          }
          const next = codes.includes(code)
            ? codes.filter((candidate) => candidate !== code)
            : [...codes, code];
          return { ...observation, productUnitBarcodes: next, quantity: next.length };
        }),
      }));
    },
    [patchRound],
  );

  const allocatedOf = (round) =>
    (round.observations || []).reduce(
      (sum, observation) => sum + (Number(observation.quantity) || 0),
      0,
    );

  const handleAddObservation = useCallback(
    (effectId, problem) => {
      patchRound(effectId, (round) => {
        const remaining = round.quantity - allocatedOf(round);
        if (remaining <= 0) return {};
        // با دانه‌های اسکن‌شده، مقدار از انتخابِ دانه‌های معیوب می‌آید.
        const scanned = round.productUnitBarcodes.length > 0;
        return {
          observations: [
            ...round.observations,
            {
              id: draftId(),
              problem,
              quantity: scanned ? 0 : remaining,
              note: "",
              ...(scanned && { productUnitBarcodes: [] }),
            },
          ],
        };
      });
    },
    [patchRound],
  );

  const handleUpdateObservation = useCallback(
    (effectId, observationId, field, value) => {
      patchRound(effectId, (round) => ({
        observations: round.observations.map((observation) => {
          if (observation.id !== observationId) return observation;
          if (field !== "quantity") return { ...observation, [field]: value };

          const otherAllocated = round.observations
            .filter((entry) => entry.id !== observationId)
            .reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
          return {
            ...observation,
            quantity: clampQuantity(value, round.quantity - otherAllocated),
          };
        }),
      }));
    },
    [patchRound],
  );

  const handleRemoveObservation = useCallback(
    (effectId, observationId) => {
      patchRound(effectId, (round) => ({
        observations: round.observations.filter(
          (observation) => observation.id !== observationId,
        ),
      }));
    },
    [patchRound],
  );

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

  /** نخستین دلیلی که ثبت را ناممکن می‌کند — همان قواعدی که سرور با ۴۰۰ اعمال می‌کند. */
  const blockingReason = useMemo(() => {
    for (const round of rounds) {
      const quantity = Number(round.quantity) || 0;
      if (quantity <= 0) continue;
      if (round.sourceRequired && round.source == null) {
        return `مبدأ «${round.productName}» را مشخص کنید: موجودی انبار یا قرنطینه`;
      }
      const scanned = round.productUnitBarcodes.length;
      if (round.barcodesRequired && scanned !== quantity) {
        return `«${round.productName}» ردیابی‌پذیر است؛ همه‌ی ${formatNumber(quantity)} دانه را اسکن کنید`;
      }
      if (scanned > 0 && scanned !== quantity) {
        return `تعداد دانه‌های اسکن‌شده‌ی «${round.productName}» با مقدار ردیف برابر نیست`;
      }
      if (
        scanned > 0 &&
        round.observations.some(
          (observation) =>
            (Number(observation.quantity) || 0) > 0 &&
            (observation.productUnitBarcodes || []).length !== Number(observation.quantity),
        )
      ) {
        return `برای مشاهده‌های «${round.productName}» مشخص کنید کدام دانه‌های اسکن‌شده معیوب‌اند`;
      }
    }
    return null;
  }, [rounds]);

  /**
   * بدنه‌ی دستور، بدونِ فیلدِ شناسه‌ی مرجوعی. ردیفِ با مقدارِ صفر
   * فرستاده نمی‌شود: بکند `Quantity > 0` می‌خواهد و کلِ درخواست را
   * به‌خاطرِ یک ردیفِ صفر رد می‌کند.
   */
  const toApiRound = useCallback(
    (round) => ({
      effectId: round.effectId,
      quantity: Number(round.quantity) || 0,
      source: round.source ?? undefined,
      productUnitBarcodes:
        round.productUnitBarcodes.length > 0 ? round.productUnitBarcodes : undefined,
      observations: withObservations
        ? round.observations
            .filter((observation) => (Number(observation.quantity) || 0) > 0)
            .map((observation) => ({
              problem: observation.problem,
              quantity: Number(observation.quantity) || 0,
              note: observation.note || undefined,
              productUnitBarcodes: observation.productUnitBarcodes?.length
                ? observation.productUnitBarcodes
                : undefined,
            }))
        : [],
    }),
    [withObservations],
  );

  const headerOf = (source) => ({
    date: source.date || undefined,
    partyName: source.partyName || undefined,
    partyPhoneNumber: source.partyPhoneNumber || undefined,
    vehiclePlate: source.vehiclePlate || undefined,
    note: source.note || undefined,
  });

  const activeRounds = rounds.filter((round) => (Number(round.quantity) || 0) > 0);

  const buildCommand = () => ({
    ...headerOf(header),
    rounds: activeRounds.map(toApiRound),
  });

  /**
   * یک دستورِ `ExecuteGoodsRound` برای هر مرجوعی — برای صفحه‌ی محموله که
   * اثرهای چند مرجوعی را کنار هم اجرا می‌کند. سربرگ (تاریخ، راننده، ...) از
   * فراخوان می‌آید چون همان مشخصاتِ خودِ محموله است.
   */
  const buildCommandsByReturn = (sharedHeader, returnIdField) => {
    const byReturn = new Map();
    activeRounds.forEach((round) => {
      const list = byReturn.get(round.returnId) ?? [];
      list.push(toApiRound(round));
      byReturn.set(round.returnId, list);
    });
    return [...byReturn.entries()].map(([returnId, apiRounds]) => ({
      [returnIdField]: returnId,
      ...headerOf(sharedHeader),
      rounds: apiRounds,
    }));
  };

  return {
    header,
    setHeader,
    rounds,
    handleQuantityChange,
    handleSourceChange,
    handleBarcodesChange,
    handleToggleObservationBarcode,
    handleAddObservation,
    handleUpdateObservation,
    handleRemoveObservation,
    isAllComplete,
    hasSomethingToRecord,
    blockingReason,
    buildCommand,
    buildCommandsByReturn,
  };
}
