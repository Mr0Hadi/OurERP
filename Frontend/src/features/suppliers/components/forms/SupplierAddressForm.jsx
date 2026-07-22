// src/features/suppliers/components/forms/SupplierAddressForm.jsx
import { MapPin, Map, Mail } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

export default function SupplierAddressForm({ register }) {
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
            onClick={() => window.open("https://maps.google.com", "_blank")}
          >
            <Map className="ml-2 h-4 w-4 text-primary" />
            باز کردن نقشه برای انتخاب مختصات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
