using Application.Common.Contracts.Context;
using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Application.Common.Contracts.Invoice;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UnitOfWork;
using Amazon.Runtime;
using Amazon.S3;
using Application.Common.Contracts.Pos;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PosIntegration.Clients;

namespace Infrastructure.Ioc
{
    public static class InfrastructureServiceRegistration
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, string connectionString, IConfiguration configuration)
        {

            // ثبت DbContext
            services.AddDbContext<WMSDbContext>(options =>
                options.UseSqlServer(connectionString));

            // ثبت GenericRepository (اینجا فرض کردیم ریپازیتوری جنریک داریم)
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

            // ثبت IApplicationDbContext برای استفاده از ApplicationDbContext در اپلیکیشن
            services.AddScoped<IWMSDbContext>(provider => provider.GetRequiredService<WMSDbContext>());

            //repositories
            services.AddScoped<ISupplierRepository, SupplierRepository>();
            services.AddScoped<ICustomerRepository, CustomerRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IProductRepository, ProductRepository>();
            services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
            services.AddScoped<IPurchaseRepository, PurchaseRepository>();
            services.AddScoped<IPurchaseReturnRepository, PurchaseReturnRepository>();
            services.AddScoped<ISaleReturnRepository, SaleReturnRepository>();
            services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            services.AddScoped<ITeamRepository, TeamRepository>();
            services.AddScoped<IPosTerminalRepository, PosTerminalRepository>();

            //UnitOfWork
            services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();

            services.AddScoped<ITokenService, TokenService>();

            services.AddScoped<IPurchaseReturnCalculationService, PurchaseReturnCalculationService>();
            services.AddScoped<IPurchaseReturnQueryService, PurchaseReturnQueryService>();

            services.AddScoped<ISaleReturnCalculationService, SaleReturnCalculationService>();
            services.AddScoped<ISaleReturnQueryService, SaleReturnQueryService>();

            services.AddScoped<IInvoiceLineCalculationService, InvoiceLineCalculationService>();

            services.AddScoped<IProductCodeService, ProductCodeService>();
            services.AddScoped<IProductUnitService, ProductUnitService>();
            services.AddScoped<IInventoryCostingService, InventoryCostingService>();

            services.AddSingleton<IBarcodeRenderer, ZXingBarcodeRenderer>();

            // QuestPdfDocumentService now only renders barcode label sheets; the invoice/credit-note
            // document is the official Excel template converted via LibreOffice headless (see
            // ExcelInvoiceDocumentService's doc comment for why DocToolkit was rejected in favor of
            // this). Registered concretely (not as IPdfDocumentService) since ExcelInvoiceDocumentService
            // injects it directly to reuse RenderBarcodeLabels.
            services.AddSingleton<QuestPdfDocumentService>();
            services.Configure<LibreOfficeOptions>(configuration.GetSection(LibreOfficeOptions.SectionName));

            // Two interchangeable invoice renderers, selected per environment by configuration
            // (InvoiceRenderer:Engine) rather than at compile time: the Excel+LibreOffice one is
            // faithful to the official template but needs `soffice` on the host, the QuestPDF one
            // runs entirely in-process. Both are registered concretely and the interface resolves
            // through a factory, so the query handlers keep injecting plain IPdfDocumentService and
            // never learn which engine is active. LibreOffice stays the default.
            services.Configure<InvoiceRendererOptions>(configuration.GetSection(InvoiceRendererOptions.SectionName));
            services.AddSingleton<ExcelInvoiceDocumentService>();
            services.AddSingleton<QuestPdfInvoiceDocumentService>();
            services.AddSingleton<IPdfDocumentService>(provider =>
            {
                var options = provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<InvoiceRendererOptions>>().Value;

                return options.UsesQuestPdf
                    ? provider.GetRequiredService<QuestPdfInvoiceDocumentService>()
                    : provider.GetRequiredService<ExcelInvoiceDocumentService>();
            });

            // فضای ذخیره‌سازی ابری (Liara Object Storage - سازگار با S3)
            services.Configure<ObjectStorageOptions>(configuration.GetSection(ObjectStorageOptions.SectionName));

            // AmazonS3Client is thread-safe and holds a pooled HTTP handler, so it is registered
            // once for the process rather than per request - the same reason the AWS SDK's own
            // AddAWSService does. ForcePathStyle is required by S3-compatible providers like Liara.
            services.AddSingleton<IAmazonS3>(provider =>
            {
                var options = provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ObjectStorageOptions>>().Value;

                var config = new AmazonS3Config
                {
                    ServiceURL = options.Endpoint,
                    ForcePathStyle = true,

                    // AWS SDK v4 defaults both of these to WHEN_SUPPORTED, which makes every
                    // PutObject stream its body as `Content-Encoding: aws-chunked` with a
                    // trailing `x-amz-checksum-crc32` (X-Amz-Content-SHA256:
                    // STREAMING-UNSIGNED-PAYLOAD-TRAILER). Real S3 unwraps that framing; Liara
                    // does not - it stores the chunk headers and the trailer as part of the
                    // object. The PUT still answers 200, so the upload looks successful and the
                    // key is saved, but every later GET hands back a file that is a few bytes
                    // longer than the original and no longer a valid image/PDF - broken
                    // thumbnails, PDFs that will not open.
                    //
                    // WHEN_REQUIRED turns the body back into the plain bytes (UNSIGNED-PAYLOAD
                    // over HTTPS, which is what DisablePayloadSigning in
                    // LiaraObjectStorageService.UploadAsync already asks for). Nothing is lost:
                    // S3 only *requires* a checksum for a handful of operations this code does
                    // not use, and the transport is TLS either way.
                    RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                    ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
                };

                var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);

                return new AmazonS3Client(credentials, config);
            });

            services.AddSingleton<IObjectStorageService, LiaraObjectStorageService>();

            // POS card-reader integration - each vendor's client calls a local bridge process
            // (Sadad's REST/WCF service, WebPCPOS.exe, or SSP1126's SignalR service) running on the
            // till machine itself, not the physical device directly; see PosIntegration/Clients/*.
            // Melli/Parsian speak plain HTTP so they get typed HttpClients; Samankish opens its own
            // SignalR HubConnection per call and needs no HttpClient.
            services.AddHttpClient<MelliPosDeviceClient>();
            services.AddHttpClient<ParsianPosDeviceClient>();
            services.AddScoped<IPosDeviceClient>(provider => provider.GetRequiredService<MelliPosDeviceClient>());
            services.AddScoped<IPosDeviceClient>(provider => provider.GetRequiredService<ParsianPosDeviceClient>());
            services.AddScoped<IPosDeviceClient, SamankishPosDeviceClient>();
            services.AddScoped<IPosDeviceClientFactory, PosDeviceClientFactory>();

            services.AddScoped<IPosPaymentGateway, PosPaymentGateway>();

            return services;
        }
    }
}
