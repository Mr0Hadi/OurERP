import { useEffect, useRef, useState } from "react";
import { SwitchCamera, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { getBarcodeDetector } from "@/shared/domain/barcode/barcodeDetector";

/**
 * رزولوشنی که از دوربین می‌خواهیم.
 *
 * ۶۴۰×۴۸۰ عمدی است و نه سهل‌انگاری: برای CODE128 و QRِ برچسب‌های ما
 * کاملاً کافی است، ولی نسبت به ۷۲۰p یک‌چهارمِ پیکسل دارد — یعنی هر
 * عبورِ دیکد حدوداً یک‌چهارم طول می‌کشد. بالا بردنِ این عدد اسکن را
 * *کندتر* می‌کند، نه دقیق‌تر.
 */
const IDEAL_WIDTH = 640;
const IDEAL_HEIGHT = 480;

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
 * اسکنرِ دوربین برای بارکد و QR.
 *
 * پیش از این روی `@zxing/browser` بود و کند بود؛ سه علتِ اصلی که اینجا
 * برطرف شده‌اند، برای اینکه دوباره برنگردند:
 *
 * ۱. آن کتابخانه بینِ هر دو تلاشِ دیکد ۵۰۰ms `setTimeout` می‌گذاشت —
 *    یعنی ۲ فریم در ثانیه از ۳۰ فریم. اینجا حلقه روی
 *    `requestVideoFrameCallback` است و هر فریمِ واقعیِ دوربین را
 *    می‌بیند.
 * ۲. انتخابِ دوربین پیش از گرفتنِ مجوز انجام می‌شد، جایی که
 *    `enumerateDevices` هنوز `label` خالی برمی‌گرداند؛ پس هیچ‌وقت
 *    دوربینِ پشت پیدا نمی‌شد و آخرین دستگاهِ فهرست انتخاب می‌شد که
 *    معمولاً ultra-wide است. حالا اول استریم باز می‌شود و *بعد*
 *    فهرست‌گیری انجام می‌شود.
 * ۳. `onDetected` در فراخوان‌ها یک arrow درون‌خطی است، پس هر رندرِ والد
 *    وابستگیِ effect را عوض می‌کرد و دوربین را از نو باز می‌کرد
 *    (`getUserMedia` روی موبایل تا یک ثانیه طول می‌کشد). اینجا از
 *    طریقِ ref خوانده می‌شود و اصلاً وابستگیِ effect نیست.
 *
 * دیکد هم دیگر روی ریسه‌ی UI نیست: `BarcodeDetector` نیتیو است و
 * fallbackِ wasm هم خارج از جاوااسکریپتِ ما اجرا می‌شود.
 */
export default function CameraScanner({ onDetected }) {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

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
      // موازی: کششِ wasm (در صورت نیاز) همزمان با بالا آمدنِ دوربین.
      const detectorPromise = getBarcodeDetector();

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

      const detector = await detectorPromise;
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
          // خودِ <video> را می‌دهیم، نه canvas: کپیِ اضافه‌ی هر فریم
          // حذف می‌شود.
          const [hit] = await detector.detect(video);
          if (hit?.rawValue) {
            cancelled = true;
            onDetectedRef.current(hit.rawValue);
            toast.success(
              hit.format === "qr_code"
                ? "کد QR با موفقیت اسکن شد"
                : "بارکد با موفقیت اسکن شد",
            );
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
        toast.error("دسترسی به دوربین رد شد. لطفاً مجوز دوربین را فعال کنید");
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        toast.error("دوربینی برای اسکن پیدا نشد");
      } else {
        console.error(err);
        toast.error("خطا در دسترسی به دوربین");
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
  }, [deviceId]);

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
