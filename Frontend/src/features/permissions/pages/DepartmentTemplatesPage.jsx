import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Building2, LayoutTemplate } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useDepartmentUserCountQuery } from "@/features/employees/services/queries";

import AccessListPane from "../components/AccessListPane";
import DepartmentTemplatePanel from "../components/DepartmentTemplatePanel";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

const toFa = (n) => Number(n ?? 0).toLocaleString("fa-IR");
const detailPath = (id) => ROUTES.ACCESS_TEMPLATES_DETAIL.replace(":id", id);

function DepartmentTemplateDetail({ departmentId, name, onDirtyChange }) {
  const { can } = usePermission();
  const { userCount } = useDepartmentUserCountQuery(departmentId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link to={ROUTES.ACCESS_TEMPLATES} aria-label="بازگشت به فهرست">
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">الگوی واحد «{name ?? "..."}»</h2>
          <p className="truncate text-xs text-muted-foreground">
            {toFa(userCount)} کارمند فعال · الگو به کسی دسترسی نمی‌دهد و فقط
            هنگام تنظیم دسترسی کارمندانِ این واحد پیشنهاد می‌شود
          </p>
        </div>
        {can("DepartmentView") && (
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.ORG_DEPARTMENTS_DETAIL.replace(":id", departmentId)}>
              <span className="hidden sm:inline">صفحه‌ی واحد</span>
              <Building2 className="size-3.5 sm:hidden" />
            </Link>
          </Button>
        )}
      </div>

      <DepartmentTemplatePanel
        className="flex-1"
        departmentId={departmentId}
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
}

/**
 * «الگوهای واحدها»: فهرستِ واحدها و الگوی واحدِ انتخاب‌شده کنارش.
 */
export default function DepartmentTemplatesPage() {
  const { id } = useParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const [search, setSearch] = useState("");
  const { departments, isLoading } = useDepartmentOptionsQuery();

  const [dirty, setDirty] = useState(false);
  const blocker = useUnsavedChangesGuard(dirty);
  const [dirtyFor, setDirtyFor] = useState(id);
  if (dirtyFor !== id) {
    setDirtyFor(id);
    setDirty(false);
  }

  useEffect(() => {
    setHeader({ title: "الگوهای دسترسی واحدها" });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const needle = search.trim();
  const visible = departments.filter((d) => !needle || d.name.includes(needle));
  const selected = departments.find((d) => String(d.id) === String(id));

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[17rem_minmax(0,1fr)]">
      <AccessListPane
        className={id ? "hidden lg:flex" : "flex h-[calc(100svh-7rem)] lg:h-auto"}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="جست‌وجوی واحد..."
        isLoading={isLoading}
        selectedId={id}
        items={visible.map((d) => ({
          id: d.id,
          title: d.name,
          subtitle: d.userCount != null ? `${toFa(d.userCount)} کارمند` : null,
          to: detailPath(d.id),
        }))}
        emptyText="واحدی پیدا نشد."
        footerText={`${toFa(departments.length)} واحد`}
      />

      <main className={id ? "flex min-h-0 min-w-0 flex-col" : "hidden min-h-0 min-w-0 lg:flex"}>
        {id ? (
          <DepartmentTemplateDetail
            key={id}
            departmentId={id}
            name={selected?.name}
            onDirtyChange={setDirty}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <LayoutTemplate className="size-8 text-muted-foreground/60" />
            <p className="font-medium">یک واحد را انتخاب کنید</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              برای هر واحد مشخص کنید کارمندانش معمولاً چه دسترسی‌هایی دارند.
              هنگام تنظیم یا جابه‌جاییِ کارمند، همین الگو پیشنهاد می‌شود.
            </p>
          </div>
        )}
      </main>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
