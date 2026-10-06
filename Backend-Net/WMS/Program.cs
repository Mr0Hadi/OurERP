
using Application.Ioc;
using Infrastructure.Ioc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using System.Text;
using WMS.Ioc;
using WMS.Logging;
using WMS.Middlewares;

namespace WMS
{
    public class Program
    {
        public static void Main(string[] args)
        {
            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var builder = WebApplication.CreateBuilder(args);

            SerilogConfiguration.ConfigureLogger(builder.Configuration, builder.Environment.ContentRootPath);
            builder.Host.UseSerilog();

            // Add services to the container.

            builder.Services.AddControllers();
            builder.Services.AddOpenApi(options =>
            {
                options.AddDocumentTransformer(async (document, context, cancellationToken) =>
                {
                    document.Components ??= new Microsoft.OpenApi.OpenApiComponents();
                    document.Components.SecuritySchemes ??= new Dictionary<string, Microsoft.OpenApi.IOpenApiSecurityScheme>();
                    document.Components.SecuritySchemes["Bearer"] = new Microsoft.OpenApi.OpenApiSecurityScheme
                    {
                        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
                        Name = "Authorization",
                        Scheme = "Bearer",
                        BearerFormat = "JWT",
                        In = Microsoft.OpenApi.ParameterLocation.Header,
                        Description = "Please insert JWT token into field"
                    };

                    foreach (var operation in document.Paths.Values.SelectMany(p => p.Operations))
                    {
                        operation.Value.Security ??= new List<Microsoft.OpenApi.OpenApiSecurityRequirement>();
                        operation.Value.Security.Add(new Microsoft.OpenApi.OpenApiSecurityRequirement
                        {
                            [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document)] = []
                        });
                    }
                });
            });

            builder.Services.AddEndPointServiceRegistration(builder.Configuration);
            builder.Services.AddApplicationServices();
            builder.Services.AddInfrastructureServices(builder.Configuration.GetConnectionString("SqlServer"), builder.Configuration);

            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            //builder.Services.AddOpenApi();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultSignInScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(configureOptions =>
            {
                configureOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    RequireAudience = true,
                    RequireExpirationTime = true,
                    ClockSkew = TimeSpan.Zero,
                    ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
                    ValidAudience = builder.Configuration["JwtSettings:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SigningKey"])),
                    TokenDecryptionKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:EncryptionKey"]))
                };

                configureOptions.SaveToken = true;
            });


            // One policy per PermissionEnum member; what a user holds is read from the
            // UserPermissions table on each request, never from claims in the token.
            builder.Services.AddPermissionAuthorization();

            builder.Services.AddLoginRateLimiting(builder.Configuration);

            // Every request body is capped at the same size, uploads included (an image is at most
            // ObjectStorage:MaxImageSizeBytes, 5 MB, so this leaves room for the multipart framing).
            // Down from the 30 MB default: a JSON request of this API is a few KB, and nothing larger
            // has a reason to be held in memory. IIS's own requestLimits in web.config still apply on
            // top - whichever is smaller wins.
            var maxRequestBodyBytes = builder.Configuration.GetValue<long?>("RequestLimits:MaxBodyBytes") ?? 10L * 1024 * 1024;
            builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maxRequestBodyBytes);
            builder.Services.Configure<IISServerOptions>(options => options.MaxRequestBodySize = maxRequestBodyBytes);
            builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = maxRequestBodyBytes);

            var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          // Content-Disposition: the import/export download names its file (DataTransferController).
                          .WithExposedHeaders(IdempotencyMiddleware.ReplayedHeaderName, "Content-Disposition")
                          .AllowCredentials();
                });
            });

            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var details = context.ModelState
                        .Where(kvp => kvp.Value?.Errors.Count > 0)
                        .Select(kvp => kvp.Key.ToString());

                    var message = "فرمت داده ورودی صحیح نمی باشد. " + string.Join(" - ", details);

                    return ResponseHandler.ResponseHandler.ExceptionResult(400, message, null);
                };
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            // OpenAPI/Scalar is deliberately served in every environment, not just Development -
            // the generated docs are the contract the frontend is built against. Set
            // "OpenApi:Enabled": false in appsettings to turn it off.
            if (builder.Configuration.GetValue("OpenApi:Enabled", true))
            {
                app.MapOpenApi();
                app.MapScalarApiReference(options =>
                {
                    options.AddPreferredSecuritySchemes("Bearer");
                    options.WithTheme(ScalarTheme.Mars);
                });
            }

            app.UseMiddleware<SecurityHeadersMiddleware>();

            // HTTPS-only from the browser's side too. Not in Development, where the API runs on plain
            // http://localhost and a remembered HSTS entry for localhost breaks every other local app.
            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
            }

            app.UseCors("AllowAll");

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseRateLimiter();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseMiddleware<RequestLoggingMiddleware>();

            app.UseMiddleware<ExceptionHandlingMiddleware>();

            app.UseMiddleware<CachingMiddleware>();

            // After the session check, so a revoked token gets 401 rather than this 403.
            app.UseMiddleware<PasswordChangeRequiredMiddleware>();

            // Inside the exception handler (a failed write releases its key) and after the token check.
            app.UseMiddleware<IdempotencyMiddleware>();

            app.MapControllers();

            app.Run();
        }
    }
}
