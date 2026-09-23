import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, KeyRound, UserPen } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useUserListQuery,
  useUserUpdateQuery,
} from "@/features/employees/services/queries";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";

import AccessListPane from "../components/AccessListPane";
import { initialsOf } from "../components/initialsOf";
import UserPermissionsPanel from "../components/UserPermissionsPanel";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

const toFa = (n) => Number(n ?? 0).toLocaleString("fa-IR");
const detailPath = (id) => ROUTES.ACCESS_USERS_DETAIL.replace(":id", id);
const fullNameOf = (u) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;

function EmployeeList({ selectedId, className }) {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const fullName = useDebouncedValue(search);

  const { departments } = useDepartmentOptionsQuery();
  const { data, isLoading } = useUserListQuery({
    page: 1,
    take: 200,
    fullName,
    departmentId,
    isActive: true,
  });
  const users = data?.userList ?? [];

  return (
    <AccessListPane
      className={className}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="جست‌وجوی نام کارمند..."
      filters={
        <Select
          value={departmentId === "" ? "all" : String(departmentId)}
          onValueChange={(v) => setDepartmentId(v === "all" ? "" : Number(v))}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه‌ی واحدها</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      isLoading={isLoading}
      selectedId={selectedId}
      items={users.map((u) => ({
        id: u.id,
        title: fullNameOf(u),
        subtitle: [u.departmentName, u.teamName].filter(Boolean).join(" · "),
        to: detailPath(u.id),
      }))}
      emptyText="کارمندی پیدا نشد."
      footerText={`${toFa(data?.page?.total ?? users.length)} کارمند فعال`}
    />
  );
}

function UserAccessDetail({ userId, onDirtyChange }) {
  const { can } = usePermission();
  const currentUser = useCurrentUser();
  const canEditEmployee = can("UserUpdate");

  // واحد و نامِ کارمند از `GetUserUpdate` می‌آید که `UserUpdate` می‌خواهد؛
  // بدون آن، ادمین واحدِ الگو را خودش در نوارِ الگو انتخاب می‌کند.
  const { data: employee } = useUserUpdateQuery(canEditEmployee ? userId : null);

  const isSelf = currentUser != null && String(currentUser.id) === String(userId);
  const name = employee ? fullNameOf(employee) : `کارمند ${toFa(userId)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link to={ROUTES.ACCESS_USERS} aria-label="بازگشت به فهرست">
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initialsOf(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">
            {name}
            {isSelf && (
              <span className="mr-2 text-xs font-normal text-muted-foreground">
                (خودتان)
              </span>
            )}
          </h2>
          {employee && (
            <p className="truncate text-xs text-muted-foreground">
              {[
                employee.departmentName,
                employee.teamName,
                employee.roleTitle,
                employee.personelCode && `کد ${toFa(employee.personelCode)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        {canEditEmployee && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to={ROUTES.EMPLOYEES_DETAIL.replace(":id", userId)}>
              <UserPen className="size-3.5" />
              <span className="hidden sm:inline">اطلاعات کارمند</span>
            </Link>
          </Button>
        )}
      </div>

      <UserPermissionsPanel
        className="flex-1"
        userId={userId}
        isSelf={isSelf}
        departmentId={employee?.departmentId ?? null}
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
}

/**
 * «دسترسی کارمندان»: فهرستِ کارمندان در یک ستون و دسترسی‌های کارمندِ
 * انتخاب‌شده کنارش — ادمین بدون رفت‌وبرگشت بینِ صفحه‌ها، یکی‌یکی تنظیم می‌کند.
 * ترکِ کارمندی که تغییراتِ ذخیره‌نشده دارد تأیید می‌خواهد.
 */
export default function UserAccessPage() {
  const { id } = useParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const [dirty, setDirty] = useState(false);
  const blocker = useUnsavedChangesGuard(dirty);

  useEffect(() => {
    setHeader({ title: "دسترسی کارمندان" });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  // با عوض‌شدنِ کارمند، پنلِ قبلی unmount می‌شود و خبرِ «تمیز» شدن نمی‌دهد.
  const [dirtyFor, setDirtyFor] = useState(id);
  if (dirtyFor !== id) {
    setDirtyFor(id);
    setDirty(false);
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[19rem_minmax(0,1fr)]">
      <EmployeeList
        selectedId={id}
        className={id ? "hidden lg:flex" : "flex h-[calc(100svh-7rem)] lg:h-auto"}
      />

      <main className={id ? "flex min-h-0 min-w-0 flex-col" : "hidden min-h-0 min-w-0 lg:flex"}>
        {id ? (
          <UserAccessDetail key={id} userId={id} onDirtyChange={setDirty} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <KeyRound className="size-8 text-muted-foreground/60" />
            <p className="font-medium">یک کارمند را از فهرست انتخاب کنید</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              دسترسی‌ها مالِ هر شخص‌اند. الگوی واحدِ کارمند کنارِ دسترسی‌هایش
              نشان داده می‌شود تا با یک کلیک اعمالش کنید.
            </p>
          </div>
        )}
      </main>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
