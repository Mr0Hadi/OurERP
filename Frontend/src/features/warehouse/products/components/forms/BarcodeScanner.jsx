import { useEffect, useRef, useState } from "react";
import { ScanBarcode, SwitchCamera, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/shared/components/ui/dialog";

// فقط فرمت‌های بارکد خطی رایج در نظر گرفته شده‌اند (نه QR/DataMatrix و...)
// تا هم سرعت اسکن بالاتر برود هم دقت تشخیص بیشتر شود.
const BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
];

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

export default function BarcodeScanner({ value, onChange, ...inputProps }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  // لیست دوربین‌ها را فقط هنگام باز شدن دیالوگ می‌خوانیم
  // و سعی می‌کنیم دوربین پشت گوشی را به‌صورت پیش‌فرض انتخاب کنیم.
  useEffect(() => {
    if (!isScannerOpen) return;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((list) => {
        if (!list.length) return;
        setDevices(list);
        const backCameraIndex = list.findIndex((d) =>
          /back|rear|environment/i.test(d.label)
        );
        setDeviceIndex(backCameraIndex !== -1 ? backCameraIndex : list.length - 1);
      })
      .catch(() => {
        // اگر enumerateDevices قبل از گرفتن مجوز خروجی کاملی ندهد،
        // اجازه می‌دهیم decodeFromVideoDevice خودش دوربین پیش‌فرض را انتخاب کند.
      });
  }, [isScannerOpen]);

  // شروع/توقف واقعی اسکن؛ با تغییر دیالوگ یا دوربین انتخابی دوباره اجرا می‌شود.
  useEffect(() => {
    if (!isScannerOpen || !videoRef.current) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(hints);
    const deviceId = devices[deviceIndex]?.deviceId;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, error) => {
        if (result) {
          onChange(result.getText());
          toast.success("بارکد با موفقیت اسکن شد");
          setIsScannerOpen(false);
          return;
        }
        // در اسکن زنده، «پیدا نشدن بارکد در این فریم» طبیعی و مکرر است،
        // پس با نام خطا فیلتر می‌کنیم (به‌جای instanceof که به‌خاطر دو نسخه‌ی
        // موازی @zxing/library و @zxing/browser ممکن است درست کار نکند).
        if (error && error?.name !== "NotFoundException") {
          console.error(error);
        }
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;

        const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
        const capabilities = track?.getCapabilities?.();
        setTorchSupported(Boolean(capabilities?.torch));
      })
      .catch((err) => {
        if (err?.name === "NotAllowedError") {
          toast.error("دسترسی به دوربین رد شد. لطفاً مجوز دوربین را فعال کنید");
        } else if (err?.name === "NotFoundError") {
          toast.error("دوربینی برای اسکن پیدا نشد");
        } else {
          toast.error("خطا در دسترسی به دوربین");
        }
        setIsScannerOpen(false);
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setTorchOn(false);
      setTorchSupported(false);
    };
  }, [isScannerOpen, deviceIndex, devices]);

  const toggleCamera = () => {
    if (devices.length < 2) return;
    setDeviceIndex((i) => (i + 1) % devices.length);
  };

  const toggleTorch = async () => {
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      toast.error("امکان روشن کردن فلاش روی این دستگاه وجود ندارد");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="بارکد را وارد یا اسکن کنید"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        {...inputProps}
      />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="اسکن بارکد"
          >
            <ScanBarcode className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اسکن بارکد با دوربین</DialogTitle>
          </DialogHeader>

          <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />

            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
              {devices.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={toggleCamera}
                  title="تعویض دوربین"
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
              )}
              {torchSupported && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={toggleTorch}
                  title="فلاش"
                >
                  {torchOn ? (
                    <ZapOff className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            دوربین را مقابل بارکد قرار دهید تا به صورت خودکار خوانده شود.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}