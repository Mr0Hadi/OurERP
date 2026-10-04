import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/** `GET PosTerminal/GetPosTerminalList` — فقط دستگاه‌های فعال؛ همه‌ی دستگاه‌ها برای انتخاب. */
export async function fetchPosTerminals() {
  const { data } = await axiosInstance.get("/PosTerminal/GetPosTerminalList", {
    params: { page: 1, take: 100 },
  });
  return normalizeListResponse(data).items;
}
