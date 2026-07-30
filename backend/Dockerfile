# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# Uses the full .NET SDK to restore deps and publish the release binary.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project file first for layer cache on restore
COPY PortfolioApi.csproj ./
RUN dotnet restore

# Copy source and publish
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# Minimal ASP.NET runtime image — no SDK, much smaller final image.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Copy only the published output
COPY --from=build /app/publish .

# Run as non-root for security
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# ASP.NET Core listens on port 8080 by default in containers
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health 2>/dev/null || exit 1

ENTRYPOINT ["dotnet", "PortfolioApi.dll"]
