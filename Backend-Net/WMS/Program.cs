
using Application.Ioc;
using Infrastructure.Ioc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

            builder.Services.AddEndPointServiceRegistration();
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


            // Authorization policies are not yet department-based (see CLAUDE.md); role-based
            // claims/policies were removed since Department/Team now carry organizational structure.
            builder.Services.AddAuthorization();

            var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
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

            app.UseCors("AllowAll");

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseMiddleware<RequestLoggingMiddleware>();

            app.UseMiddleware<ExceptionHandlingMiddleware>();

            app.UseMiddleware<CachingMiddleware>();

            app.MapControllers();

            app.Run();
        }
    }
}
