using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SistemOdasiAPI.Data;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SistemOdasiAPI
{
    public class VeriTemizlikServisi : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<VeriTemizlikServisi> _logger;

        public VeriTemizlikServisi(IServiceProvider serviceProvider, ILogger<VeriTemizlikServisi> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Veri Temizlik Servisi baslatildi.");

            // Uygulama açık olduğu sürece döngü devam eder
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Veri temizlik islemi baslatiliyor...");

                    // BackgroundService 'Singleton' çalıştığı için, 'Scoped' olan DbContext'e erişmek için scope oluşturuyoruz
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<SistemDbContext>();

                        // 30 gün öncesinin sınır tarihini belirle
                        DateTime otuzGunOnce = DateTime.Now.AddDays(-30);

                        // 30 günden eski olan tüm kayıtları bul
                        var eskiVeriler = context.OrtamVerileri
                                                 .Where(x => x.KayitTarihi < otuzGunOnce);

                        int silinenAdet = eskiVeriler.Count();

                        if (silinenAdet > 0)
                        {
                            context.OrtamVerileri.RemoveRange(eskiVeriler);
                            await context.SaveChangesAsync(stoppingToken);
                            _logger.LogInformation($"[TEMİZLİK] {silinenAdet} adet 30 günden eski veri basariyla silindi.");
                        }
                        else
                        {
                            _logger.LogInformation("[TEMİZLİK] 30 günden eski silinecek veri bulunamadi.");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Veri temizleme sirasinda hata olustu: {ex.Message}");
                }

                // Görevi her 24 saatte bir çalışacak şekilde uykudan uyandır (Günde 1 kez çalışır)
                // Test etmek istersen TimeSpan.FromMinutes(5) yapıp 5 dakikada bir çalıştırabilirsin.
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }
    }
}