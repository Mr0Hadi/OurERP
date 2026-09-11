import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Users } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Button } from "@/shared/components/ui/button";
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
import { useDeleteTeamMutation } from "../../teams/services/mutations";

/**
 * تیم‌های یک واحد، داخل صفحه‌ی جزئیات همان واحد: دیدن تیم‌ها و رفتن به
 * جزئیاتشان، ساختنِ تیمِ تازه (بدون از دست دادنِ فرمِ واحد)، و حذف.
 *
 * «افزودنِ تیمِ موجود» اینجا نیست: تیم بین واحدها جابه‌جا نمی‌شود
 * (`UpdateTeam` `departmentId` نمی‌گیرد).
 *
 * «حذف» یعنی حذفِ نرمِ خودِ تیم؛ متنِ دیالوگ همین را صریح می‌گوید.
 */
export default function DepartmentTeamsCard({
  departmentId,
  onOpenTeam,
  onCreateTeam,
}) {
  const [teamToDelete, setTeamToDelete] = useState(null);

  const { teams: departmentTeams, isLoading } = useTeamOptionsQuery(departmentId);

  const deleteMutation = useDeleteTeamMutation();

  // `teamToDelete?.id` و نه `teamToDelete.id`: کامپایلرِ ری‌اکت خواندنِ
  // پراپرتی را برای مقایسه‌ی وابستگی‌ها به *زمانِ رندر* بالا می‌برد، و در
  // رندرِ اول این state هنوز null است.
  const handleDelete = () => {
    const id = teamToDelete?.id;
    if (id == null) return;

    deleteMutation.mutate(id, { onSuccess: () => setTeamToDelete(null) });
  };

  const isBusy = deleteMutation.isPending;

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
                  {team.headName ?? "بدون مسئول"} ·{" "}
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

      <AlertDialog
        open={teamToDelete != null}
        onOpenChange={(open) => !open && setTeamToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تیم</AlertDialogTitle>
            <AlertDialogDescription>
              «{teamToDelete?.name}» حذف (غیرفعال) می‌شود. تیمی که کارمند فعال
              دارد قابل حذف نیست؛ اول اعضایش را از صفحه‌ی جزئیات همان تیم خارج
              کنید.
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
