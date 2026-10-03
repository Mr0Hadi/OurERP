import { useRef, useState } from "react";
import { Loader2, LocateFixed, Search, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { searchPlaces } from "./nominatim";

/**
 * نوارِ بالای نقشه: جست‌وجوی مکان با Nominatim و دکمه‌ی «موقعیت من».
 *
 * @param {object} props
 * @param {(result: { lat: number, lng: number, label: string }) => void} props.onPick انتخابِ یک نتیجه
 * @param {() => void} props.onLocate درخواستِ موقعیتِ GPS
 * @param {boolean} props.isLocating
 * @param {string} [props.locateError]
 */
export default function MapSearchBar({ onPick, onLocate, isLocating, locateError }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const abortRef = useRef(null);

  const runSearch = async () => {
    const text = query.trim();
    if (!text) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError("");
    try {
      const data = await searchPlaces(text, { signal: controller.signal });
      setResults(data);
      setShowResults(true);
      if (data.length === 0) setSearchError("نتیجه‌ای برای این جستجو یافت نشد.");
    } catch (err) {
      if (err.name !== "AbortError") {
        setSearchError("جستجو با خطا مواجه شد. اتصال اینترنت را بررسی کنید.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setSearchError("");
    setShowResults(false);
  };

  const pick = (result) => {
    setShowResults(false);
    setQuery(result.display_name);
    onPick({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      label: result.display_name,
    });
  };

  const error = searchError || locateError;

  return (
    <div className="px-6 pt-4 pb-2 border-b bg-muted/20 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="جستجوی شهر، خیابان یا آدرس..."
            className="h-10 pr-10 pl-9 rounded-lg"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="پاک کردن جستجو"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}

          {showResults && results.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-popover shadow-lg">
              {results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => pick(result)}
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
          disabled={isSearching || !query.trim()}
          aria-label="جستجو"
        >
          {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 px-3 rounded-lg shrink-0 gap-1.5"
          onClick={onLocate}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4 text-primary" />
          )}
          <span className="hidden sm:inline text-sm">موقعیت من</span>
        </Button>
      </div>

      {error && <p className="text-xs text-destructive px-1">{error}</p>}
    </div>
  );
}
