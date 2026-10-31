import { AlertCircle, Building2, IdCard, KeyRound, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import toast from "react-hot-toast";

import ChangePasswordForm from "../components/ChangePasswordForm";
import ProfileForm from "../components/ProfileForm";
import { fullNameOf, initialsOf } from "../domain/userDisplay";
import { useUserInfoQuery } from "../services/queries";

/** یک مشخصه‌ی فقط‌خواندنی در کارتِ بالا؛ خالی ⇒ «—». */
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * حسابِ کاربرِ واردشده: مشخصاتِ سازمانی (فقط‌خواندنی)، ویرایشِ نام و تغییرِ رمز.
 * بی‌دسترسیِ خاص — هر کاربری به حسابِ خودش.
 */
export default function AccountPage() {
  usePageHeader({ title: "حساب کاربری" });
  const { data: user, isLoading, error, refetch } = useUserInfoQuery();

  if (isLoading) return <AccountSkeleton />;

  // خطای تازه‌سازیِ پس‌زمینه (مثلاً تایم‌اوت بعد از ذخیره) داده‌ی قبلی را پاک نمی‌کند.
  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-muted-foreground">{getErrorMessage(error, "دریافت اطلاعات حساب انجام نشد.")}</p>
        <Button onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" />
          تلاش دوباره
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card className="gap-0 overflow-hidden rounded-2xl p-0 shadow-md">
        <div className="flex flex-col items-center gap-3 border-b bg-muted/30 px-4 py-5 text-center sm:flex-row sm:gap-4 sm:px-6 sm:text-right">
          <Avatar className="size-16 rounded-2xl">
            <AvatarFallback className="rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{fullNameOf(user)}</h2>
            <p dir="ltr" className="truncate text-sm text-muted-foreground sm:text-right">
              {user.username}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 min-[420px]:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <InfoItem icon={IdCard} label="کد پرسنلی" value={user.personelCode} />
          <InfoItem icon={Building2} label="واحد" value={user.departmentName} />
          <InfoItem icon={Users} label="تیم" value={user.teamName} />
          <InfoItem icon={ShieldCheck} label="نقش" value={user.roleTitle} />
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FormSectionCard icon={UserRound} title="اطلاعات شخصی" contentClassName="px-4 py-5 sm:px-6">
          <ProfileForm key={`${user.firstName}|${user.lastName}`} user={user} />
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            واحد، تیم، نقش و کد پرسنلی را مسئولِ شما در صفحه‌ی کارمندان تغییر می‌دهد.
          </p>
        </FormSectionCard>

        <FormSectionCard icon={KeyRound} title="تغییر رمز عبور" contentClassName="px-4 py-5 sm:px-6">
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            بعد از تغییر رمز، از همه‌ی دستگاه‌های دیگر خارج می‌شوید؛ این دستگاه وارد می‌ماند.
          </p>
          <ChangePasswordForm
            username={user.username}
            onSuccess={() => toast.success("رمز عبور شما تغییر کرد.")}
          />
        </FormSectionCard>
      </div>
    </div>
  );
}
