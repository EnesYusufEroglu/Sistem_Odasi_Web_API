const API_LAST_URL = "https://localhost:7014/api/Veri/son-durum";
const API_HISTORY_BASE_URL = "https://localhost:7014/api/Veri/gecmis";

let gaugeSicaklik, gaugeNem, gaugeGaz;
let historyChart;
let currentHistoryData = []; // CSV'ye dönüştürülecek verileri burada tutacağız

// --- GLOBAL DİNAMİK EŞİK DEĞERLERİ ---
let thresholds = {
    tempMax: 28.0,
    humMin: 30.0,
    humMax: 70.0,
    gasMax: 300
};

document.addEventListener("DOMContentLoaded", function () {

    // 1. LocalStorage'dan eşik değerleri yükle (Varsa)
    const savedThresholds = localStorage.getItem("system_thresholds");
    if (savedThresholds) {
        thresholds = JSON.parse(savedThresholds);
    }

    // Input alanlarını mevcut ayarlarla doldur
    document.getElementById("input-temp-max").value = thresholds.tempMax;
    document.getElementById("input-hum-min").value = thresholds.humMin;
    document.getElementById("input-hum-max").value = thresholds.humMax;
    document.getElementById("input-gas-max").value = thresholds.gasMax;

    // Göstergeleri Başlat (Renkleri dinamik yöneteceğimiz için levelColors kaldırıldı)
    gaugeSicaklik = new JustGage({
        id: "gauge-sicaklik",
        value: 0,
        min: 0,
        max: 50,
        label: "°C",
        title: "Sıcaklık",
        valueFontColor: "#f8fcfc",
        titleFontColor: "#94a3b8"
    });

    gaugeNem = new JustGage({
        id: "gauge-nem",
        value: 0,
        min: 0,
        max: 100,
        label: "%",
        title: "Nem",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    gaugeGaz = new JustGage({
        id: "gauge-gaz",
        value: 0,
        min: 0,
        max: 1023,
        label: "PPM",
        title: "Duman/Gaz",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    // 3. GRAFİK OLUŞTURMA
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Sıcaklık (°C)',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Nem (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Gaz Seviyesi (PPM)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 4. GÖRÜNÜM GEÇİŞ MANTIĞI (GÜNCELLENDİ)
    const btnAnalog = document.getElementById("btn-analog");
    const btnDigital = document.getElementById("btn-digital");
    const btnSettings = document.getElementById("btn-settings");

    const analogViews = document.querySelectorAll(".analog-view");
    const digitalView = document.querySelector(".digital-view-container");
    const settingsView = document.getElementById("settings-card");

    btnAnalog.addEventListener("click", () => {
        btnAnalog.classList.add("active");
        btnDigital.classList.remove("active");
        btnSettings.classList.remove("active");
        analogViews.forEach(el => el.classList.remove("hidden"));
        digitalView.classList.add("hidden");
        settingsView.classList.add("hidden");
    });

    btnDigital.addEventListener("click", () => {
        btnDigital.classList.add("active");
        btnAnalog.classList.remove("active");
        btnSettings.classList.remove("active");
        analogViews.forEach(el => el.classList.add("hidden"));
        digitalView.classList.remove("hidden");
        settingsView.classList.add("hidden");
    });

    btnSettings.addEventListener("click", () => {
        btnSettings.classList.add("active");
        btnAnalog.classList.remove("active");
        btnDigital.classList.remove("active");
        analogViews.forEach(el => el.classList.add("hidden"));
        digitalView.classList.add("hidden");
        settingsView.classList.remove("hidden");
    });

    // 5. AYARLARI KAYDETME TETİKLEYİCİSİ
    document.getElementById("btn-save-settings").addEventListener("click", () => {
        const tempMaxVal = parseFloat(document.getElementById("input-temp-max").value);
        const humMinVal = parseFloat(document.getElementById("input-hum-min").value);
        const humMaxVal = parseFloat(document.getElementById("input-hum-max").value);
        const gasMaxVal = parseInt(document.getElementById("input-gas-max").value);

        if (isNaN(tempMaxVal) || isNaN(humMinVal) || isNaN(humMaxVal) || isNaN(gasMaxVal)) {
            alert("Lütfen tüm alanları geçerli sayılarla doldurun!");
            return;
        }

        // Değerleri güncelle
        thresholds.tempMax = tempMaxVal;
        thresholds.humMin = humMinVal;
        thresholds.humMax = humMaxVal;
        thresholds.gasMax = gasMaxVal;

        // Tarayıcı belleğine kaydet
        localStorage.setItem("system_thresholds", JSON.stringify(thresholds));

        // Arayüzü hemen güncelle
        anlikVerileriGetir();

        alert("Eşik değerleri başarıyla güncellendi ve kaydedildi!");

        // Analog ekrana geri dön
        btnAnalog.click();
    });

    const selectElement = document.getElementById("data-limit-select");
    selectElement.addEventListener("change", function () {
        grafikVerileriniGuncelle(this.value);
    });

    anlikVerileriGetir();
    grafikVerileriniGuncelle(selectElement.value);

    setInterval(() => {
        anlikVerileriGetir();
        const currentLimit = document.getElementById("data-limit-select").value;
        grafikVerileriniGuncelle(currentLimit);
    }, 1000);

    // --- CSV İNDİRME TETİKLEYİCİSİ ---
    document.getElementById("btn-download-csv").addEventListener("click", function () {
        if (currentHistoryData.length === 0) {
            alert("İndirilecek geçmiş veri bulunamadı!");
            return;
        }
        exportToCSV(currentHistoryData);
    });
});

function anlikVerileriGetir() {
    const statusBadge = document.getElementById("connection-status");

    fetch(API_LAST_URL)
        .then(response => {
            if (!response.ok) throw new Error("Veri yok");
            return response.json();
        })
        .then(data => {
            statusBadge.textContent = "SİSTEM ÇEVRİMİÇİ";
            statusBadge.className = "status-badge online";

            // Kadranları Yenile
            gaugeSicaklik.refresh(data.sicaklik);
            gaugeNem.refresh(data.nem);
            gaugeGaz.refresh(data.gaz);

            // 1. Durum Analizlerini Merkezi Motordan Al
            const analizTemp = durumAnaliziYap('sicaklik', data.sicaklik);
            const analizNem = durumAnaliziYap('nem', data.nem);
            const analizGaz = durumAnaliziYap('gaz', data.gaz);
            const analizEnerji = durumAnaliziYap('enerji', data.enerjiVarMi);
            const analizHareket = durumAnaliziYap('hareket', data.hareketVarMi);
            const analizKlima = durumAnaliziYap('klima', data.klimaAcikMi, data.sicaklik);

            // 2. ANALOG KARTLARI GÜNCELLE
            // Sıcaklık Kartı
            const cardSicaklik = document.getElementById("card-sicaklik");
            const textSicaklik = document.getElementById("text-sicaklik");
            const titleSicaklik = cardSicaklik.querySelector("h3"); // Başlığı yakaladık

            textSicaklik.textContent = analizTemp.cardText;
            textSicaklik.style.color = analizTemp.alarm ? "#ef4444" : "#10b981";
            if (analizTemp.alarm) {
                cardSicaklik.classList.add("analog-danger");
                titleSicaklik.style.color = "#ef4444"; // Başlık Kırmızı
            } else {
                cardSicaklik.classList.remove("analog-danger");
                titleSicaklik.style.color = "#66e3ff"; // Başlık Varsayılan Turkuaz
            }

            // Nem Kartı
            const cardNem = document.getElementById("card-nem");
            const textNem = document.getElementById("text-nem");
            const titleNem = cardNem.querySelector("h3");

            textNem.textContent = analizNem.cardText;
            textNem.style.color = analizNem.warning ? "#fbbf24" : "#10b981";
            if (analizNem.warning) {
                cardNem.classList.add("analog-warning");
                titleNem.style.color = "#fbbf24"; // Başlık Sarı/Turuncu
            } else {
                cardNem.classList.remove("analog-warning");
                titleNem.style.color = "#66e3ff";
            }

            // Gaz Kartı
            const cardGaz = document.getElementById("card-gaz");
            const textGaz = document.getElementById("text-gaz");
            const titleGaz = cardGaz.querySelector("h3");

            textGaz.textContent = analizGaz.cardText;
            textGaz.style.color = analizGaz.alarm ? "#ef4444" : "#10b981";
            if (analizGaz.alarm) {
                cardGaz.classList.add("analog-danger");
                titleGaz.style.color = "#ef4444"; // Başlık Kırmızı
            } else {
                cardGaz.classList.remove("analog-danger");
                titleGaz.style.color = "#66e3ff";
            }

            // Enerji Kartı
            const cardEnerji = document.getElementById("card-enerji");
            const iconEnerji = document.getElementById("icon-enerji");
            const textEnerji = document.getElementById("text-enerji");
            const titleEnerji = cardEnerji.querySelector("h3");

            iconEnerji.textContent = data.enerjiVarMi ? "⚡" : "🔋";
            textEnerji.textContent = analizEnerji.cardText;
            textEnerji.style.color = analizEnerji.alarm ? "#ef4444" : "#10b981";
            if (analizEnerji.alarm) {
                cardEnerji.classList.add("analog-danger");
                titleEnerji.style.color = "#ef4444"; // Başlık Kırmızı
            } else {
                cardEnerji.classList.remove("analog-danger");
                titleEnerji.style.color = "#66e3ff";
            }

            // Hareket Kartı
            const cardHareket = document.getElementById("card-hareket");
            const iconHareket = document.getElementById("icon-hareket");
            const textHareket = document.getElementById("text-hareket");
            const titleHareket = cardHareket.querySelector("h3");

            iconHareket.textContent = data.hareketVarMi ? "🏃" : "🟢";
            textHareket.textContent = analizHareket.cardText;
            textHareket.style.color = data.hareketVarMi ? "#ef4444" : "#10b981";
            if (analizHareket.alarm) {
                cardHareket.classList.add("analog-danger");
                titleHareket.style.color = "#ef4444"; // Başlık Kırmızı
            } else {
                cardHareket.classList.remove("analog-danger");
                titleHareket.style.color = "#66e3ff";
            }

            // Klima Kartı
            const cardKlima = document.getElementById("card-klima");
            const iconKlima = document.getElementById("icon-klima");
            const textKlima = document.getElementById("text-klima");
            const titleKlima = cardKlima.querySelector("h3");

            iconKlima.textContent = data.klimaAcikMi ? "❄️" : (analizKlima.alarm ? "⚠️" : "💤");
            textKlima.textContent = analizKlima.cardText;
            textKlima.style.color = data.klimaAcikMi ? "#10b981" : (analizKlima.alarm ? "#ef4444" : "#94a3b8");
            if (analizKlima.alarm) {
                cardKlima.classList.add("analog-danger");
                titleKlima.style.color = "#ef4444"; // Başlık Kırmızı
            } else {
                cardKlima.classList.remove("analog-danger");
                titleKlima.style.color = "#66e3ff";
            }

            // 3. DİJİTAL TABLOYU GÜNCELLE
            document.getElementById("table-temp").textContent = `${data.sicaklik.toFixed(1)} °C`;
            document.getElementById("table-temp-status").textContent = analizTemp.tableText;
            document.getElementById("table-temp-status").className = analizTemp.cls;

            document.getElementById("table-hum").textContent = `${data.nem.toFixed(1)} %`;
            document.getElementById("table-hum-status").textContent = analizNem.tableText;
            document.getElementById("table-hum-status").className = analizNem.cls;

            document.getElementById("table-gas").textContent = `${data.gaz} PPM`;
            document.getElementById("table-gas-status").textContent = analizGaz.tableText;
            document.getElementById("table-gas-status").className = analizGaz.cls;

            document.getElementById("table-energy").textContent = analizEnerji.display;
            document.getElementById("table-energy-status").textContent = analizEnerji.tableText;
            document.getElementById("table-energy-status").className = analizEnerji.cls;

            document.getElementById("table-movement").textContent = data.hareketVarMi ? "HAREKET ALGILANDI" : "Güvenli";
            document.getElementById("table-movement-status").textContent = analizHareket.tableText;
            document.getElementById("table-movement-status").className = analizHareket.cls;

            document.getElementById("table-klima").textContent = analizKlima.display;
            document.getElementById("table-klima-status").textContent = analizKlima.tableText;
            document.getElementById("table-klima-status").className = analizKlima.cls;

            const tarih = new Date(data.kayitTarihi);
            document.getElementById("last-update").textContent = tarih.toLocaleTimeString();
        })
        .catch(error => {
            statusBadge.textContent = "BAĞLANTI HATASI / VERİ YOK";
            statusBadge.className = "status-badge offline";
        });
}

function grafikVerileriniGuncelle(limit) {
    fetch(`${API_HISTORY_BASE_URL}?limit=${limit}`)
        .then(response => {
            if (!response.ok) throw new Error("Geçmiş veri çekilemedi");
            return response.json();
        })
        .then(siraliVeri => {
            currentHistoryData = siraliVeri; // CSV için veriyi sakla
            const zamanEtiketleri = siraliVeri.map(x => {
                const d = new Date(x.kayitTarihi);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            });

            const sicakliklar = siraliVeri.map(x => x.sicaklik);
            const nemler = siraliVeri.map(x => x.nem);
            const gazlar = siraliVeri.map(x => x.gaz);

            historyChart.data.labels = zamanEtiketleri;
            historyChart.data.datasets[0].data = sicakliklar;
            historyChart.data.datasets[1].data = nemler;
            historyChart.data.datasets[2].data = gazlar;

            historyChart.update();
        })
        .catch(error => console.error("Grafik güncelleme hatası:", error));
}

// --- VERİLERİ EXCEL UYUMLU CSV DOSYASINA DÖNÜŞTÜRÜP İNDİREN FONKSİYON ---
function exportToCSV(dataList) {
    // Excel'in sütunları doğru ayırması için noktalı virgül (;) kullanıyoruz.
    // Başlık satırı:
    let csvContent = "Kayit Tarihi;Sicaklik (°C);Nem (%);Gaz Seviyesi (PPM);Enerji Durumu;Kapi Durumu\r\n";

    // Veri satırlarını döngüyle ekliyoruz:
    dataList.forEach(item => {
        let tarih = new Date(item.kayitTarihi).toLocaleString('tr-TR');
        let enerji = item.enerjiVarMi ? "Sebeke" : "UPS/Jenerator";
        let kapi = item.kapiAcikMi ? "ACIK (ALARM)" : "KAPALI";

        // JS küsuratlı sayıların noktalarını Excel virgülüyle değiştirmek gerekebilir (.toFixed kullanarak temiz yazıyoruz)
        let sicaklik = item.sicaklik.toFixed(1).replace('.', ',');
        let nem = item.nem.toFixed(1).replace('.', ',');

        csvContent += `${tarih};${sicaklik};${nem};${item.gaz};${enerji};${kapi}\r\n`;
    });

    // Türkçe karakterlerin Excel'de düzgün açılması için UTF-8 BOM ekliyoruz (\uFEFF)
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Geçici bir gizli link oluşturup tarayıcıya tıklatıyoruz
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Dosya adı dinamik olarak o anın tarihiyle kaydolur
    const dosyaTarihi = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Sistem_Odasi_Rapor_${dosyaTarihi}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- TAM MERKEZİ ALARM MOTORU ---
function durumAnaliziYap(tip, veri, sicaklik) {
    switch (tip) {
        case 'sicaklik':
            if (veri > thresholds.tempMax) {
                return {
                    alarm: true,
                    tableText: `⚠️ LİMİT DIŞI (> ${thresholds.tempMax}°C)`,
                    cardText: `KRİTİK SICAKLIK (> ${thresholds.tempMax}°C)`,
                    cls: "text-red-alarm"
                };
            }
            return { alarm: false, tableText: "✅ Stabil", cardText: "Stabil / Normal", cls: "text-green-stable" };

        case 'nem':
            if (veri < thresholds.humMin || veri > thresholds.humMax) {
                return {
                    warning: true,
                    tableText: `⚠️ LİMİT DIŞI (< ${thresholds.humMin}% veya > ${thresholds.humMax}%)`,
                    cardText: "NEM LİMİT DIŞI!",
                    cls: "text-yellow-alarm"
                };
            }
            return { alarm: false, tableText: "✅ Stabil", cardText: "Stabil / Normal", cls: "text-green-stable" };

        case 'gaz':
            if (veri > thresholds.gasMax) {
                return {
                    alarm: true,
                    tableText: `🚨 TEHLİKELİ SEVİYE (> ${thresholds.gasMax} PPM)`,
                    cardText: "TEHLİKELİ GAZ SIZINTISI!",
                    cls: "text-red-alarm"
                };
            }
            return { alarm: false, tableText: "✅ Temiz", cardText: "Temiz / Güvenli", cls: "text-green-stable" };

        case 'enerji':
            if (veri) {
                return {
                    alarm: false,
                    tableText: "🔌 Kesintisiz",
                    cardText: "Şebeke (Kesintisiz)",
                    cls: "text-green-stable",
                    display: "Şebeke"
                };
            }
            return {
                alarm: true,
                tableText: "🔋 ELEKTRİK KESİNTİSİ!",
                cardText: "JENERATÖR / UPS DEVREDE!",
                cls: "text-red-alarm",
                display: "UPS / Jeneratör"
            };

        case 'hareket':
            if (veri) {
                return {
                    alarm: true,
                    tableText: "🚨 YETKİSİZ GİRİŞ!",
                    cardText: "HAREKET ALGILANDI!",
                    cls: "text-red-alarm"
                };
            }
            return { alarm: false, tableText: "✅ Güvenli", cardText: "Oda Boş / Güvenli", cls: "text-green-stable" };

        case 'klima':
            if (veri) {
                return {
                    alarm: false,
                    tableText: "✅ Çalışıyor",
                    cardText: "Klima Aktif (Soğutuyor)",
                    cls: "text-green-stable",
                    display: "Açık"
                };
            }
            if (sicaklik > thresholds.tempMax) {
                return {
                    alarm: true,
                    tableText: "🚨 RİSK: YÜKSEK SICAKLIK & KLİMA KAPALI!",
                    cardText: "KAPALI / SICAKLIK KRİTİK!",
                    cls: "text-red-alarm",
                    display: "KAPALI"
                };
            }
            return {
                alarm: false,
                tableText: "💤 Beklemede",
                cardText: "Kapalı",
                cls: "text-green-stable",
                display: "KAPALI"
            };

        default:
            return { alarm: false, tableText: "--", cardText: "--", cls: "" };
    }
}