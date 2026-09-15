import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import ObservationEditor from "@/shared/components/returns/ObservationEditor";
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";
import { allocationOf, NO_QUANTITY_CAP } from "../../hooks/useReceivingForm";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * یک قلمِ دریافت: چند عدد رسید، چندتایش خراب است، و پیش‌نمایشِ اینکه
 * سرور آن را چطور بین موجودی، قرنطینه و مازاد تقسیم می‌کند.
 */
export default function ReceivingItemCard({
  item,
  onArrivedChange,
  onAddDefect,
  onUpdateDefect,
  onRemoveDefect,
}) {
  const arrived = Number(item.arrivedQuantity) || 0;
  const status = getRowStatus(item.stillOwedQuantity, arrived);
  const config = ROW_STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const allocation = allocationOf(item);
  const quarantined =
    (item.quarantinedOnOrderQuantity || 0) + (item.quarantinedExcessQuantity || 0);

  return (
    <div className={`rounded-lg border border-border p-3 space-y-2.5 ${config.rowClass}`}>
      <div className="flex items-start gap-2.5">
        <ProductThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-card-foreground text-sm truncate">
            {item.productName}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
            <span>{item.productCode}</span>
            {item.brand && (
              <>
                <span className="text-border">|</span>
                <span>برند: {item.brand}</span>
              </>
            )}
          </div>
        </div>
        {item.stillOwedQuantity > 0 && (
          <Badge variant="outline" className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          سفارش {fa(item.orderedQuantity)} · قبلاً {fa(item.receivedQuantity)} · باقیمانده{" "}
          <span className="tabular-nums font-medium text-card-foreground">
            {fa(item.stillOwedQuantity)}
          </span>
          {quarantined > 0 && ` · در قرنطینه ${fa(quarantined)}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">رسیده این دور</span>
          <QuantityStepper
            value={item.arrivedQuantity}
            max={NO_QUANTITY_CAP}
            onChange={(next) => onArrivedChange(item.rowKey, next)}
            size="sm"
          />
        </div>
      </div>

      {arrived > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="outline" className={ROW_STATUS_CONFIG.complete.badgeClass}>
              به موجودی: {fa(allocation.healthyOnOrder)}
            </Badge>
            {allocation.defectiveOnOrder > 0 && (
              <Badge variant="outline" className={ROW_STATUS_CONFIG.partial.badgeClass}>
                قرنطینه (خراب، سهم سفارش): {fa(allocation.defectiveOnOrder)}
              </Badge>
            )}
            {allocation.excess > 0 && (
              <Badge variant="outline" className={ROW_STATUS_CONFIG.partial.badgeClass}>
                قرنطینه (مازاد): {fa(allocation.excess)}
              </Badge>
            )}
          </div>

          <ObservationEditor
            round={{ effectId: item.rowKey, quantity: arrived, observations: item.defects }}
            onAddObservation={onAddDefect}
            onUpdateObservation={onUpdateDefect}
            onRemoveObservation={onRemoveDefect}
            title={`خرابی‌های این قلم (${fa(arrived)} عدد رسیده)`}
            emptyHint="اگر بخشی از رسیده‌ها خراب است، تعداد و علتش را ثبت کنید. کالای خراب به قرنطینه می‌رود، نه موجودی."
            healthySuffix="عدد سالم"
            addLabel="افزودن خرابی"
          />
        </>
      )}
    </div>
  );
}
