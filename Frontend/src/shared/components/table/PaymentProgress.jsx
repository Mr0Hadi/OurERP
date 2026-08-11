export default function PaymentProgress({ paid, total }) {
  const percent =
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1 items-end min-w-[100px]">
      <span className="tabular-nums text-xs">
        {paid.toLocaleString("fa-IR")} / {total.toLocaleString("fa-IR")}
      </span>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percent === 100
              ? "bg-green-500"
              : percent > 0
                ? "bg-amber-400"
                : "bg-red-400"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
