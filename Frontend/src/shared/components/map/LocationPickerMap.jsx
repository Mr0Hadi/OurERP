import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import MapSearchBar from "./MapSearchBar";
import { formatAddressFromNominatim, reverseGeocode } from "./nominatim";

// Leaflet سنگین است؛ فقط وقتی دیالوگ باز شد دانلود می‌شود.
const MapCanvas = lazy(() => import("./MapCanvas"));

const toPosition = (lat, lng) => {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  return Number.isNaN(parsedLat) || Number.isNaN(parsedLng) ? null : [parsedLat, parsedLng];
};

const GEO_ERRORS = {
  unsupported: "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.",
  denied: "دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات مرورگر اجازه دهید.",
  failed: "دریافت موقعیت مکانی با خطا مواجه شد.",
};

/**
 * دیالوگِ انتخابِ مختصات روی نقشه، مستقل از فیچر. سه راه برای تعیینِ نقطه:
 * کلیک روی نقشه، جست‌وجوی مکان، و «موقعیت من» (GPS مرورگر). در هر سه حالت
 * آدرسِ متنیِ خلاصه (بدونِ سطوحِ اداریِ تکراری و کد پستی) خودکار پیدا می‌شود.
 *
 * با تأیید، `onSelect(lat, lng, address)` صدا زده می‌شود.
 *
 * محتوای دیالوگ فقط وقتی باز است mount می‌شود، پس با هر بار باز شدن جست‌وجو و
 * خطاها از نو شروع می‌شوند و نقطه به مقدارِ اولیه برمی‌گردد.
 */
export default function LocationPickerMap({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  onSelect,
  title = "انتخاب موقعیت روی نقشه",
}) {
  const initialPosition = useMemo(() => toPosition(initialLat, initialLng), [initialLat, initialLng]);

  const [position, setPosition] = useState(initialPosition);
  const [flyTarget, setFlyTarget] = useState(null);
  const [address, setAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const reverseAbortRef = useRef(null);

  const resetForOpen = () => {
    setPosition(initialPosition);
    setFlyTarget(null);
    setAddress("");
    setLocateError("");
  };

  /** نقطه‌ی تازه + پیدا کردنِ آدرسش؛ درخواستِ قبلیِ هنوز‌بازنگشته لغو می‌شود. */
  const moveTo = async (next, { fly = false } = {}) => {
    setPosition(next);
    if (fly) setFlyTarget({ position: next, zoom: 16 });

    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    setIsResolvingAddress(true);
    try {
      setAddress(await reverseGeocode(next[0], next[1], { signal: controller.signal }));
    } catch (err) {
      if (err.name !== "AbortError") setAddress("");
    } finally {
      if (!controller.signal.aborted) setIsResolvingAddress(false);
    }
  };

  const handlePickSearchResult = ({ lat, lng, label }) => {
    reverseAbortRef.current?.abort();
    setIsResolvingAddress(false);
    const next = [lat, lng];
    setPosition(next);
    setFlyTarget({ position: next, zoom: 16 });
    setAddress(formatAddressFromNominatim(label));
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError(GEO_ERRORS.unsupported);
      return;
    }
    setIsLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        moveTo([pos.coords.latitude, pos.coords.longitude], { fly: true });
      },
      (err) => {
        setIsLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED ? GEO_ERRORS.denied : GEO_ERRORS.failed);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleConfirm = () => {
    if (position) onSelect(position[0], position[1], address);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForOpen();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4.5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <MapSearchBar
          onPick={handlePickSearchResult}
          onLocate={handleLocate}
          isLocating={isLocating}
          locateError={locateError}
        />

        <div className="h-[380px] w-full">
          {open && (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  در حال بارگذاری نقشه...
                </div>
              }
            >
              <MapCanvas
                initialPosition={initialPosition}
                position={position}
                flyTarget={flyTarget}
                onPositionChange={(next) => moveTo(next)}
              />
            </Suspense>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-col items-stretch gap-3 sm:items-stretch">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {isResolvingAddress ? (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  در حال یافتن آدرس...
                </span>
              ) : address ? (
                <span className="text-foreground">{address}</span>
              ) : position ? (
                <span className="text-muted-foreground" dir="ltr">
                  {`${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  روی نقشه کلیک کنید یا از جستجو/موقعیت من استفاده کنید
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            {/* تا آدرس پیدا نشده تأیید نمی‌شود؛ وگرنه موقعیت بدونِ آدرس ذخیره می‌شد. */}
            <Button type="button" onClick={handleConfirm} disabled={!position || isResolvingAddress}>
              تایید موقعیت
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
