import { useForm } from "react-hook-form";
import { requiredMessage } from "@/shared/utils/validationRules";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";

/**
 * فرمِ کارمند در دو حالت «ثبت» و «ویرایش» یک شکل دارد ولی دو payload
 * متفاوت می‌سازد، چون سرور دو قرارداد متفاوت دارد:
 *
 *   ثبت    → رمز عبور می‌گیرد؛ `isActive` و `role` نمی‌گیرد (کاربرِ تازه
 *            همیشه فعال و عضوِ ساده است)
 *   ویرایش → `isActive` و `role` (اختیاری) می‌گیرد، ولی رمز عبور را
 *            *نمی‌پذیرد*
 *
 * `personelCode` در فرم نیست — سرور می‌سازدش؛ در ویرایش فقط برای *نمایش*
 * از خودِ `employee` خوانده می‌شود.
 */

/** واحد اجباری است — هم در UI و هم در اعتبارسنجیِ خودِ سرور. */
export const departmentRules = {
  validate: (value) =>
    (value != null && value !== "") || requiredMessage("واحد سازمانی"),
};

function buildDefaultValues(employee) {
  if (!employee) {
    return {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      rePassword: "",
      departmentId: null,
      teamId: null,
      isActive: true,
    };
  }

  return {
    firstName: employee.firstName || "",
    lastName: employee.lastName || "",
    username: employee.username || "",
    password: "",
    rePassword: "",
    departmentId: employee.departmentId ?? null,
    teamId: employee.teamId ?? null,
    role: employee.role ?? OrgRoleEnum.MEMBER,
    isActive: employee.isActive ?? true,
  };
}

/** شناسه‌ی عددی یا null — Select برای «بدون تیم» null می‌دهد. */
const toId = (value) => (value === "" || value == null ? null : Number(value));

/** payload دستور `CreateUser`. */
export function buildCreatePayload(data) {
  return {
    // غلط املاییِ `fisrtName` عمدی است — قرارداد فعلی سرور همین است.
    fisrtName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    password: data.password,
    departmentId: toId(data.departmentId),
    teamId: toId(data.teamId),
  };
}

/**
 * payload دستور `UpdateUser` — کل رکورد، نه فقط فیلدهای تغییرکرده.
 *
 * `role` فقط وقتی `null` می‌رود که **نه جایگاه و نه نقش** عوض شده باشد؛
 * سرور `null` را «به نقش دست نزن» می‌فهمد، پس ویرایشِ نام کسی را برکنار
 * نمی‌کند و اگر نقش در این فاصله از صفحه‌ی تیم/واحد عوض شده باشد، فرمِ
 * کهنه آن را برنمی‌گرداند. در هر حالت دیگر، انتخابِ صریحِ فرم فرستاده
 * می‌شود — حتی وقتی کاربر جابه‌جا شده و همان نقشِ قبلی را در مقصد دوباره
 * انتخاب کرده (با `null` سرور آن را آزاد می‌کرد).
 */
export function buildUpdatePayload(data, initial) {
  const departmentId = toId(data.departmentId);
  const teamId = toId(data.teamId);
  const role = data.role ?? OrgRoleEnum.MEMBER;

  const stayed =
    departmentId == initial.departmentId &&
    teamId == (initial.teamId ?? null);
  const roleUnchanged = role === (initial.role ?? OrgRoleEnum.MEMBER);

  return {
    id: Number(initial.id),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    departmentId,
    teamId,
    role: stayed && roleUnchanged ? null : role,
    isActive: Boolean(data.isActive),
  };
}

/**
 * @param initialData رکوردِ کارمند در حالت ویرایش (یا null در حالت ثبت)
 * @param draftValues پیش‌نویسِ بازگشتی از صفحه‌ی «واحد/تیم جدید»؛ روی
 *        مقادیر پیش‌فرض می‌نشیند و حالتِ فرم (ثبت/ویرایش) را عوض نمی‌کند
 */
export function useEmployeeForm(initialData = null, draftValues = null) {
  const isEditing = Boolean(initialData);

  const formMethods = useForm({
    defaultValues: {
      ...buildDefaultValues(initialData),
      ...(draftValues ?? {}),
    },
  });

  return {
    formMethods,
    isEditing,
    buildPayload: (data) =>
      isEditing
        ? buildUpdatePayload(data, initialData)
        : buildCreatePayload(data),
  };
}
