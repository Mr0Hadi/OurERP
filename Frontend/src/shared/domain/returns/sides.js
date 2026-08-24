// src/shared/domain/returns/sides.js

import { EFFECT_KINDS } from "./effects";
import { MONEY_DIRECTIONS } from "./resolutions";
import { RETURN_STATUSES } from "./statuses";

/**
 * تفاوت مرجوعی فروش و مرجوعی خرید — که تماماً *زبانی* است، نه منطقی.
 *
 * مدل زیرین یکی است (چهار اثر، سه محورِ تصمیم، یک ماشین وضعیت). آنچه
 * فرق می‌کند فقط این است که طرف حساب کیست و هر جهت را با چه کلمه‌ای
 * صدا می‌زنیم. نگه‌داشتن این تفاوت در یک جا باعث می‌شود کامپوننت‌های
 * مشترک بتوانند هر دو سمت را رندر کنند بدون اینکه شرطِ if بنویسند.
 *
 * ترتیب محورهای کالا هم اینجاست: در فروش، کارِ رایج «پس‌گرفتن» است و
 * در خرید «عودت‌دادن» — پس هر سمت باید محورِ رایجش را اول ببیند.
 */

// بدون معادل در بکند — فقط کلید محلی برای انتخاب بین دو دسته برچسب/
// تنظیمات همین فایل است، هیچ‌وقت روی سیم منتقل نمی‌شود.
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

    // محورِ رایج اول: کالا از مشتری پس گرفته می‌شود.
    goodsSlots: [
      {
        slot: GOODS_IN_SLOT,
        kind: EFFECT_KINDS.GOODS_IN,
        label: "کالا از مشتری پس گرفته شود",
        hint: "کالای برگشتی وارد انبار می‌شود",
        // انتخابگر کالا لازم نیست؛ پیش‌فرض همان کالای ادعاست.
        allowPicker: false,
      },
      {
        slot: GOODS_OUT_SLOT,
        kind: EFFECT_KINDS.GOODS_OUT,
        label: "کالای جایگزین برای مشتری ارسال شود",
        hint: "می‌تواند همان کالا باشد یا کالای دیگری، با هر تعدادی",
        allowPicker: true,
      },
    ],

    money: {
      [MONEY_DIRECTIONS.NONE]: "بدون جابه‌جایی پول",
      [MONEY_DIRECTIONS.RECEIVE]: "دریافت پول از مشتری",
      [MONEY_DIRECTIONS.PAY]: "پرداخت پول به مشتری",
    },

    effectLabels: {
      [EFFECT_KINDS.GOODS_IN]: "پس‌گرفتن",
      [EFFECT_KINDS.GOODS_OUT]: "ارسال",
      [EFFECT_KINDS.MONEY_IN]: "دریافت وجه",
      [EFFECT_KINDS.MONEY_OUT]: "پرداخت وجه",
    },

    statusLabels: {
      [RETURN_STATUSES.OPEN]: "در انتظار تصمیم",
      [RETURN_STATUSES.IN_PROGRESS]: "در حال اجرا",
      [RETURN_STATUSES.SETTLED]: "تسویه شده",
      [RETURN_STATUSES.REJECTED]: "رد شده",
      [RETURN_STATUSES.CANCELLED]: "لغو شده",
    },

    warehouse: {
      [EFFECT_KINDS.GOODS_IN]: "دریافت کالا از مشتری",
      [EFFECT_KINDS.GOODS_OUT]: "ارسال کالا برای مشتری",
    },
  },

  [RETURN_SIDES.PURCHASE]: {
    key: RETURN_SIDES.PURCHASE,
    counterparty: "تامین‌کننده",
    documentLabel: "مرجوعی به تامین‌کننده",
    orderLabel: "خرید",

    // محورِ رایج اول: کالا به تامین‌کننده عودت داده می‌شود.
    goodsSlots: [
      {
        slot: GOODS_OUT_SLOT,
        kind: EFFECT_KINDS.GOODS_OUT,
        label: "کالا به تامین‌کننده عودت داده شود",
        hint: "کالا از انبار خارج می‌شود",
        allowPicker: false,
      },
      {
        slot: GOODS_IN_SLOT,
        kind: EFFECT_KINDS.GOODS_IN,
        label: "کالای جایگزین از تامین‌کننده دریافت شود",
        hint: "می‌تواند همان کالا باشد یا کالای دیگری، با هر تعدادی",
        allowPicker: true,
      },
    ],

    money: {
      [MONEY_DIRECTIONS.NONE]: "بدون جابه‌جایی پول",
      [MONEY_DIRECTIONS.RECEIVE]: "دریافت پول از تامین‌کننده",
      [MONEY_DIRECTIONS.PAY]: "پرداخت پول به تامین‌کننده",
    },

    effectLabels: {
      [EFFECT_KINDS.GOODS_IN]: "دریافت کالا",
      [EFFECT_KINDS.GOODS_OUT]: "عودت کالا",
      [EFFECT_KINDS.MONEY_IN]: "دریافت وجه",
      [EFFECT_KINDS.MONEY_OUT]: "پرداخت وجه",
    },

    statusLabels: {
      [RETURN_STATUSES.OPEN]: "در انتظار تصمیم",
      [RETURN_STATUSES.IN_PROGRESS]: "در حال هماهنگی با تامین‌کننده",
      [RETURN_STATUSES.SETTLED]: "تسویه شده",
      [RETURN_STATUSES.REJECTED]: "رد شده توسط تامین‌کننده",
      [RETURN_STATUSES.CANCELLED]: "لغو شده",
    },

    warehouse: {
      [EFFECT_KINDS.GOODS_IN]: "دریافت کالای جایگزین",
      [EFFECT_KINDS.GOODS_OUT]: "عودت کالا به تامین‌کننده",
    },
  },
};

export function sideConfig(side) {
  return SIDE_CONFIG[side] ?? SIDE_CONFIG[RETURN_SIDES.SALES];
}
