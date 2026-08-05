using System;

namespace SistemOdasiAPI.Models
{
    public class OrtamVerisi
    {
        public int Id { get; set; }
        public double Sicaklik { get; set; }
        public double Nem { get; set; }
        public int Gaz { get; set; }

        public bool EnerjiVarMi { get; set; }
        public bool HareketVarMi { get; set; }
        public bool KapiAcikMi { get; set; }

        // C# API'nizde 'KlimaAcikMi' yazıyor, ESP32 ve app.js 'Klima1AcikMi' bekliyor
        public bool Klima1AcikMi { get; set; }
        public bool Klima2AcikMi { get; set; }

        // YENİ EKLENEN: Su Baskını Sensörü
        public bool SuBaskiniVarMi { get; set; }

        public DateTime KayitTarihi { get; set; }
    }
}