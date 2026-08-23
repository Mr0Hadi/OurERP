/**
 * هارنس وارسی مرجوعی فروش — هم دامنه و هم موتور اثر.
 *
 * چرا لازم است: منطق مرجوعی، منطقِ ترکیبی است — هر تصمیم به چند اثر باز
 * می‌شود و اثرها روی پول و موجودی و وضعیت می‌نشینند. درستیِ این ترکیب‌ها
 * را نه با نگاه‌کردن به UI می‌شود دید و نه با تایپ‌چک؛ باید اجرا شوند.
 * این اسکریپت سناریوهای واقعیِ کسب‌وکار را مستقیم روی ماژول‌های
 * src/features/sales/returns اجرا می‌کند، بدون بالا آوردن اپ.
 *
 * چون ماژول‌های پروژه import های بدون پسوند و alias دارند (قرارداد
 * Vite) و Node آن‌ها را نمی‌شناسد، یک resolve hook کوچک ثبت می‌شود.
 *
 * اجرا:  pnpm check:returns    (یا: node scripts/check-sales-returns.js)
 */
import { register } from "node:module";

register("./extensionless-resolver.js", import.meta.url);

const DOMAIN = "../src/shared/domain/returns";
const SALES_DOMAIN = "../src/features/sales/returns/domain";

const { CLAIM_SCOPES, RETURN_PROBLEMS, SALES_RETURN_STATUSES, RETURN_PROBLEM_LABELS } =
  await import(`${SALES_DOMAIN}/returnVocabulary.js`);

const {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  PAYMENT_METHODS,
  affectsInvoiceTotal,
  summarizeEffects,
  stockDeltasOf,
  observationsOf,
} = await import(`${DOMAIN}/effects.js`);

const {
  MONEY_DIRECTIONS,
  methodsForDirection,
  moneyAmountOf,
  emptyComposition,
  buildResolution,
  expandComposition,
  validateComposition,
  deriveReturnStatus,
  claimRemainingQty,
  canDeleteReturn,
  summarizeReturn,
  buildGoodsLines,
} = await import(`${DOMAIN}/resolutions.js`);

let failures = 0;
let sectionNo = 0;
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n) =>
  String(n)
    .split("")
    .map((d) => FA_DIGITS[Number(d)])
    .join("");

/** سرتیترِ یک سناریو. شماره خودکار است تا با جابه‌جایی بخش‌ها جا نیفتد. */
const section = (title) => console.log(`
${faNum(++sectionNo)}) ${title}`);

const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name} ${extra}`);
  }
};

const brakePad = {
  productId: 1,
  productCode: "BRK-001",
  productName: "لنت ترمز جلو",
  unit: "دست",
  unitPrice: 2_000_000,
  scope: CLAIM_SCOPES.ON_INVOICE,
};
const premiumPad = {
  productId: 9,
  productCode: "BRK-009",
  productName: "لنت ترمز اسپرت",
  unit: "دست",
  unitPrice: 3_000_000,
};

const mkClaim = (over = {}) => ({
  id: "c1",
  ...brakePad,
  problem: RETURN_PROBLEMS.DEFECTIVE,
  qty: 10,
  resolutions: [],
  ...over,
});

const kindsOf = (fx) => fx.map((e) => e.kind).sort();
const money = (direction, amount, over = {}) => ({
  direction,
  amount,
  method: PAYMENT_METHODS.CASH,
  reference: "",
  parts: [],
  ...over,
});
const comp = (over = {}) => ({ ...emptyComposition(over.qty ?? 1), ...over });

section("واژگان");
check(
  "هر مشکل برچسب فارسی دارد",
  Object.values(RETURN_PROBLEMS).every((p) => Boolean(RETURN_PROBLEM_LABELS[p])),
);

section("ترکیب خالی هیچ اثری نمی‌سازد");
{
  const fx = expandComposition(comp({ qty: 4 }), mkClaim());
  check("هیچ اثری تولید نشد", fx.length === 0, fx.length);
}

section("فقط پس‌گرفتن کالا");
{
  const fx = expandComposition(comp({ qty: 4, goodsIn: { enabled: true, items: [] } }), mkClaim());
  check("یک اثر GOODS_IN", kindsOf(fx).join() === EFFECT_KINDS.GOODS_IN);
  check("تعدادش درست است", fx[0].qty === 4);
  check("معلق است تا انبار تحویل بگیرد", fx[0].status === EFFECT_STATUSES.PENDING);
}

section("پس‌گرفتن + پرداخت وجه");
{
  const fx = expandComposition(
    comp({ qty: 4, goodsIn: { enabled: true, items: [] }, money: money(MONEY_DIRECTIONS.PAY, 8_000_000) }),
    mkClaim(),
  );
  check(
    "دو اثر: GOODS_IN و MONEY_OUT",
    kindsOf(fx).join() === [EFFECT_KINDS.GOODS_IN, EFFECT_KINDS.MONEY_OUT].sort().join(),
    kindsOf(fx).join(),
  );
  const out = fx.find((e) => e.kind === EFFECT_KINDS.MONEY_OUT);
  check("مبلغ درست", out.amount === 8_000_000);
  check("روشش نقدی است", out.method === PAYMENT_METHODS.CASH);
  check("اثر پولی همان لحظه اعمال می‌شود", out.status === EFFECT_STATUSES.APPLIED);
}

section("اعتبار خرید بعدی — یک روشِ پرداخت، نه یک جهتِ جدا");
{
  const fx = expandComposition(
    comp({
      qty: 2,
      money: money(MONEY_DIRECTIONS.PAY, 4_000_000, {
        method: PAYMENT_METHODS.STORE_CREDIT,
      }),
    }),
    mkClaim(),
  );
  check("یک اثر MONEY_OUT", kindsOf(fx).join() === EFFECT_KINDS.MONEY_OUT);
  check("روشش اعتبار خرید بعدی است", fx[0].method === PAYMENT_METHODS.STORE_CREDIT);
  check("روی مبلغ فاکتور اثر نمی‌گذارد", affectsInvoiceTotal(fx[0].method) === false);
  check(
    "فقط در جهتِ پرداخت پیشنهاد می‌شود",
    methodsForDirection(MONEY_DIRECTIONS.PAY).includes(PAYMENT_METHODS.STORE_CREDIT) &&
      !methodsForDirection(MONEY_DIRECTIONS.RECEIVE).includes(
        PAYMENT_METHODS.STORE_CREDIT,
      ),
  );
}

section("نسیه و ترکیبی");
{
  const onAccount = expandComposition(
    comp({
      qty: 2,
      money: money(MONEY_DIRECTIONS.PAY, 3_000_000, {
        method: PAYMENT_METHODS.ON_ACCOUNT,
      }),
    }),
    mkClaim(),
  );
  check("نسیه یک اثر پولی می‌سازد", onAccount.length === 1);
  check(
    "نسیه برخلاف اعتبار، مبلغ فاکتور را جابه‌جا می‌کند",
    affectsInvoiceTotal(onAccount[0].method) === true,
  );

  const mixedMoney = money(MONEY_DIRECTIONS.PAY, "", {
    method: PAYMENT_METHODS.MIXED,
    parts: [
      { type: "cash", amount: 1_000_000 },
      { type: "check", amount: 2_500_000, checkNumber: "۱۲۳" },
      { type: "transfer", amount: 0 },
    ],
  });
  check(
    "مبلغ ترکیبی از جمع ردیف‌ها می‌آید",
    moneyAmountOf(mixedMoney) === 3_500_000,
    moneyAmountOf(mixedMoney),
  );

  const fx = expandComposition(comp({ qty: 2, money: mixedMoney }), mkClaim());
  check("یک اثر پولی با مبلغ کل", fx.length === 1 && fx[0].amount === 3_500_000);
  check("ردیف‌های صفر ذخیره نمی‌شوند", fx[0].parts.length === 2, fx[0].parts.length);
  check(
    "ترکیبی بدون هیچ ردیفِ معتبر رد می‌شود",
    validateComposition(
      comp({
        qty: 2,
        money: money(MONEY_DIRECTIONS.PAY, "", {
          method: PAYMENT_METHODS.MIXED,
          parts: [{ type: "cash", amount: 0 }],
        }),
      }),
      mkClaim(),
      { remainingQty: 10 },
    ).length > 0,
  );
  check(
    "اعتبار خرید بعدی در جهتِ دریافت رد می‌شود",
    validateComposition(
      comp({
        qty: 1,
        money: money(MONEY_DIRECTIONS.RECEIVE, 100, {
          method: PAYMENT_METHODS.STORE_CREDIT,
        }),
      }),
      mkClaim(),
      { remainingQty: 10 },
    ).length > 0,
  );
}

section("دریافت وجه از مشتری (کالای اضافه‌ای که نگه می‌دارد)");
{
  const off = mkClaim({ scope: CLAIM_SCOPES.OFF_INVOICE, qty: 3 });
  const fx = expandComposition(
    comp({ qty: 3, money: money(MONEY_DIRECTIONS.RECEIVE, 6_000_000) }),
    off,
  );
  check("یک اثر MONEY_IN", kindsOf(fx).join() === EFFECT_KINDS.MONEY_IN);
  check("مبلغ درست", fx[0].amount === 6_000_000);
}

section("تعویض با کالای دیگر + مابه‌التفاوت");
{
  const fx = expandComposition(
    comp({
      qty: 2,
      goodsIn: { enabled: true, items: [] },
      goodsOut: { enabled: true, items: [{ ...premiumPad, qty: 2 }] },
      money: money(MONEY_DIRECTIONS.RECEIVE, 2_000_000),
    }),
    mkClaim(),
  );
  check("سه اثر ساخته شد", fx.length === 3, fx.length);
  const goodsIn = fx.find((e) => e.kind === EFFECT_KINDS.GOODS_IN);
  const goodsOut = fx.find((e) => e.kind === EFFECT_KINDS.GOODS_OUT);
  check("کالای برگشتی، کالای ادعاست", goodsIn.productId === brakePad.productId);
  check("کالای ارسالی، کالای انتخاب‌شده است", goodsOut.productId === premiumPad.productId);
  check("مابه‌التفاوت از مشتری گرفته می‌شود", fx.some((e) => e.kind === EFFECT_KINDS.MONEY_IN));
}

section("ارسال چند کالای مختلف در یک تصمیم");
{
  const fx = expandComposition(
    comp({
      qty: 2,
      goodsOut: { enabled: true, items: [
        { ...premiumPad, qty: 2 },
        { ...brakePad, productId: 3, productName: "روغن ترمز", qty: 5 },
      ] },
    }),
    mkClaim(),
  );
  check("دو اثر GOODS_OUT جدا", fx.length === 2 && fx.every((e) => e.kind === EFFECT_KINDS.GOODS_OUT));
  check("هر کدام تعداد خودش را دارد", fx[0].qty === 2 && fx[1].qty === 5);
}

section("حرکت موجودی: فقط بخش سالمِ برگشتی به موجودی می‌رود");
{
  const fx = expandComposition(comp({ qty: 5, goodsIn: { enabled: true, items: [] } }), mkClaim());
  check("تا اجرا نشود هیچ حرکت موجودی نیست", stockDeltasOf(fx).length === 0);

  fx[0].doneQty = 5;
  fx[0].restockedQty = 2;
  fx[0].status = EFFECT_STATUSES.APPLIED;
  const deltas = stockDeltasOf(fx);
  check("فقط ۲ واحد سالم به موجودی اضافه می‌شود", deltas[0].delta === 2, JSON.stringify(deltas));
}

section("اعتبارسنجی");
{
  const claim = mkClaim();
  check(
    "تعداد بیش از باقیمانده رد می‌شود",
    validateComposition(comp({ qty: 12, goodsIn: { enabled: true, items: [] } }), claim, { remainingQty: 10 }).length > 0,
  );
  check(
    "ترکیب بدون هیچ اقدامی رد می‌شود",
    validateComposition(comp({ qty: 2 }), claim, { remainingQty: 10 }).length > 0,
  );
  check(
    "محورِ کالاییِ بدون انتخاب، خودش کالای ادعا را می‌گذارد",
    expandComposition(
      comp({ qty: 2, goodsOut: { enabled: true, items: [] } }),
      claim,
    ).some((e) => e.kind === EFFECT_KINDS.GOODS_OUT && e.productId === claim.productId),
  );
  check(
    "جابه‌جایی پول با مبلغ صفر رد می‌شود",
    validateComposition(comp({ qty: 2, money: money(MONEY_DIRECTIONS.PAY, 0) }), claim, {
      remainingQty: 10,
    }).length > 0,
  );
  check(
    "ترکیب معتبر خطا ندارد",
    validateComposition(
      comp({ qty: 2, goodsIn: { enabled: true, items: [] }, money: money(MONEY_DIRECTIONS.PAY, 4_000_000) }),
      claim,
      { remainingQty: 10 },
    ).length === 0,
  );
}

section("وضعیت مرجوعی از روی داده مشتق می‌شود");
{
  const claim = mkClaim({ qty: 10 });
  const ret = { status: SALES_RETURN_STATUSES.OPEN, claims: [claim] };
  check("بدون تصمیم → باز", deriveReturnStatus(ret) === SALES_RETURN_STATUSES.OPEN);

  claim.resolutions = [
    buildResolution(comp({ qty: 10, money: money(MONEY_DIRECTIONS.PAY, 1_000_000) }), claim),
  ];
  check(
    "تصمیمِ فقط-پولی مستقیم تسویه می‌شود (بدون دخالت انبار)",
    deriveReturnStatus(ret) === SALES_RETURN_STATUSES.SETTLED,
    deriveReturnStatus(ret),
  );

  claim.resolutions = [buildResolution(comp({ qty: 10, goodsIn: { enabled: true, items: [] } }), claim)];
  check(
    "تصمیمِ کالایی تا اجرای انبار در حال اجرا می‌ماند",
    deriveReturnStatus(ret) === SALES_RETURN_STATUSES.IN_PROGRESS,
    deriveReturnStatus(ret),
  );

  claim.resolutions = [buildResolution(comp({ qty: 4, goodsIn: { enabled: true, items: [] } }), claim)];
  check("تصمیم جزئی → در حال اجرا", deriveReturnStatus(ret) === SALES_RETURN_STATUSES.IN_PROGRESS);
  check("باقیمانده‌ی ادعا درست است", claimRemainingQty(claim) === 6, claimRemainingQty(claim));
}

section("نگهبان حذف و جمع‌بندی مالی");
{
  const claim = mkClaim({ qty: 10 });
  const ret = { status: SALES_RETURN_STATUSES.OPEN, claims: [claim] };
  check("مرجوعیِ بدون تصمیم قابل حذف است", canDeleteReturn(ret));

  claim.resolutions = [buildResolution(comp({ qty: 10, goodsIn: { enabled: true, items: [] } }), claim)];
  check(
    "تصمیمِ کالاییِ هنوز اجرانشده مانع حذف نیست",
    canDeleteReturn(ret),
  );

  claim.resolutions = [
    buildResolution(comp({ qty: 6, money: money(MONEY_DIRECTIONS.PAY, 500_000) }), claim),
    buildResolution(comp({ qty: 4, money: money(MONEY_DIRECTIONS.RECEIVE, 200_000) }), claim),
  ];
  check("اثر پولیِ اعمال‌شده جلوی حذف را می‌گیرد", !canDeleteReturn(ret));

  const summary = summarizeReturn(ret);
  check("خالص مالی = ۲۰۰٬۰۰۰ − ۵۰۰٬۰۰۰", summary.netMoney === -300_000, summary.netMoney);
}

section("ردیف‌های انبار از اثرهای معلق ساخته می‌شوند");
{
  const claim = mkClaim({ qty: 6 });
  const ret = { status: SALES_RETURN_STATUSES.OPEN, claims: [claim] };
  claim.resolutions = [
    buildResolution(
      comp({
        qty: 6,
        goodsIn: { enabled: true, items: [] },
        goodsOut: { enabled: true, items: [{ ...premiumPad, qty: 6 }] },
      }),
      claim,
    ),
  ];
  const inLines = buildGoodsLines(ret, EFFECT_KINDS.GOODS_IN);
  const outLines = buildGoodsLines(ret, EFFECT_KINDS.GOODS_OUT);
  check("یک ردیف در صف دریافت", inLines.length === 1);
  check("یک ردیف در صف ارسال", outLines.length === 1);
  check("ردیف ارسال کالای جایگزین را نشان می‌دهد", outLines[0].productId === premiumPad.productId);
  check("زمینه‌ی ادعا همراه ردیف است", inLines[0].problem === RETURN_PROBLEMS.DEFECTIVE);
}

section("جمع‌بندی اثر: پیش‌نمایش در برابر واقعیت");
{
  const fx = expandComposition(
    comp({ qty: 3, goodsIn: { enabled: true, items: [] }, money: money(MONEY_DIRECTIONS.PAY, 900_000) }),
    mkClaim(),
  );
  const preview = summarizeEffects(fx, { includePending: true });
  const actual = summarizeEffects(fx);
  check("پیش‌نمایش ۳ عدد برگشتی را می‌شمارد", preview.goodsInQty === 3);
  check("واقعیت هنوز صفر است (انبار تحویل نگرفته)", actual.goodsInQty === 0);
  check("پول در هر دو دیده می‌شود", preview.moneyOut === 900_000 && actual.moneyOut === 900_000);
  check("یک اثر معلق شمرده شد", preview.pendingCount === 1);
}

// ════════════════════════════════════════════════════════════════════════════
// بخش دوم: موتور اثر — اتصال تصمیم‌ها به موجودی انبار و مبلغ فروش
// ════════════════════════════════════════════════════════════════════════════

const api = await import("../src/features/sales/returns/services/api-mockData.js");
const { allSales } = await import("../src/features/sales/orders/services/mockData.js");
const { allProducts } = await import("../src/features/warehouse/products/services/mockData.js");
const { RETURN_ELIGIBLE_SALE_STATUSES } = await import(
  "../src/features/sales/returns/services/mockData.js"
);

const saleOf = (id) => allSales.find((s) => Number(s.id) === Number(id));
const stockOf = (id) =>
  allProducts.find((p) => Number(p.id) === Number(id))?.stock ?? 0;
const hostSale = allSales.find((s) =>
  RETURN_ELIGIBLE_SALE_STATUSES.includes(s.status),
);

async function newReturn(claims) {
  return api.createSalesReturn({
    saleId: hostSale.id,
    saleInvoiceNumber: hostSale.invoiceNumber,
    customerId: hostSale.customerId,
    customerName: hostSale.customerName,
    returnDate: "2026-08-19",
    description: "",
    claims,
  });
}

const claimFrom = (saleItem, over = {}) => ({
  scope: CLAIM_SCOPES.ON_INVOICE,
  saleLineId: String(saleItem.productId),
  productId: saleItem.productId,
  productCode: saleItem.productCode,
  productName: saleItem.productName,
  unit: saleItem.unit,
  unitPrice: saleItem.unitPrice,
  qty: 2,
  problem: RETURN_PROBLEMS.DEFECTIVE,
  note: "",
  ...over,
});

const returnableOf = async (productId) =>
  (await api.fetchSaleForReturn(hostSale.id)).items.find(
    (i) => i.productId === productId,
  ).returnableQty;

section("اثر مالی: بازگشت وجه، مبلغ فاکتور را کم می‌کند");
{
  const item = hostSale.items[0];
  const before = saleOf(hostSale.id).totalAmount;
  const ret = await newReturn([claimFrom(item, { qty: 2 })]);
  await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(2),
    money: money(MONEY_DIRECTIONS.PAY, 1_500_000),
  });
  check(
    "مبلغ فروش ۱٫۵ میلیون کم شد",
    saleOf(hostSale.id).totalAmount === before - 1_500_000,
    `${before} → ${saleOf(hostSale.id).totalAmount}`,
  );

  const fresh = await api.fetchSalesReturnById(ret.id);
  check(
    "چون اثر کالایی ندارد، مستقیم تسویه شد",
    fresh.status === SALES_RETURN_STATUSES.SETTLED,
    fresh.status,
  );

  await api.removeClaimResolution(
    ret.id,
    fresh.claims[0].id,
    fresh.claims[0].resolutions[0].id,
  );
  check(
    "با حذف تصمیم، مبلغ فاکتور برمی‌گردد",
    saleOf(hostSale.id).totalAmount === before,
    saleOf(hostSale.id).totalAmount,
  );
}

section("اثر مالی: اعتبار خرید بعدی روی فاکتور اثری ندارد");
{
  const item = hostSale.items[0];
  const before = saleOf(hostSale.id).totalAmount;
  const ret = await newReturn([claimFrom(item, { qty: 1 })]);
  await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(1),
    money: money(MONEY_DIRECTIONS.PAY, 900_000, {
      method: PAYMENT_METHODS.STORE_CREDIT,
    }),
  });
  check(
    "مبلغ فاکتور دست‌نخورده ماند",
    saleOf(hostSale.id).totalAmount === before,
    saleOf(hostSale.id).totalAmount,
  );
}

section("اثر مالی: کالای خارج از فاکتور که مشتری نگه می‌دارد، مبلغ را زیاد می‌کند");
{
  const item = hostSale.items[0];
  const before = saleOf(hostSale.id).totalAmount;
  const ret = await newReturn([
    claimFrom(item, {
      qty: 3,
      scope: CLAIM_SCOPES.OFF_INVOICE,
      problem: RETURN_PROBLEMS.OVER_SHIPPED,
    }),
  ]);
  await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(3),
    money: money(MONEY_DIRECTIONS.RECEIVE, 3 * item.unitPrice),
  });
  const expected = before + 3 * item.unitPrice;
  check(
    "مبلغ فاکتور به اندازه‌ی بهای کالای اضافه زیاد شد",
    saleOf(hostSale.id).totalAmount === expected,
    `${saleOf(hostSale.id).totalAmount} ≠ ${expected}`,
  );
}

section("اثر کالایی: فقط بخش سالمِ برگشتی وارد موجودی می‌شود");
{
  const item = hostSale.items[0];
  const stockBefore = stockOf(item.productId);
  const ret = await newReturn([claimFrom(item, { qty: 4 })]);
  const updated = await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(4),
    goodsIn: { enabled: true, items: [] },
  });
  const effect = updated.claims[0].resolutions[0].effects[0];
  check(
    "اثر کالایی معلق ثبت شد",
    effect.status === EFFECT_STATUSES.PENDING && effect.kind === EFFECT_KINDS.GOODS_IN,
  );

  // دور اول: ۳ عدد رسید که انباردار ۲ عددش را معیوب دید — یعنی فقط
  // ۱ عدد سالم. مقدار سالم ورودیِ جدا ندارد و از روی همین مشاهده‌ها
  // مشتق می‌شود.
  const afterRound1 = await api.executeGoodsRound(ret.id, {
    rounds: [
      {
        effectId: effect.id,
        qty: 3,
        observations: [
          { problem: RETURN_PROBLEMS.DEFECTIVE, qty: 2, note: "۲ عدد شکسته" },
        ],
      },
    ],
    partyName: "پیک مشتری",
  });
  check(
    "موجودی فقط ۱ واحد (سالم) زیاد شد",
    stockOf(item.productId) === stockBefore + 1,
    `${stockBefore} → ${stockOf(item.productId)}`,
  );
  const e1 = afterRound1.claims[0].resolutions[0].effects[0];
  check(
    "اثر هنوز معلق است (۳ از ۴)",
    e1.status === EFFECT_STATUSES.PENDING && e1.doneQty === 3,
    JSON.stringify([e1.status, e1.doneQty]),
  );
  check(
    "مرجوعی هنوز تسویه نشده",
    afterRound1.status === SALES_RETURN_STATUSES.IN_PROGRESS,
    afterRound1.status,
  );

  // دور دوم: ۱ عدد باقیمانده، سالم
  const afterRound2 = await api.executeGoodsRound(ret.id, {
    rounds: [{ effectId: effect.id, qty: 1 }],
  });
  const e2 = afterRound2.claims[0].resolutions[0].effects[0];
  check("اثر کامل و اجراشده شد", e2.status === EFFECT_STATUSES.APPLIED && e2.doneQty === 4);
  check("مجموع بازگشته به موجودی = ۲", e2.restockedQty === 2, e2.restockedQty);
  check("موجودی در مجموع ۲ واحد زیاد شد", stockOf(item.productId) === stockBefore + 2);
  check("حالا مرجوعی تسویه شد", afterRound2.status === SALES_RETURN_STATUSES.SETTLED, afterRound2.status);
  check("تاریخچه‌ی هر دو دور ثبت شد", e2.history.length === 2, e2.history.length);

  const observed = observationsOf(e2);
  check(
    "مشاهده‌ی انبار با نوع و تعداد نگه داشته شد",
    observed.length === 1 &&
      observed[0].problem === RETURN_PROBLEMS.DEFECTIVE &&
      observed[0].qty === 2,
    JSON.stringify(observed),
  );
  check(
    "مشاهده‌ی انبار ادعای مشتری را بازنویسی نمی‌کند",
    afterRound2.claims[0].problem !== RETURN_PROBLEMS.DEFECTIVE ||
      observed[0].problem === afterRound2.claims[0].problem,
  );
}

section("ایدمپوتنسی: یک کلید، یک بار اعمال");
{
  const item = hostSale.items[0];
  const ret = await newReturn([claimFrom(item, { qty: 2 })]);
  const withResolution = await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(2),
    goodsIn: { enabled: true, items: [] },
  });
  const effect = withResolution.claims[0].resolutions[0].effects[0];

  const key = "idem-test-1";
  const round = { rounds: [{ effectId: effect.id, qty: 1 }] };

  const first = await api.executeGoodsRound(ret.id, round, { idempotencyKey: key });
  const again = await api.executeGoodsRound(ret.id, round, { idempotencyKey: key });

  const e1 = first.claims[0].resolutions[0].effects[0];
  const e2 = again.claims[0].resolutions[0].effects[0];
  check("دورِ تکراری با همان کلید دوباره اعمال نمی‌شود", e2.doneQty === 1, e2.doneQty);
  check("پاسخِ تکراری همان سندِ بار اول است", e1.doneQty === e2.doneQty);

  // کلید تازه = قصدِ تازه، پس واقعاً اعمال می‌شود
  const third = await api.executeGoodsRound(ret.id, round, { idempotencyKey: "idem-test-2" });
  check(
    "کلید تازه یعنی عملیات تازه",
    third.claims[0].resolutions[0].effects[0].doneQty === 2,
    third.claims[0].resolutions[0].effects[0].doneQty,
  );
}

section("سقف ادعا همیشه کل مقدار تحویل‌شده است");
{
  const item = hostSale.items[0];
  const delivered = item.shippedQty ?? item.qty;
  check(
    "سقف = مقدار تحویل‌شده",
    (await returnableOf(item.productId)) === delivered,
    `${await returnableOf(item.productId)} ≠ ${delivered}`,
  );

  // یک مرجوعیِ فعال روی همان کالا نباید سقف مرجوعی بعدی را کم کند —
  // واحد فروش باید بتواند برای کل مقدار فاکتور دوباره ادعا ثبت کند.
  await newReturn([claimFrom(item, { qty: delivered })]);
  check(
    "ادعای فعالِ قبلی سقف را کم نمی‌کند",
    (await returnableOf(item.productId)) === delivered,
    `${await returnableOf(item.productId)} ≠ ${delivered}`,
  );

  const info = (await api.fetchSaleForReturn(hostSale.id)).items.find(
    (i) => i.productId === item.productId,
  );
  check(
    "ولی مقدارِ ادعاشده در مرجوعی‌های دیگر گزارش می‌شود",
    info.activeClaimedQty >= delivered,
    info.activeClaimedQty,
  );
}

section("چرخه‌ی چندباره: مرجوعی روی مرجوعی");
{
  const item = hostSale.items[1] ?? hostSale.items[0];
  const ret = await newReturn([claimFrom(item, { qty: 2 })]);

  const withRes = await api.addClaimResolution(ret.id, ret.claims[0].id, {
    ...emptyComposition(2),
    goodsIn: { enabled: true, items: [] },
    goodsOut: { enabled: true, items: [
      {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        qty: 2,
        unitPrice: item.unitPrice,
      },
    ] },
  });
  const effects = withRes.claims[0].resolutions[0].effects;
  const goodsIn = effects.find((e) => e.kind === EFFECT_KINDS.GOODS_IN);
  const goodsOut = effects.find((e) => e.kind === EFFECT_KINDS.GOODS_OUT);

  await api.executeGoodsRound(ret.id, {
    rounds: [{ effectId: goodsIn.id, qty: 2, healthyQty: 0 }],
  });
  await api.executeGoodsRound(ret.id, { rounds: [{ effectId: goodsOut.id, qty: 2 }] });

  const settled = await api.fetchSalesReturnById(ret.id);
  check(
    "پس از اجرای هر دو اثر، مرجوعی تسویه شد",
    settled.status === SALES_RETURN_STATUSES.SETTLED,
    settled.status,
  );

  // همان کالای جایگزین دوباره خراب از آب درآمده — مرجوعی دوم روی
  // همان فروش، زنجیرشده به اولی.
  const followUp = await api.createSalesReturn({
    saleId: hostSale.id,
    saleInvoiceNumber: hostSale.invoiceNumber,
    customerId: hostSale.customerId,
    customerName: hostSale.customerName,
    returnDate: "2026-08-20",
    description: "",
    previousReturnId: ret.id,
    claims: [claimFrom(item, { qty: 2, problem: RETURN_PROBLEMS.DAMAGED_IN_TRANSIT })],
  });
  check("مرجوعی دوم به اولی زنجیر شد", followUp.previousReturnId === ret.id);
  check("مرجوعی دوم مستقل و باز است", followUp.status === SALES_RETURN_STATUSES.OPEN);
}
section("ادعای خارج از فاکتور سهمیه‌ی خط فروش را مصرف نمی‌کند");
{
  const item = hostSale.items[0];
  const before = await returnableOf(item.productId);
  await newReturn([
    claimFrom(item, {
      qty: 5,
      scope: CLAIM_SCOPES.OFF_INVOICE,
      problem: RETURN_PROBLEMS.OVER_SHIPPED,
    }),
  ]);
  const after = await returnableOf(item.productId);
  check("سهمیه‌ی روی فاکتور دست‌نخورده ماند", after === before, `${before} → ${after}`);
}

section("نگهبان چرخه‌ی عمر: بعد از اعمال اثر، حذف ممنوع می‌شود");
{
  const item = hostSale.items[0];
  const ret = await newReturn([claimFrom(item, { qty: 1 })]);
  await api.removeSalesReturn(ret.id).then(
    () => check("مرجوعیِ دست‌نخورده حذف می‌شود", true),
    (e) => check("مرجوعیِ دست‌نخورده حذف می‌شود", false, e.message),
  );

  const ret2 = await newReturn([claimFrom(item, { qty: 1 })]);
  await api.addClaimResolution(ret2.id, ret2.claims[0].id, {
    ...emptyComposition(1),
    money: money(MONEY_DIRECTIONS.PAY, 100_000),
  });
  await api.removeSalesReturn(ret2.id).then(
    () => check("مرجوعیِ دارای اثر اعمال‌شده حذف نمی‌شود", false, "حذف شد!"),
    () => check("مرجوعیِ دارای اثر اعمال‌شده حذف نمی‌شود", true),
  );
}

section("اعتبارسنجی موتور: تصمیم بیش از باقیمانده رد می‌شود");
{
  const item = hostSale.items[0];
  const ret = await newReturn([claimFrom(item, { qty: 2 })]);
  await api
    .addClaimResolution(ret.id, ret.claims[0].id, {
      ...emptyComposition(5),
      goodsIn: { enabled: true, items: [] },
    })
    .then(
      () => check("تعداد بیش از ادعا پذیرفته نمی‌شود", false, "پذیرفته شد!"),
      () => check("تعداد بیش از ادعا پذیرفته نمی‌شود", true),
    );
}

if (failures === 0) {
  console.log("\n✅ همه‌ی سناریوها پذیرفته شدند\n");
} else {
  // throw به‌جای process.exit — هم خروجیِ ناموفق می‌دهد و هم این فایل
  // را از globalهای Node مستقل نگه می‌دارد (پیکربندی ESLint پروژه روی
  // globals.browser تنظیم شده).
  throw new Error(`${failures} سناریو شکست خورد`);
}
