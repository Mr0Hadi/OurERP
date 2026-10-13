import { useEffect, useRef, useState } from "react";
import { QrCode, ScanBarcode, SwitchCamera, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { createFrameReader } from "@/shared/domain/barcode/frameReader";

/**
 * رزولوشنی که از دوربین می‌خواهیم. ۷۲۰p: در ۶۴۰×۴۸۰ میله‌های باریکِ
 * CODE128ِ بلند فقط از فاصله‌ی خیلی نزدیک تفکیک می‌شدند (که آنجا هم
 * فوکوس نمی‌گیرد).
 */
const IDEAL_WIDTH = 1280;
const IDEAL_HEIGHT = 720;

/** حالت‌های اسکن؛ هر حالت فقط نمادِ خودش را دیکد می‌کند. */
const MODE_LABELS = { barcode: "بارکد", qr: "کد QR" };

/** فاصله‌ی حلقه وقتی مرورگر `requestVideoFrameCallback` ندارد (فایرفاکس). */
const FALLBACK_FRAME_MS = 100;

/**
 * الگوی نامِ دوربینِ اصلیِ پشت.
 *
 * روی گوشی‌های چنددوربینه باید صریحاً از ultra-wide و telephoto دوری
 * کنیم: ultra-wide فوکوسِ نزدیک ندارد و برچسبِ داخلِ دست هیچ‌وقت شارپ
 * نمی‌شود.
 */
const BACK_CAMERA_RE = /\b(back|rear|environment)\b/i;
const SECONDARY_CAMERA_RE = /ultra|wide|tele|zoom|depth|macro|مونوکروم|mono/i;

function pickBackCamera(list) {
  const backs = list.filter((d) => BACK_CAMERA_RE.test(d.label));
  if (!backs.length) return null;
  return backs.find((d) => !SECONDARY_CAMERA_RE.test(d.label)) ?? backs[0];
}

/**
 * اسکنرِ دوربین برای بارکد و QR. کلِ فریم دیکد می‌شود (نه فقط داخلِ
 * کادر)؛ کادر صرفاً راهنمای نشانه‌گیری است.
 */
export default function CameraScanner({ onDetected }) {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [mode, setMode] = useState("barcode");

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // تا تغییرِ identityِ callback باعثِ راه‌اندازیِ دوباره‌ی دوربین نشود.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let frameHandle = null;
    let timeoutHandle = null;
    let detecting = false;

    const scheduleNextFrame = (loop) => {
      if (cancelled) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        frameHandle = video.requestVideoFrameCallback(loop);
      } else {
        timeoutHandle = setTimeout(loop, FALLBACK_FRAME_MS);
      }
    };

    const start = async () => {
      // موازی: کششِ wasm همزمان با بالا آمدنِ دوربین.
      const readerPromise = createFrameReader(mode);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: "environment" } }),
          width: { ideal: IDEAL_WIDTH },
          height: { ideal: IDEAL_HEIGHT },
          // فوکوس پیوسته: مهم‌ترین تنظیم برای خوندن سریع‌تر بارکد از نزدیک
          advanced: [{ focusMode: "continuous" }],
        },
      });

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();


      const track = stream.getVideoTracks()[0];
      setTorchSupported(Boolean(track?.getCapabilities?.().torch));

      // حالا که مجوز گرفته شده، `label`ها پر هستند و می‌شود فهرستِ
      // معناداری از دوربین‌ها ساخت. این فقط برای دکمه‌ی تعویض است و
      // عمداً وابستگیِ این effect نیست، وگرنه همین‌جا خودش را ری‌استارت
      // می‌کند.
      const list = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === "videoinput",
      );
      if (cancelled) return;
      setDevices(list);

      if (!deviceId) {
        const activeId = track?.getSettings?.().deviceId;
        const preferred = pickBackCamera(list);
        // اگر مرورگر خودش دوربینِ فرعی داده، به دوربینِ پشتِ اصلی سوییچ
        // کن؛ این همان تعویضِ تک‌باره‌ای است که جایش اینجاست، نه در
        // هر رندر.
        if (preferred && preferred.deviceId !== activeId) {
          setDeviceId(preferred.deviceId);
          return;
        }
        if (activeId) setDeviceId(activeId);
      }

      const read = await readerPromise;
      if (cancelled) return;

      const loop = async () => {
        if (cancelled) return;
        // فریم‌ها سریع‌تر از دیکد می‌رسند؛ بدون این نگهبان صف‌های
        // موازیِ detect روی هم تلنبار می‌شوند.
        if (detecting) {
          scheduleNextFrame(loop);
          return;
        }
        detecting = true;
        try {
          const text = await read(video);
          if (text) {
            cancelled = true;
            onDetectedRef.current(text);
            toast.success(`${MODE_LABELS[mode]} خوانده شد`);
            return;
          }
        } catch {
          // فریمِ ناقص یا ویدئوی هنوز آماده‌نشده — فریمِ بعدی.
        } finally {
          detecting = false;
        }
        scheduleNextFrame(loop);
      };

      scheduleNextFrame(loop);
    };

    start().catch((err) => {
      if (cancelled) return;
      if (err?.name === "NotAllowedError") {
        toast.error("اجازه‌ی دوربین داده نشده؛ از تنظیماتِ مرورگر دسترسی به دوربین را باز کنید");
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        toast.error("دوربینی برای اسکن پیدا نشد");
      } else {
        console.error(err);
        toast.error("دوربین باز نشد؛ دوباره تلاش کنید");
      }
    });

    return () => {
      cancelled = true;
      if (frameHandle !== null) video.cancelVideoFrameCallback?.(frameHandle);
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      video.srcObject = null;
      setTorchOn(false);
      setTorchSupported(false);
    };
  }, [deviceId, mode]);

  const toggleCamera = () => {
    if (devices.length < 2) return;
    const current = devices.findIndex((d) => d.deviceId === deviceId);
    setDeviceId(devices[(current + 1) % devices.length].deviceId);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
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
    <div
      // مربع، دقیقاً همان ناحیه‌ای که ZXing دیکد می‌کند (`frameReader`).
      className="relative aspect-square w-full bg-black rounded-md overflow-hidden"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      />
      {/* فقط راهنمای نشانه‌گیری؛ کدِ بیرونِ کادر هم خوانده می‌شود. */}
      <div
        className={`pointer-events-none absolute rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] ${
          mode === "qr" ? "inset-[17.5%]" : "inset-x-[7.5%] inset-y-[32%]"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-2">
        <span role="status" className="rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          {MODE_LABELS[mode]} را جلوی دوربین بگیرید
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => setMode((m) => (m === "qr" ? "barcode" : "qr"))}
          title={mode === "qr" ? "تعویض به بارکدخوان" : "تعویض به QR‌خوان"}
          aria-label={mode === "qr" ? "تعویض به بارکدخوان" : "تعویض به QR‌خوان"}
        >
          {mode === "qr" ? <ScanBarcode className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
        </Button>
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
