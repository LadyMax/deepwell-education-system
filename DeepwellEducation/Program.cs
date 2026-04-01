using System.Text;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;

namespace DeepwellEducation
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
            builder.Services.AddScoped<JwtService>();
            builder.Services.AddScoped<ICourseRequestService, CourseRequestService>();
            builder.Services.AddScoped<IMessageService, MessageService>();

            var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not set.");
            var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DeepwellEducation";
            var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DeepwellEducation";
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtIssuer,
                        ValidAudience = jwtAudience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                    };
                });

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Description = "JWT: Bearer <token>",
                    Name = "Authorization",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey
                });
                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // JWT is stored in localStorage (per browser origin). In Development, launchSettings often exposes
            // both http://localhost:5190 and https://localhost:7169; forcing HTTP→HTTPS splits localStorage
            // across two origins, so navigation looks like an immediate logout. Production still redirects.
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            var wwwrootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
            var frontendRoot = Path.Combine(wwwrootPath, "frontend");
            if (Directory.Exists(frontendRoot))
            {
                var frontendFiles = new PhysicalFileProvider(frontendRoot);
                var disableFrontendStaticCache = app.Environment.IsDevelopment();
                app.UseDefaultFiles(new DefaultFilesOptions
                {
                    FileProvider = frontendFiles,
                    RequestPath = "/frontend"
                });
                app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = frontendFiles,
                    RequestPath = "/frontend",
                    OnPrepareResponse = ctx =>
                    {
                        if (!disableFrontendStaticCache)
                            return;
                        var name = ctx.File.Name;
                        if (name.EndsWith(".css", StringComparison.OrdinalIgnoreCase) ||
                            name.EndsWith(".js", StringComparison.OrdinalIgnoreCase))
                            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                    }
                });
            }

            app.UseStaticFiles();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapGet("/", () => Results.Redirect("/frontend/"));

            app.MapControllers();

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.Migrate();
                await AdminSeeder.SeedAsync(scope.ServiceProvider);
            }

            app.Run();
        }
    }
}
