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
        title: "Sıcaklık",
        label: "°C",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    gaugeNem = new JustGage({
        id: "gauge-nem",
        value: 0,
        min: 0,
        max: 100,
        title: "Nem",
        label: "%",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    gaugeGaz = new JustGage({
        id: "gauge-gaz",
        value: 0,
        min: 0,
        max: 1023,
        title: "Duman/Gaz",
        label: "PPM",
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
    }, 2000);

    // --- CSV İNDİRME TETİKLEYİCİSİ ---
    document.getElementById("btn-download-csv").addEventListener("click", function() {
        if (currentHistoryData.length === 0) {
            alert("İndirilecek geçmiş veri bulunamadı!");
            return;
        }
        exportToCSV(currentHistoryData);
    });
});

function anlikVerileriGetir() {
    const statusBadge = document.getElementById("connection-status");
    const energyBadge = document.getElementById("energy-badge");

    fetch(API_LAST_URL)
        .then(response => {
            if (!response.ok) throw new Error("Veri yok");
            return response.json();
        })
        .then(data => {
            statusBadge.textContent = "SİSTEM ÇEVRİMİÇİ";
            statusBadge.className = "status-badge online";

            gaugeSicaklik.refresh(data.sicaklik);
            gaugeNem.refresh(data.nem);
            gaugeGaz.refresh(data.gaz);

            // --- ANALOG KART DİNAMİK ALARM KONTROLLERİ (EŞİKLER DİNAMİK YAPILDI) ---
            const cardSicaklik = document.getElementById("card-sicaklik");
            const cardNem = document.getElementById("card-nem");
            const cardGaz = document.getElementById("card-gaz");

            // Sıcaklık Kontrolü
            if (data.sicaklik > thresholds.tempMax) {
                cardSicaklik.classList.add("analog-danger");
            } else {
                cardSicaklik.classList.remove("analog-danger");
            }

            // Nem Kontrolü
            if (data.nem < thresholds.humMin || data.nem > thresholds.humMax) {
                cardNem.classList.add("analog-warning");
            } else {
                cardNem.classList.remove("analog-warning");
            }

            // Gaz Kontrolü
            if (data.gaz > thresholds.gasMax) {
                cardGaz.classList.add("analog-danger");
            } else {
                cardGaz.classList.remove("analog-danger");
            }

            // --- ENERJİ DURUMU ROZET GÜNCELLEMESİ ---
            if (data.enerjiVarMi === true) {
                energyBadge.className = "energy-badge energy-ok";
                energyBadge.textContent = "⚡ Enerji: Şebeke";
            } else {
                energyBadge.className = "energy-badge energy-fail";
                energyBadge.textContent = "⚡ Enerji: Jeneratör";
            }

            // --- KAPİ DURUMU ROZET GÜNCELLEMESİ ---
            const doorBadge = document.getElementById("door-badge");
            if (data.kapiAcikMi === true) {
                doorBadge.className = "door-badge door-open";
                doorBadge.textContent = "🚪 Kapı: AÇIK (ALARM)";
            } else {
                doorBadge.className = "door-badge door-closed";
                doorBadge.textContent = "🚪 Kapı: Kilitli";
            }

            // --- DİJİTAL TABLO GÜNCELLEMELERİ (EŞİKLER DİNAMİK YAPILDI) ---
            document.getElementById("table-temp").textContent = `${data.sicaklik.toFixed(1)} °C`;
            const tempStatus = document.getElementById("table-temp-status");
            if (data.sicaklik > thresholds.tempMax) {
                tempStatus.textContent = `⚠️ LİMİT DIŞI (> ${thresholds.tempMax}°C)`;
                tempStatus.className = "text-red-alarm";
            } else {
                tempStatus.textContent = "✅ Stabil";
                tempStatus.className = "text-green-stable";
            }

            document.getElementById("table-hum").textContent = `${data.nem.toFixed(1)} %`;
            const humStatus = document.getElementById("table-hum-status");
            if (data.nem < thresholds.humMin || data.nem > thresholds.humMax) {
                humStatus.textContent = `⚠️ Limit Dışı (< ${thresholds.humMin}% veya > ${thresholds.humMax}%)`;
                humStatus.className = "text-yellow-alarm";
            } else {
                humStatus.textContent = "✅ Stabil";
                humStatus.className = "text-green-stable";
            }

            document.getElementById("table-gas").textContent = `${data.gaz} PPM`;
            const gasStatus = document.getElementById("table-gas-status");
            if (data.gaz > thresholds.gasMax) {
                gasStatus.textContent = `🚨 TEHLİKELİ SEVİYE (> ${thresholds.gasMax} PPM)`;
                gasStatus.className = "text-red-alarm";
            } else {
                gasStatus.textContent = "✅ Temiz";
                gasStatus.className = "text-green-stable";
            }

            const tableEnergy = document.getElementById("table-energy");
            const tableEnergyStatus = document.getElementById("table-energy-status");
            if (data.enerjiVarMi) {
                tableEnergy.textContent = "Şebeke";
                tableEnergyStatus.textContent = "🔌 Kesintisiz";
                tableEnergyStatus.className = "text-green-stable";
            } else {
                tableEnergy.textContent = "UPS / Jeneratör";
                tableEnergyStatus.textContent = "🔋 ELEKTRİK KESİNTİSİ!";
                tableEnergyStatus.className = "text-red-alarm";
            }

            const tableDoor = document.getElementById("table-door");
            const tableDoorStatus = document.getElementById("table-door-status");
            if (data.kapiAcikMi) {
                tableDoor.textContent = "AÇIK";
                tableDoorStatus.textContent = "🚨 GÜVENLİK İHLALİ!";
                tableDoorStatus.className = "text-red-alarm";
            } else {
                tableDoor.textContent = "KAPALI";
                tableDoorStatus.textContent = "✅ Güvenli";
                tableDoorStatus.className = "text-green-stable";
            }

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
    const dosyaTarihi = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `Sistem_Odasi_Rapor_${dosyaTarihi}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}