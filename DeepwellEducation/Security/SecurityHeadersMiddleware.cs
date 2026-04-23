using Microsoft.AspNetCore.Hosting;

namespace DeepwellEducation.Security;

/// <summary>
/// OWASP-aligned response headers. Production uses a stricter CSP allowlist; Development keeps a minimal CSP so Swagger UI and local tooling keep working.
/// </summary>
public static class SecurityHeadersMiddlewareExtensions
{
    private const string CspDevelopment =
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

    /// <summary>Aligned with current static frontend: local scripts, jQuery/Bootstrap CDNs, Font Awesome, Google Fonts.</summary>
    private const string CspProduction =
        "default-src 'self'; " +
        "script-src 'self' https://code.jquery.com https://stackpath.bootstrapcdn.com; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
        "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'";

    public static IApplicationBuilder UseOwaspSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] =
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

            var env = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
            if (!headers.ContainsKey("Content-Security-Policy"))
                headers["Content-Security-Policy"] = env.IsDevelopment() ? CspDevelopment : CspProduction;

            if (!env.IsDevelopment() && context.Request.IsHttps)
            {
                headers["Cross-Origin-Opener-Policy"] = "same-origin";
            }

            await next();
        });
    }
}
