// ==================== VARIABLES ====================
let currentMode = "normal";
let dayNormal = 0, dayExperiment = 0;
let dataNormal = [], dataExperiment = [];
let growthChart = null;
let comparisonData = [];

const get = (id) => document.getElementById(id);

const OPTIMAL_VALUES = {
    water: 100, light: 80, temp: 27, ph: 6.5, humidity: 60,
    fertDose: 50, fertilizer: "npk", season: "optimal"
};

const growthPhases = [
    { day: 0, emoji: "🌰", name: "Biji", size: 55 },
    { day: 5, emoji: "🌱", name: "Kecambah", size: 60 },
    { day: 15, emoji: "🌿", name: "Bibit", size: 65 },
    { day: 30, emoji: "🍃", name: "Vegetatif", size: 75 },
    { day: 50, emoji: "🌼", name: "Kuncup Bunga", size: 80 },
    { day: 70, emoji: "🌻", name: "Bunga Mekar", size: 92 },
    { day: 85, emoji: "🌻🍎", name: "Pembentukan Buah", size: 90 },
    { day: 100, emoji: "🌻🌰", name: "Pembentukan Biji", size: 85 },
    { day: 115, emoji: "🍂", name: "Menua / Daun Menguning", size: 75 }
];

function getRealTargetHeight(day) {
    if (day <= 0) return 0;
    if (day <= 10) return 2 + (day / 10) * 3;
    if (day <= 20) return 5 + ((day - 10) / 10) * 15;
    if (day <= 40) return 20 + ((day - 20) / 20) * 80;
    if (day <= 60) return 100 + ((day - 40) / 20) * 80;
    if (day <= 75) return 180 + ((day - 60) / 15) * 40;
    if (day <= 90) return 220 + ((day - 75) / 15) * 30;
    if (day <= 115) return 250 - (day - 90) * 1.2;
    return Math.max(0, 220 - (day - 115) * 3);
}

function resetSlidersToOptimal() {
    get("water").value = OPTIMAL_VALUES.water;
    get("light").value = OPTIMAL_VALUES.light;
    get("temp").value = OPTIMAL_VALUES.temp;
    get("ph").value = OPTIMAL_VALUES.ph;
    get("humidity").value = OPTIMAL_VALUES.humidity;
    get("fertDose").value = OPTIMAL_VALUES.fertDose;
    get("fertilizer").value = OPTIMAL_VALUES.fertilizer;
    get("season").value = OPTIMAL_VALUES.season;
    
    get("waterVal").innerText = OPTIMAL_VALUES.water;
    get("lightVal").innerText = OPTIMAL_VALUES.light;
    get("tempVal").innerText = OPTIMAL_VALUES.temp;
    get("phVal").innerText = OPTIMAL_VALUES.ph;
    get("humVal").innerText = OPTIMAL_VALUES.humidity;
    get("fertVal").innerText = OPTIMAL_VALUES.fertDose;
}

function updatePlantAnimation(day, isDead, stressLevel, currentHeight) {
    const plantDiv = get("plantEmoji");
    if (!plantDiv) return;
    plantDiv.classList.remove("grow-effect");
    
    if (isDead) {
        plantDiv.innerHTML = "💀";
        plantDiv.style.fontSize = "55px";
        plantDiv.style.filter = "grayscale(1)";
        plantDiv.style.animation = "sway 1s infinite ease-in-out";
        return;
    }
    
    let currentPhase = growthPhases[0];
    for (let p of growthPhases) if (day >= p.day) currentPhase = p;
    
    plantDiv.innerHTML = currentPhase.emoji;
    let sizeBonus = Math.min(30, Math.max(0, currentHeight / 8));
    plantDiv.style.fontSize = (currentPhase.size + sizeBonus) + "px";
    plantDiv.style.animation = stressLevel > 2 ? "sway 0.5s infinite ease-in-out" : "sway 3s infinite ease-in-out";
    plantDiv.style.filter = stressLevel > 2 ? "drop-shadow(0 0 8px rgba(255,0,0,0.6))" : "drop-shadow(0 8px 12px rgba(0,0,0,0.2))";
    plantDiv.classList.add("grow-effect");
    setTimeout(() => plantDiv.classList.remove("grow-effect"), 400);
}

function growthStep(previous, currentDay, mode) {
    let height = previous?.height ?? 0;
    let stress = previous?.stress ?? 0;
    
    if (previous?.dead) {
        return { height: Math.max(0, height - 3.5), stress, dead: true, deadReason: previous.deadReason };
    }
    
    let water = parseFloat(get("water").value);
    let light = parseFloat(get("light").value);
    let temp = parseFloat(get("temp").value);
    let ph = parseFloat(get("ph").value);
    let humidity = parseFloat(get("humidity").value);
    let fertilizer = get("fertilizer").value;
    let dose = parseFloat(get("fertDose").value) / 100;
    let season = get("season").value;
    
    if (mode === "normal") {
        water = OPTIMAL_VALUES.water; light = OPTIMAL_VALUES.light; temp = OPTIMAL_VALUES.temp;
        ph = OPTIMAL_VALUES.ph; humidity = OPTIMAL_VALUES.humidity; dose = OPTIMAL_VALUES.fertDose / 100;
        fertilizer = OPTIMAL_VALUES.fertilizer; season = OPTIMAL_VALUES.season;
    }
    
    if (season === "kemarau") { water *= 0.65; humidity *= 0.65; }
    if (season === "hujan") { water *= 1.25; humidity *= 1.2; }
    
    let fertEffect = fertilizer === "npk" ? 1 + 0.45 * dose : (fertilizer === "organic" ? 1 + 0.25 * dose : 0.7);
    if (dose > 0.85) stress += 1.3;
    
    let waterFactor = Math.min(1, water / 100) * (water > 150 ? 0.7 : 1);
    let lightFactor = Math.min(1, light / 80) * (light > 95 ? 0.65 : 1);
    let tempFactor = (temp >= 20 && temp <= 30) ? 1 : Math.max(0.3, 1 - Math.abs(temp - 26) / 15);
    let phFactor = (ph >= 6 && ph <= 7.5) ? 1 : Math.max(0.3, 1 - Math.abs(ph - 6.8) / 4);
    let humidityFactor = (humidity >= 40 && humidity <= 70) ? 1 : Math.max(0.3, 1 - Math.abs(humidity - 55) / 35);
    
    let envFactor = Math.min(waterFactor, lightFactor, tempFactor, phFactor, humidityFactor);
    let finalFactor = envFactor * fertEffect;
    
    if (envFactor < 0.55) stress += 0.45;
    else if (envFactor > 0.85) stress = Math.max(0, stress - 0.2);
    else stress = Math.max(0, stress - 0.08);
    
    if (stress > 4.3) {
        let cause = water < 50 ? "💧 Kekeringan ekstrem" : (water > 170 ? "💧 Kebanjiran" : (temp < 15 ? "🌡️ Terlalu dingin" : (temp > 37 ? "🌡️ Terlalu panas" : "⚠️ Stres lingkungan")));
        return { height, stress, dead: true, deadReason: cause };
    }
    
    if (currentDay > 115) {
        let decline = (currentDay - 115) * 2.2;
        height = Math.max(0, height - decline);
        if (height < 1 || currentDay > 150) {
            return { height: 0, stress, dead: true, deadReason: "🍂 Siklus hidup selesai (menua alami)" };
        }
        return { height, stress };
    }
    
    let target = getRealTargetHeight(currentDay);
    let growth = Math.max(0, target - height) * 0.4 * finalFactor;
    return { height: Math.min(265, height + growth), stress };
}

function runSimulation(finalDay, mode) {
    let results = [], previous = null;
    for (let day = 5; day <= finalDay; day += 5) {
        let stepResult = growthStep(previous, day, mode);
        results.push(stepResult);
        if (stepResult.dead) break;
        previous = stepResult;
    }
    return results;
}

function updateActivePhase(currentDay) {
    document.querySelectorAll('.phase-item').forEach(el => {
        el.classList.remove('active-phase');
        let phaseDay = parseInt(el.getAttribute('data-day'));
        if (currentDay >= phaseDay) {
            let nextPhaseDay = Infinity;
            document.querySelectorAll('.phase-item').forEach(other => {
                let otherDay = parseInt(other.getAttribute('data-day'));
                if (otherDay > phaseDay && otherDay < nextPhaseDay) nextPhaseDay = otherDay;
            });
            if (currentDay < nextPhaseDay) el.classList.add('active-phase');
        }
    });
}

function updateAllUI() {
    let currentDay = currentMode === "normal" ? dayNormal : dayExperiment;
    let currentData = currentMode === "normal" ? dataNormal : dataExperiment;
    let latest = currentData.length ? currentData[currentData.length - 1] : { height: 0, stress: 0, dead: false };
    
    get("dayDisplay").innerText = currentDay;
    get("heightDisplay").innerText = latest.height.toFixed(1);
    
    let currentPhase = growthPhases[0];
    for (let p of growthPhases) if (currentDay >= p.day) currentPhase = p;
    get("phaseDisplay").innerHTML = latest.dead ? `💀 MATI (${latest.deadReason || "stres"})` : `${currentPhase.emoji} ${currentPhase.name}`;
    
    updatePlantAnimation(currentDay, latest.dead, latest.stress || 0, latest.height);
    updateActivePhase(currentDay);
    
    if (currentMode === "normal") {
        get("treatmentInfo").innerHTML = "🌿 MODE NORMAL: Air 100 | Cahaya 80% | Suhu 27°C | pH 6.5 | Kelembaban 60% | Pupuk NPK 50% | Musim Optimal";
    } else {
        get("treatmentInfo").innerHTML = `💧 Air: ${get("water").value} | ☀️ Cahaya: ${get("light").value}% | 🌡️ Suhu: ${get("temp").value}°C | 🧪 pH: ${get("ph").value} | 💨 Kelembaban: ${get("humidity").value}% | 🌾 Pupuk: ${get("fertDose").value}%`;
    }
    
    let target = getRealTargetHeight(currentDay);
    let percent = target > 0 ? ((latest.height / target) * 100).toFixed(0) : 0;
    
    if (latest.dead) {
        get("plantInfo").innerHTML = `💀 TANAMAN MATI<br>⚠️ ${latest.deadReason || "stres"}`;
    } else {
        get("plantInfo").innerHTML = `🌱 STATUS: ${latest.height.toFixed(1)} / ${target.toFixed(1)} cm (${percent}%)<br>${latest.stress > 2 ? `⚠️ Stres: ${latest.stress.toFixed(1)}/5` : "✅ Stres minimal"}`;
    }
    
    drawChart();
}

function drawChart() {
    const maxLen = Math.max(dataNormal.length, dataExperiment.length);
    const labels = Array.from({length: maxLen}, (_, i) => (i+1)*5);
    const canvas = get("growthChart");
    if (!canvas) return;
    if (growthChart) growthChart.destroy();
    
    let datasets = [
        { label: "🌿 Mode Normal", data: dataNormal.map(d => d.height), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", borderWidth: 3, fill: true, tension: 0.3 },
        { label: "🧪 Mode Eksperimen", data: dataExperiment.map(d => d.height), borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 3, fill: true, tension: 0.3 }
    ];
    
    comparisonData.forEach((comp, idx) => {
        let colors = ["#f59e0b", "#8b5cf6", "#06b6d4", "#ec489a"];
        datasets.push({ label: comp.label, data: comp.data.map(d => d.height), borderColor: colors[idx % colors.length], backgroundColor: "transparent", borderWidth: 2, borderDash: [5, 5], tension: 0.3 });
    });
    
    growthChart = new Chart(canvas, { type: "line", data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: true, scales: { y: { title: { display: true, text: "Tinggi (cm)" }, min: 0, max: 280 }, x: { title: { display: true, text: "Hari ke-" } } } } });
}

function saveCurrentTreatment() {
    let currentData = currentMode === "normal" ? dataNormal : dataExperiment;
    let name = prompt("Nama perlakuan:", `Perlakuan ${comparisonData.length + 1}`);
    if (name) { comparisonData.push({ label: name, data: [...currentData] }); drawChart(); alert(`✅ "${name}" disimpan!`); }
}
function clearComparison() { comparisonData = []; drawChart(); alert("🗑️ Perbandingan dihapus!"); }
function nextDay() {
    if (currentMode === "normal") { dayNormal = Math.min(dayNormal + 5, 150); dataNormal = runSimulation(dayNormal, "normal"); }
    else { dayExperiment = Math.min(dayExperiment + 5, 150); dataExperiment = runSimulation(dayExperiment, "experiment"); }
    updateAllUI();
}
function prevDay() {
    if (currentMode === "normal" && dayNormal >= 5) { dayNormal -= 5; dataNormal = runSimulation(dayNormal, "normal"); }
    if (currentMode === "experiment" && dayExperiment >= 5) { dayExperiment -= 5; dataExperiment = runSimulation(dayExperiment, "experiment"); }
    updateAllUI();
}
function resetCurrentMode() {
    if (currentMode === "normal") { dayNormal = 0; dataNormal = []; }
    else { dayExperiment = 0; dataExperiment = []; }
    updateAllUI();
}
function resetOtherMode() {
    if (currentMode === "normal") { dayExperiment = 0; dataExperiment = []; }
    else { dayNormal = 0; dataNormal = []; }
    updateAllUI();
}
function resetAll() {
    dayNormal = 0; dayExperiment = 0; dataNormal = []; dataExperiment = []; comparisonData = [];
    if (currentMode === "normal") resetSlidersToOptimal();
    updateAllUI();
}
function changeMode() {
    if (get("modeSelect").value === "normal" && currentMode === "experiment") { dayNormal = 0; dataNormal = []; resetSlidersToOptimal(); }
    currentMode = get("modeSelect").value;
    updateAllUI();
}

function init() {
    get("prevBtn").addEventListener("click", prevDay);
    get("nextBtn").addEventListener("click", nextDay);
    get("resetCurrentBtn").addEventListener("click", resetCurrentMode);
    get("resetOtherBtn").addEventListener("click", resetOtherMode);
    get("resetAllBtn").addEventListener("click", resetAll);
    get("saveComparisonBtn").addEventListener("click", saveCurrentTreatment);
    get("clearComparisonBtn").addEventListener("click", clearComparison);
    get("modeSelect").addEventListener("change", changeMode);
    
    ["water", "light", "temp", "ph", "humidity", "fertDose"].forEach(id => {
        get(id).addEventListener("input", function() {
            get(id + "Val").innerText = this.value;
            if (currentMode === "experiment") { dayExperiment = Math.min(dayExperiment, 150); dataExperiment = runSimulation(dayExperiment, "experiment"); updateAllUI(); }
        });
    });
    get("fertilizer").addEventListener("change", () => { if (currentMode === "experiment") { dataExperiment = runSimulation(dayExperiment, "experiment"); updateAllUI(); } });
    get("season").addEventListener("change", () => { if (currentMode === "experiment") { dataExperiment = runSimulation(dayExperiment, "experiment"); updateAllUI(); } });
    
    // Panel Perkembangan
    const phaseDescriptions = {
        0: "🌰 BIJI: Fase awal perkecambahan. Embrio dalam biji mulai aktif jika air dan suhu sesuai.",
        5: "🌱 KECAMBAH: Radikula (akar) keluar, plumula (tunas) muncul menuju permukaan tanah.",
        15: "🌿 BIBIT: Daun pertama terbuka, tanaman mulai fotosintesis mandiri.",
        30: "🍃 VEGETATIF: Pertumbuhan batang dan daun pesat. Auksin memacu pemanjangan sel.",
        50: "🌼 KUNCUP BUNGA: Peralihan ke fase generatif. Meristem apikal berubah menjadi primordia bunga.",
        70: "🌻 BUNGA MEKAR: Bunga matahari mekar sempurna. Penyerbukan terjadi.",
        85: "🍎 PEMBENTUKAN BUAH: Ovarium membesar menjadi buah. Giberelin berperan.",
        100: "🌰 PEMBENTUKAN BIJI: Embrio di dalam biji matang. Siklus hidup siap berulang.",
        115: "🍂 MENUA: Daun menguning (senesen), tanaman mengarah ke kematian alami."
    };
    
    document.querySelectorAll('.phase-item').forEach(el => {
        el.addEventListener('click', () => {
            let day = parseInt(el.getAttribute('data-day'));
            document.getElementById('phaseDescription').innerHTML = `📖 ${phaseDescriptions[day] || "Fase perkembangan tanaman."}`;
        });
    });
    
    resetSlidersToOptimal();
    updateAllUI();
}

init();
