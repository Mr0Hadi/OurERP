import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

function ClaimRow({ item, claim, reasonOptions, onUpdate, onRemove }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5">
      <Select
        value={claim.reason}
        onValueChange={(v) => onUpdate(item.lineId, claim.id, "reason", v)}
      >
        <SelectTrigger className="h-8 text-xs sm:w-40 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {reasonOptions.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        min={0}
        value={claim.qty}
        onChange={(e) => onUpdate(item.lineId, claim.id, "qty", e.target.value)}
        className="h-8 text-center text-xs sm:w-16 shrink-0"
      />

      <Input
        placeholder="توضیح اختیاری..."
        value={claim.note || ""}
        onChange={(e) => onUpdate(item.lineId, claim.id, "note", e.target.value)}
        className="h-8 text-xs flex-1"
      />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.lineId, claim.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ProductClaimsCard({
  item,
  reasonOptions,
  addClaimLabel,
  noClaimHint,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
}) {
  const claims = item.claims || [];
  const allocated = claims.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const remaining = Math.max(0, item.maxReturnableQty - allocated);

  return (
    <div
      className={`border border-border rounded-lg p-3 space-y-2.5 ${
        allocated > 0 ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">
            {item.productName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.productCode}
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {allocated.toLocaleString("fa-IR")} از{" "}
          {item.maxReturnableQty.toLocaleString("fa-IR")} ثبت‌شده
        </span>
      </div>

      {claims.length > 0 && (
        <div className="space-y-1.5">
          {claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              item={item}
              claim={claim}
              reasonOptions={reasonOptions}
              onUpdate={onUpdateClaim}
              onRemove={onRemoveClaim}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs gap-1.5"
        onClick={() => onAddClaim(item.lineId)}
        disabled={remaining <= 0}
      >
        <Plus className="h-3.5 w-3.5" />
        {addClaimLabel}
      </Button>

      {claims.length === 0 && (
        <p className="text-xs text-muted-foreground">{noClaimHint}</p>
      )}
    </div>
  );
}

/**
 * انتخاب اقلام یک مرجوعی و تقسیم تعداد هر کالا بین چند دلیل.
 *
 * ساختار داده در خرید و فروش یکسان است (lineId، maxReturnableQty، claims)؛
 * تنها فهرست دلایل و متن‌ها فرق می‌کنند و از بیرون داده می‌شوند.
 */
export default function ReturnClaimsSection({
  items,
  reasonLabels,
  title,
  description,
  emptyText,
  addClaimLabel,
  noClaimHint,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
}) {
  const reasonOptions = useMemo(
    () => Object.entries(reasonLabels),
    [reasonLabels],
  );

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const claimed = (item.claims || []).reduce(
            (s, c) => s + (Number(c.qty) || 0),
            0,
          );
          acc.qty += claimed;
          acc.amount += claimed * item.unitPrice;
          return acc;
        },
        { qty: 0, amount: 0 },
      ),
    [items],
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
            {emptyText}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <ProductClaimsCard
            key={item.lineId}
            item={item}
            reasonOptions={reasonOptions}
            addClaimLabel={addClaimLabel}
            noClaimHint={noClaimHint}
            onAddClaim={onAddClaim}
            onUpdateClaim={onUpdateClaim}
            onRemoveClaim={onRemoveClaim}
          />
        ))}

        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border mt-2">
          <span className="text-sm font-medium text-muted-foreground">
            جمع کل ({totals.qty.toLocaleString("fa-IR")} عدد):
          </span>
          <span className="text-sm font-bold text-card-foreground">
            {totals.amount.toLocaleString("fa-IR")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
