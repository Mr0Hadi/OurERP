// src/features/organization/departments/components/DepartmentTeamsCard.jsx
import { useMemo, useState } from "react";
import { ChevronLeft, Plus, Trash2, Users } from "lucide-react";

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

import { useTeamOptionsQuery } from "../../teams/services/queries";
import {
  useAssignTeamToDepartmentMutation,
  useDeleteTeamMutation,
} from "../../teams/services/mutations";

/**
 * تیم‌های یک واحد، داخل صفحه‌ی جزئیات همان واحد.
 *
 * سه کارِ خواسته‌شده را کنار هم می‌گذارد: دیدن تیم‌ها و رفتن به جزئیاتشان،
 * ساختن تیم تازه (بدون از دست دادنِ فرمِ واحد)، و اضافه/حذف‌کردن تیم.
 *
 * «افزودن» یعنی انتقالِ یک تیمِ *موجود* از واحد دیگر به این واحد — تیم در
 * بکند بدون واحد وجود ندارد (`Team.DepartmentId` غیرقابل‌null است)، پس
 * چیزی به اسم «تیمِ بی‌واحد» برای انتخاب وجود ندارد.
 *
 * «حذف» هم به همین دلیل یعنی حذفِ نرمِ خودِ تیم، نه جداکردنش از واحد؛
 * متنِ دیالوگ همین را صریح می‌گوید تا کاربر فکر نکند تیم جای دیگری
 * می‌رود.
 */
export default function DepartmentTeamsCard({
  departmentId,
  departmentName,
  onOpenTeam,
  onCreateTeam,
}) {
  const [teamToAdd, setTeamToAdd] = useState("");
  const [teamToDelete, setTeamToDelete] = useState(null);

  const { teams: departmentTeams, isLoading } = useTeamOptionsQuery(departmentId);
  const { teams: allTeams } = useTeamOptionsQuery("");

  const assignMutation = useAssignTeamToDepartmentMutation();
  const deleteMutation = useDeleteTeamMutation();

  /**
   * تیم‌هایی که این واحد ندارد.
   *
   * تفریق بر اساس *شناسه* انجام می‌شود، نه `team.departmentId`:
   * `TeamListDto` در سرور `DepartmentId` ندارد (فقط `DepartmentName`)، و
   * فیلترکردن روی فیلدی که همیشه undefined است یعنی تیم‌های خودِ همین
   * واحد هم در فهرستِ «افزودن» ظاهر شوند.
   */
  const addableTeams = useMemo(() => {
    const mine = new Set(departmentTeams.map((team) => team.id));
    return allTeams.filter((team) => !mine.has(team.id));
  }, [allTeams, departmentTeams]);

  const handleAdd = () => {
    if (teamToAdd === "") return;

    // فقط شناسه می‌رود؛ لایه‌ی api خودش رکوردِ کامل را با
    // `GetTeamDetail` می‌گیرد، چون `UpdateTeam` کل رکورد را بازنویسی
    // می‌کند و ردیفِ فهرست `headId`/`deputyId` ندارد.
    assignMutation.mutate(
      { teamId: Number(teamToAdd), departmentId },
      { onSuccess: () => setTeamToAdd("") },
    );
  };

  // `teamToDelete?.id` و نه `teamToDelete.id`: کامپایلرِ ری‌اکت خواندنِ
  // پراپرتی را برای مقایسه‌ی وابستگی‌ها به *زمانِ رندر* بالا می‌برد، و در
  // رندرِ اول این state هنوز null است.
  const handleDelete = () => {
    const id = teamToDelete?.id;
    if (id == null) return;

    deleteMutation.mutate(id, { onSuccess: () => setTeamToDelete(null) });
  };

  const isBusy = assignMutation.isPending || deleteMutation.isPending;

  return (
    <FormSectionCard
      icon={Users}
      title="تیم‌های این واحد"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onCreateTeam}
        >
          <Plus className="h-4 w-4" />
          تیم جدید
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        ) : departmentTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            این واحد هنوز تیمی ندارد.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {departmentTeams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {team.headName ?? "بدون مدیر"} ·{" "}
                    {Number(team.userCount ?? 0).toLocaleString("fa-IR")} عضو
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onOpenTeam(team.id)}
                  >
                    جزئیات
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setTeamToDelete(team)}
                    disabled={isBusy}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">افزودن تیم موجود به این واحد</p>
          <div className="flex gap-2">
            {/* رشته‌ی خالی (نه undefined) یعنی «بدون انتخاب»؛ با undefined
                انتخابگر uncontrolled می‌شود و بعد از افزودنِ تیم، نامِ
                قبلی روی دکمه می‌ماند. */}
            <Select
              value={String(teamToAdd)}
              onValueChange={setTeamToAdd}
              disabled={isBusy || addableTeams.length === 0}
            >
              <SelectTrigger className="h-10 rounded-lg flex-1">
                <SelectValue
                  placeholder={
                    addableTeams.length === 0
                      ? "تیمی در واحدهای دیگر نیست"
                      : "انتخاب تیم"
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {addableTeams.map((team) => (
                  <SelectItem
                    key={team.id}
                    value={String(team.id)}
                    className="rounded-lg"
                  >
                    {team.name} ({team.departmentName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              onClick={handleAdd}
              disabled={isBusy || teamToAdd === ""}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            تیم از واحد فعلی‌اش جدا و به «{departmentName}» منتقل می‌شود. اعضای
            تیم فعلاً در واحد قبلی‌شان می‌مانند و باید جداگانه منتقل شوند.
          </p>
        </div>
      </div>

      <AlertDialog
        open={teamToDelete != null}
        onOpenChange={(open) => !open && setTeamToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تیم از این واحد</AlertDialogTitle>
            <AlertDialogDescription>
              «{teamToDelete?.name}» حذف (غیرفعال) می‌شود. تیمی که کارمند فعال
              دارد قابل حذف نیست؛ اول اعضایش را از صفحه‌ی جزئیات همان تیم خارج
              کنید. اگر می‌خواهید تیم را به واحد دیگری ببرید، به‌جای حذف واحدش
              را عوض کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormSectionCard>
  );
}
