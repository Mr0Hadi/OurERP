//using Application.Common.Contracts.Captcha;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Documents;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UnitOfWork;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Ioc
{
    public static class InfrastructureServiceRegistration
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, string connectionString)
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

            //services.AddScoped<ICaptchaService, CaptchaService>();

            services.AddScoped<ITokenService, TokenService>();

            services.AddScoped<IPurchaseReturnCalculationService, PurchaseReturnCalculationService>();

            services.AddScoped<ISaleReturnCalculationService, SaleReturnCalculationService>();

            services.AddScoped<IProductCodeService, ProductCodeService>();
            services.AddScoped<IProductUnitService, ProductUnitService>();

            services.AddSingleton<IBarcodeRenderer, ZXingBarcodeRenderer>();
            services.AddSingleton<IPdfDocumentService, QuestPdfDocumentService>();

            //services.AddSixLabCaptcha(x => x.DrawLines = 4);

            return services;
        }
    }
}
