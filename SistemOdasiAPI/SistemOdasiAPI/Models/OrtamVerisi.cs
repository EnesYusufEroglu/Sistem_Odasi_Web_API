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

        // Kapı Durumu (True: Açık, False: Kapalı)
        public bool KapiAcikMi { get; set; }
        public DateTime KayitTarihi { get; set; }
    }
}