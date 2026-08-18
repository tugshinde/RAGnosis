using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Services;
using RAGnosis.Api.Services.Abstractions;

// Preserve short claim names ("sub", "role", "user_id") instead of letting the handler
// rewrite them to the long WS-Federation URIs. The client and CurrentUser both read the short form.
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- configuration
builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection(MongoSettings.SectionName));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<GroqSettings>(builder.Configuration.GetSection(GroqSettings.SectionName));
builder.Services.Configure<StorageSettings>(builder.Configuration.GetSection(StorageSettings.SectionName));
builder.Services.Configure<EmbeddingSettings>(builder.Configuration.GetSection(EmbeddingSettings.SectionName));
builder.Services.Configure<OcrSettings>(builder.Configuration.GetSection(OcrSettings.SectionName));

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

// ---------------------------------------------------------------- json contract
builder.Services
    .AddControllers()
    // HospitalController reuses ReportsController's upload pipeline, so controllers
    // must be resolvable from the container rather than only activated by MVC.
    .AddControllersAsServices()
    .AddJsonOptions(options =>
    {
        // The React client speaks snake_case; C# stays PascalCase.
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
    });

// Model-validation failures use the same error envelope as everything else.
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kv => kv.Value?.Errors.Count > 0)
            .ToDictionary(
                kv => JsonNamingPolicy.SnakeCaseLower.ConvertName(kv.Key),
                kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

        // Surface the first concrete message, since the client shows a single toast.
        var first = errors.Values.FirstOrDefault()?.FirstOrDefault() ?? "The request failed validation.";

        return new BadRequestObjectResult(new ApiError(first) { Errors = errors });
    };
});

// ---------------------------------------------------------------- data & services
builder.Services.AddSingleton<MongoContext>();
builder.Services.AddSingleton<MongoIndexInitializer>();
builder.Services.AddSingleton<KnowledgeSeeder>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

builder.Services.AddSingleton<FileStorageService>();
builder.Services.AddSingleton<IFileStorageService>(sp => sp.GetRequiredService<FileStorageService>());

builder.Services.AddSingleton<IImagePreprocessor, OpenCvImagePreprocessor>();
builder.Services.AddSingleton<ITextExtractionService, TextExtractionService>();
builder.Services.AddSingleton<IParameterExtractionService, ParameterExtractionService>();
builder.Services.AddSingleton<IRecommendationService, RecommendationService>();

// One ONNX session is loaded for the lifetime of the process.
builder.Services.AddSingleton<IEmbeddingService, OnnxEmbeddingService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();
builder.Services.AddScoped<ReportAnalysisService>();

builder.Services.AddHttpClient<ILlmService, GroqLlmService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

// ---------------------------------------------------------------- auth
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = TokenService.BuildSigningKey(jwtSettings.Key),
            // Tokens expire when they say they do, rather than five minutes later.
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = "role",
            NameClaimType = "email"
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------- cors
const string CorsPolicy = "ragnosis-spa";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];

builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

// ---------------------------------------------------------------- swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RAGnosis API",
        Version = "v1",
        Description = "AI-powered medical report analysis platform."
    });

    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT returned by /api/auth/login.",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };

    options.AddSecurityDefinition("Bearer", scheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = Array.Empty<string>() });
});

var app = builder.Build();

// ---------------------------------------------------------------- pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/swagger/v1/swagger.json", "RAGnosis API v1"));
}
else
{
    app.UseHsts();
}

app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Kept at the API root so the Vite dev server and the browser can both reach it.
app.MapGet("/health", (IEmbeddingService embeddings, ILlmService llm) => Results.Ok(new
{
    status = "ok",
    utc = DateTime.UtcNow,
    embeddings_available = embeddings.IsAvailable,
    llm_configured = llm.IsConfigured
})).AllowAnonymous();

// ---------------------------------------------------------------- startup work
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<MongoIndexInitializer>().EnsureIndexesAsync();
    await scope.ServiceProvider.GetRequiredService<KnowledgeSeeder>().SeedAsync();
}

app.Run();
