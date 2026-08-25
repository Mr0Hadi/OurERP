// src/shared/domain/enums/accountStatus.js

/**
 * `AccountStatusEnum` — وضعیت حساب کاربریِ کارمند.
 *
 * در بکند این یک enum نیست بلکه `User.IsActive` (بولین) است. اینجا به
 * enum عددی تبدیل شده تا فیلترِ فهرست بتواند سه حالت را از هم تفکیک کند:
 * «فعال»، «غیرفعال» و «فیلتر نشده». با بولین، `false` و «فیلتر نشده» یکی
 * می‌شدند.
 *
 * شماره‌ها عمداً `0`/`1` هستند تا نگاشت به بولینِ سرور بی‌ابهام باشد.
 */
export const AccountStatusEnum = Object.freeze({
  INACTIVE: 0,
  ACTIVE: 1,
});

export const ACCOUNT_STATUS_LABELS = Object.freeze({
  [AccountStatusEnum.INACTIVE]: "غیرفعال",
  [AccountStatusEnum.ACTIVE]: "فعال",
});

/** enum → بولینِ `IsActive` که سرور می‌فهمد. */
export const accountStatusToIsActive = (status) =>
  status === "" || status == null ? undefined : status === AccountStatusEnum.ACTIVE;

/** بولینِ سرور → enum. */
export const isActiveToAccountStatus = (isActive) =>
  isActive ? AccountStatusEnum.ACTIVE : AccountStatusEnum.INACTIVE;
