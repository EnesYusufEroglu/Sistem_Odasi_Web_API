const API_LAST_URL = "https://localhost:7014/api/Veri/son-durum";
const API_HISTORY_BASE_URL = "https://localhost:7014/api/Veri/gecmis";

let gaugeSicaklik, gaugeNem, gaugeGaz;
let historyChart;
let currentHistoryData = [];

let thresholds = {
    tempMax: 28.0,
    humMin: 30.0,
    humMax: 70.0,
    gasMax: 300
};

document.addEventListener("DOMContentLoaded", function () {

    const savedThresholds = localStorage.getItem("system_thresholds");
    if (savedThresholds) {
        thresholds = JSON.parse(savedThresholds);
    }

    document.getElementById("input-temp-max").value = thresholds.tempMax;
    document.getElementById("input-hum-min").value = thresholds.humMin;
    document.getElementById("input-hum-max").value = thresholds.humMax;
    document.getElementById("input-gas-max").value = thresholds.gasMax;

    gaugeSicaklik = new JustGage({
        id: "gauge-sicaklik",
        value: 0,
        min: 0,
        max: 50,
        label: "°C",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    gaugeNem = new JustGage({
        id: "gauge-nem",
        value: 0,
        min: 0,
        max: 100,
        label: "%",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

    gaugeGaz = new JustGage({
        id: "gauge-gaz",
        value: 0,
        min: 0,
        max: 1023,
        label: "PPM",
        valueFontColor: "#f8fafc",
        titleFontColor: "#94a3b8"
    });

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
            resizeDelay: 100,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

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

    document.getElementById("btn-save-settings").addEventListener("click", () => {
        const tempMaxVal = parseFloat(document.getElementById("input-temp-max").value);
        const humMinVal = parseFloat(document.getElementById("input-hum-min").value);
        const humMaxVal = parseFloat(document.getElementById("input-hum-max").value);
        const gasMaxVal = parseInt(document.getElementById("input-gas-max").value);

        if (isNaN(tempMaxVal) || isNaN(humMinVal) || isNaN(humMaxVal) || isNaN(gasMaxVal)) {
            alert("Lütfen tüm alanları geçerli sayılarla doldurun!");
            return;
        }

        thresholds.tempMax = tempMaxVal;
        thresholds.humMin = humMinVal;
        thresholds.humMax = humMaxVal;
        thresholds.gasMax = gasMaxVal;

        localStorage.setItem("system_thresholds", JSON.stringify(thresholds));
        anlikVerileriGetir();

        alert("Eşik değerleri başarıyla güncellendi ve kaydedildi!");
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

    document.getElementById("btn-download-csv").addEventListener("click", function () {
        if (currentHistoryData.length === 0) {
            alert("İndirilecek geçmiş veri bulunamadı!");
            return;
        }
        exportToCSV(currentHistoryData);
    });

    // --- MENÜ AÇMA / KAPAMA (COLLAPSIBLE SIDEBAR) LOGIC ---
    const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    const sidebar = document.querySelector(".sidebar-tabs");

    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");

            // Grafiğin genişleyen alana anında yumuşakça oturması için resize tetikliyoruz
            setTimeout(() => {
                if (historyChart) {
                    historyChart.resize();
                }
            }, 300);
        });
    }
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

            // Kadran Göstergelerini Yenile
            gaugeSicaklik.refresh(data.sicaklik);
            gaugeNem.refresh(data.nem);
            gaugeGaz.refresh(data.gaz);

            // Durum Analizlerini Çalıştır
            const analizTemp = durumAnaliziYap('sicaklik', data.sicaklik);
            const analizNem = durumAnaliziYap('nem', data.nem);
            const analizGaz = durumAnaliziYap('gaz', data.gaz);
            const analizEnerji = durumAnaliziYap('enerji', data.enerjiVarMi);
            const analizHareket = durumAnaliziYap('hareket', data.hareketVarMi);
            const analizKapi = durumAnaliziYap('kapi', data.kapiAcikMi); // YENİ
            const analizKlima1 = durumAnaliziYap('klima', data.klimaAcikMi, data.sicaklik);
            const analizKlima2 = durumAnaliziYap('klima', data.klima2AcikMi, data.sicaklik);

            // --- 1. SICAKLIK KARTI ---
            const cardSicaklik = document.getElementById("card-sicaklik");
            const textSicaklik = document.getElementById("text-sicaklik");
            const titleSicaklik = cardSicaklik.querySelector("h3");

            textSicaklik.textContent = analizTemp.cardText;
            textSicaklik.style.color = analizTemp.alarm ? "#ef4444" : "#10b981";
            if (analizTemp.alarm) {
                cardSicaklik.classList.add("analog-danger");
                titleSicaklik.style.color = "#ef4444";
            } else {
                cardSicaklik.classList.remove("analog-danger");
                titleSicaklik.style.color = "#66e3ff";
            }

            // --- 2. NEM KARTI ---
            const cardNem = document.getElementById("card-nem");
            const textNem = document.getElementById("text-nem");
            const titleNem = cardNem.querySelector("h3");

            textNem.textContent = analizNem.cardText;
            textNem.style.color = analizNem.warning ? "#fbbf24" : "#10b981";
            if (analizNem.warning) {
                cardNem.classList.add("analog-warning");
                titleNem.style.color = "#fbbf24";
            } else {
                cardNem.classList.remove("analog-warning");
                titleNem.style.color = "#66e3ff";
            }

            // --- 3. GAZ KARTI ---
            const cardGaz = document.getElementById("card-gaz");
            const textGaz = document.getElementById("text-gaz");
            const titleGaz = cardGaz.querySelector("h3");

            textGaz.textContent = analizGaz.cardText;
            textGaz.style.color = analizGaz.alarm ? "#ef4444" : "#10b981";
            if (analizGaz.alarm) {
                cardGaz.classList.add("analog-danger");
                titleGaz.style.color = "#ef4444";
            } else {
                cardGaz.classList.remove("analog-danger");
                titleGaz.style.color = "#66e3ff";
            }

            // --- 4. ENERJİ KARTI ---
            const cardEnerji = document.getElementById("card-enerji");
            const iconEnerji = document.getElementById("icon-enerji");
            const textEnerji = document.getElementById("text-enerji");
            const titleEnerji = cardEnerji.querySelector("h3");

            iconEnerji.textContent = data.enerjiVarMi ? "⚡" : "🔋";
            textEnerji.textContent = analizEnerji.cardText;
            textEnerji.style.color = analizEnerji.alarm ? "#ef4444" : "#10b981";
            if (analizEnerji.alarm) {
                cardEnerji.classList.add("analog-danger");
                titleEnerji.style.color = "#ef4444";
            } else {
                cardEnerji.classList.remove("analog-danger");
                titleEnerji.style.color = "#66e3ff";
            }

            // --- 5. İKİLİ GÜVENLİK & ERİŞİM KARTI (HAREKET + KAPÍ) ---
            const hareketSubcard = document.getElementById("hareket-subcard");
            const hareketStatus = document.getElementById("hareket-status");
            if (data.hareketVarMi) {
                hareketStatus.textContent = "ALGILANDI";
                hareketSubcard.className = "subcard-item subcard-danger";
            } else {
                hareketStatus.textContent = "YOK";
                hareketSubcard.className = "subcard-item subcard-ok";
            }

            const kapiSubcard = document.getElementById("kapi-subcard");
            const kapiStatus = document.getElementById("kapi-status");
            if (data.kapiAcikMi) {
                kapiStatus.textContent = "AÇIK";
                kapiSubcard.className = "subcard-item subcard-danger";
            } else {
                kapiStatus.textContent = "KAPALI";
                kapiSubcard.className = "subcard-item subcard-ok";
            }

            const cardGuvenlikCombined = document.getElementById("card-guvenlik-combined");
            const titleGuvenlikCombined = document.getElementById("title-guvenlik-combined");
            if (analizHareket.alarm || analizKapi.alarm) {
                cardGuvenlikCombined.classList.add("analog-danger");
                titleGuvenlikCombined.style.color = "#ef4444";
            } else {
                cardGuvenlikCombined.classList.remove("analog-danger");
                titleGuvenlikCombined.style.color = "#66e3ff";
            }

            // --- 6. İKİLİ KLİMA KARTI ---
            const k1Subcard = document.getElementById("klima1-subcard");
            const k1Status = document.getElementById("klima1-status");
            if (data.klimaAcikMi) {
                k1Status.textContent = "AÇIK";
                k1Subcard.classList.add("klima-active");
            } else {
                k1Status.textContent = "KAPALI";
                k1Subcard.classList.remove("klima-active");
            }

            const k2Subcard = document.getElementById("klima2-subcard");
            const k2Status = document.getElementById("klima2-status");
            if (data.klima2AcikMi) {
                k2Status.textContent = "AÇIK";
                k2Subcard.classList.add("klima-active");
            } else {
                k2Status.textContent = "KAPALI";
                k2Subcard.classList.remove("klima-active");
            }

            const cardKlimaCombined = document.getElementById("card-klima-combined");
            const titleKlimaCombined = document.getElementById("title-klima-combined");
            if (analizKlima1.alarm || analizKlima2.alarm) {
                cardKlimaCombined.classList.add("analog-danger");
                titleKlimaCombined.style.color = "#ef4444";
            } else {
                cardKlimaCombined.classList.remove("analog-danger");
                titleKlimaCombined.style.color = "#66e3ff";
            }

            // --- 7. DİJİTAL TABLO GÜNCELLEMELERİ ---
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

            // YENİ: Kapı Satırı
            document.getElementById("table-door").textContent = analizKapi.display;
            document.getElementById("table-door-status").textContent = analizKapi.tableText;
            document.getElementById("table-door-status").className = analizKapi.cls;

            document.getElementById("table-klima").textContent = analizKlima1.display;
            document.getElementById("table-klima-status").textContent = analizKlima1.tableText;
            document.getElementById("table-klima-status").className = analizKlima1.cls;

            document.getElementById("table-klima2").textContent = analizKlima2.display;
            document.getElementById("table-klima2-status").textContent = analizKlima2.tableText;
            document.getElementById("table-klima2-status").className = analizKlima2.cls;

            // Son Güncelleme Zamanı
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
            currentHistoryData = siraliVeri;
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

function exportToCSV(dataList) {
    let csvContent = "Kayit Tarihi;Sicaklik (°C);Nem (%);Gaz Seviyesi (PPM);Enerji Durumu;Hareket;Kapi Durumu;Klima 1;Klima 2\r\n";

    dataList.forEach(item => {
        let tarih = new Date(item.kayitTarihi).toLocaleString('tr-TR');
        let enerji = item.enerjiVarMi ? "Sebeke" : "UPS/Jenerator";
        let hareket = item.hareketVarMi ? "HAREKET VAR" : "YOK";
        let kapi = item.kapiAcikMi ? "ACIK (ALARM)" : "KAPALI";
        let k1 = item.klimaAcikMi ? "ACIK" : "KAPALI";
        let k2 = item.klima2AcikMi ? "ACIK" : "KAPALI";

        let sicaklik = item.sicaklik.toFixed(1).replace('.', ',');
        let nem = item.nem.toFixed(1).replace('.', ',');

        csvContent += `${tarih};${sicaklik};${nem};${item.gaz};${enerji};${hareket};${kapi};${k1};${k2}\r\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);

    const dosyaTarihi = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Sistem_Odasi_Rapor_${dosyaTarihi}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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

        case 'kapi':
            if (veri) { // true = Kapı Açık
                return {
                    alarm: true,
                    tableText: "🚨 TEHLİKE: KAPI AÇIK!",
                    cardText: "KAPI AÇIK!",
                    cls: "text-red-alarm",
                    display: "AÇIK"
                };
            }
            return { alarm: false, tableText: "✅ Kapalı / Güvenli", cardText: "Kapalı", cls: "text-green-stable", display: "Kapalı" };

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