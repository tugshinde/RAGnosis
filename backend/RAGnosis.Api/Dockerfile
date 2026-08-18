FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY RAGnosis.Api/RAGnosis.Api.csproj RAGnosis.Api/
RUN dotnet restore RAGnosis.Api/RAGnosis.Api.csproj
COPY RAGnosis.Api/ RAGnosis.Api/
RUN dotnet publish RAGnosis.Api/RAGnosis.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Native dependencies for Tesseract OCR and OpenCvSharp.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libleptonica-dev libtesseract-dev tesseract-ocr-eng \
        libgdiplus libc6-dev libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "RAGnosis.Api.dll"]
