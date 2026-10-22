import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { DOCUMENT_KIND_LABELS } from "@/shared/domain/enums/documentKind";
import { normalizePersianDigits } from "@/shared/lib/persianDigits";
import UserFilterSelect from "@/features/employees/components/UserFilterSelect";
import { AUDIT_ENTITY_LABELS, STANDALONE_ENTITY_TYPES } from "../domain/auditVocabulary";
import { useAuditEventFilterStore } from "../store/auditEventFilterStore";
import AuditActionSelect from "./AuditActionSelect";

const ENTITY_OPTIONS = STANDALONE_ENTITY_TYPES.map((value) => ({ value, label: AUDIT_ENTITY_LABELS[value] }));
const DOCUMENT_OPTIONS = toFilterOptions(DOCUMENT_KIND_LABELS);

/** شناسه‌ی رکورد/سند؛ رقمِ فارسی هم پذیرفته می‌شود. */
function IdInput({ label, placeholder, value, onChange }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Label className="whitespace-nowrap text-sm font-medium text-foreground">{label}</Label>
      <Input
        inputMode="numeric"
        dir="ltr"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(normalizePersianDigits(event.target.value).replace(/\D/g, ""))}
        className="flex-1 text-left"
      />
    </div>
  );
}

/**
 * فیلترهای گزارشِ فعالیت (`GetAuditEventList`). شناسه‌ی رکورد فقط بعد از انتخابِ نوع و شناسه‌ی
 * سند فقط بعد از انتخابِ نوعِ سند دیده می‌شود — سرور نیمه‌ی تنها را نادیده می‌گیرد.
 */
export default function AuditEventFilters() {
  const state = useAuditEventFilterStore();

  const userSelect = <UserFilterSelect label="کاربر" value={state.userId} onSelect={state.setUserId} />;

  return (
    <FilterPanel
      store={useAuditEventFilterStore}
      onReset={state.resetFilters}
      primary={userSelect}
      dateRowClassName="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end"
      resetButtonClassName="w-full px-4"
      dateRow={
        <>
          <FilterSelect
            label="سند"
            value={state.documentKind}
            onChange={state.setDocumentKind}
            options={DOCUMENT_OPTIONS}
            numeric
          />
          {state.documentKind ? (
            <IdInput
              label="شماره سند"
              placeholder="مثلاً ۴۲"
              value={state.documentId}
              onChange={state.setDocumentId}
            />
          ) : (
            <p className="flex items-center rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground xs:col-span-1 lg:col-span-3">
              برای دیدنِ کارهای انجام‌شده روی یک فاکتور یا مرجوعی، اول نوعِ سند را انتخاب کنید.
            </p>
          )}
          {state.documentKind && <div className="hidden lg:col-span-2 lg:block" />}
        </>
      }
    >
      <AuditActionSelect label="عملیات" value={state.action} onSelect={state.setAction} />
      <FilterSelect
        label="نوع رکورد"
        value={state.entityType}
        onChange={state.setEntityType}
        options={ENTITY_OPTIONS}
      />
      {state.entityType && (
        <IdInput label="شناسه رکورد" placeholder="مثلاً ۵" value={state.entityKey} onChange={state.setEntityKey} />
      )}
    </FilterPanel>
  );
}
