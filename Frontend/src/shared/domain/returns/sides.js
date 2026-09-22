import { EFFECT_DIRECTIONS } from "./effects";
import { MONEY_DIRECTIONS } from "./resolutions";
import { RETURN_STATUSES } from "./statuses";

/**
 * تفاوت مرجوعی فروش و مرجوعی خرید — که تقریباً تماماً *زبانی* است.
 *
 * مدل زیرین یکی است. آنچه فرق می‌کند این است که طرف حساب کیست، هر جهت را
 * با چه کلمه‌ای صدا می‌زنیم، و یک تفاوتِ واقعی: فقط مرجوعی خرید قرنطینه
 * دارد (`quarantineSlots`).
 *
 * ترتیب محورهای کالا هم اینجاست: در فروش، کارِ رایج «پس‌گرفتن» است و در
 * خرید «عودت‌دادن» — پس هر سمت محورِ رایجش را اول می‌بیند.
 */

// بدون معادل در بکند — فقط کلید محلی برای انتخاب بین دو دسته برچسب/تنظیمات.
export const RETURN_SIDES = {
  SALES: 0,
  PURCHASE: 1,
};

const GOODS_IN_SLOT = "goodsIn";
const GOODS_OUT_SLOT = "goodsOut";

export const SIDE_CONFIG = {
  [RETURN_SIDES.SALES]: {
    key: RETURN_SIDES.SALES,
    counterparty: "مشتری",
    documentLabel: "مرجوعی از فروش",
    orderLabel: "فروش",

    goodsSlots: [
      {
        slot: GOODS_IN_SLOT,
        direction: EFFECT_DIRECTIONS.GOODS_IN,
        label: "کالا از مشتری پس گرفته شود",
        hint: "کالای برگشتی وارد انبار می‌شود",
        allowPicker: false,
      },
      {
        slot: GOODS_OUT_SLOT,
        direction: EFFECT_DIRECTIONS.GOODS_OUT,
        label: "کالای جایگزین برای مشتری ارسال شود",
        hint: "می‌تواند همان کالا باشد یا کالای دیگری، با هر تعدادی",
        allowPicker: true,
      },
    ],

    // مرجوعی فروش قرنطینه ندارد: کالای برگشتی کالای خودِ ماست.
    quarantineSlots: [],

    money: {
      [MONEY_DIRECTIONS.NONE]: "بدون جابه‌جایی پول",
      [MONEY_DIRECTIONS.RECEIVE]: "دریافت پول از مشتری",
      [MONEY_DIRECTIONS.PAY]: "پرداخت پول به مشتری",
    },

    effectLabels: {
      [EFFECT_DIRECTIONS.GOODS_IN]: "پس‌گرفتن",
      [EFFECT_DIRECTIONS.GOODS_OUT]: "ارسال",
      [EFFECT_DIRECTIONS.MONEY_IN]: "دریافت وجه",
      [EFFECT_DIRECTIONS.MONEY_OUT]: "پرداخت وجه",
      [EFFECT_DIRECTIONS.GOODS_RELEASE]: "آزادسازی",
      [EFFECT_DIRECTIONS.GOODS_SCRAP]: "اسقاط",
    },

    statusLabels: {
      [RETURN_STATUSES.OPEN]: "در انتظار تصمیم",
      [RETURN_STATUSES.IN_PROGRESS]: "در حال اجرا",
      [RETURN_STATUSES.SETTLED]: "تسویه شده",
      [RETURN_STATUSES.REJECTED]: "رد شده",
      [RETURN_STATUSES.CANCELLED]: "لغو شده",
    },

    warehouse: {
      [EFFECT_DIRECTIONS.GOODS_IN]: "دریافت کالا از مشتری",
      [EFFECT_DIRECTIONS.GOODS_OUT]: "ارسال کالا برای مشتری",
    },
  },

  [RETURN_SIDES.PURCHASE]: {
    key: RETURN_SIDES.PURCHASE,
    counterparty: "تامین‌کننده",
    documentLabel: "مرجوعی به تامین‌کننده",
    orderLabel: "خرید",

    goodsSlots: [
      {
        slot: GOODS_OUT_SLOT,
        direction: EFFECT_DIRECTIONS.GOODS_OUT,
        label: "کالا به تامین‌کننده عودت داده شود",
        hint: "کالا از انبار یا قرنطینه خارج می‌شود",
        allowPicker: false,
      },
      {
        slot: GOODS_IN_SLOT,
        direction: EFFECT_DIRECTIONS.GOODS_IN,
        label: "کالای جایگزین از تامین‌کننده دریافت شود",
        hint: "می‌تواند همان کالا باشد یا کالای دیگری، با هر تعدادی",
        allowPicker: true,
      },
    ],

    quarantineSlots: [
      {
        slot: "goodsRelease",
        direction: EFFECT_DIRECTIONS.GOODS_RELEASE,
        label: "کالای قرنطینه به موجودی قابل فروش برگردد",
        hint: "نگه‌داشتنِ کالا — مثلاً با تخفیف یا پرداختِ مازاد",
      },
      {
        slot: "goodsScrap",
        direction: EFFECT_DIRECTIONS.GOODS_SCRAP,
        label: "کالای قرنطینه اسقاط شود",
        hint: "کالا از چرخه خارج می‌شود و به‌اندازه‌ی بهایش زیان ثبت می‌شود",
      },
    ],

    money: {
      [MONEY_DIRECTIONS.NONE]: "بدون جابه‌جایی پول",
      [MONEY_DIRECTIONS.RECEIVE]: "دریافت پول از تامین‌کننده",
      [MONEY_DIRECTIONS.PAY]: "پرداخت پول به تامین‌کننده",
    },

    effectLabels: {
      [EFFECT_DIRECTIONS.GOODS_IN]: "دریافت کالا",
      [EFFECT_DIRECTIONS.GOODS_OUT]: "عودت کالا",
      [EFFECT_DIRECTIONS.MONEY_IN]: "دریافت وجه",
      [EFFECT_DIRECTIONS.MONEY_OUT]: "پرداخت وجه",
      [EFFECT_DIRECTIONS.GOODS_RELEASE]: "آزادسازی از قرنطینه",
      [EFFECT_DIRECTIONS.GOODS_SCRAP]: "اسقاط از قرنطینه",
    },

    statusLabels: {
      [RETURN_STATUSES.OPEN]: "در انتظار تصمیم",
      [RETURN_STATUSES.IN_PROGRESS]: "در حال هماهنگی با تامین‌کننده",
      [RETURN_STATUSES.SETTLED]: "تسویه شده",
      [RETURN_STATUSES.REJECTED]: "رد شده توسط تامین‌کننده",
      [RETURN_STATUSES.CANCELLED]: "لغو شده",
    },

    warehouse: {
      [EFFECT_DIRECTIONS.GOODS_IN]: "دریافت کالای جایگزین",
      [EFFECT_DIRECTIONS.GOODS_OUT]: "عودت کالا به تامین‌کننده",
      [EFFECT_DIRECTIONS.GOODS_RELEASE]: "آزادسازی از قرنطینه",
      [EFFECT_DIRECTIONS.GOODS_SCRAP]: "اسقاط از قرنطینه",
    },
  },
};

export function sideConfig(side) {
  return SIDE_CONFIG[side] ?? SIDE_CONFIG[RETURN_SIDES.SALES];
}
