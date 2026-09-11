import { useState } from "react";
import {
  ChevronLeft,
  Crown,
  Plus,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  ORG_POSITION_LABELS,
  OrgPositionEnum,
  orgPositionIn,
} from "@/shared/domain/enums/orgHeadRole";

import {
  useTeamMembersQuery,
  useTeamCandidatesQuery,
} from "@/features/employees/services/queries";
import { useAssignEmployeeMembershipMutation } from "@/features/employees/services/mutations";

const fullNameOf = (employee) =>
  employee.fullName ||
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

/**
 * اعضای یک تیم، داخل صفحه‌ی جزئیات همان تیم.
 *
 * همه‌ی کارها — افزودن، خارج‌کردن، «مدیر کردن» و «معاون کردن» — یک دستور در
 * سرورند: `ChangeUserTeam` (با `isHead`/`isDeputy`). عمداً از `UpdateUser`
 * استفاده نمی‌شود چون `ChangeUserTeamCommand` پیش از جابه‌جایی
 * `ReleaseAllRolesAsync` را صدا می‌زند.
 *
 * ⚠️ آن آزادسازی **همه‌ی** سمت‌های کاربر است، نه فقط سمتِ تیمِ قبلی:
 * مدیریت و معاونتِ هر تیم *و واحدی* که داشته باشد — حتی وقتی فقط از این
 * تیم خارج می‌شود. متن‌های راهنما و دیالوگ همین را صریح می‌گویند.
 *
 * افزودنِ عضو، واحدِ کارمند را هم به واحدِ تیم تغییر می‌دهد؛ سرور اجازه‌ی
 * عضویت در تیمی که زیر واحد دیگری است را نمی‌دهد.
 */
export default function TeamMembersCard({ team, onOpenEmployee }) {
  const [memberToAdd, setMemberToAdd] = useState("");
  const [memberToRemove, setMemberToRemove] = useState(null);

  const { members, isLoading } = useTeamMembersQuery(team.id);
  const { candidates } = useTeamCandidatesQuery(team.id);

  const assignMutation = useAssignEmployeeMembershipMutation();

  const handleAdd = () => {
    if (memberToAdd === "") return;

    const employee = candidates.find((item) => item.id === Number(memberToAdd));
    if (!employee) return;

    assignMutation.mutate(
      {
        userId: employee.id,
        departmentId: team.departmentId,
        teamId: team.id,
        successMessage: `${fullNameOf(employee)} به تیم اضافه شد.`,
      },
      { onSuccess: () => setMemberToAdd("") },
    );
  };

  const handleAssignPosition = (member, position) => {
    const isHead = position === OrgPositionEnum.HEAD;

    assignMutation.mutate({
      userId: member.id,
      departmentId: team.departmentId,
      teamId: team.id,
      isHead,
      isDeputy: !isHead,
      successMessage: `${fullNameOf(member)} ${
        isHead ? "مدیر" : "معاون"
      } این تیم شد.`,
    });
  };

  const handleRemove = () => {
    if (!memberToRemove) return;

    // واحد دست نمی‌خورد: کارمند از تیم خارج می‌شود ولی هنوز کارمندِ همان
    // واحد است. سرور هم `DepartmentId > 0` می‌خواهد، پس واحدِ فعلیِ خودش
    // فرستاده می‌شود.
    assignMutation.mutate(
      {
        userId: memberToRemove.id,
        departmentId: memberToRemove.departmentId ?? team.departmentId,
        teamId: null,
        successMessage: `${fullNameOf(memberToRemove)} از تیم خارج شد.`,
      },
      { onSuccess: () => setMemberToRemove(null) },
    );
  };

  const isBusy = assignMutation.isPending;

  return (
    <FormSectionCard icon={Users} title="اعضای تیم">
      <div className="space-y-4">
        {isLoading ? (
          <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            این تیم هنوز عضوی ندارد.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {members.map((member) => {
              const position = orgPositionIn(team, member.id);

              return (
                <li
                  key={member.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 ${
                    member.isActive ? "" : "opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {fullNameOf(member)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ORG_POSITION_LABELS[position]} ·{" "}
                      {member.personelCode ?? "—"}
                      {!member.isActive && " · غیرفعال"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {member.isActive && position !== OrgPositionEnum.HEAD && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="تعیین به‌عنوان مدیر تیم"
                        onClick={() =>
                          handleAssignPosition(member, OrgPositionEnum.HEAD)
                        }
                        disabled={isBusy}
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    )}
                    {member.isActive && position !== OrgPositionEnum.DEPUTY && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="تعیین به‌عنوان معاون تیم"
                        onClick={() =>
                          handleAssignPosition(member, OrgPositionEnum.DEPUTY)
                        }
                        disabled={isBusy}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => onOpenEmployee(member.id)}
                    >
                      جزئیات
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      title="خارج‌کردن از تیم"
                      onClick={() => setMemberToRemove(member)}
                      disabled={isBusy}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">افزودن عضو</p>
          <div className="flex gap-2">
            {/* رشته‌ی خالی (نه undefined) یعنی «بدون انتخاب»؛ با undefined
                انتخابگر uncontrolled می‌شود و بعد از افزودنِ عضو، نامِ
                قبلی روی دکمه می‌ماند. */}
            <Select
              value={String(memberToAdd)}
              onValueChange={setMemberToAdd}
              disabled={isBusy || candidates.length === 0}
            >
              <SelectTrigger className="h-10 rounded-lg flex-1">
                <SelectValue
                  placeholder={
                    candidates.length === 0
                      ? "کارمندی برای افزودن نیست"
                      : "انتخاب کارمند"
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {candidates.map((employee) => (
                  <SelectItem
                    key={employee.id}
                    value={String(employee.id)}
                    className="rounded-lg"
                  >
                    {fullNameOf(employee)}
                    {employee.teamName ? ` (${employee.teamName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              onClick={handleAdd}
              disabled={isBusy || memberToAdd === ""}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-5">
            کارمند از تیم قبلی‌اش خارج و واحدش به واحد این تیم تغییر می‌کند. هر
            سمتِ مدیریت یا معاونتی که در تیم یا واحدِ دیگری داشته باشد آزاد
            می‌شود.
          </p>
        </div>
      </div>

      <AlertDialog
        open={memberToRemove != null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>خروج عضو از تیم</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && fullNameOf(memberToRemove)} از «{team.name}»
              خارج می‌شود. حساب کاربری و واحد سازمانی‌اش دست‌نخورده می‌ماند،
              ولی هر سمتِ مدیریت یا معاونتی که دارد — در این تیم یا در واحدش —
              آزاد می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBusy ? "در حال انجام..." : "خروج از تیم"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormSectionCard>
  );
}
