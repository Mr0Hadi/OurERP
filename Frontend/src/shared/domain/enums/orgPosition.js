// src/shared/domain/enums/orgPosition.js

/**
 * `OrgPositionEnum` — جایگاه یک کارمند در واحد یا تیمش.
 *
 * در بکند این فیلدی روی `User` نیست؛ *مشتق* است: کاربر وقتی مدیر است که
 * `Department.HeadId` یا `Team.HeadId` برابر شناسه‌اش باشد. اینجا به enum
 * عددی تبدیل شده تا جدول و بج‌ها یک مقدار واحد بگیرند نه سه بولینِ جدا.
 *
 * ⚠️ `DEPUTY` هنوز در بکند وجود ندارد — نه `Department.DeputyId` و نه
 * `Team.DeputyId`. تا اضافه‌شدنشان هیچ‌وقت از سرور نمی‌آید و فرانت هم
 * نمی‌فرستدش (سند `docs/org-structure-contract.fa.md`).
 */
export const OrgPositionEnum = Object.freeze({
  MEMBER: 0,
  HEAD: 1,
  DEPUTY: 2,
});

export const ORG_POSITION_LABELS = Object.freeze({
  [OrgPositionEnum.MEMBER]: "عضو",
  [OrgPositionEnum.HEAD]: "مدیر",
  [OrgPositionEnum.DEPUTY]: "معاون",
});
