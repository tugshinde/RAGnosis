namespace RAGnosis.Api.Configuration;

/// <summary>Named rate-limiting policies, shared between Program and the controllers that opt in.</summary>
public static class RateLimitPolicies
{
    /// <summary>Credential endpoints: capped per client IP to blunt brute-force attempts.</summary>
    public const string Auth = "auth";
}

/// <summary>
/// Fail-fast configuration checks. A misconfigured deployment should refuse to start rather
/// than come up quietly with a forgeable signing key, which would let anyone mint a token
/// for any role and read every patient's clinical records.
/// </summary>
public static class StartupValidation
{
    /// <summary>
    /// Signing keys that ship in the repository (appsettings.Development.json and the
    /// docker-compose fallback). Anyone can read these, so they are development-only.
    /// </summary>
    private static readonly string[] PublishedKeys =
    [
        "ragnosis-local-development-signing-key-change-in-production"
    ];

    public static void Validate(IConfiguration configuration, IHostEnvironment environment, ILogger logger)
    {
        var jwt = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

        if (string.IsNullOrWhiteSpace(jwt.Key))
            throw new InvalidOperationException(
                "Jwt:Key is not configured. Set the Jwt__Key environment variable before starting the API.");

        var isPublished = PublishedKeys.Contains(jwt.Key, StringComparer.Ordinal);

        if (environment.IsDevelopment())
        {
            if (isPublished)
                logger.LogInformation("Using the committed development signing key. Set Jwt__Key before deploying.");
            return;
        }

        // Outside Development every weakness below is a live vulnerability, not a nuisance.
        if (isPublished)
            throw new InvalidOperationException(
                $"Jwt:Key is set to the published development key while running in {environment.EnvironmentName}. " +
                "Anyone could forge tokens for any role. Set Jwt__Key to a private secret of at least 32 characters.");

        if (jwt.Key.Length < 32)
            throw new InvalidOperationException(
                $"Jwt:Key is {jwt.Key.Length} characters. Use at least 32 characters outside Development — " +
                "shorter secrets are stretched to the HS256 minimum but carry no more entropy than what was supplied.");

        var groq = configuration.GetSection(GroqSettings.SectionName).Get<GroqSettings>() ?? new GroqSettings();
        if (string.IsNullOrWhiteSpace(groq.ApiKey))
            logger.LogWarning("Groq:ApiKey is not configured. The chatbot will return 503 until it is set.");
    }
}
