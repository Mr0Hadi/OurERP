import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Vehicle`. کالایی که به هیچ خودرویی وصل نیست «برای همه‌ی
 * خودروها»ست؛ سرور این را با نبودنِ ردیف نشان می‌دهد، نه با یک خودروی ویژه.
 */

/** `GET GetVehicleList` — `universalProductCount` شمارِ کالاهای «همه‌ی خودروها»ست. */
export const fetchVehicles = async () => {
  const { data } = await axiosInstance.get("/Vehicle/GetVehicleList", {
    params: { page: 1, take: 500 },
  });
  return {
    ...normalizeListResponse(data, { itemsKey: "vehicleList" }),
    universalProductCount: data?.universalProductCount ?? 0,
  };
};

/** `GET GetVehicleProductList` — بدونِ `vehicleId` یعنی کالاهای «همه‌ی خودروها». */
export const fetchVehicleProducts = async ({ vehicleId, search, page = 1, take = 20 }) => {
  const { data } = await axiosInstance.get("/Vehicle/GetVehicleProductList", {
    params: { vehicleId: vehicleId ?? undefined, search: search || undefined, page, take },
  });
  return normalizeListResponse(data, { itemsKey: "productList" });
};

/** `POST CreateVehicle` — خروجی `{ id, name }`. */
export const createVehicle = async ({ name }) => {
  const { data } = await axiosInstance.post("/Vehicle/CreateVehicle", { name });
  return data;
};

/** `PUT UpdateVehicle` — `id` در بدنه. خروجی `{ id, name }` با نامِ یکدست‌شده. */
export const updateVehicle = async ({ id, name }) => {
  const { data } = await axiosInstance.put("/Vehicle/UpdateVehicle", { id, name });
  return data;
};

/** `DELETE DeleteVehicle` — خروجی `{ becameUniversalCount }`. */
export const deleteVehicle = async (id) => {
  const { data } = await axiosInstance.delete("/Vehicle/DeleteVehicle", { params: { id } });
  return data;
};

/** `POST AddProductsToVehicle` — تکراری‌ها را سرور نادیده می‌گیرد. */
export const addProductsToVehicle = async ({ vehicleId, productIds }) => {
  const { data } = await axiosInstance.post("/Vehicle/AddProductsToVehicle", { vehicleId, productIds });
  return data;
};

/** `DELETE RemoveProductFromVehicle` — خروجی `{ becameUniversal }`. */
export const removeProductFromVehicle = async ({ vehicleId, productId }) => {
  const { data } = await axiosInstance.delete("/Vehicle/RemoveProductFromVehicle", {
    params: { vehicleId, productId },
  });
  return data;
};
