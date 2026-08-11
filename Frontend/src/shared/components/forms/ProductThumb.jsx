export default function ProductThumb({ item }) {
  return item.image ? (
    <img
      src={item.image}
      alt={item.productName}
      className="w-10 h-10 rounded-md object-cover shrink-0 border border-border"
    />
  ) : (
    <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
      <span className="text-[10px] text-muted-foreground">تصویر</span>
    </div>
  );
}
