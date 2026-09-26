import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";
import { satisfies } from "@/features/auth/hooks/usePermission";

/**
 * «این کاربر کیست؟» — تنها ورودیِ تصمیم‌گیریِ داشبورد.
 *
 * از دو پاسخِ سرور ساخته می‌شود که هر کاربرِ واردشده دارد:
 * `GetUserInfo` (واحد، تیم و نقشِ سازمانی) و `GetMyPermissions`. هیچ
 * چیزِ دیگری در انتخابِ ویجت‌ها دخیل نیست، تا داشبوردِ دو کارمندِ
 * هم‌نقش و هم‌دسترسی دقیقاً یک پیش‌فرض داشته باشد.
 *
 * محدوده‌ها (`scopes`) همان چیزی است که سرور برای گزارشِ محدوده‌دار
 * اجازه می‌دهد (`frontend-requests.fa.md` بخشِ ۶): «من» برای همه،
 * «تیم» برای مسئول و جانشینِ تیم، «واحد» برای مسئول و جانشینِ واحد.
 * «سازمان» جدا است و به دسترسیِ `ReportView` بسته است، نه به نقش — یک
 * حسابدار ممکن است مسئولِ هیچ‌جا نباشد ولی کلِ گزارش را ببیند.
 */

/** هم‌شماره با `ReportScopeEnum`ِ درخواستی در بکند. */
export const ReportScopeEnum = Object.freeze({
  ME: 0,
  TEAM: 1,
  DEPARTMENT: 2,
});

const TEAM_LEADS = [OrgRoleEnum.TEAM_HEAD, OrgRoleEnum.TEAM_DEPUTY];
const DEPARTMENT_LEADS = [
  OrgRoleEnum.DEPARTMENT_HEAD,
  OrgRoleEnum.DEPARTMENT_DEPUTY,
];

/** همه‌ی دسترسی‌ها لازم‌اند (برخلافِ `satisfies` که هرکدام را کافی می‌داند). */
export const allOf = (names, required = []) =>
  required.every((name) => names.has(name));

export function buildDashboardContext(user, permissionNames) {
  const names = permissionNames ?? new Set();
  const role = Number(user?.role ?? OrgRoleEnum.MEMBER);

  const isTeamLead = TEAM_LEADS.includes(role) && user?.teamId != null;
  const isDepartmentLead = DEPARTMENT_LEADS.includes(role);

  return {
    user,
    role,
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    names,
    can: (required) => satisfies(names, required),
    canAll: (...required) => allOf(names, required),
    isTeamLead,
    isDepartmentLead,
    canSeeOrg: names.has("ReportView"),
    // چه کسی اصلاً کارِ فروش یا خرید می‌کند — برای این‌که «عملکرد من»ِ
    // یک انباردار با چهار کارتِ صفر پر نشود.
    sells: satisfies(names, ["SaleCreate", "SaleInPerson"]),
    buys: names.has("PurchaseCreate"),
  };
}
