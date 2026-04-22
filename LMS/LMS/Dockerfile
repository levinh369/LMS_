# Sử dụng hình ảnh SDK để build code
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy file project và restore các gói NuGet
COPY ["LMS.csproj", "./"]
RUN dotnet restore "./LMS.csproj"

# Copy toàn bộ code và build
COPY . .
RUN dotnet publish "./LMS.csproj" -c Release -o /app/publish

# Sử dụng hình ảnh Runtime để chạy app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render dùng cổng 8080 mặc định cho Docker
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "LMS.dll"]