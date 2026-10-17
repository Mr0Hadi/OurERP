import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Hash, History, Layers, UserRound } from "lucide-react";

import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES } from "@/shared/constants/routes";
import { withFilters } from "@/shared/hooks/useUrlPreset";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import {
  AUDIT_OPERATION_ICONS,
  AUDIT_OPERATION_LABELS,
  AUDIT_OPERATION_TONES,
  actionGroupOf,
  actionTitleOf,
} from "../domain/auditEnums";
import { changeTargetOf } from "../domain/auditVocabulary";
import AuditChangeCard from "../components/AuditChangeCard";
import { useAuditEventQuery } from "../services/queries";

function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

/**
 * تغییرها بر اساسِ صاحبشان: هر سند یک گروه (ردیف‌ها، پرداخت‌ها، ... ی همان فاکتور کنارِ هم)،
 * و هر رکوردِ بی‌سند گروهِ خودش. ترتیبِ اولین ظهور در پاسخِ سرور حفظ می‌شود.
 */
function groupChanges(changes) {
  const groups = new Map();
  for (const change of changes) {
    const key = change.documentKind && change.documentId
      ? `doc:${change.documentKind}:${change.documentId}`
      : `entity:${change.entityType}:${change.entityKey}`;
    if (!groups.has(key)) groups.set(key, { key, target: changeTargetOf(change), changes: [] });
    groups.get(key).changes.push(change);
  }
  return [...groups.values()];
}

function OperationCounts({ changes }) {
  const counts = new Map();
  for (const change of changes) counts.set(change.operation, (counts.get(change.operation) ?? 0) + 1);
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...counts].map(([operation, count]) => (
        <StatusBadge key={operation} tone={AUDIT_OPERATION_TONES[operation]} icon={AUDIT_OPERATION_ICONS[operation]}>
          {formatNumber(count)} {AUDIT_OPERATION_LABELS[operation]}
        </StatusBadge>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function AuditEventDetail({ event }) {
  const group = actionGroupOf(event.action);
  const changes = event.changes ?? [];
  const groups = groupChanges(changes);

  return (
    <div className="container mx-auto max-w-5xl space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <StatusBadge tone={group.tone}>{group.label}</StatusBadge>
              <h2 className="text-lg font-bold md:text-xl">{actionTitleOf(event)}</h2>
            </div>
            {event.userId && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to={withFilters(ROUTES.AUDIT, { userId: event.userId })}>
                  <History className="size-4" />
                  همه‌ی کارهای این کاربر
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 xs:grid-cols-2 lg:grid-cols-4">
            <Meta icon={UserRound} label="کاربر">
              {event.userName || <span className="text-muted-foreground">بدون کاربر (درخواستِ بی‌نام)</span>}
            </Meta>
            <Meta icon={CalendarClock} label="زمان">
              <span className="tabular-nums">{gregorianToPersianDateTime(event.occurredAt)}</span>
            </Meta>
            <Meta icon={Layers} label="سطرهای تغییرکرده">
              {formatNumber(changes.length)}
            </Meta>
            <Meta icon={Hash} label="شماره رویداد">
              <span className="font-mono">{formatDigits(event.id)}</span>
            </Meta>
          </div>

          {changes.length > 0 && <OperationCounts changes={changes} />}
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            این رویداد سطری را تغییر نداده است.
          </CardContent>
        </Card>
      ) : (
        groups.map(({ key, target, changes: groupChangesList }) => (
          <SectionCard
            key={key}
            title={target.label}
            description={`${formatNumber(groupChangesList.length)} سطر`}
            action={
              target.to && (
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to={target.to}>مشاهده</Link>
                </Button>
              )
            }
          >
            {groupChangesList.map((change) => (
              <AuditChangeCard key={change.id} change={change} showTarget={false} />
            ))}
          </SectionCard>
        ))
      )}
    </div>
  );
}

/** یک رویداد با *همه‌ی* تغییراتش (`GetAuditEventDetail`)، به هر سند و رکوردی که تعلق داشته باشند. */
export default function AuditEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, isError, error, refetch } = useAuditEventQuery(id);

  usePageHeader({
    title: isLoading ? "در حال بارگذاری..." : event ? `رویداد ${formatDigits(event.id)}` : "خطا",
    showBack: true,
  });

  if (isLoading) return <DetailSkeleton />;

  if (isError || !event) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="رویداد مورد نظر یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.AUDIT)}
      />
    );
  }

  return <AuditEventDetail event={event} />;
}
