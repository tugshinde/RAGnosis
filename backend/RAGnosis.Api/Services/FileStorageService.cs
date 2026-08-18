using Microsoft.Extensions.Options;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Stores uploads on the local filesystem under {UploadRoot}/{userId}/{guid}{ext}.
/// Swapping this for blob storage only means reimplementing this interface.
/// </summary>
public sealed class FileStorageService : IFileStorageService
{
    private readonly StorageSettings _settings;
    private readonly string _root;

    public FileStorageService(IOptions<StorageSettings> options, IWebHostEnvironment env)
    {
        _settings = options.Value;
        _root = Path.IsPathRooted(_settings.UploadRoot)
            ? _settings.UploadRoot
            : Path.Combine(env.ContentRootPath, _settings.UploadRoot);
        Directory.CreateDirectory(_root);
    }

    public bool IsAllowed(IFormFile file, out string? reason)
    {
        if (file.Length == 0)
        {
            reason = "The uploaded file is empty.";
            return false;
        }

        if (file.Length > _settings.MaxFileSizeBytes)
        {
            reason = $"File exceeds the {_settings.MaxFileSizeBytes / (1024 * 1024)} MB limit.";
            return false;
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_settings.AllowedExtensions.Contains(ext))
        {
            reason = $"Unsupported file type '{ext}'. Allowed: {string.Join(", ", _settings.AllowedExtensions)}.";
            return false;
        }

        reason = null;
        return true;
    }

    public async Task<(string StoredPath, long Length)> SaveAsync(IFormFile file, string userId, CancellationToken ct = default)
    {
        var safeUser = Path.GetFileName(userId);
        var dir = Path.Combine(_root, safeUser);
        Directory.CreateDirectory(dir);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var name = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, name);

        await using (var stream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream, ct);
        }

        // Store a root-relative path so the records survive a change of upload directory.
        var relative = Path.GetRelativePath(_root, fullPath).Replace('\\', '/');
        return (relative, file.Length);
    }

    public Task<Stream?> OpenReadAsync(string storedPath, CancellationToken ct = default)
    {
        var full = ResolveFullPath(storedPath);
        if (full is null || !File.Exists(full))
            return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public void Delete(string storedPath)
    {
        var full = ResolveFullPath(storedPath);
        if (full is not null && File.Exists(full))
            File.Delete(full);
    }

    /// <summary>Resolves a stored relative path and refuses anything that escapes the upload root.</summary>
    public string? ResolveFullPath(string storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath)) return null;

        var combined = Path.GetFullPath(Path.Combine(_root, storedPath));
        var rootFull = Path.GetFullPath(_root);

        return combined.StartsWith(rootFull, StringComparison.Ordinal) ? combined : null;
    }
}
