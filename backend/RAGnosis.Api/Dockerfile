FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY RAGnosis.Api/RAGnosis.Api.csproj RAGnosis.Api/
RUN dotnet restore RAGnosis.Api/RAGnosis.Api.csproj
COPY RAGnosis.Api/ RAGnosis.Api/
RUN dotnet publish RAGnosis.Api/RAGnosis.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Native dependencies for Tesseract OCR and OpenCvSharp, plus curl for the health probe.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libleptonica-dev libtesseract-dev tesseract-ocr-eng \
        libgdiplus libc6-dev libgl1 libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Run as an unprivileged user: this process parses untrusted PDFs and images through native
# libraries, so a parser bug should not land an attacker on a root shell. The uploads
# directory is created and handed over here because it is a mount point at runtime.
RUN groupadd --system --gid 64198 ragnosis \
    && useradd --system --uid 64198 --gid ragnosis --no-create-home ragnosis \
    && mkdir -p /app/uploads \
    && chown -R ragnosis:ragnosis /app

USER ragnosis

EXPOSE 8080

# Readiness rather than liveness: this reports unhealthy when MongoDB is unreachable, which
# is the state in which the API is running but cannot actually serve a request.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "RAGnosis.Api.dll"]
