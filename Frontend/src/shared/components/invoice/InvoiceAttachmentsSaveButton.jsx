import { Button } from "@/shared/components/ui/button";

const keysOf = (list = []) =>
  list
    .map((item) => item?.objectKey)
    .filter(Boolean)
    .join("|");
const notesOf = (list = []) => list.map((item) => item?.note || "").join("|");

/**
 * پیوست‌های فاکتورِ صادرشده جدا از فرم ذخیره می‌شوند
 * (`Update{Purchase,Sale}Attachments`). دکمه فقط وقتی دیده می‌شود که
 * فهرست با نسخه‌ی سرور فرق دارد.
 */
export default function InvoiceAttachmentsSaveButton({
  attachments,
  saved = [],
  isPending,
  onSave,
}) {
  const current = attachments.filesPayload;
  const dirty =
    keysOf(current) !== keysOf(saved) || notesOf(current) !== notesOf(saved);
  if (!dirty) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full"
      disabled={isPending || attachments.isUploading}
      onClick={() => onSave(current)}
    >
      {attachments.isUploading
        ? "در حال بارگذاری..."
        : isPending
          ? "در حال ذخیره..."
          : "ذخیره‌ی پیوست‌ها"}
    </Button>
  );
}
