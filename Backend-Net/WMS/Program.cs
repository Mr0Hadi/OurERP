
using Application.Ioc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using System.Text;
using WMS.Ioc;
using WMS.Middlewares;
using Serilog;

namespace WMS
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Host.UseSerilog();

            // Add services to the container.

            builder.Services.AddControllers();
            builder.Services.AddOpenApi(options =>
            {
                options.AddDocumentTransformer(async (document, context, cancellationToken) =>
                {
                    document.Components ??= new OpenApiComponents();
                    document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                    document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.Http,
                        Name = "Authorization",
                        Scheme = "Bearer",
                        BearerFormat = "JWT",
                        In = ParameterLocation.Header,
                        Description = "Please insert JWT token into field"
                    };

                    foreach (var operation in document.Paths.Values.SelectMany(p => p.Operations))
                    {
                        operation.Value.Security ??= new List<OpenApiSecurityRequirement>();
                        operation.Value.Security.Add(new OpenApiSecurityRequirement
                        {
                            [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                        });
                    }
                });
            });

            builder.Services.AddEndPointServiceRegistration();
            builder.Services.AddApplicationServices();
            //builder.Services.AddInfrastructureServices(builder.Configuration.GetConnectionString("DBConnection"));

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


            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("Admin", options => { options.RequireClaim("Admin"); });
                options.AddPolicy("Manager", options => { options.RequireClaim("Manager"); });

                //foreach (var permission in Enum.GetValues<PermissionsEnum>())
                //    options.AddPolicy(permission.ToString(), p =>
                //        p.RequireAssertion(ctx => ctx.User.HasClaim("Admin", "Admin") || ctx.User.HasClaim(permission.ToString(), permission.ToString())));
            });

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
                    ResponseHandler.ResponseHandler.HandleExceptionAsync(context.HttpContext, 400, "فرمت داده ورودی صحیح نمی باشد.", null).GetAwaiter().GetResult();

                    return new EmptyResult();
                };
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment() || true)
            {
                app.MapOpenApi();
                app.MapScalarApiReference(options =>
                {
                    options.AddPreferredSecuritySchemes("Bearer");
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
