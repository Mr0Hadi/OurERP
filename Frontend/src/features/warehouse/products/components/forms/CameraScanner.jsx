import { useEffect, useRef, useState } from "react";
import { SwitchCamera, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

import { Button } from "@/shared/components/ui/button";

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

export default function CameraScanner({ onDetected }) {
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((list) => {
        if (!list.length) return;
        setDevices(list);
        const backCameraIndex = list.findIndex((d) =>
          /back|rear|environment/i.test(d.label),
        );
        setDeviceIndex(
          backCameraIndex !== -1 ? backCameraIndex : list.length - 1,
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(hints);
    const deviceId = devices[deviceIndex]?.deviceId;

    const constraints = {
      video: {
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        // فوکوس پیوسته: مهم‌ترین تنظیم برای خوندن سریع‌تر بارکد از نزدیک
        advanced: [{ focusMode: "continuous" }],
      },
    };

    reader
      .decodeFromConstraints(constraints, videoRef.current, (result, error) => {
        if (result) {
          onDetected(result.getText());
          toast.success("بارکد با موفقیت اسکن شد");
          return;
        }
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
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setTorchOn(false);
      setTorchSupported(false);
    };
  }, [deviceIndex, devices, onDetected]);

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
  );
}
