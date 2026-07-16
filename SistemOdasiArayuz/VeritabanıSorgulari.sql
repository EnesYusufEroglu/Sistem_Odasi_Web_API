-- Tüm Kayıtları En Yeni Olandan En Eski Olana Doğru Listele
SELECT * FROM OrtamVerileri 
ORDER BY KayitTarihi DESC;

-- Belirli Bir Değerin Üzerindeki Tehlikeli Anları Bul
SELECT * FROM OrtamVerileri 
WHERE Sicaklik > 25.0 OR Gaz > 300
ORDER BY KayitTarihi DESC;

-- Sadece Son 10 Kaydı Getir
SELECT TOP 10 * FROM OrtamVerileri 
ORDER BY KayitTarihi DESC;