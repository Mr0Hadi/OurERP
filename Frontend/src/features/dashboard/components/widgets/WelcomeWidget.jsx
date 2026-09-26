import { Building2, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

const persianToday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function greetingFor(hour) {
  if (hour < 5) return "شب بخیر";
  if (hour < 12) return "صبح بخیر";
  if (hour < 16) return "ظهر بخیر";
  if (hour < 20) return "عصر بخیر";
  return "شب بخیر";
}

/**
 * سرِ داشبورد: «این داشبوردِ کیست و چرا این‌طور چیده شده».
 *
 * جایگاهِ سازمانی (نقش، واحد، تیم) صریح نوشته می‌شود چون همین سه چیز
 * تعیین می‌کنند چه بخش‌هایی زیرش دیده شوند؛ کسی که از تیمی به تیمِ
 * دیگر رفته، اینجا می‌فهمد چرا داشبوردش عوض شده.
 */
export default function WelcomeWidget({ context, action }) {
  const { user, fullName } = context;
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("‌");

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary"
          >
            {initials || "؟"}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-lg font-bold">
              {greetingFor(new Date().getHours())}، {user?.firstName || fullName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {user?.roleTitle && (
                <Badge variant="secondary" className="font-normal">
                  {user.roleTitle}
                </Badge>
              )}
              {user?.departmentName && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {user.departmentName}
                </span>
              )}
              {user?.teamName && (
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {user.teamName}
                </span>
              )}
              <span>{persianToday.format(new Date())}</span>
            </div>
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
