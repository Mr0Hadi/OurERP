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
            // Keys keep the uploader's own file name so the bucket listing stays readable.
            Assert.Equal("shelf.png", uploaded.ObjectKey);
            Assert.Equal(uploaded.ObjectKey, storage.NormalizeKey(uploaded.Url));
            Assert.True(storage.Objects.ContainsKey(uploaded.ObjectKey));
        }

        // Before this, the key WAS the raw file name, so a second "logo.png" silently replaced the
        // first one's bytes - and the first entity's ImageUrl then pointed at the wrong picture.
        [Fact]
        public async Task UploadImage_SameFileNameTwice_SuffixesTheKeyAndKeepsBothObjects()
        {
            var storage = new FakeObjectStorage();
            var handler = MakeUploadHandler(storage);

            async Task<UploadedFileDto> Upload(byte[] bytes) =>
                Assert.IsType<UploadedFileDto>((await handler.Handle(new UploadImageCommand
                {
                    Content = new MemoryStream(bytes),
                    FileName = "logo.png",
                    ContentType = "image/png",
                    Length = bytes.Length,
                    Folder = ImageFolderEnum.PRODUCTS,
                }, CancellationToken.None)).Data);

            var first = await Upload(new byte[] { 1, 1, 1 });
            var second = await Upload(new byte[] { 2, 2, 2 });
            var third = await Upload(new byte[] { 3, 3, 3 });

            Assert.Equal("logo.png", first.ObjectKey);
            Assert.Equal("logo-1.png", second.ObjectKey);
            Assert.Equal("logo-2.png", third.ObjectKey);

            // The point of the exercise: the first upload's bytes are still there.
            Assert.Equal(new byte[] { 1, 1, 1 }, storage.Objects["logo.png"]);
            Assert.Equal(new byte[] { 2, 2, 2 }, storage.Objects["logo-1.png"]);
            Assert.Equal(3, storage.Objects.Count);
        }

        // The file name is client-controlled and becomes the key verbatim, so it must not be able
        // to choose its own prefix in the bucket.
        [Theory]
        [InlineData("../../evil.png", "evil.png")]
        [InlineData("products/2026/logo.png", "logo.png")]
        [InlineData("C:\\Users\\alisi\\Desktop\\photo.png", "photo.png")]
        [InlineData("  spaced.png  ", "spaced.png")]
        public async Task UploadImage_FileNameIsReducedToASinglePathSegment(string sent, string expectedKey)
        {
            var storage = new FakeObjectStorage();

            var uploaded = Assert.IsType<UploadedFileDto>((await MakeUploadHandler(storage).Handle(new UploadImageCommand
            {
                Content = Bytes(),
                FileName = sent,
                ContentType = "image/png",
                Length = 16,
                Folder = ImageFolderEnum.PRODUCTS,
            }, CancellationToken.None)).Data);

            Assert.Equal(expectedKey, uploaded.ObjectKey);
            Assert.DoesNotContain('/', uploaded.ObjectKey);
            Assert.DoesNotContain('\\', uploaded.ObjectKey);
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
            Assert.Equal("products/abc.png", storage.NormalizeKey(url));
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
            Assert.StartsWith(FakeObjectStorage.ApiHost, detail.ImageUrl);

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
                ImageKey = detail.ImageUrl,
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
                ImageKey = "customers/ali.jpg",
            }, CancellationToken.None);

            var customerId = scope.Context.Customers.Single().Id;

            var detail = (CustomerDto)(await new GetCustomerDetailQueryHandler(scope.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance)
                .Handle(new GetCustomerDetailQuery { Id = customerId }, CancellationToken.None)).Data!;

            Assert.Equal("customers/ali.jpg", detail.ImageKey);
            Assert.Equal("customers/ali.jpg", FakeObjectStorage.Instance.NormalizeKey(detail.ImageUrl));

            var listRes = await new GetCustomerListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetCustomerListQuery(), CancellationToken.None);

            var listItem = Assert.Single(ItemsOf<CustomerListDto>(listRes.Data!, "CustomerList"));
            Assert.Equal("customers/ali.jpg", listItem.ImageKey);
            Assert.Equal("customers/ali.jpg", FakeObjectStorage.Instance.NormalizeKey(listItem.ImageUrl));
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
                    ImageKey = "suppliers/logo.png",
                }, CancellationToken.None);

            var supplierId = scope.Context.Suppliers.Single().Id;

            var detail = (SupplierDto)(await new GetSupplierDetailQueryHandler(scope.SupplierRepository, TestMapper.Instance, FakeObjectStorage.Instance)
                .Handle(new GetSupplierDetailQuery { Id = supplierId }, CancellationToken.None)).Data!;

            Assert.Equal("suppliers/logo.png", detail.ImageKey);
            Assert.Equal("suppliers/logo.png", FakeObjectStorage.Instance.NormalizeKey(detail.ImageUrl));

            var listRes = await new GetSupplierListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetSupplierListQuery(), CancellationToken.None);

            var listItem = Assert.Single(ItemsOf<SupplierListDto>(listRes.Data!, "SupplierList"));
            Assert.Equal("suppliers/logo.png", listItem.ImageKey);
            Assert.Equal("suppliers/logo.png", FakeObjectStorage.Instance.NormalizeKey(listItem.ImageUrl));
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

        // The reason images are served through this API at all: Liara's storage edge answers a
        // plain "404 page not found" to any request carrying a browser User-Agent, so a bucket URL
        // in an <img src> can never load. GetFixedUrl must therefore point at api/File/GetImage on
        // our own host - never at the bucket - and GetImageFileQuery must serve the bytes.
        [Fact]
        public async Task ImageUrl_PointsAtThisApiRatherThanTheBucket_AndServesTheBytes()
        {
            var storage = new FakeObjectStorage();

            var uploaded = Assert.IsType<UploadedFileDto>((await MakeUploadHandler(storage)
                .Handle(new UploadImageCommand
                {
                    Content = new MemoryStream(new byte[] { 1, 2, 3, 4 }),
                    FileName = "logo.png",
                    ContentType = "image/png",
                    Length = 4,
                    Folder = ImageFolderEnum.PRODUCTS,
                }, CancellationToken.None)).Data);

            Assert.StartsWith($"{FakeObjectStorage.ApiHost}/api/File/GetImage", uploaded.Url);
            Assert.DoesNotContain(FakeObjectStorage.Host, uploaded.Url);

            // ...and that URL, fed straight back in, resolves to the object's bytes.
            var file = await new GetImageFileQueryHandler(storage)
                .Handle(new GetImageFileQuery { ObjectKey = uploaded.Url! }, CancellationToken.None);

            Assert.Equal(new byte[] { 1, 2, 3, 4 }, file.Content);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetImageFileQueryHandler(storage)
                .Handle(new GetImageFileQuery { ObjectKey = "products/not-there.png" }, CancellationToken.None));
        }

        private static CreateProductCommand NewProduct(Infrastructure.Persistence.WMSDbContext context, string? imageKey)
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
                ImageKey = imageKey,
                ProductCategoryId = category.Id,
            };
        }

        private static List<T> ItemsOf<T>(object data, string propertyName) =>
            (List<T>)data.GetType().GetProperty(propertyName)!.GetValue(data)!;
    }
}
