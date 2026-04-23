using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Security;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

namespace DeepwellEducation
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
            builder.Services.AddScoped<JwtService>();
            builder.Services.AddScoped<ICourseRequestService, CourseRequestService>();
            builder.Services.AddScoped<IMessageService, MessageService>();
            builder.Services.Configure<AiClassifierOptions>(builder.Configuration.GetSection("AiClassifier"));
            builder.Services.AddHttpClient<IAiMessageClassifier, FastApiMessageClassifier>((sp, client) =>
            {
                var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiClassifierOptions>>().Value;
                client.BaseAddress = new Uri(options.BaseUrl);
                var timeout = options.TimeoutSeconds <= 0 ? 5 : options.TimeoutSeconds;
                client.Timeout = TimeSpan.FromSeconds(timeout);
            });

            var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not set.");
            if (jwtKey.Length < 32)
            {
                throw new InvalidOperationException(
                    "Jwt:Key must be at least 32 characters (signing key entropy; OWASP ASVS / NIST-aligned minimum for HMAC).");
            }
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
                    options.Events = new JwtBearerEvents
                    {
                        OnTokenValidated = async context =>
                        {
                            var pwv = context.Principal?.FindFirstValue(JwtService.PasswordStampClaimType);
                            if (string.IsNullOrEmpty(pwv))
                                return;

                            var userIdStr = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                                return;

                            await using var scope = context.HttpContext.RequestServices.CreateAsyncScope();
                            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            var row = await db.Users.AsNoTracking()
                                .Where(u => u.Id == userId)
                                .Select(u => new { u.PasswordChangedAt, u.CreatedAt, u.IsActive })
                                .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

                            if (row == null)
                            {
                                context.Fail("User not found.");
                                return;
                            }

                            if (!row.IsActive)
                            {
                                context.Fail("Account is disabled.");
                                return;
                            }

                            var expected = (row.PasswordChangedAt ?? row.CreatedAt).Ticks.ToString();
                            if (pwv != expected)
                                context.Fail("Session expired. Please sign in again.");
                        }
                    };
                });

            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddFixedWindowLimiter("auth", opt =>
                {
                    opt.Window = TimeSpan.FromMinutes(1);
                    opt.PermitLimit = 20;
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0;
                });

                // OWASP abuse resistance: partition by authenticated user id, else client IP.
                static string UserOrIpPartition(HttpContext ctx) =>
                    ctx.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? ctx.Connection.RemoteIpAddress?.ToString()
                    ?? "unknown";

                options.AddPolicy("messages-send", ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        UserOrIpPartition(ctx),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            Window = TimeSpan.FromMinutes(1),
                            PermitLimit = 30,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

                options.AddPolicy("course-requests-submit", ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        UserOrIpPartition(ctx),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            Window = TimeSpan.FromMinutes(1),
                            PermitLimit = 40,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

                options.AddPolicy("course-cover-upload", ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        UserOrIpPartition(ctx),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            Window = TimeSpan.FromMinutes(1),
                            PermitLimit = 30,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));
            });

            builder.Services.AddAuthorization(options =>
            {
                options.FallbackPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build();
            });

            builder.Services.AddProblemDetails();
            builder.Services.AddExceptionHandler<ProblemDetailsExceptionHandler>();

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

            app.UseExceptionHandler();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            else
            {
                app.UseHsts();
            }

            // JWT is stored in localStorage (per browser origin). In Development, launchSettings often exposes
            // both http://localhost:5190 and https://localhost:7169; forcing HTTP→HTTPS splits localStorage
            // across two origins, so navigation looks like an immediate logout. Production still redirects.
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            app.UseOwaspSecurityHeaders();

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

            app.UseRateLimiter();

            app.MapGet("/", () => Results.Redirect("/frontend/")).AllowAnonymous();

            app.MapControllers();

            app.Lifetime.ApplicationStarted.Register(() =>
                Console.WriteLine("Application startup completed."));

            var runStartupTasks = builder.Configuration.GetValue<bool>("StartupTasks:RunOnStartup");
            if (runStartupTasks)
            {
                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.Migrate();
                await MessageAiAssistBackfill.ApplyIfNeededAsync(db);
                await AdminSeeder.SeedAsync(scope.ServiceProvider);
            }

            app.Run();
        }
    }
}
