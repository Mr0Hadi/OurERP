import { useState } from "react";

import PrintPreviewOverlay from "@/shared/components/print/PrintPreviewOverlay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { LABEL_CODE_KIND_OPTIONS } from "@/shared/domain/barcode/barcodeConfig";

import { fa } from "../domain/unitVocabulary";
import { usePrintPreferenceStore } from "../store/unitFilterStore";
import { useMarkUnitsPrintedMutation } from "../services/mutations";
import UnitLabel from "./UnitLabel";

/**
 * چاپِ برچسبِ دانه‌ها + ثبتِ اینکه چاپ شدند.
 *
 * مرورگر نمی‌گوید پرینتر واقعاً چاپ کرد یا کاربر پنجره‌ی چاپ را بست؛ پس
 * بعد از بستنِ پنجره یک سؤالِ صریح می‌پرسیم و فقط با «بله» ثبت می‌کنیم.
 * ثبتِ اشتباه بدتر از ثبت‌نکردن است: دانه از صفِ چاپ بیرون می‌رود و
 * برچسبش هرگز زده نمی‌شود.
 *
 * `onClose(printed)` — `true` فقط وقتی چاپ ثبت شد.
 */
export default function UnitPrintDialog({ units, onClose }) {
  const [askConfirm, setAskConfirm] = useState(false);
  const { sheetPresetKey, setSheetPresetKey, labelCodeKind, setLabelCodeKind } =
    usePrintPreferenceStore();
  const markPrinted = useMarkUnitsPrintedMutation();

  const open = Boolean(units?.length);
  const count = units?.length ?? 0;

  const confirmPrinted = () =>
    markPrinted.mutate(units, {
      onSuccess: () => {
        setAskConfirm(false);
        onClose(true);
      },
    });

  return (
    <>
      <PrintPreviewOverlay
        open={open && !askConfirm}
        onOpenChange={(next) => !next && onClose(false)}
        title={`چاپ ${fa(count)} برچسب`}
        items={units ?? []}
        renderItem={(unit) => <UnitLabel unit={unit} codeKind={labelCodeKind} />}
        getItemKey={(unit) => unit.id}
        presetKey={sheetPresetKey}
        onPresetKeyChange={setSheetPresetKey}
        onPrinted={() => setAskConfirm(true)}
        toolbar={
          <Select value={labelCodeKind} onValueChange={setLabelCodeKind}>
            <SelectTrigger dir="rtl" className="h-9 w-auto min-w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {LABEL_CODE_KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <AlertDialog open={open && askConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>برچسب‌ها چاپ شدند؟</AlertDialogTitle>
            <AlertDialogDescription>
              اگر {fa(count)} برچسب درست از پرینتر بیرون آمد، ثبتش کنید تا این دانه‌ها از
              «صف چاپ برچسب» بیرون بروند و تاریخ و دفعاتِ چاپ روی هر دانه بماند. اگر
              چاپ لغو شد یا خراب درآمد، «چاپ نشد» را بزنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={markPrinted.isPending}
              onClick={() => setAskConfirm(false)}
            >
              چاپ نشد — برگرد
            </AlertDialogCancel>
            <AlertDialogAction disabled={markPrinted.isPending} onClick={confirmPrinted}>
              {markPrinted.isPending ? "در حال ثبت..." : "بله، ثبت کن"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
