# warehouse — کالا، دسته، دانه، خودرو، دریافت و ارسال

نه زیرماژول در `src/features/warehouse/`: `products/`، `categories/`، `units/`، `vehicles/`، `receiving/`، `shipping/`، `saleCheck/` (بررسیِ انبارِ پیش‌فاکتورِ فروش)، `stocktake/` (انبارگردانی، GAP-01)، `warehouses/` (انبارها و حواله‌ی بین انبار، GAP-08)؛ به‌علاوه‌ی `shared/` (مشترکِ دریافت/ارسال). یک `routes.jsx`.

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
| `WAREHOUSE_STOCKTAKE` (+ `_DETAIL`) | `/warehouse/stocktake`، `/:id` | `["StocktakeView", "StocktakeCount", "StocktakeApprove"]` | `src/features/warehouse/stocktake/pages/StocktakeListPage.jsx`، `StocktakeDetailPage.jsx` (اسکن و شمارشِ دستی با دکمه‌ی «ثبتِ شمارش» — `hooks/useStocktakeCountDrafts.js`، مغایرت پس از پایانِ شمارش، پایان/بازگشایی/تأیید/لغو) |
| `WAREHOUSE_WAREHOUSES` | `/warehouse/warehouses` | `["WarehouseManage", "ProductUnitView", "StockTransferView", "StockTransferManage"]` | `src/features/warehouse/warehouses/pages/WarehousesPage.jsx` (کارتِ هر انبار با شمارِ دانه‌ها؛ افزودن/ویرایش/غیرفعال با `WarehouseManage`؛ کدِ تازه با `suggestWarehouseCode` پیشنهاد می‌شود، `W1`، `W2`، …؛ نشانیِ کامل منتظرِ بکند §۳۸) |
| `WAREHOUSE_TRANSFERS` (+ `_NEW`، `_DETAIL`) | `/warehouse/transfers`، `/new`، `/:id` | `["StockTransferView", "StockTransferManage"]` (ساخت: `StockTransferManage`) | `StockTransfersPage.jsx`، `StockTransferNewPage.jsx` (مبدأ/مقصد، کالا با سقفِ موجودیِ مبدأ، اسکنِ اختیاری یا الزامی برای کالای ردیابی‌دار)، `StockTransferDetailPage.jsx` (تحویل/لغو) |

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
| warehouses | `fetchWarehouses` GET `/Warehouse/GetWarehouseList` (برای هر کاربر؛ انتخابگرها هم همین)، `fetchProductWarehouseStock`، `createWarehouse`/`updateWarehouse`/`deactivateWarehouse`، `fetchStockTransfers`/`fetchStockTransfer`، `createStockTransfer` (ایدمپوتنت)، `changeStockTransferStatus(action, id)` برای `Receive`/`CancelStockTransfer`؛ حواله `productKeys` و `productUnitKeys` را هم باطل می‌کند | `warehouseKeys` (`["warehouses"]`، حواله‌ها هم زیرِ همین) |
| stocktake | `fetchStocktakes` GET `/Stocktake/GetStocktakeList`، `fetchStocktake` GET `GetStocktakeDetail`، `createStocktake` (ایدمپوتنت)، `scanStocktakeUnits`، `removeStocktakeScan`، `countStocktakeLine`، `changeStocktakeStatus(action, id)` برای `Submit`/`Reopen`/`Approve` (ایدمپوتنت)/`CancelStocktake`؛ هر دستور سندِ کامل برمی‌گرداند و در کشِ جزئیات می‌نشیند؛ تأیید `productKeys` و `productUnitKeys` را هم باطل می‌کند | `stocktakeKeys` (`["stocktakes"]`) |
| shipping | `fetchShippableSales` GET `/Sale/GetSaleList`، `fetchSaleForShipping` GET `/Sale/GetSaleDetail`، `fetchSaleReturnPendingEffects`، `dispatchShipment` POST `/Shipment/DispatchShipment` | `shippingKeys` (`['shipping']`) |

فرمِ کالا کارتِ `ProductReorderForm` (نقطه‌ی سفارش، `targetStock`، `minOrderQuantity`، `leadTimeDays`، `preferredSupplierId`) دارد؛ `buildProductPayload` در `src/features/warehouse/products/hooks/useProductForm.js` این‌ها را همیشه می‌فرستد، چون `UpdateProduct` نفرستاده را پاک می‌کند.

هوک‌های پرکاربرد برای بقیه‌ی برنامه: `useDocumentProducts`، `useProductSearchQuery`، `ProductSelect` (`src/features/warehouse/products/components/ProductSelect.jsx`، انتخابِ یک کالا با جست‌وجوی سرور برای فیلترها) (`src/features/warehouse/products/services/queries.js`)؛ `UnitsPageLink` (`src/features/warehouse/units/components/UnitsPageLink.jsx`).

## state و دامنه

- `useProductFilterStore` (`src/features/warehouse/products/store/productFilterStore.js`، با اکشنِ `setPriceRange`).
- `src/features/warehouse/units/store/unitFilterStore.js`: `useProductUnitFilterStore`؛ `src/features/warehouse/units/store/labelTemplateStore.js`: `useLabelTemplateStore` (persist `unit-label-template`).
- `useReceivingFormStore`، `useShippingFormStore`، `useReceivingFilterStore`، `useShippingFilterStore`؛ hookها `useReceivingForm`، `useShippingForm`.
- دامنه: `src/features/warehouse/units/domain/unitVocabulary.js` (`UNIT_SEGMENTS`، `UnitActionEnum`، `REASONS_BY_ACTION`، `allowedActionsOf`، `canApply`، …؛ `DocumentKindEnum`/`documentRouteOf` از `src/shared/domain/enums/documentKind.js`)، `labelTemplate.js` (هندسه‌ی برگه و قالب)، `receivingVocabulary.js`، `shippingVocabulary.js`.
- چندانبار (GAP-08): سوییچِ `Warehouse.MultiWarehouseEnabled` با `useMultiWarehouse` (`src/features/warehouse/warehouses/hooks/useMultiWarehouse.js`)؛ `useWarehouseChoice` یعنی «روشن و بیش از یک انبارِ فعال». انتخابگرِ انبار `WarehouseSelect` و کارتِ `ShipmentWarehouseCard` (دریافت، ارسال و دو صفحه‌ی دورِ مرجوعی) فقط در این حالت دیده می‌شوند؛ `withWarehouse` در `src/features/warehouse/warehouses/domain/warehouse.js` `warehouseId` را روی سند و همه‌ی دورهای یک محموله می‌گذارد (`null` = پیش‌فرضِ سرور). فیلترِ انبار در دانه‌ها و انبارگردانی و `ProductWarehouseStockCard` در جزئیاتِ کالا با بیش از یک انبار دیده می‌شوند، مستقل از سوییچ (داده‌ی دورانِ روشن می‌ماند). حواله‌ی تازه و منوی حواله فقط با سوییچِ روشن؛ تحویل/لغوِ حواله‌ی در راه همیشه.
- انبارگردانی: `useStocktakeFilterStore` (`src/features/warehouse/stocktake/store/stocktakeFilterStore.js`)؛ دامنه در `src/features/warehouse/stocktake/domain/stocktake.js` (`STOCKTAKE_SCOPE`، `toApiStocktake`، `stocktakeActions`، `scanOutcome` — پیامِ اسکن از تفاوتِ سند پیش و پس، چون interceptor پیامِ سرور را برنمی‌گرداند — و `visibleLines`)؛ enumها در `src/shared/domain/enums/stocktake.js`. شمارشِ کور (`isBlind`، تنظیمِ `Stocktake.BlindCount`) را سرور اعمال می‌کند؛ صفحه فقط فیلدهای `null` را پنهان می‌کند.
- `src/features/warehouse/shared/`: `useQueueRows.js`، `queueFilters.js`، `shipmentCache.js` (`applyShipmentResult`)، `productInfo.js`، `QueueTable.jsx`، `QueueFilters.jsx`، `NothingPending.jsx`، `WarehouseSubmitBar.jsx`، `returnRowCells.jsx`.

## جریان‌ها

**ثبتِ کالا** — `ProductNewPage` → `useProductForm()` (react-hook-form + `useImageUpload({ folder: ImageFolderEnum.PRODUCTS })`) → `buildProductPayload` → `useCreateProductMutation` → `POST /Product/CreateProduct` → invalidate `productKeys.lists()`، `vehicleKeys.all`، `productCategoryKeys.all` → `imageUpload.commit()` و `goBack({ newProductId })` از `useReturnTo` (برگشت به فرمِ سندی که «کالای جدید» را باز کرده بود).

**اقدام روی دانه** — `UnitActionDialog.jsx` (دلیل‌ها از `REASONS_BY_ACTION`) → `useApplyUnitActionMutation` (`mutationKey: productUnitKeys.unitWrites()`) → `applyProductUnitAction(variables, { idempotencyKey: idempotencyKeyFor(variables) })` → invalidate `productUnitKeys.all`، `productKeys.all`، `purchaseKeys.all`، `supplierKeys.all`. حالتِ «در حال ذخیره» با `useIsMutating({ mutationKey: unitWrites() })`.

**چاپِ برچسب** — `UnitBulkBar` یا `UnitDetailSheet` → `UnitsPage.openPrint` → `LabelPrintDesigner` (lazy؛ پوسته‌ی مشترکِ `PrintStudio` از `src/shared/components/print/studio/`) با قالبِ `useLabelTemplateStore` و `sheetGeometryOf` → `UnitLabel` در `LabelSheet` (`src/shared/components/print/`) → `usePrint()` → پرسشِ «چاپ شد؟» (دیالوگِ پرسش در چاپ پنهان است؛ `print.css` همه‌ی فرزندانِ body جز پورتال را کنار می‌گذارد) → فقط با «بله» `useMarkUnitsPrintedMutation` (`POST /Product/MarkProductUnitsPrinted`).

### دریافت و ارسال

1. صف: `ReceivingListPage` → `useReceivablePurchasesQuery` (`statuses: receivingStatusesOf(status)`)؛ `useQueueRows` اثرهای معلقِ مرجوعی را هم به صف اضافه می‌کند. برچسبِ ردیفِ مرجوعیِ خرید نوعِ کار را می‌گوید («مرجوعی خرید: اسقاط، عودت»). صفحه‌های کارِ انبار روی مرجوعی برای کاربرِ بدونِ `*ReturnView` به صفِ انبار برمی‌گردند، نه به صفحه‌ی مرجوعی (خواندن با `*ReturnExecute`: درخواستِ ۲۳ در `Backend-Net/docs/frontend-requests.fa.md`). ارسال قرینه است (`useShippableSalesQuery`).
2. جزئیات: `ReceivingDetailPage` → `usePurchaseReceivingInfoQuery`.
3. ثبت: command `{ purchase, purchaseReturnRounds, saleReturnRounds: [] }` → `useReceiveShipmentMutation` → `POST /Shipment/ReceiveShipment`.
4. موفق: `applyShipmentResult` (`src/features/warehouse/shared/shipmentCache.js`) سندهای مرجوعیِ برگشتی را در کش می‌نشاند و `invalidatePurchaseEcosystem` / `invalidateSalesEcosystem` را صدا می‌زند؛ `receivingKeys.all` باطل؛ ناوبری به `exitRoute`.

## importهای بیرونی

`auth`؛ `purchases` (`PURCHASE_SORT_COLUMNS`، `fetchPurchaseById`، `invalidatePurchaseEcosystem`، `purchaseReturnKeys`، `useExecuteGoodsRoundMutation`، `purchaseKeys`)؛ `sales` (`SALE_SORT_COLUMNS`، `invalidateSalesEcosystem`، `salesReturnKeys`، `useSalesReturnQuery`، `useExecuteGoodsRoundMutation`)؛ `suppliers`؛ `customers`؛ `audit` (`AuditHistoryButton` در `ProductDetailPage`). این وابستگیِ «داده‌ی پایه → اسناد» است ([02](../02-folder-structure.md)).

## نکته‌ها و بدهی

- نام‌گذاریِ صفحه‌های مرجوعی در انبار گمراه‌کننده است: `ReceivingReturnDetailPage` مرجوعیِ **فروش** است و `SupplierReturnDetailPage` زیرِ `/shipping/` مرجوعیِ **خرید**.
- `fetchCategoryProducts` پارامترها را دستی PascalCase می‌سازد (`ProductCategoryId`، `Page`، `Take`) به جای `listQuery`.
- mutationهای دسته فقط `productCategoryKeys.lists()` را باطل می‌کنند.
- `createProductCategory` وقتی سرور شناسه نمی‌دهد، فهرست را با نام می‌گردد (TODO به بکند).
- `useQueueRows.js` اثرهای معلقِ مرجوعیِ خرید را بدونِ `purchaseId` می‌گیرد (همه‌ی خریدها؛ ظاهراً عمدی).
