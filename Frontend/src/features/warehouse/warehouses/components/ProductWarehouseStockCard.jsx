import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useProductWarehouseStockQuery, useWarehousesQuery } from "../services/queries";

/**
 * موجودیِ یک کالا به تفکیکِ انبار (`GetProductWarehouseStock`). فقط با بیش از یک انبار (مستقل از سوییچ: دانه‌های
 * دورانِ روشن سرِ جایشان می‌مانند)؛ با یک انبار همان موجودیِ کالاست.
 */
export default function ProductWarehouseStockCard({ productId }) {
  const manyWarehouses = (useWarehousesQuery().data?.length ?? 0) > 1;
  const { data: rows = [], isLoading } = useProductWarehouseStockQuery(productId, { enabled: manyWarehouses });
  if (!manyWarehouses) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">موجودی در انبارها</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] text-muted-foreground">
              <tr>
                <th className="pb-1 text-right font-normal">انبار</th>
                <th className="pb-1 font-normal">قفسه</th>
                <th className="pb-1 font-normal">قرنطینه</th>
                <th className="pb-1 font-normal">رزرو</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.warehouseId}>
                  <td className="py-1.5">
                    {row.warehouseName}
                    {row.outgoingInTransit > 0 && (
                      <span className="block text-[11px] text-muted-foreground">
                        {formatNumber(row.outgoingInTransit)} دانه در راه به بیرون
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-center tabular-nums font-medium">{formatNumber(row.inStock)}</td>
                  <td className="py-1.5 text-center tabular-nums">{formatNumber(row.quarantined)}</td>
                  <td className="py-1.5 text-center tabular-nums">{formatNumber(row.reserved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
