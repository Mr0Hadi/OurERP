using System.Reflection;
using Application.Common.Contracts.DataTransfer;
using Application.Common.Contracts.Permissions;
using Application.Common.DataTransfer;
using Application.Features.Customer.Commands;
using Application.Features.Customer.DataTransfer;
using Application.Features.DataTransfer;
using Application.Features.DataTransfer.Commands;
using Application.Features.DataTransfer.Queries;
using Application.Features.Product.Commands;
using Application.Features.Product.DataTransfer;
using Application.Features.Supplier.Commands;
using Application.Features.Supplier.DataTransfer;
using Common.Exceptions;
using Domain.Enums;
using Infrastructure.Services.DataTransfer;
using Microsoft.Extensions.Options;
using NSubstitute;
using WMS.Tests.Support;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// The three real definitions and the permission gate, without a database: building a definition's specs touches
    /// none of its services, and the gate refuses before any query runs.
    /// </summary>
    public class DataTransferDefinitionTests
    {
        private static IDataTransferDefinition[] Definitions() => new IDataTransferDefinition[]
        {
            new ProductDataTransferDefinition(null!, null!, null!, null!, null!, null!, null!),
            new CustomerDataTransferDefinition(null!, null!, null!, null!),
            new SupplierDataTransferDefinition(null!, null!, null!, null!),
        };

        /// <summary>Fields that must never leave the server in a table export.</summary>
        private static readonly string[] Forbidden = { "Id", "CreatedAt", "UpdatedAt", "IsActive", "ImageUrl", "ImageKey", "Password", "PasswordHash", "RefreshToken", "Longitude", "Latitude" };

        public static IEnumerable<object[]> ExportRowTypes() => new[]
        {
            new object[] { typeof(ProductExportRow) },
            new object[] { typeof(CustomerExportRow) },
            new object[] { typeof(SupplierExportRow) },
        };

        [Theory]
        [MemberData(nameof(ExportRowTypes))]
        public void ExportRows_CarryNoSystemOrSensitiveFields(Type rowType)
        {
            var properties = rowType.GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(p => p.Name);
            Assert.Empty(properties.Intersect(Forbidden));
        }

        [Fact]
        public void ExportHeaders_AreUnique_AndInAStableOrder()
        {
            foreach (var definition in Definitions())
            {
                var headers = definition.Export!.Columns.Select(c => c.Header).ToList();
                Assert.Equal(headers.Count, headers.Distinct().Count());
                Assert.Equal(headers, definition.Export.Columns.Select(c => c.Header).ToList());
            }
        }

        [Fact]
        public void ImportColumns_PointAtRealCommandProperties()
        {
            var commands = new Dictionary<string, Type>
            {
                ["products"] = typeof(CreateProductCommand),
                ["customers"] = typeof(CreateCustomerCommand),
                ["suppliers"] = typeof(CreateSupplierCommand),
            };

            foreach (var definition in Definitions())
            {
                var command = commands[definition.Resource];
                foreach (var column in definition.Import!.Columns)
                {
                    Assert.NotNull(column.Property);
                    Assert.True(command.GetProperty(column.Property!) != null, $"{definition.Resource}.{column.Key} -> {column.Property} does not exist on {command.Name}");
                    if (column.Type == DataFieldTypeEnum.Enum) Assert.NotNull(column.EnumType);
                }
                Assert.Equal(definition.Import.Columns.Count, definition.Import.Columns.Select(c => c.Key).Distinct().Count());
            }
        }

        [Fact]
        public void ProductImport_DoesNotAcceptStockOrServerGeneratedFields()
        {
            var keys = new ProductDataTransferDefinition(null!, null!, null!, null!, null!, null!, null!).Import.Columns.Select(c => c.Key);
            Assert.DoesNotContain("stock", keys);
            Assert.DoesNotContain("code", keys);
            Assert.DoesNotContain("barCode", keys);
        }

        [Fact]
        public void EachResource_HasItsOwnExportAndImportPermission()
        {
            var expected = new Dictionary<string, (PermissionEnum Export, PermissionEnum Import)>
            {
                ["products"] = (PermissionEnum.ProductExport, PermissionEnum.ProductImport),
                ["customers"] = (PermissionEnum.CustomerExport, PermissionEnum.CustomerImport),
                ["suppliers"] = (PermissionEnum.SupplierExport, PermissionEnum.SupplierImport),
            };

            foreach (var definition in Definitions())
            {
                Assert.Equal(expected[definition.Resource].Export, definition.Export!.Permission);
                Assert.Equal(expected[definition.Resource].Import, definition.Import!.Permission);
            }
        }

        [Fact]
        public void Registry_RefusesUnknownAndDuplicateResources()
        {
            var registry = new DataTransferRegistry(Definitions());
            Assert.Equal("products", registry.Get("PRODUCTS").Resource);
            Assert.Throws<NotFoundCustomException>(() => registry.Get("salesInvoices"));
            Assert.Throws<InvalidOperationException>(() => new DataTransferRegistry(Definitions().Concat(Definitions())));
        }

        // ---------------- the permission gate ----------------

        private static DataTransferAccess Access(params PermissionEnum[] held)
        {
            var permissions = Substitute.For<IPermissionService>();
            permissions.HasPermissionAsync(Arg.Any<int>(), Arg.Any<PermissionEnum>(), Arg.Any<CancellationToken>())
                .Returns(call => held.Contains(call.ArgAt<PermissionEnum>(1)));
            return new DataTransferAccess(new DataTransferRegistry(Definitions()), permissions, FakeUserContext.WithUserId(5));
        }

        /// <summary>A stream that fails the test if anything reads it.</summary>
        private sealed class UntouchableStream : MemoryStream
        {
            public override int Read(byte[] buffer, int offset, int count) => throw new InvalidOperationException("the file was read");
            public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => throw new InvalidOperationException("the file was read");
        }

        [Fact]
        public async Task Export_WithoutTheExportPermission_IsForbidden_EvenWithImport()
        {
            var handler = new ExportDataQueryHandler(Access(PermissionEnum.ProductImport, PermissionEnum.ProductView),
                new TabularFileFormatProvider(new ITabularFileFormat[] { new CsvTabularFormat() }),
                Substitute.For<IDataTransferAuditLog>(), Options.Create(new DataTransferOptions()));

            await Assert.ThrowsAsync<ForbiddenCustomException>(() =>
                handler.Handle(new ExportDataQuery { Resource = "products", Format = DataTransferFormatEnum.CSV }, CancellationToken.None));
        }

        [Fact]
        public async Task Import_WithoutTheImportPermission_IsForbidden_BeforeTheFileIsRead()
        {
            var handler = new ImportDataCommandHandler(Access(PermissionEnum.CustomerExport, PermissionEnum.CustomerCreate),
                new TabularFileFormatProvider(new ITabularFileFormat[] { new CsvTabularFormat() }), null!,
                Substitute.For<IDataTransferAuditLog>(), Options.Create(new DataTransferOptions()));

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => handler.Handle(new ImportDataCommand
            {
                Resource = "customers",
                Mode = ImportModeEnum.COMMIT,
                Content = new UntouchableStream(),
                FileName = "customers.csv",
                Length = 10,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task Template_NeedsTheImportPermission()
        {
            var handler = new GetImportTemplateQueryHandler(Access(PermissionEnum.SupplierExport),
                new TabularFileFormatProvider(new ITabularFileFormat[] { new XlsxTabularFormat() }));

            await Assert.ThrowsAsync<ForbiddenCustomException>(() =>
                handler.Handle(new GetImportTemplateQuery { Resource = "suppliers" }, CancellationToken.None));
        }

        [Fact]
        public async Task Template_HasTheImportHeadersInOrder()
        {
            var handler = new GetImportTemplateQueryHandler(Access(PermissionEnum.SupplierImport),
                new TabularFileFormatProvider(new ITabularFileFormat[] { new XlsxTabularFormat() }));

            var file = await handler.Handle(new GetImportTemplateQuery { Resource = "suppliers", Format = DataTransferFormatEnum.XLSX }, CancellationToken.None);
            var sheet = await new XlsxTabularFormat().ReadAsync(new MemoryStream(file.Content), new TabularReadLimits { MaxRows = 10, MaxUncompressedBytes = 10_000_000 }, CancellationToken.None);

            var expected = new SupplierDataTransferDefinition(null!, null!, null!, null!).Import.Columns.Select(c => c.Header);
            Assert.Equal(expected, sheet.Headers);
            Assert.EndsWith(".xlsx", file.FileName);
        }

        [Fact]
        public async Task Import_RefusesAnOversizedFile_AndAnExtensionThatDoesNotMatch()
        {
            var options = Options.Create(new DataTransferOptions { MaxUploadBytes = 100 });
            var handler = new ImportDataCommandHandler(Access(PermissionEnum.CustomerImport),
                new TabularFileFormatProvider(new ITabularFileFormat[] { new CsvTabularFormat(), new XlsxTabularFormat() }), null!,
                Substitute.For<IDataTransferAuditLog>(), options);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ImportDataCommand
            { Resource = "customers", Content = new UntouchableStream(), FileName = "c.csv", Length = 101 }, CancellationToken.None));

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ImportDataCommand
            { Resource = "customers", Content = new UntouchableStream(), FileName = "c.exe", Length = 10 }, CancellationToken.None));

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ImportDataCommand
            { Resource = "customers", Format = DataTransferFormatEnum.XLSX, Content = new UntouchableStream(), FileName = "c.csv", Length = 10 }, CancellationToken.None));
        }

        [Fact]
        public void SafeFileName_StripsPathsAndControlCharacters()
        {
            Assert.Equal("evil.csv", DataTransferAccess.SafeFileName("..\\..\\windows/evil.csv"));
            Assert.Equal("ab.csv", DataTransferAccess.SafeFileName("a\u0000b.csv"));
            Assert.Null(DataTransferAccess.SafeFileName("  "));
        }
    }
}
