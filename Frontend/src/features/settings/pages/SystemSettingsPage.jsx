import { Settings } from "lucide-react";
import { useMemo, useState } from "react";

import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import Notice from "@/shared/components/feedback/Notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { usePermission } from "@/features/auth/hooks/usePermission";
import UnsavedChangesDialog from "@/features/permissions/components/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import SettingGroupNav from "../components/SettingGroupNav";
import SettingsSaveBar from "../components/SettingsSaveBar";
import SystemSettingField from "../components/SystemSettingField";
import TextSettingsForm from "../components/TextSettingsForm";
import { useActiveSection } from "../hooks/useActiveSection";
import {
  changedSettings,
  groupAnchor,
  groupIcon,
  isFormGroup,
  serverValue,
  settingValueError,
} from "../domain/systemSetting";
import { useUpdateSystemSettingsMutation } from "../services/mutations";
import { useSystemSettingsQuery } from "../services/queries";

/**
 * تنظیماتِ سامانه (`api/Setting`) — گروه‌ها و فیلدها از پاسخِ سرور ساخته می‌شوند تا تنظیمِ
 * تازه‌ی بکند بدونِ تغییرِ فرانت بیاید. تغییرها پیش‌نویس می‌مانند و از نوارِ پایین یک‌جا
 * (همه یا هیچ) ذخیره می‌شوند.
 */
export default function SystemSettingsPage() {
  const query = useSystemSettingsQuery();
  const mutation = useUpdateSystemSettingsMutation();
  const { allows } = usePermission();
  const readOnly = !allows("SettingManage");

  // فقط کلیدهای دست‌خورده (مقدارِ مؤثر)؛ بقیه مقدارِ سرور را نشان می‌دهند.
  const [draft, setDraft] = useState({});
  const groups = useMemo(() => query.data ?? [], [query.data]);

  const errors = useMemo(() => {
    const result = {};
    for (const s of groups.flatMap((g) => g.settings)) {
      const error = s.key in draft ? settingValueError(s, draft[s.key]) : null;
      if (error) result[s.key] = error;
    }
    return result;
  }, [groups, draft]);

  const changes = changedSettings(groups, draft);
  const changedKeys = new Set(changes.map((c) => c.key));
  const dirtyCountByGroup = Object.fromEntries(
    groups.map((g) => [g.group, g.settings.filter((s) => changedKeys.has(s.key)).length]),
  );

  const blocker = useUnsavedChangesGuard(changes.length > 0, { reason: "تغییرهای ذخیره‌نشده در تنظیمات سامانه" });
  const activeAnchor = useActiveSection(groups.map((g) => groupAnchor(g.group)));

  const valueOf = (setting) => (setting.key in draft ? draft[setting.key] : serverValue(setting));
  const setValue = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => mutation.mutate(changes, { onSuccess: () => setDraft({}) });

  return (
    // عمداً بدونِ `ListPageLayout`: کارتِ آن `overflow-hidden` است و ناوبری و نوارِ ذخیره را از چسبیدن می‌اندازد.
    <div className="container mx-auto w-full min-w-0 space-y-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Settings className="size-5 text-primary" />
          تنظیمات سامانه
        </h1>
        <p className="text-sm text-muted-foreground">
          قاعده‌هایی که روی همه‌ی کاربران اثر دارند. هر تغییر بلافاصله پس از ذخیره اعمال و در تاریخچه‌ی تغییرات ثبت می‌شود.
        </p>
      </header>

      {readOnly && <Notice tone="info">فقط مشاهده — برای تغییر، دسترسیِ «ویرایش تنظیمات» لازم است.</Notice>}

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
          <Skeleton className="h-10 md:h-32" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6">
          <SettingGroupNav
            groups={groups}
            dirtyCountByGroup={dirtyCountByGroup}
            activeAnchor={activeAnchor}
          />

          <div className="min-w-0 space-y-4">
            {groups.map((group) => {
              const Icon = groupIcon(group.group);
              return (
                <Card key={group.group} id={groupAnchor(group.group)} className="gap-0 py-0">
                  <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{group.groupTitle}</CardTitle>
                      <CardDescription className="text-xs">{group.settings.length} تنظیم</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className={isFormGroup(group) ? "px-4 md:px-6" : "divide-y px-4 md:px-6"}>
                    {isFormGroup(group) ? (
                      <TextSettingsForm
                        settings={group.settings}
                        valueOf={valueOf}
                        readOnly={readOnly}
                        onChange={setValue}
                      />
                    ) : (
                      group.settings.map((setting) => (
                        <SystemSettingField
                          key={setting.key}
                          setting={setting}
                          value={valueOf(setting)}
                          error={errors[setting.key] ?? null}
                          readOnly={readOnly}
                          onChange={(value) => setValue(setting.key, value)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <SettingsSaveBar
              count={changes.length}
              hasErrors={Object.keys(errors).length > 0}
              isSaving={mutation.isPending}
              onSave={save}
              onDiscard={() => setDraft({})}
            />
          </div>
        </div>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
