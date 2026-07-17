const API_LAST_URL = "https://localhost:7014/api/Veri/son-durum"; 
const API_HISTORY_BASE_URL = "https://localhost:7014/api/Veri/gecmis"; 

let gaugeSicaklik, gaugeNem, gaugeGaz;
let historyChart;

document.addEventListener("DOMContentLoaded", function() {
    // --- GÖRÜNÜM DEĞİŞTİRME MANTIĞI ---
    const btnAnalog = document.getElementById("btn-analog");
    const btnDigital = document.getElementById("btn-digital");
    const analogViews = document.querySelectorAll(".analog-view");
    const digitalView = document.querySelector(".digital-view-container");

    btnAnalog.addEventListener("click", () => {
        btnAnalog.classList.add("active");
        btnDigital.classList.remove("active");
        analogViews.forEach(el => el.classList.remove("hidden"));
        digitalView.classList.add("hidden");
    });

    btnDigital.addEventListener("click", () => {
        btnDigital.classList.add("active");
        btnAnalog.classList.remove("active");
        analogViews.forEach(el => el.classList.add("hidden"));
        digitalView.classList.remove("hidden");
    });
    
    // Göstergeleri Başlat
    gaugeSicaklik = new JustGage({
        id: "gauge-sicaklik",
        value: 0,
        min: 0,
        max: 50,
        title: "Sıcaklık",
        label: "°C",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8",
        levelColors: ["#3b82f6", "#f59e0b", "#ef4444"]
    });

    gaugeNem = new JustGage({
        id: "gauge-nem",
        value: 0,
        min: 0,
        max: 100,
        title: "Nem",
        label: "%",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8",
        levelColors: ["#93c5fd", "#3b82f6", "#1d4ed8"]
    });

    gaugeGaz = new JustGage({
        id: "gauge-gaz",
        value: 0,
        min: 0,
        max: 1023,
        title: "Duman/Gaz",
        label: "PPM",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8",
        levelColors: ["#10b981", "#f59e0b", "#ef4444"]
    });

    // Grafik Tanımı
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

    const selectElement = document.getElementById("data-limit-select");
    selectElement.addEventListener("change", function() {
        grafikVerileriniGuncelle(this.value);
    });

    anlikVerileriGetir();
    grafikVerileriniGuncelle(selectElement.value);
    
    setInterval(() => {
        anlikVerileriGetir();
        const currentLimit = document.getElementById("data-limit-select").value;
        grafikVerileriniGuncelle(currentLimit);
    }, 2000);
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
            // --- ANALOG KART DİNAMİK ALARM KONTROLLERİ ---
            const cardSicaklik = document.getElementById("card-sicaklik");
            const cardNem = document.getElementById("card-nem");
            const cardGaz = document.getElementById("card-gaz");

            // Sıcaklık Kontrolü (> 28°C ise Alarm)
            if (data.sicaklik > 28) {
                cardSicaklik.classList.add("analog-danger");
            } else {
                cardSicaklik.classList.remove("analog-danger");
            }

            // Nem Kontrolü (< 30% veya > 70% ise Uyarı)
            if (data.nem > 70 || data.nem < 30) {
                cardNem.classList.add("analog-warning");
            } else {
                cardNem.classList.remove("analog-warning");
            }

            // Gaz Kontrolü (> 300 PPM ise Alarm)
            if (data.gaz > 300) {
                cardGaz.classList.add("analog-danger");
            } else {
                cardGaz.classList.remove("analog-danger");
            }
            // ---------------------------------------------
            
            statusBadge.textContent = "SİSTEM ÇEVRİMİÇİ";
            statusBadge.className = "status-badge online";

            gaugeSicaklik.refresh(data.sicaklik);
            gaugeNem.refresh(data.nem);
            gaugeGaz.refresh(data.gaz);

            // --- ENERJİ DURUMU ROZET GÜNCELLEMESİ ---
            if (data.enerjiVarMi === true) {
                energyBadge.className = "energy-badge energy-ok";
                energyBadge.textContent = "⚡ Enerji: Şebeke";
            } else {
                energyBadge.className = "energy-badge energy-fail";
                energyBadge.textContent = "⚡ Enerji: Jeneratör";
            }

            // --- KAPİ DURUMU ROZET GÜNCELLEMESİ (YENİ) ---
            const doorBadge = document.getElementById("door-badge");
            if (data.kapiAcikMi === true) {
                doorBadge.className = "door-badge door-open";
                doorBadge.textContent = "🚪 Kapı: AÇIK (ALARM)";
            } else {
                doorBadge.className = "door-badge door-closed";
                doorBadge.textContent = "🚪 Kapı: Kilitli";
            }

            const tarih = new Date(data.kayitTarihi);
            document.getElementById("last-update").textContent = tarih.toLocaleTimeString();

            // --- DİJİTAL TABLO GÜNCELLEMELERİ (HAREKETLİ VE RENKLİ ALARMLAR) ---
            document.getElementById("table-temp").textContent = `${data.sicaklik.toFixed(1)} °C`;
            const tempStatus = document.getElementById("table-temp-status");
            if (data.sicaklik > 28) {
                tempStatus.textContent = "⚠️ YÜKSEK SICAKLIK ALARMI";
                tempStatus.className = "text-red-alarm"; // Sallanan ve parlayan kırmızı alarm
            } else {
                tempStatus.textContent = "✅ Stabil";
                tempStatus.className = "text-green-stable";
            }

            document.getElementById("table-hum").textContent = `${data.nem.toFixed(1)} %`;
            const humStatus = document.getElementById("table-hum-status");
            if (data.nem > 70 || data.nem < 30) {
                humStatus.textContent = "⚠️ Limit Dışı Uyarı";
                humStatus.className = "text-yellow-alarm"; // Parlayan turuncu uyarı
            } else {
                humStatus.textContent = "✅ Stabil";
                humStatus.className = "text-green-stable";
            }

            document.getElementById("table-gas").textContent = `${data.gaz} PPM`;
            const gasStatus = document.getElementById("table-gas-status");
            if (data.gaz > 300) {
                gasStatus.textContent = "🚨 TEHLİKELİ GAZ/DUMAN SIZINTISI";
                gasStatus.className = "text-red-alarm"; // Sallanan ve parlayan kırmızı alarm
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
                tableEnergyStatus.className = "text-red-alarm"; // Elektrik gidince titreşen alarm
            }

            // --- TABLO KAPİ DURUMU GÜNCELLEMESİ (HAREKETLİ) ---
            const tableDoor = document.getElementById("table-door");
            const tableDoorStatus = document.getElementById("table-door-status");
            if (data.kapiAcikMi) {
                tableDoor.textContent = "AÇIK";
                tableDoorStatus.textContent = "🚨 KAPALI OLMALIDIR / YETKİSİZ GİRİŞ!";
                tableDoorStatus.className = "text-red-alarm"; // Kapı açık unutulursa titreşen alarm
            } else {
                tableDoor.textContent = "KAPALI";
                tableDoorStatus.textContent = "✅ Güvenli";
                tableDoorStatus.className = "text-green-stable";
            }
            // -------------------------------------
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