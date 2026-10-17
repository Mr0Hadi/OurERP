import { History } from "lucide-react";

import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import AuditEventFilters from "../components/AuditEventFilters";
import AuditEventTable from "../components/AuditEventTable";
import { useAuditEventListFilters, useAuditEventsQuery } from "../services/queries";
import { useAuditEventFilterStore } from "../store/auditEventFilterStore";

/** پیوندهای «فعالیت‌های این کارمند» و مانندِ آن (`?userId=7`، `?entityType=Customer&entityKey=5`). */
const URL_KEYS = ["userId", "action", "documentKind", "documentId", "fromDate", "toDate"];
const URL_TEXT_KEYS = ["entityType", "entityKey"];

/**
 * گزارشِ فعالیتِ کاربران (`GetAuditEventList`) — هر کاری که در سامانه ذخیره شده: چه کسی، کِی،
 * کدام عملیات و روی چند سطر. جزئیاتِ هر رویداد (قبل و بعدِ هر ستون) در صفحه‌ی رویداد است.
 */
export default function AuditEventsPage() {
  useUrlPreset(useAuditEventFilterStore, URL_KEYS, { textKeys: URL_TEXT_KEYS });

  const listState = useAuditEventFilterStore();
  const filters = useAuditEventListFilters();
  const query = useAuditEventsQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="گزارش فعالیت کاربران"
      icon={History}
      description="هر ثبت، ویرایش و حذفی که در سامانه انجام شده، با نامِ کاربر و زمان. برای دیدنِ مقدارهای قبل و بعد، رویداد را باز کنید."
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <AuditEventFilters />
      <ServerTable query={query} listState={listState} table={AuditEventTable} />
    </ListPageLayout>
  );
}
