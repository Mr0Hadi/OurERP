using Application.Common.Contracts.Storage;
using Application.Common.Enums;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Dtos;
using Application.Features.Customer.Queries;
using Application.Features.FileStorage.Commands;
using Application.Features.FileStorage.Queries;
using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Dtos;
using Application.Features.Supplier.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.Extensions.Options;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ImageUploadTests
    {
        private static UploadImageCommandHandler MakeUploadHandler(FakeObjectStorage storage, ObjectStorageOptions? options = null) =>
            new(storage, Options.Create(options ?? new ObjectStorageOptions()));

        private static Stream Bytes(int length = 16) => new MemoryStream(new byte[length]);

        [Fact]
        public async Task UploadImage_ValidPng_StoresObjectAndReturnsKeyAndUrl()
        {
            var storage = new FakeObjectStorage();
            var handler = MakeUploadHandler(storage);

            var res = await handler.Handle(new UploadImageCommand
            {
                Content = Bytes(),
                FileName = "shelf.png",
                ContentType = "image/png",
                Length = 16,
                Folder = ImageFolderEnum.PRODUCTS,
            }, CancellationToken.None);

            var uploaded = Assert.IsType<UploadedFileDto>(res.Data);
            Assert.StartsWith("products/", uploaded.ObjectKey);
            Assert.EndsWith(".png", uploaded.ObjectKey);
            Assert.Contains(uploaded.ObjectKey, uploaded.Url);
            Assert.True(storage.Objects.ContainsKey(uploaded.ObjectKey));
        }

        [Fact]
        public async Task UploadImage_OverSizeLimit_ThrowsValidationAndUploadsNothing()
        {
            var storage = new FakeObjectStorage();
            var handler = MakeUploadHandler(storage, new ObjectStorageOptions { MaxImageSizeBytes = 1024 });

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UploadImageCommand
            {
                Content = Bytes(),
                FileName = "huge.png",
                ContentType = "image/png",
                Length = 2048,
                Folder = ImageFolderEnum.PRODUCTS,
            }, CancellationToken.None));

            Assert.Empty(storage.Objects);
        }

        [Fact]
        public async Task UploadImage_DisallowedExtension_ThrowsValidationAndUploadsNothing()
        {
            var storage = new FakeObjectStorage();
            var handler = MakeUploadHandler(storage);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UploadImageCommand
            {
                Content = Bytes(),
                FileName = "payload.svg",
                ContentType = "image/svg+xml",
                Length = 16,
                Folder = ImageFolderEnum.PRODUCTS,
            }, CancellationToken.None));

            Assert.Empty(storage.Objects);
        }

        [Fact]
        public async Task UploadImage_ImageExtensionButNonImageContentType_ThrowsValidation()
        {
            var storage = new FakeObjectStorage();
            var handler = MakeUploadHandler(storage);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UploadImageCommand
            {
                Content = Bytes(),
                FileName = "trojan.png",
                ContentType = "application/x-msdownload",
                Length = 16,
                Folder = ImageFolderEnum.PRODUCTS,
            }, CancellationToken.None));

            Assert.Empty(storage.Objects);
        }

        [Fact]
        public async Task DeleteImage_RemovesObjectFromBucket()
        {
            var storage = new FakeObjectStorage();
            var uploaded = await storage.UploadAsync(Bytes(), "old.png", "image/png", ImageFolderEnum.PRODUCTS);

            var handler = new DeleteImageCommandHandler(storage);
            await handler.Handle(new DeleteImageCommand { ObjectKey = uploaded.ObjectKey }, CancellationToken.None);

            Assert.Empty(storage.Objects);
        }

        [Fact]
        public async Task GetImageUrl_ReSignsAStoredKey()
        {
            var storage = new FakeObjectStorage();
            var handler = new GetImageUrlQueryHandler(storage);

            var res = await handler.Handle(new GetImageUrlQuery { ObjectKey = "products/abc.png" }, CancellationToken.None);

            var payload = res.Data!.GetType();
            var url = (string?)payload.GetProperty("Url")!.GetValue(res.Data);
            var key = (string?)payload.GetProperty("ObjectKey")!.GetValue(res.Data);

            Assert.Equal("products/abc.png", key);
            Assert.Contains("products/abc.png", url);
        }

        // The point of NormalizeKey: a frontend that reads ImageUrl off a detail response and
        // echoes it straight back into the update command must not persist the expiring URL.
        [Fact]
        public async Task UpdateProduct_EchoingBackASignedUrl_PersistsTheBareKey()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var createHandler = new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await createHandler.Handle(NewProduct(scope.Context, "products/original.png"), CancellationToken.None);

            using (var check = db.NewContext())
                Assert.Equal("products/original.png", check.Products.Single().ImageUrl);

            var detailHandler = new GetProductDetailQueryHandler(scope.ProductRepository, TestMapper.Instance, FakeObjectStorage.Instance);
            var productId = scope.Context.Products.Single().Id;
            var detail = (ProductDto)(await detailHandler.Handle(new GetProductDetailQuery { Id = productId }, CancellationToken.None)).Data!;

            Assert.Equal("products/original.png", detail.ImageKey);
            Assert.StartsWith(FakeObjectStorage.Host, detail.ImageUrl);

            // Echo the signed URL back, exactly as a naive frontend would.
            var updateHandler = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await updateHandler.Handle(new UpdateProductCommand
            {
                Id = productId,
                Name = "کالا",
                Brand = "برند",
                Unit = ProductUnitEnum.Number,
                PurchasePrice = 100,
                RetailPrice = 200,
                WholeSalePrice = 150,
                Tax = 9,
                Stock = 0,
                LowStockThreshold = 1,
                ImageObjectKey = detail.ImageUrl,
                ProductCategoryId = scope.Context.ProductCategories.Single().Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal("products/original.png", verify.Products.Single().ImageUrl);
        }

        [Fact]
        public async Task CustomerDetailAndList_ExposeKeyAndSignedUrl()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var createHandler = new CreateCustomerCommandHandler(scope.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance, scope.UnitOfWork);
            await createHandler.Handle(new CreateCustomerCommand
            {
                FirstName = "علی",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = BalanceTypeEnum.Debtor,
                ImageUrl = "customers/ali.jpg",
            }, CancellationToken.None);

            var customerId = scope.Context.Customers.Single().Id;

            var detail = (CustomerDto)(await new GetCustomerDetailQueryHandler(scope.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance)
                .Handle(new GetCustomerDetailQuery { Id = customerId }, CancellationToken.None)).Data!;

            Assert.Equal("customers/ali.jpg", detail.ImageKey);
            Assert.Contains("customers/ali.jpg", detail.ImageUrl);

            var listRes = await new GetCustomerListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetCustomerListQuery(), CancellationToken.None);

            var listItem = Assert.Single(ItemsOf<CustomerListDto>(listRes.Data!, "CustomerList"));
            Assert.Equal("customers/ali.jpg", listItem.ImageKey);
            Assert.Contains("customers/ali.jpg", listItem.ImageUrl);
        }

        [Fact]
        public async Task SupplierDetailAndList_ExposeKeyAndSignedUrl()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            await new CreateSupplierCommandHandler(scope.SupplierRepository, TestMapper.Instance, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreateSupplierCommand
                {
                    FirstName = "رضا",
                    LastName = "کریمی",
                    CompanyName = "شرکت الف",
                    Phone = "09121234567",
                    Address = "تهران",
                    PostalCode = "1234567890",
                    BalanceType = BalanceTypeEnum.Creditor,
                    ImageUrl = "suppliers/logo.png",
                }, CancellationToken.None);

            var supplierId = scope.Context.Suppliers.Single().Id;

            var detail = (SupplierDto)(await new GetSupplierDetailQueryHandler(scope.SupplierRepository, TestMapper.Instance, FakeObjectStorage.Instance)
                .Handle(new GetSupplierDetailQuery { Id = supplierId }, CancellationToken.None)).Data!;

            Assert.Equal("suppliers/logo.png", detail.ImageKey);
            Assert.Contains("suppliers/logo.png", detail.ImageUrl);

            var listRes = await new GetSupplierListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetSupplierListQuery(), CancellationToken.None);

            var listItem = Assert.Single(ItemsOf<SupplierListDto>(listRes.Data!, "SupplierList"));
            Assert.Equal("suppliers/logo.png", listItem.ImageKey);
            Assert.Contains("suppliers/logo.png", listItem.ImageUrl);
        }

        [Fact]
        public async Task ProductWithoutImage_LeavesBothKeyAndUrlNull()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var createHandler = new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await createHandler.Handle(NewProduct(scope.Context, null), CancellationToken.None);

            var productId = scope.Context.Products.Single().Id;
            var detail = (ProductDto)(await new GetProductDetailQueryHandler(scope.ProductRepository, TestMapper.Instance, FakeObjectStorage.Instance)
                .Handle(new GetProductDetailQuery { Id = productId }, CancellationToken.None)).Data!;

            Assert.Null(detail.ImageKey);
            Assert.Null(detail.ImageUrl);
        }

        private static CreateProductCommand NewProduct(Infrastructure.Persistence.WMSDbContext context, string? imageUrl)
        {
            var category = context.ProductCategories.FirstOrDefault();
            if (category == null)
            {
                category = Seed.Category();
                context.ProductCategories.Add(category);
                context.SaveChanges();
            }

            return new CreateProductCommand
            {
                Name = "کالا",
                Brand = "برند",
                Unit = ProductUnitEnum.Number,
                PurchasePrice = 100,
                RetailPrice = 200,
                WholeSalePrice = 150,
                Tax = 9,
                Stock = 0,
                LowStockThreshold = 1,
                ImageObjectKey = imageUrl,
                ProductCategoryId = category.Id,
            };
        }

        private static List<T> ItemsOf<T>(object data, string propertyName) =>
            (List<T>)data.GetType().GetProperty(propertyName)!.GetValue(data)!;
    }
}
