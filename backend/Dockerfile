# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# Uses the full .NET SDK to restore deps and publish the release binary.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy only the published output
COPY --from=build /app/publish .

# Install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Grant non-root user ownership of /app so it can write projects-cache.json
RUN chown -R $APP_UID:$APP_UID /app

# Use built-in non-root user from official .NET image
USER $APP_UID

# ASP.NET Core listens on port 8080 by default in containers
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "PortfolioApi.dll"]
