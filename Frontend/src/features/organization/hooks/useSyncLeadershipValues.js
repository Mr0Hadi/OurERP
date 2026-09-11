import { useEffect, useRef } from "react";

/**
 * مدیر و معاونِ فرم را با رکوردِ تازه‌ی سرور هم‌گام نگه می‌دارد.
 *
 * `useForm` مقادیر پیش‌فرض را فقط یک بار می‌خواند. ولی مدیر و معاون از
 * جاهای دیگری هم عوض می‌شوند — کارت اعضای تیم (`ChangeUserTeam` با
 * `isHead`/`isDeputy`)، یا انتصابِ همان فرد در تیم و واحدِ دیگر که
 * سرور با آزادکردنِ سمتِ قبلی جواب می‌دهد. بدون این هم‌گام‌سازی، فرم
 * مقدارِ کهنه را نگه می‌داشت و «ذخیره تغییرات» بعدی آن را برمی‌گرداند.
 *
 * فقط *تغییرِ* مقدارِ سرور اعمال می‌شود، نه مقدارِ اولیه — وگرنه
 * پیش‌نویسِ بازگشتی از صفحه‌ی دیگر (`useFormDraft`) در همان رندرِ اول
 * پاک می‌شد.
 */
export function useSyncLeadershipValues(setValue, headId, deputyId) {
  const previous = useRef({ headId, deputyId });

  useEffect(() => {
    const prev = previous.current;
    if (prev.headId !== headId) setValue("headId", headId ?? null);
    if (prev.deputyId !== deputyId) setValue("deputyId", deputyId ?? null);
    previous.current = { headId, deputyId };
  }, [headId, deputyId, setValue]);
}
