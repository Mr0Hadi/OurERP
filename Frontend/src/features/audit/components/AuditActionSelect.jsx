import EntitySelect from "@/shared/components/filters/EntitySelect";
import { actionGroupOf } from "../domain/auditEnums";
import { useAuditActionsQuery } from "../services/queries";

const keyOf = (action) => action.value;
const labelOf = (action) => action.title;
const metaOf = (action) => <span className="text-[11px] text-muted-foreground">{actionGroupOf(action.value).label}</span>;

/** انتخابِ یک عملیات از کاتالوگِ سرور (`GetAuditActionList`) با جست‌وجو؛ صد و چند گزینه دارد. */
export default function AuditActionSelect({ label, value, onSelect }) {
  const { actions, isLoading } = useAuditActionsQuery();
  return (
    <EntitySelect
      label={label}
      placeholder="همه‌ی عملیات‌ها"
      emptyText="عملیاتی یافت نشد"
      items={actions}
      value={value}
      onSelect={onSelect}
      isLoading={isLoading}
      getKey={keyOf}
      getLabel={labelOf}
      renderMeta={metaOf}
    />
  );
}
