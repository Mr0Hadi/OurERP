# warehouse — کالا، دسته، دانه، خودرو، دریافت و ارسال

هفت زیرماژول در `src/features/warehouse/`: `products/`، `categories/`، `units/`، `vehicles/`، `receiving/`، `shipping/`، `saleCheck/` (بررسیِ انبارِ پیش‌فاکتورِ فروش)؛ به‌علاوه‌ی `shared/` (مشترکِ دریافت/ارسال). یک `routes.jsx`.

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `WAREHOUSE` | `/warehouse` | — | ریدایرکت به `WAREHOUSE_PRODUCTS` |
| `WAREHOUSE_PRODUCTS` | `/warehouse/products` | `ProductView` | `src/features/warehouse/products/pages/ProductsPage.jsx` |
| `WAREHOUSE_PRODUCTS_NEW` | `/warehouse/products/new` | `ProductCreate` | `src/features/warehouse/products/pages/ProductNewPage.jsx` |
| `WAREHOUSE_PRODUCTS_DETAIL` | `/warehouse/products/:id` | `ProductView` | `src/features/warehouse/products/pages/ProductDetailPage.jsx` |
| `WAREHOUSE_CATEGORIES` (+ `_DETAIL`) | `/warehouse/categories`، `/:id` | `ProductCategoryView` | `src/features/warehouse/categories/pages/CategoriesPage.jsx` |
| `WAREHOUSE_VEHICLES` (+ `_DETAIL`) | `/warehouse/vehicles`، `/:id` | `["VehicleView", "ProductCategoryView"]` | `src/features/warehouse/vehicles/pages/VehiclesPage.jsx` |
| `WAREHOUSE_UNITS` | `/warehouse/units` | `ProductUnitView` | `src/features/warehouse/units/pages/UnitsPage.jsx` |
| `WAREHOUSE_UNIT_LABELS` | `/warehouse/unit-labels` | — | ریدایرکت (با حفظِ query) به `WAREHOUSE_UNITS` |
| `WAREHOUSE_RECEIVING` (+ `_DETAIL`) | `/warehouse/receiving`، `/:id` | `PurchaseReceive` | `src/features/warehouse/receiving/pages/ReceivingListPage.jsx`، `ReceivingDetailPage.jsx` |
| `WAREHOUSE_RECEIVING_RETURN_DETAIL` | `/warehouse/receiving/returns/:id` | `SaleReturnExecute` | `src/features/warehouse/receiving/pages/ReceivingReturnDetailPage.jsx` (کالای برگشتی از **مرجوعیِ فروش**) |
| `WAREHOUSE_SHIPPING` (+ `_DETAIL`) | `/warehouse/shipping`، `/:id` | `SaleShip` | `src/features/warehouse/shipping/pages/ShippingListPage.jsx`، `ShippingDetailPage.jsx` |
| `WAREHOUSE_SALE_CHECK` (+ `_DETAIL`) | `/warehouse/sale-check`، `/:id` | `SaleWarehouseCheck` | `src/features/warehouse/saleCheck/pages/SaleCheckListPage.jsx`، `SaleCheckPage.jsx` (اسکن و رزروِ دانه‌ها، کم‌کردنِ اقلام با دلیل و تأیید، گزارشِ معیوب/مفقود) |
| `WAREHOUSE_SHIPPING_RETURN_DETAIL` | `/warehouse/shipping/returns/:id` | `PurchaseReturnExecute` | `src/features/warehouse/shipping/pages/SupplierReturnDetailPage.jsx` (عودت به تامین‌کننده در **مرجوعیِ خرید**) |

`CategoriesPage` و `VehiclesPage` فهرست/جزئیات در یک کامپوننت‌اند؛ `:id` فقط انتخاب است.

## سرویس‌ها

| زیرماژول | endpointها | کلید |
| --- | --- | --- |
| products | `fetchProducts` GET `/Product/GetProductList`، `fetchProductById` GET `/Product/GetProductDetail`، `fetchProductByBarcode` GET `/Product/ScanBarcode` (۴۰۴ → `null`)، `createProduct` POST، `updateProduct` PUT، `deleteProduct` DELETE | `productKeys` (`['products']`) |
| categories | `/ProductCategory/GetProductCategoryList`، `CreateProductCategory`، `UpdateProductCategory`، `DeleteProductCategory`؛ `fetchCategoryProducts` → `/Product/GetProductList` | `productCategoryKeys` (`["productCategories"]`) |
| units | `fetchProductUnits` GET `/Product/GetProductUnitList`، `fetchAllProductUnits` (صفحه‌به‌صفحه ۲۰۰تایی تا ۲۰۰۰)، `fetchProductUnitSummary`، `fetchProductUnitHistory`، `resolveScannedCode`، `markProductUnitsPrinted` POST، `applyProductUnitAction` POST (ایدمپوتنت)، `setProductUnitLocation` POST | `productUnitKeys` (`["productUnits"]`) |
| vehicles | `/Vehicle/GetVehicleList` (take ۵۰۰)، `GetVehicleProductList`، `CreateVehicle`، `UpdateVehicle`، `DeleteVehicle`، `AddProductsToVehicle`، `RemoveProductFromVehicle` | `vehicleKeys` (`["vehicles"]`) |
| receiving | `fetchReceivablePurchases` GET `/Purchase/GetPurchaseList`، `fetchPurchaseReceivingInfo` GET `/PurchaseReturn/GetPurchaseReceivingInfo`، `fetchPurchaseReturnPendingEffects`، `receiveShipment` POST `/Shipment/ReceiveShipment` | `receivingKeys` (`['receiving']`) |
| saleCheck | `useProformaQueueQuery(CUSTOMER_APPROVED)` و فیلترهای `ProformaQueueFilters` از `sales/orders`، `useInStockUnitsQuery` (`fetchProductUnits`)؛ نوشتن با `useWarehouseApproveMutation`ِ `sales/orders` | `saleKeys`، `productUnitKeys` |
| shipping | `fetchShippableSales` GET `/Sale/GetSaleList`، `fetchSaleForShipping` GET `/Sale/GetSaleDetail`، `fetchSaleReturnPendingEffects`، `dispatchShipment` POST `/Shipment/DispatchShipment` | `shippingKeys` (`['shipping']`) |

هوک‌های پرکاربرد برای بقیه‌ی برنامه: `useDocumentProducts`، `useProductSearchQuery`، `useProductsOptionsQuery` (`src/features/warehouse/products/services/queries.js`)؛ `UnitsPageLink` (`src/features/warehouse/units/components/UnitsPageLink.jsx`).

## state و دامنه

- `useProductFilterStore` (`src/features/warehouse/products/store/productFilterStore.js`، با اکشنِ `setPriceRange`).
- `src/features/warehouse/units/store/unitFilterStore.js`: `useProductUnitFilterStore`، و **`useLabelTemplateStore`** (persist `unit-label-template`).
- `useReceivingFormStore`، `useShippingFormStore`، `useReceivingFilterStore`، `useShippingFilterStore`؛ hookها `useReceivingForm`، `useShippingForm`.
- دامنه: `src/features/warehouse/units/domain/unitVocabulary.js` (`UNIT_SEGMENTS`، `UnitActionEnum`، `REASONS_BY_ACTION`، `allowedActionsOf`، `canApply`، …؛ `DocumentKindEnum`/`documentRouteOf` از `src/shared/domain/enums/documentKind.js`)، `labelTemplate.js` (هندسه‌ی برگه و قالب)، `receivingVocabulary.js`، `shippingVocabulary.js`.
- `src/features/warehouse/shared/`: `useQueueRows.js`، `queueFilters.js`، `shipmentCache.js` (`applyShipmentResult`)، `productInfo.js`، `QueueTable.jsx`، `QueueFilters.jsx`، `NothingPending.jsx`، `WarehouseSubmitBar.jsx`، `returnRowCells.jsx`.

## جریان‌ها

**ثبتِ کالا** — `ProductNewPage` → `useProductForm()` (react-hook-form + `useImageUpload({ folder: ImageFolderEnum.PRODUCTS })`) → `buildProductPayload` → `useCreateProductMutation` → `POST /Product/CreateProduct` → invalidate `productKeys.lists()`، `vehicleKeys.all`، `productCategoryKeys.all` → `imageUpload.commit()` و `goBack({ newProductId })` از `useReturnTo` (برگشت به فرمِ سندی که «کالای جدید» را باز کرده بود).

**اقدام روی دانه** — `UnitActionDialog.jsx` (دلیل‌ها از `REASONS_BY_ACTION`) → `useApplyUnitActionMutation` (`mutationKey: productUnitKeys.unitWrites()`) → `applyProductUnitAction(variables, { idempotencyKey: idempotencyKeyFor(variables) })` → invalidate `productUnitKeys.all`، `productKeys.all`، `purchaseKeys.all`، `supplierKeys.all`. حالتِ «در حال ذخیره» با `useIsMutating({ mutationKey: unitWrites() })`.

**چاپِ برچسب** — `UnitBulkBar` یا `UnitDetailSheet` → `UnitsPage.openPrint` → `LabelPrintDesigner` (lazy) با قالبِ `useLabelTemplateStore` و `sheetGeometryOf` → `UnitLabel` در `LabelSheet` (`src/shared/components/print/`) → `usePrint()` → پرسشِ «چاپ شد؟» → فقط با «بله» `useMarkUnitsPrintedMutation` (`POST /Product/MarkProductUnitsPrinted`).

### دریافت و ارسال

1. صف: `ReceivingListPage` → `useReceivablePurchasesQuery` (`statuses: receivingStatusesOf(status)`)؛ `useQueueRows` اثرهای معلقِ مرجوعی را هم به صف اضافه می‌کند. برچسبِ ردیفِ مرجوعیِ خرید نوعِ کار را می‌گوید («مرجوعی خرید: اسقاط، عودت»). صفحه‌های کارِ انبار روی مرجوعی برای کاربرِ بدونِ `*ReturnView` به صفِ انبار برمی‌گردند، نه به صفحه‌ی مرجوعی (خواندن با `*ReturnExecute`: درخواستِ ۲۳ در `Backend-Net/docs/frontend-requests.fa.md`). ارسال قرینه است (`useShippableSalesQuery`).
2. جزئیات: `ReceivingDetailPage` → `usePurchaseReceivingInfoQuery`.
3. ثبت: command `{ purchase, purchaseReturnRounds, saleReturnRounds: [] }` → `useReceiveShipmentMutation` → `POST /Shipment/ReceiveShipment`.
4. موفق: `applyShipmentResult` (`src/features/warehouse/shared/shipmentCache.js`) سندهای مرجوعیِ برگشتی را در کش می‌نشاند و `invalidatePurchaseEcosystem` / `invalidateSalesEcosystem` را صدا می‌زند؛ `receivingKeys.all` باطل؛ ناوبری به `exitRoute`.

## importهای بیرونی

`auth`؛ `purchases` (`PURCHASE_SORT_COLUMNS`، `fetchPurchaseById`، `invalidatePurchaseEcosystem`، `purchaseReturnKeys`، `useExecuteGoodsRoundMutation`، `purchaseKeys`)؛ `sales` (`SALE_SORT_COLUMNS`، `invalidateSalesEcosystem`، `salesReturnKeys`، `useSalesReturnQuery`، `useExecuteGoodsRoundMutation`)؛ `suppliers`؛ `customers`؛ `audit` (`AuditHistoryButton` در `ProductDetailPage`). این وابستگیِ «داده‌ی پایه → اسناد» است ([02](../02-folder-structure.md)).

## نکته‌ها و بدهی

- نام‌گذاریِ صفحه‌های مرجوعی در انبار گمراه‌کننده است: `ReceivingReturnDetailPage` مرجوعیِ **فروش** است و `SupplierReturnDetailPage` زیرِ `/shipping/` مرجوعیِ **خرید**.
- `useLabelTemplateStore` در فایلی به نامِ `unitFilterStore.js` است.
- `fetchCategoryProducts` پارامترها را دستی PascalCase می‌سازد (`ProductCategoryId`، `Page`، `Take`) به جای `listQuery`.
- mutationهای دسته فقط `productCategoryKeys.lists()` را باطل می‌کنند.
- `createProductCategory` وقتی سرور شناسه نمی‌دهد، فهرست را با نام می‌گردد (TODO به بکند).
- `useProductsOptionsQuery` همه‌ی کالاها را صفحه‌به‌صفحه می‌خواند (TODOِ خودش: جست‌وجوی سمتِ سرور).
- `ROUTES.WAREHOUSE_STOCK` و `WAREHOUSE_TRANSACTIONS` فقط در breadcrumb هستند.
- `useQueueRows.js` اثرهای معلقِ مرجوعیِ خرید را بدونِ `purchaseId` می‌گیرد (همه‌ی خریدها؛ ظاهراً عمدی).
