using Microsoft.AspNetCore.Mvc;
using SistemOdasiAPI.Data;
using SistemOdasiAPI.Models;
using System;
using System.Linq;

namespace SistemOdasiAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Erişim adresimiz: http://localhost:5000/api/veri (veya projenizin portu)
    public class VeriController : ControllerBase
    {
        private readonly SistemDbContext _context;

        // Dependency Injection (Bağımlılık Enjeksiyonu) ile MS SQL köprümüzü içeri alıyoruz
        public VeriController(SistemDbContext context)
        {
            _context = context;
        }

        // 1. ESP32'DEN VERİ ALMA KAPISI (HTTP POST)
        // Adres: POST api/veri
        [HttpPost]
        public IActionResult VeriKaydet([FromBody] OrtamVerisi gelenVeri)
        {
            if (gelenVeri == null)
            {
                return BadRequest("Geçersiz veya boş veri paketi.");
            }

            try
            {
                // ESP32'den gelen veriye o anki sunucu saatini damgalıyoruz
                gelenVeri.KayitTarihi = DateTime.Now;

                // Entity Framework aracılığıyla veriyi MS SQL'e ekliyoruz
                _context.OrtamVerileri.Add(gelenVeri);
                _context.SaveChanges(); // Değişiklikleri fiziksel veri tabanına kaydeder

                // Terminale/Konsola log basıyoruz (Çalıştığını görmek için)
                Console.WriteLine($"[BAŞARILI] {DateTime.Now} - Veri MS SQL'e yazıldı: T: {gelenVeri.Sicaklik}°C, N: %{gelenVeri.Nem}, G: %{gelenVeri.Gaz}");

                return Ok(new { mesaj = "Veri basariyla kaydedildi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Veritabanı hatası: {ex.Message}");
            }
        }

        // 2. WEB ARAYÜZÜNE VERİ GÖNDERME KAPISI (HTTP GET)
        // Adres: GET api/veri/son-durum
        [HttpGet("son-durum")]
        public IActionResult SonDurumuGetir()
        {
            try
            {
                // MS SQL'deki kayıtları tarihe göre tersten sıralayıp en son eklenen 1 tanesini getirir
                var sonKayit = _context.OrtamVerileri
                                       .OrderByDescending(x => x.KayitTarihi)
                                       .FirstOrDefault();

                if (sonKayit == null)
                {
                    return NotFound("Veri tabanında henüz kayıtlı veri bulunmuyor.");
                }

                return Ok(sonKayit); // Web arayüzüne JSON formatında fırlatır
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Veri çekme hatası: {ex.Message}");
            }
        }

        // 3. DİNAMİK GEÇMİŞ VERİ LİSTELEME KAPISI (HTTP GET)
        // Örnek Kullanımlar: 
        // GET api/veri/gecmis?limit=50  (Son 50 veriyi getirir)
        // GET api/veri/gecmis?limit=-1  (Son 24 saatin tüm verilerini getirir)
        [HttpGet("gecmis")]
        public IActionResult GecmisVerileriGetir([FromQuery] int limit = 100)
        {
            try
            {
                IQueryable<OrtamVerisi> sorgu = _context.OrtamVerileri;

                if (limit == -1)
                {
                    // Son 24 saat filtresi
                    DateTime yirmidortSaatOnce = DateTime.Now.AddDays(-1);
                    sorgu = sorgu.Where(x => x.KayitTarihi >= yirmidortSaatOnce);
                }

                // Önce en yeniye göre sıralayıp limiti uyguluyoruz
                var sonucSorgu = sorgu.OrderByDescending(x => x.KayitTarihi);

                List<OrtamVerisi> veriler;
                if (limit > 0)
                {
                    veriler = sonucSorgu.Take(limit).ToList();
                }
                else
                {
                    veriler = sonucSorgu.ToList();
                }

                // Grafikte soldan sağa kronolojik aksın diye verileri frontend'e göndermeden önce tarihe göre yeniden sıralıyoruz
                var kronolojikVeriler = veriler.OrderBy(x => x.KayitTarihi).ToList();

                return Ok(kronolojikVeriler);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Hata: {ex.Message}");
            }
        }
    }
}