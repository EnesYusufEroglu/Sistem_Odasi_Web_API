
using Microsoft.EntityFrameworkCore;
using SistemOdasiAPI.Data;

namespace SistemOdasiAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Web arayüzünün (JS) API'ye baðlanabilmesi için CORS izni ekliyoruz
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("HerKeseIzinVer", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            // MS SQL Baðlantýsýný ve DbContext'i servis olarak ekliyoruz
            builder.Services.AddDbContext<SistemDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("MsSqlBaglantisi")));

            // Add services to the container.
            builder.Services.AddControllers();
            // Arka planda çalýþan temizlik servisini projeye dahil ediyoruz
            builder.Services.AddHostedService<VeriTemizlikServisi>();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseCors("HerKeseIzinVer");
            app.UseAuthorization();
            app.MapControllers();
            app.Run();

        }
    }
}
