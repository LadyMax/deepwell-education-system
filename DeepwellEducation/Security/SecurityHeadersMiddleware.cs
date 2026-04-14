namespace DeepwellEducation.Security;

/// <summary>
/// OWASP-aligned response headers (defense in depth with CSP frame/base/form restrictions;
/// full script CSP would require refactoring inline scripts and CDN allowlists).
/// </summary>
public static class SecurityHeadersMiddlewareExtensions
{
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
            // Clickjacking + base tag hijack + form posting off-origin; does not block external script CDNs used by the static site.
            if (!headers.ContainsKey("Content-Security-Policy"))
            {
                headers["Content-Security-Policy"] =
                    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
            }

            await next();
        });
    }
}
