using Microsoft.EntityFrameworkCore;
using SistemOdasiAPI.Models;

namespace SistemOdasiAPI.Data
{
    public class SistemDbContext : DbContext
    {
        public SistemDbContext(DbContextOptions<SistemDbContext> options) : base(options)
        {
        }

        // Bu özellik, MS SQL tarafında "OrtamVerileri" adında bir tablo oluşturulmasını sağlar
        public DbSet<OrtamVerisi> OrtamVerileri { get; set; }
    }
}