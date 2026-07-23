namespace SistemOdasiAPI.Models
{
    public class OrtamVerisi
    {
        public int Id { get; set; }
        public double Sicaklik { get; set; }
        public double Nem { get; set; }
        public int Gaz { get; set; }

        // Enerji Durumu
        public bool EnerjiVarMi { get; set; }

        // Hareket Algılama (True: Hareket Var, False: Güvenli)
        public bool HareketVarMi { get; set; }
        // 0 = Kapalı, 1 = Açık
        public bool KapiAcikMi { get; set; } 
        // Klima Durumu (True: Açık, False: Kapalı)
        public bool KlimaAcikMi { get; set; }
        public bool Klima2AcikMi { get; set; }   // Klima 2
        public DateTime KayitTarihi { get; set; }
    }
}