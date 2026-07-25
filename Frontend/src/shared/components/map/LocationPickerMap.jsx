// src/shared/components/map/LocationPickerMap.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MapPin, Search, LocateFixed, Loader2, X } from "lucide-react";

// رفع مشکل شناخته‌شده‌ی آیکون پیش‌فرض Leaflet هنگام استفاده با باندلرهایی مثل Vite
// (بدون این تنظیم، آیکون مارکر به‌صورت شکسته نمایش داده می‌شود)
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER = [35.6892, 51.389]; // مرکز پیش‌فرض: تهران
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

const POSTAL_CODE_REGEX = /^[\d۰-۹]{4,10}(-[\d۰-۹]{3,6})?$/;
const ADMIN_PREFIX_REGEX = /^(شهرستان|بخش مرکزی|شهر|بخش|دهستان|روستای|استان)\s+/;
const CENTRAL_DISTRICT_REGEX = /^بخش مرکزی/;
const COUNTY_REGEX = /^شهرستان\s+/;

// حذف پیشوندهای رایج اداری برای مقایسه‌ی نام‌ها (مثلاً «شهر تهران» → «تهران»)
function extractCoreName(part) {
  return part.replace(ADMIN_PREFIX_REGEX, "").trim();
}

/**
 * سرویس Nominatim آدرس کامل را به‌صورت رشته‌ای «از جزئی به کلی» و جدا‌شده با کاما
 * برمی‌گرداند؛ این رشته معمولاً شامل سطوح اداریِ تکراری هم هست، مثلاً:
 *
 *   «..., شهر سیرجان, بخش مرکزی شهرستان سیرجان, شهرستان سیرجان, استان کرمان, ...»
 *
 * که در آن «شهرستان سیرجان» و «بخش مرکزی شهرستان سیرجان» چیزی به «شهر سیرجان»
 * اضافه نمی‌کنند. این تابع:
 *   ۱. کد پستی و نام کشور را از متن آدرس جدا و حذف می‌کند (کد پستی در متن آدرس
 *      نمایش داده نمی‌شود و در فیلد جداگانه‌ای هم ست نمی‌شود).
 *   ۲. سطح «بخش مرکزی ...» را همیشه حذف می‌کند (تقریباً هیچ‌وقت اطلاعات مفیدی
 *      نسبت به نام شهر اضافه نمی‌کند).
 *   ۳. سطح «شهرستان X» را فقط وقتی حذف می‌کند که نام X با یکی دیگر از اجزای آدرس
 *      (مثلاً «شهر X») یکی باشد؛ یعنی واقعاً تکراری باشد.
 *   ۴. ترتیب را از «جزئی به کلی» به «کلی به جزئی» (متداول در آدرس‌نویسی فارسی)
 *      برمی‌گرداند.
 */
function formatAddressFromNominatim(displayName) {
  if (!displayName) return "";

  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return displayName;

  const remaining = [...parts];

  // آخرین توکن معمولاً نام کشور است
  const country = remaining.length > 0 ? remaining.pop() : "";

  // اگر آخرین توکن باقی‌مانده شبیه کدپستی بود، حذفش کن (کدپستی در آدرس نمایش داده نمی‌شود)
  if (remaining.length > 0 && POSTAL_CODE_REGEX.test(remaining[remaining.length - 1])) {
    remaining.pop();
  }

  const coreNames = remaining.map(extractCoreName);

  const filtered = remaining.filter((part, index) => {
    // «بخش مرکزی ...» همیشه حذف می‌شود
    if (CENTRAL_DISTRICT_REGEX.test(part)) return false;

    // «شهرستان X» فقط وقتی حذف می‌شود که در جای دیگری از آدرس همان X تکرار شده باشد
    if (COUNTY_REGEX.test(part)) {
      const core = coreNames[index];
      const isDuplicate = coreNames.some(
        (otherCore, otherIndex) => otherIndex !== index && otherCore === core,
      );
      if (isDuplicate) return false;
    }

    return true;
  });

  // ترتیب Nominatim از جزئی به کلی است؛ برای خوانایی فارسی برعکسش می‌کنیم (کلی به جزئی)
  const hierarchy = [...filtered].reverse();

  let text = hierarchy.join("، ");
  if (country) {
    text = text ? `${text}، ${country}` : country;
  }

  return text || displayName;
}

function LocationMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={defaultIcon} /> : null;
}

// کامپوننت کمکی برای حرکت برنامه‌ای نقشه به یک نقطه‌ی جدید (نتیجه‌ی جستجو یا GPS)
function FlyToHandler({ target }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo(target.position, target.zoom ?? 15, { duration: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return null;
}

/**
 * کامپوننت گلوبال و مستقل از فیچر برای انتخاب مختصات جغرافیایی روی نقشه.
 * در قالب یک Dialog باز می‌شود و سه روش برای تعیین موقعیت دارد:
 *   ۱. کلیک مستقیم روی نقشه
 *   ۲. جستجوی نام مکان/آدرس (از طریق سرویس Nominatim - OpenStreetMap)
 *   ۳. استفاده از موقعیت فعلی کاربر (GPS مرورگر)
 *
 * در هر سه حالت، آدرس متنیِ خلاصه و خوانا (بدون سطوح اداری تکراری و بدون کدپستی)
 * به‌صورت خودکار پیدا می‌شود.
 *
 * با تایید، نتیجه از طریق onSelect(lat, lng, address) برگردانده می‌شود.
 *
 * <LocationPickerMap
 *   open={mapOpen}
 *   onOpenChange={setMapOpen}
 *   initialLat={watch("lat")}
 *   initialLng={watch("lng")}
 *   onSelect={(lat, lng, address) => {
 *     setValue("lat", lat.toFixed(6));
 *     setValue("lng", lng.toFixed(6));
 *     if (address) setValue("address", address);
 *   }}
 * />
 */
export default function LocationPickerMap({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  onSelect,
  title = "انتخاب موقعیت روی نقشه",
}) {
  const initialPosition = useMemo(() => {
    const lat = parseFloat(initialLat);
    const lng = parseFloat(initialLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    return null;
  }, [initialLat, initialLng]);

  const [position, setPosition] = useState(initialPosition);
  const [flyTarget, setFlyTarget] = useState(null);

  // --- آدرس متنی محل انتخاب‌شده (از طریق Reverse Geocoding) ---
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseAbortRef = useRef(null);

  // --- جستجوی مکان ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchAbortRef = useRef(null);

  // --- موقعیت فعلی کاربر (GPS) ---
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const resetTransientState = (next) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowResults(false);
    setLocateError("");
    setPosition(next);
    setFlyTarget(null);
    setResolvedAddress("");
  };

  // پیدا کردن آدرس متنی از روی مختصات (برای کلیک روی نقشه و GPS)
  const reverseGeocode = async (lat, lng) => {
    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    setIsResolvingAddress(true);
    try {
      const url = `${NOMINATIM_REVERSE_URL}?format=json&lat=${lat}&lon=${lng}&accept-language=fa&zoom=18`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("خطا در دریافت آدرس");

      const data = await res.json();
      setResolvedAddress(formatAddressFromNominatim(data?.display_name));
    } catch (err) {
      if (err.name !== "AbortError") {
        setResolvedAddress("");
      }
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const runSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearching(true);
    setSearchError("");

    try {
      const url = `${NOMINATIM_SEARCH_URL}?format=json&addressdetails=0&limit=5&accept-language=fa&q=${encodeURIComponent(
        query,
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("خطا در دریافت نتایج جستجو");

      const data = await res.json();
      setSearchResults(data);
      setShowResults(true);
      if (data.length === 0) {
        setSearchError("نتیجه‌ای برای این جستجو یافت نشد.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setSearchError("جستجو با خطا مواجه شد. اتصال اینترنت را بررسی کنید.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const next = [lat, lng];
    setPosition(next);
    setFlyTarget({ position: next, zoom: 16, key: Date.now() });
    setShowResults(false);
    setSearchQuery(result.display_name);
    setResolvedAddress(formatAddressFromNominatim(result.display_name));
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowResults(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }

    setIsLocating(true);
    setLocateError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude];
        setPosition(next);
        setFlyTarget({ position: next, zoom: 16, key: Date.now() });
        setIsLocating(false);
        reverseGeocode(next[0], next[1]);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError("دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات مرورگر اجازه دهید.");
        } else {
          setLocateError("دریافت موقعیت مکانی با خطا مواجه شد.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // کلیک مستقیم روی نقشه → پیدا کردن آدرس همان نقطه
  const handleMapPositionChange = (next) => {
    setPosition(next);
    reverseGeocode(next[0], next[1]);
  };

  const handleConfirm = () => {
    if (position) {
      onSelect(position[0], position[1], resolvedAddress);
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetTransientState(initialPosition);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* نوار جستجو + دکمه‌ی موقعیت من */}
        <div className="px-6 pt-4 pb-2 border-b bg-muted/20 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="جستجوی شهر، خیابان یا آدرس..."
                className="h-10 pr-10 pl-9 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showResults && searchResults.length > 0 && (
                <div className="absolute z-[1000] mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-popover shadow-lg">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full text-right px-3 py-2 text-sm hover:bg-muted/70 transition-colors border-b last:border-b-0"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-10 px-3 rounded-lg shrink-0"
              onClick={runSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 px-3 rounded-lg shrink-0 gap-1.5"
              onClick={handleUseMyLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4 text-primary" />
              )}
              <span className="hidden sm:inline text-sm">موقعیت من</span>
            </Button>
          </div>

          {(searchError || locateError) && (
            <p className="text-xs text-destructive px-1">{searchError || locateError}</p>
          )}
        </div>

        <div className="h-[380px] w-full">
          {open && (
            <MapContainer
              center={initialPosition || DEFAULT_CENTER}
              zoom={initialPosition ? 15 : 12}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={position} onChange={handleMapPositionChange} />
              <FlyToHandler target={flyTarget} />
            </MapContainer>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-col items-stretch gap-3 sm:items-stretch">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {isResolvingAddress ? (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  در حال یافتن آدرس...
                </span>
              ) : resolvedAddress ? (
                <span className="text-foreground">{resolvedAddress}</span>
              ) : position ? (
                <span className="text-muted-foreground">
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
            <Button type="button" onClick={handleConfirm} disabled={!position}>
              تایید موقعیت
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}