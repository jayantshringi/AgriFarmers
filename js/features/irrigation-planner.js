/**
 * AgroVision Smart Evapotranspiration (ET0) Irrigation Planner
 * Standalone ES/Global Feature Module
 */

(function () {
    'use strict';

    // FAO-56 Crop Coefficients (Kc) across growth stages
    const CROP_KC_TABLE = {
        'Wheat':      { initial: 0.40, mid: 1.15, late: 0.40, root_depth_m: 1.2, name: 'Wheat' },
        'Rice':       { initial: 1.05, mid: 1.20, late: 0.90, root_depth_m: 0.6, name: 'Paddy / Rice' },
        'Maize':      { initial: 0.40, mid: 1.20, late: 0.60, root_depth_m: 1.0, name: 'Maize' },
        'Cotton':     { initial: 0.45, mid: 1.20, late: 0.70, root_depth_m: 1.4, name: 'Cotton' },
        'Sugarcane':  { initial: 0.40, mid: 1.25, late: 0.75, root_depth_m: 1.5, name: 'Sugarcane' },
        'Mustard':    { initial: 0.35, mid: 1.05, late: 0.45, root_depth_m: 1.0, name: 'Mustard' },
        'Potato':     { initial: 0.50, mid: 1.15, late: 0.75, root_depth_m: 0.6, name: 'Potato' },
        'Soybean':    { initial: 0.40, mid: 1.15, late: 0.50, root_depth_m: 0.9, name: 'Soybean' }
    };

    // Soil Available Water Capacity (AWC in mm water per meter depth)
    const SOIL_TYPES = {
        'Sandy':        { awc_mm_m: 70,  infiltration_rate: 'High (30 mm/hr)',   efficiency_loss: 0.20 },
        'Sandy Loam':   { awc_mm_m: 120, infiltration_rate: 'Moderate (20 mm/hr)', efficiency_loss: 0.10 },
        'Loam':         { awc_mm_m: 160, infiltration_rate: 'Optimal (12 mm/hr)',  efficiency_loss: 0.05 },
        'Clay Loam':    { awc_mm_m: 180, infiltration_rate: 'Slow (8 mm/hr)',      efficiency_loss: 0.05 },
        'Black Cotton': { awc_mm_m: 200, infiltration_rate: 'Very Slow (5 mm/hr)', efficiency_loss: 0.08 }
    };

    // Irrigation System Efficiencies
    const IRRIGATION_SYSTEMS = {
        'drip':      { name: 'Drip Irrigation',      efficiency: 0.90, discharge_rate_lph: 25000 },
        'sprinkler': { name: 'Micro-Sprinkler',      efficiency: 0.80, discharge_rate_lph: 35000 },
        'flood':     { name: 'Surface / Furrow (Flood)', efficiency: 0.55, discharge_rate_lph: 45000 }
    };

    let state = {
        crop: 'Wheat',
        growthStage: 'mid', // 'initial', 'mid', 'late'
        soilType: 'Loam',
        irrigationMethod: 'drip',
        areaAcres: 2.0,
        tempC: 26,
        humidityPercent: 55,
        pumpHp: 5.0
    };

    // ─── Modal Open/Close ───────────────────────────────────────────────────────

    function openIrrigationPlannerModal() {
        const modal = document.getElementById('irrigationPlannerModal');
        if (!modal) return;
        modal.classList.add('active');

        // Sync with live weather if available
        if (window.userWeatherTemp) {
            state.tempC = window.userWeatherTemp;
        }

        initForm();
        calculateIrrigationPlan();
    }

    function closeIrrigationPlannerModal() {
        const modal = document.getElementById('irrigationPlannerModal');
        if (modal) modal.classList.remove('active');
    }

    function initForm() {
        const cropEl = document.getElementById('ipCropSelect');
        const stageEl = document.getElementById('ipStageSelect');
        const soilEl = document.getElementById('ipSoilSelect');
        const methodEl = document.getElementById('ipMethodSelect');
        const areaEl = document.getElementById('ipAreaInput');
        const tempEl = document.getElementById('ipTempInput');

        if (cropEl) cropEl.value = state.crop;
        if (stageEl) stageEl.value = state.growthStage;
        if (soilEl) soilEl.value = state.soilType;
        if (methodEl) methodEl.value = state.irrigationMethod;
        if (areaEl) areaEl.value = state.areaAcres;
        if (tempEl) tempEl.value = state.tempC;
    }

    function onInputChange(field, value) {
        if (field === 'crop') state.crop = value;
        if (field === 'stage') state.growthStage = value;
        if (field === 'soil') state.soilType = value;
        if (field === 'method') state.irrigationMethod = value;
        if (field === 'area') state.areaAcres = Math.max(0.1, parseFloat(value) || 1);
        if (field === 'temp') state.tempC = Math.max(5, Math.min(50, parseFloat(value) || 25));

        calculateIrrigationPlan();
    }

    // ─── Precision ET0 & Water Requirement Calculator ──────────────────────────

    function calculateIrrigationPlan() {
        const cropData = CROP_KC_TABLE[state.crop] || CROP_KC_TABLE['Wheat'];
        const soilData = SOIL_TYPES[state.soilType] || SOIL_TYPES['Loam'];
        const systemData = IRRIGATION_SYSTEMS[state.irrigationMethod] || IRRIGATION_SYSTEMS['drip'];

        // 1. Reference Evapotranspiration (ET0) using Hargreaves approximation:
        // ET0 = 0.0023 * (Tmean + 17.8) * sqrt(Tmax - Tmin) * Ra (approx ~4.0 - 7.5 mm/day for northern plains)
        const baseSolarFactor = 0.16;
        const et0_mm_day = Math.max(2.5, Math.min(9.0, (state.tempC * 0.14) + (baseSolarFactor * 12)));

        // 2. Crop Coefficient (Kc) for current growth stage
        const kc = cropData[state.growthStage] || cropData.mid;

        // 3. Crop Evapotranspiration (ETc) = Kc * ET0 (mm/day)
        const etc_mm_day = parseFloat((kc * et0_mm_day).toFixed(2));

        // 4. Volume in Liters: 1 mm over 1 acre (4046.86 m2) = 4,046.86 Liters
        const dailyGrossLitersPerAcre = (etc_mm_day * 4046.86) / systemData.efficiency;
        const totalDailyLiters = Math.round(dailyGrossLitersPerAcre * state.areaAcres);

        // 5. Total water compared to standard flood irrigation (for water savings metric)
        const floodGrossLiters = (etc_mm_day * 4046.86) / 0.55 * state.areaAcres;
        const waterSavedLiters = Math.max(0, Math.round(floodGrossLiters - totalDailyLiters));
        const waterSavingsPercent = Math.round((waterSavedLiters / floodGrossLiters) * 100);

        // 6. Pump Run-Time (Hours & Minutes based on 5HP / discharge rate)
        const pumpDischargePerHour = 28000; // ~28,000 L/hr for 5 HP submersible/monoblock
        const dailyRunHours = totalDailyLiters / pumpDischargePerHour;
        const runHours = Math.floor(dailyRunHours);
        const runMins = Math.round((dailyRunHours - runHours) * 60);

        // 7. Irrigation Frequency & 7-Day Schedule
        // Soil water holding capacity in root zone
        const rootZoneCapacityMm = soilData.awc_mm_m * cropData.root_depth_m;
        const allowableDepletionMm = rootZoneCapacityMm * 0.45; // 45% MAD
        const intervalDays = Math.max(1, Math.min(5, Math.round(allowableDepletionMm / etc_mm_day)));

        // Build 7-day schedule
        const schedule7Days = [];
        const dayNames = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const isWateringDay = (i % intervalDays === 0);

            schedule7Days.push({
                day_label: dayNames[i] || `Day ${i + 1}`,
                date_str: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
                should_water: isWateringDay,
                liters: isWateringDay ? (totalDailyLiters * intervalDays) : 0,
                duration: isWateringDay ? `${runHours * intervalDays}h ${runMins}m` : 'Rest',
                optimal_time: isWateringDay ? '05:30 AM - 08:30 AM (or after 06:00 PM)' : '-'
            });
        }

        renderIrrigationResults({
            crop: cropData.name,
            kc,
            et0: et0_mm_day.toFixed(1),
            etc: etc_mm_day,
            totalDailyLiters,
            waterSavedLiters,
            waterSavingsPercent,
            systemName: systemData.name,
            runHours,
            runMins,
            intervalDays,
            schedule: schedule7Days
        });
    }

    // ─── Render Results to DOM ─────────────────────────────────────────────────

    function renderIrrigationResults(plan) {
        // Daily Water Requirement
        const dailyLitersEl = document.getElementById('ipDailyLiters');
        const etcEl = document.getElementById('ipEtcVal');
        const runTimeEl = document.getElementById('ipPumpRunTime');
        const savingsEl = document.getElementById('ipWaterSavings');
        const savingsBar = document.getElementById('ipSavingsBar');

        if (dailyLitersEl) dailyLitersEl.textContent = `${(plan.totalDailyLiters / 1000).toFixed(1)}k L / day`;
        if (etcEl) etcEl.textContent = `${plan.etc} mm/day (Kc: ${plan.kc})`;
        if (runTimeEl) runTimeEl.textContent = `${plan.runHours} hrs ${plan.runMins} mins / day`;
        if (savingsEl) savingsEl.textContent = `${plan.waterSavingsPercent}% Water Saved vs Flood`;
        if (savingsBar) savingsBar.style.width = `${Math.min(100, plan.waterSavingsPercent)}%`;

        // Render 7-Day Schedule Cards
        const scheduleContainer = document.getElementById('ipScheduleGrid');
        if (scheduleContainer) {
            scheduleContainer.innerHTML = plan.schedule.map(s => {
                const borderClass = s.should_water
                    ? 'border-blue-400 bg-blue-50/60 shadow-sm ring-1 ring-blue-300'
                    : 'border-gray-200 bg-gray-50 opacity-75';

                const icon = s.should_water ? 'fa-faucet-drip text-blue-600' : 'fa-sun text-amber-500';
                const badge = s.should_water
                    ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">Irrigate</span>'
                    : '<span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Rest</span>';

                return `
                    <div class="p-3 rounded-xl border ${borderClass} flex flex-col justify-between transition-all">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <p class="text-xs font-bold text-gray-800">${s.day_label}</p>
                                <p class="text-[10px] text-gray-500">${s.date_str}</p>
                            </div>
                            ${badge}
                        </div>
                        <div class="my-1">
                            <div class="flex items-center gap-1.5 text-xs font-bold ${s.should_water ? 'text-blue-900' : 'text-gray-500'}">
                                <i class="fas ${icon}"></i>
                                <span>${s.should_water ? `${(s.liters / 1000).toFixed(1)}k Litres` : 'No Irrigation'}</span>
                            </div>
                            ${s.should_water ? `<p class="text-[10px] text-blue-700 mt-1"><i class="fas fa-clock mr-1"></i>Run: ${s.duration}</p>` : ''}
                        </div>
                        ${s.should_water ? `<p class="text-[9px] text-gray-500 italic mt-2 border-t pt-1">Best window: Morning/Evening</p>` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // ─── Export Global API ─────────────────────────────────────────────────────

    window.AgroVisionIrrigation = {
        open: openIrrigationPlannerModal,
        close: closeIrrigationPlannerModal,
        onInputChange,
        calculate: calculateIrrigationPlan
    };

    window.openIrrigationPlannerModal = openIrrigationPlannerModal;
    window.closeIrrigationPlannerModal = closeIrrigationPlannerModal;

})();
