// src/features/customers/components/forms/CustomerAddressForm.jsx
import { useState } from "react";
import { MapPin, Map, Mail } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import LocationPickerMap from "@/shared/components/map/LocationPickerMap";
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

export default function CustomerAddressForm({ register, watch, setValue }) {
  const [mapOpen, setMapOpen] = useState(false);
  // آدرس جدیدی که از نقشه آمده ولی هنوز به‌خاطر تعارض با متن دستی کاربر، تایید نشده
  const [pendingAddress, setPendingAddress] = useState(null);

  // مقادیر فعلی lat/lng برای نمایش در دیالوگ و پیش‌مقداردهی مارکر
  const lat = watch ? watch("lat") : "";
  const lng = watch ? watch("lng") : "";

  const handleLocationSelect = (selectedLat, selectedLng, address) => {
    // مختصات همیشه بلافاصله ست می‌شوند؛ این بخش با متن آدرس تداخلی ندارد
    setValue("lat", selectedLat.toFixed(6), { shouldDirty: true });
    setValue("lng", selectedLng.toFixed(6), { shouldDirty: true });

    if (!address) return;

    const currentAddress = (watch("address") || "").trim();

    // اگر کاربر قبلاً چیزی متفاوت در Textarea نوشته باشد، اول تاییدش را می‌گیریم
    // تا آدرس دستی‌اش بی‌اطلاع پاک/جایگزین نشود
    if (currentAddress && currentAddress !== address.trim()) {
      setPendingAddress(address);
      return;
    }

    setValue("address", address, { shouldDirty: true });
  };

  const confirmReplaceAddress = () => {
    if (pendingAddress) {
      setValue("address", pendingAddress, { shouldDirty: true });
    }
    setPendingAddress(null);
  };

  return (
    <Card className="shadow-md rounded-2xl overflow-hidden pt-0 gap-0">
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4.5 w-4.5 text-primary" />
          </div>
          آدرس و موقعیت
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-sm font-medium">آدرس کامل</Label>
          <Textarea 
            id="address" 
            placeholder="خیابان، کوچه، پلاک، واحد..." 
            className="min-h-[90px] rounded-lg transition-all resize-none"
            {...register("address")} 
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="postalCode" className="text-sm font-medium">کد پستی</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="postalCode" 
              dir="ltr" 
              placeholder="1234567890" 
              className="h-10 pr-10 rounded-lg transition-all input-rtl-placeholder"
              {...register("postalCode")} 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">مختصات جغرافیایی</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input 
              dir="ltr" 
              placeholder="Latitude" 
              className="h-10 rounded-lg transition-all input-rtl-placeholder"
              {...register("lat")} 
            />
            <Input 
              dir="ltr" 
              placeholder="Longitude" 
              className="h-10 rounded-lg transition-all input-rtl-placeholder"
              {...register("lng")} 
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 mt-2 rounded-lg transition-all font-medium text-sm"
            onClick={() => setMapOpen(true)}
          >
            <Map className="ml-2 h-4 w-4 text-primary" />
            باز کردن نقشه برای انتخاب مختصات
          </Button>
        </div>
      </CardContent>

      <LocationPickerMap
        open={mapOpen}
        onOpenChange={setMapOpen}
        initialLat={lat}
        initialLng={lng}
        onSelect={handleLocationSelect}
      />

      <AlertDialog open={!!pendingAddress} onOpenChange={(next) => !next && setPendingAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>جایگزینی آدرس</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-right">
                <p>
                  شما قبلاً آدرسی را به‌صورت دستی وارد کرده‌اید. آیا می‌خواهید آن را با
                  آدرس زیر (برگرفته از موقعیت انتخاب‌شده روی نقشه) جایگزین کنید؟
                </p>
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                  {pendingAddress}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAddress(null)}>
              انصراف، آدرس فعلی بماند
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplaceAddress}>
              بله، جایگزین شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}