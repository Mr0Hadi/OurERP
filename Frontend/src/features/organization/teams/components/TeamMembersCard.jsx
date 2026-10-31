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
import { ORG_ROLE_LABELS, OrgRoleEnum } from "@/shared/domain/enums/orgRole";

import {
  useTeamMembersQuery,
  useTeamCandidatesQuery,
} from "@/features/employees/services/queries";
import { useChangeUserTeamMutation } from "@/features/employees/services/mutations";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";

/** `UserListDto` نامِ کامل ندارد؛ از `firstName`/`lastName` ساخته می‌شود. */
const fullNameOf = (user) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

const roleTitleOf = (user) =>
  user.roleTitle ?? ORG_ROLE_LABELS[user.role] ?? ORG_ROLE_LABELS[OrgRoleEnum.MEMBER];

/**
 * اعضای یک تیم، داخل صفحه‌ی جزئیات همان تیم.
 *
 * همه‌ی کارها — افزودن، خارج‌کردن، «مسئول کردن» و «جانشین کردن» — یک
 * دستور در سرورند: `ChangeUserTeam` (با `isHead`/`isDeputy`). نقشِ هر عضو
 * مستقیم از `role`/`roleTitle`ِ فهرستِ کارمندان خوانده می‌شود؛ سرور آن را
 * از خودِ `headId`/`deputyId` تیم و واحد مشتق می‌کند، پس با این صفحه
 * اختلاف پیدا نمی‌کند.
 *
 * قاعده‌ی سرور: هر کاربر یک نقش دارد و هر جابه‌جایی نقشِ قبلی را آزاد
 * می‌کند. `isHead` و `isDeputy` هر دو false یعنی «عضو ساده».
 */
export default function TeamMembersCard({ team, onOpenEmployee }) {
  const [memberToAdd, setMemberToAdd] = useState("");
  const [memberToRemove, setMemberToRemove] = useState(null);

  const { members, isLoading } = useTeamMembersQuery(team.id);
  const { candidates } = useTeamCandidatesQuery(team.id);

  const assignMutation = useChangeUserTeamMutation();

  const handleAdd = () => {
    if (memberToAdd === "") return;

    const user = candidates.find((item) => item.id === Number(memberToAdd));
    if (!user) return;

    assignMutation.mutate(
      {
        userId: user.id,
        departmentId: team.departmentId,
        teamId: team.id,
        successMessage: `${fullNameOf(user)} به تیم اضافه شد.`,
      },
      { onSuccess: () => setMemberToAdd("") },
    );
  };

  const handleAssignRole = (member, role) => {
    const isHead = role === OrgRoleEnum.TEAM_HEAD;

    assignMutation.mutate({
      userId: member.id,
      departmentId: team.departmentId,
      teamId: team.id,
      isHead,
      isDeputy: !isHead,
      successMessage: `${fullNameOf(member)} ${ORG_ROLE_LABELS[role]} شد.`,
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
            {members.map((member) => (
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
                    {roleTitleOf(member)} · {member.personelCode ?? "—"}
                    {!member.isActive && " · غیرفعال"}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {member.isActive && member.role !== OrgRoleEnum.TEAM_HEAD && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="تعیین به‌عنوان مسئول تیم"
                      onClick={() =>
                        handleAssignRole(member, OrgRoleEnum.TEAM_HEAD)
                      }
                      disabled={isBusy}
                    >
                      <Crown className="h-4 w-4" />
                    </Button>
                  )}
                  {member.isActive &&
                    member.role !== OrgRoleEnum.TEAM_DEPUTY && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="تعیین به‌عنوان جانشین تیم"
                        onClick={() =>
                          handleAssignRole(member, OrgRoleEnum.TEAM_DEPUTY)
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
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">افزودن عضو</p>
          <div className="flex gap-2">
            <OptionSelect
              value={memberToAdd}
              onChange={setMemberToAdd}
              disabled={isBusy || candidates.length === 0}
              placeholder={
                candidates.length === 0 ? "کارمندی برای افزودن نیست" : "انتخاب کارمند"
              }
              className="h-10 rounded-lg flex-1"
              contentClassName="rounded-xl"
              itemClassName="rounded-lg"
              options={candidates.map((user) => ({
                value: user.id,
                label: (
                  <>
                    {fullNameOf(user)}
                    {" — "}
                    {[user.departmentName, user.teamName].filter(Boolean).join(" / ")}
                    {user.role !== OrgRoleEnum.MEMBER && ` (${roleTitleOf(user)})`}
                  </>
                ),
              }))}
            />

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
            کارمند به‌عنوان عضو ساده به این تیم (و واحدش) منتقل می‌شود. هر نقش
            مسئول یا جانشینی که جای دیگری داشته باشد آزاد می‌شود.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={memberToRemove != null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="خروج عضو از تیم"
        description={
          <>
            {memberToRemove && fullNameOf(memberToRemove)} از «{team.name}» خارج می‌شود و عضو ساده‌ی واحدش
            باقی می‌ماند. اگر مسئول یا جانشینِ این تیم باشد، آن نقش آزاد می‌شود.
          </>
        }
        confirmLabel="خروج از تیم"
        isPending={isBusy}
        onConfirm={handleRemove}
      />
    </FormSectionCard>
  );
}
