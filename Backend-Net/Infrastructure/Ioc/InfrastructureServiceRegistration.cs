using Application.Common.Contracts.Context;
using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Application.Common.Contracts.Invoice;
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
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
            services.AddScoped<IRoleRepository, RoleRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IProductRepository, ProductRepository>();
            services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
            services.AddScoped<IPurchaseRepository, PurchaseRepository>();
            services.AddScoped<IPurchaseReturnRepository, PurchaseReturnRepository>();
            services.AddScoped<ISaleReturnRepository, SaleReturnRepository>();

            //UnitOfWork
            services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();

            services.AddScoped<ITokenService, TokenService>();

            services.AddScoped<IPurchaseReturnCalculationService, PurchaseReturnCalculationService>();

            services.AddScoped<ISaleReturnCalculationService, SaleReturnCalculationService>();
            services.AddScoped<ISaleReturnQueryService, SaleReturnQueryService>();

            services.AddScoped<IInvoiceLineCalculationService, InvoiceLineCalculationService>();

            services.AddScoped<IProductCodeService, ProductCodeService>();
            services.AddScoped<IProductUnitService, ProductUnitService>();

            services.AddSingleton<IBarcodeRenderer, ZXingBarcodeRenderer>();
            services.AddSingleton<IPdfDocumentService, QuestPdfDocumentService>();

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
                };

                var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);

                return new AmazonS3Client(credentials, config);
            });

            services.AddSingleton<IObjectStorageService, LiaraObjectStorageService>();

            return services;
        }
    }
}
