import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import AccountingNav from "./AccountingNav";

/**
 * پوسته‌ی صفحه‌های دفترِ حسابداری: نوارِ صفحه‌ها بالای همان `ListPageLayout`ِ بقیه‌ی
 * فهرست‌ها (عنوان، توضیح، دکمه‌ی خروجی).
 *
 * `min-w-0` لازم است: والدِ `<Outlet>` فلکس است و جدولِ پهن بدونِ آن کلِ صفحه را افقی
 * اسکرول می‌کرد (همان نکته‌ی داشبورد).
 */
export default function AccountingPageLayout({ children, ...layoutProps }) {
  return (
    <div className="container mx-auto w-full min-w-0 space-y-3">
      <AccountingNav />
      <ListPageLayout {...layoutProps}>{children}</ListPageLayout>
    </div>
  );
}
