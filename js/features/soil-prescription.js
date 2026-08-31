/**
 * AgroVision Precision Soil Lab & Dynamic Fertilizer Prescription
 * Standalone ES/Global Feature Module
 */

(function () {
    'use strict';

    const PH_RANGES = {
        'Very Acidic':       { min: 0,   max: 5.0,  color: '#ef4444', desc: 'Severe acidity. Phosphorus locked. Lime needed.' },
        'Acidic':            { min: 5.0, max: 6.0,  color: '#f97316', desc: 'Moderate acidity. Apply agricultural lime.' },
        'Slightly Acidic':   { min: 6.0, max: 6.5,  color: '#eab308', desc: 'Good for potatoes and specific legumes.' },
        'Optimal (Neutral)': { min: 6.5, max: 7.5,  color: '#22c55e', desc: 'Ideal for maximum nutrient uptake.' },
        'Slightly Alkaline': { min: 7.5, max: 8.0,  color: '#eab308', desc: 'Adequate. Zinc/Iron micro-nutrients may be needed.' },
        'Alkaline (Saline)': { min: 8.0, max: 8.8,  color: '#f97316', desc: 'High pH. Apply gypsum or sulfur amendments.' },
        'Very Alkaline':     { min: 8.8, max: 14.0, color: '#ef4444', desc: 'Sodic soil hazard. Urgent gypsum reclamation.' }
    };

    const DEFAULT_CROP_PRESETS = {
        'Wheat':     { n: 80,  p: 50,  k: 60,  ph: 6.8 },
        'Rice':      { n: 110, p: 45,  k: 70,  ph: 6.5 },
        'Maize':     { n: 95,  p: 55,  k: 50,  ph: 6.6 },
        'Cotton':    { n: 85,  p: 45,  k: 55,  ph: 7.2 },
        'Sugarcane': { n: 160, p: 75,  k: 90,  ph: 7.0 },
        'Soybean':   { n: 30,  p: 65,  k: 50,  ph: 6.7 },
        'Groundnut': { n: 25,  p: 50,  k: 45,  ph: 6.5 },
        'Mustard':   { n: 70,  p: 40,  k: 35,  ph: 7.1 },
        'Potato':    { n: 130, p: 90,  k: 110, ph: 5.8 },
        'Bajra':     { n: 65,  p: 35,  k: 35,  ph: 7.4 }
    };

    let state = {
        crop: 'Wheat',
        area: 2.0,
        areaUnit: 'acres',
        soilN: 80,
        soilP: 50,
        soilK: 60,
        soilPH: 6.5,
        prescription: null,
        loading: false
    };

    // ─── Modal Open/Close ───────────────────────────────────────────────────────

    function openSoilPrescriptionModal() {
        const modal = document.getElementById('soilPrescriptionModal');
        if (!modal) return;
        modal.classList.add('active');
        initValues();
        calculatePrescription();
    }

    function closeSoilPrescriptionModal() {
        const modal = document.getElementById('soilPrescriptionModal');
        if (modal) modal.classList.remove('active');
    }

    function initValues() {
        const cropSelect = document.getElementById('spCropSelect');
        const areaInput = document.getElementById('spAreaInput');
        const nSlider = document.getElementById('spSliderN');
        const pSlider = document.getElementById('spSliderP');
        const kSlider = document.getElementById('spSliderK');
        const phSlider = document.getElementById('spSliderPH');

        if (cropSelect) cropSelect.value = state.crop;
        if (areaInput) areaInput.value = state.area;
        if (nSlider) nSlider.value = state.soilN;
        if (pSlider) pSlider.value = state.soilP;
        if (kSlider) kSlider.value = state.soilK;
        if (phSlider) phSlider.value = state.soilPH;

        updateLiveStatusIndicators();
    }

    // ─── Live Indicator Updates ────────────────────────────────────────────────

    function onCropChange(cropName) {
        state.crop = cropName;
        const preset = DEFAULT_CROP_PRESETS[cropName];
        if (preset) {
            state.soilN = preset.n;
            state.soilP = preset.p;
            state.soilK = preset.k;
            state.soilPH = preset.ph;
            initValues();
        }
        calculatePrescription();
    }

    function onSliderChange(metric, value) {
        const numVal = parseFloat(value);
        if (metric === 'n') state.soilN = numVal;
        if (metric === 'p') state.soilP = numVal;
        if (metric === 'k') state.soilK = numVal;
        if (metric === 'ph') state.soilPH = numVal;
        if (metric === 'area') state.area = Math.max(0.1, numVal);

        updateLiveStatusIndicators();
        debouncedCalculate();
    }

    let debounceTimer = null;
    function debouncedCalculate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculatePrescription, 300);
    }

    function updateLiveStatusIndicators() {
        // Nitrogen
        const nValEl = document.getElementById('spValN');
        const nBadge = document.getElementById('spBadgeN');
        if (nValEl) nValEl.textContent = `${state.soilN} kg/ha`;
        if (nBadge) {
            const status = state.soilN < 50 ? { t: 'Deficient', c: 'bg-red-100 text-red-700' }
                         : state.soilN <= 120 ? { t: 'Optimal', c: 'bg-green-100 text-green-700' }
                         : { t: 'Excess', c: 'bg-amber-100 text-amber-700' };
            nBadge.textContent = status.t;
            nBadge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${status.c}`;
        }

        // Phosphorus
        const pValEl = document.getElementById('spValP');
        const pBadge = document.getElementById('spBadgeP');
        if (pValEl) pValEl.textContent = `${state.soilP} kg/ha`;
        if (pBadge) {
            const status = state.soilP < 30 ? { t: 'Deficient', c: 'bg-red-100 text-red-700' }
                         : state.soilP <= 70 ? { t: 'Optimal', c: 'bg-green-100 text-green-700' }
                         : { t: 'Excess', c: 'bg-amber-100 text-amber-700' };
            pBadge.textContent = status.t;
            pBadge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${status.c}`;
        }

        // Potassium
        const kValEl = document.getElementById('spValK');
        const kBadge = document.getElementById('spBadgeK');
        if (kValEl) kValEl.textContent = `${state.soilK} kg/ha`;
        if (kBadge) {
            const status = state.soilK < 40 ? { t: 'Deficient', c: 'bg-red-100 text-red-700' }
                         : state.soilK <= 80 ? { t: 'Optimal', c: 'bg-green-100 text-green-700' }
                         : { t: 'Excess', c: 'bg-amber-100 text-amber-700' };
            kBadge.textContent = status.t;
            kBadge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${status.c}`;
        }

        // pH Scale
        const phValEl = document.getElementById('spValPH');
        const phBadge = document.getElementById('spBadgePH');
        const phDescEl = document.getElementById('spDescPH');

        if (phValEl) phValEl.textContent = state.soilPH.toFixed(1);

        let activePhRange = PH_RANGES['Optimal (Neutral)'];
        for (const [key, range] of Object.entries(PH_RANGES)) {
            if (state.soilPH >= range.min && state.soilPH < range.max) {
                activePhRange = range;
                if (phBadge) {
                    phBadge.textContent = key;
                    phBadge.style.color = range.color;
                }
                if (phDescEl) phDescEl.textContent = range.desc;
                break;
            }
        }
    }

    // ─── Prescription Calculation ──────────────────────────────────────────────

    async function calculatePrescription() {
        const baseUrl = window.AGRIFARMERS_CONFIG?.otpApiBaseUrl || '';
        const loadingIndicator = document.getElementById('spLoading');
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');

        try {
            const response = await fetch(`${baseUrl}/api/agrovision/soil-calc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    crop: state.crop,
                    area_acres: state.area,
                    soil_n: state.soilN,
                    soil_p: state.soilP,
                    soil_k: state.soilK,
                    soil_ph: state.soilPH
                })
            });

            if (response.ok) {
                const data = await response.json();
                state.prescription = data;
                renderPrescription(data);
            } else {
                throw new Error('API response not ok');
            }
        } catch (err) {
            console.warn('Soil API fallback to local calculator:', err.message);
            const fallbackData = computeLocalPrescription();
            state.prescription = fallbackData;
            renderPrescription(fallbackData);
        } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    function computeLocalPrescription() {
        const area = state.area;
        const nDef = Math.max(0, 100 - state.soilN * 0.4);
        const pDef = Math.max(0, 50 - state.soilP * 0.4);
        const kDef = Math.max(0, 50 - state.soilK * 0.3);

        const dapKgAcre = Math.round(pDef / 0.46);
        const remN = Math.max(0, nDef - (dapKgAcre * 0.18));
        const ureaKgAcre = Math.round(remN / 0.46);
        const mopKgAcre = Math.round(kDef / 0.60);

        const totalUrea = Math.round(ureaKgAcre * area);
        const totalDap = Math.round(dapKgAcre * area);
        const totalMop = Math.round(mopKgAcre * area);

        const ureaBags = Math.ceil(totalUrea / 45);
        const dapBags = Math.ceil(totalDap / 50);
        const mopBags = Math.ceil(totalMop / 50);

        const totalCost = (ureaBags * 266.50) + (dapBags * 1350) + (mopBags * 1700);

        return {
            success: true,
            crop: state.crop,
            area_acres: area,
            fertilizer_prescription: {
                urea: { total_kg: totalUrea, bags_45kg: ureaBags, cost_inr: Math.round(ureaBags * 266.50) },
                dap:  { total_kg: totalDap,  bags_50kg: dapBags,  cost_inr: Math.round(dapBags * 1350) },
                mop:  { total_kg: totalMop,  bags_50kg: mopBags,  cost_inr: Math.round(mopBags * 1700) }
            },
            total_estimated_cost_inr: Math.round(totalCost),
            application_schedule: [
                {
                    stage: 'Basal Dose (Sowing)',
                    timing: 'Day 0',
                    fertilizers: [
                        { name: 'DAP', amount_kg: totalDap, note: 'Full Phosphorus starter' },
                        { name: 'MOP (Potash)', amount_kg: Math.round(totalMop * 0.75), note: '75% Potassium' },
                        { name: 'Urea', amount_kg: Math.round(totalUrea * 0.33), note: '33% Nitrogen starter' }
                    ],
                    advice: 'Drill 5 cm below seed level.'
                },
                {
                    stage: 'First Top Dressing (Tillering / Vegetative)',
                    timing: '21-25 Days After Sowing (with 1st irrigation)',
                    fertilizers: [
                        { name: 'Urea', amount_kg: Math.round(totalUrea * 0.33), note: '33% Nitrogen' }
                    ],
                    advice: 'Broadcast when field is moist.'
                },
                {
                    stage: 'Second Top Dressing (Panicle Initiation)',
                    timing: '45-50 Days After Sowing',
                    fertilizers: [
                        { name: 'Urea', amount_kg: Math.round(totalUrea * 0.34), note: 'Remaining Nitrogen' },
                        { name: 'MOP (Potash)', amount_kg: Math.round(totalMop * 0.25), note: 'Grain filling boost' }
                    ],
                    advice: 'Ensures plump grains and prevents lodging.'
                }
            ],
            organic_recommendations: [
                'Incorporate 2-3 tons of Farm Yard Manure (FYM) or Vermicompost before sowing.',
                'Use Azotobacter / Rhizobium liquid bio-fertilizer @ 250ml/acre for seed inoculation.'
            ]
        };
    }

    // ─── Render Results to DOM ─────────────────────────────────────────────────

    function renderPrescription(data) {
        const fp = data.fertilizer_prescription;

        // Bag counters
        const ureaBagsEl = document.getElementById('spUreaBags');
        const dapBagsEl = document.getElementById('spDapBags');
        const mopBagsEl = document.getElementById('spMopBags');
        const totalCostEl = document.getElementById('spTotalCost');

        if (ureaBagsEl) ureaBagsEl.textContent = `${fp.urea.bags_45kg} Bags (${fp.urea.total_kg} kg)`;
        if (dapBagsEl) dapBagsEl.textContent = `${fp.dap.bags_50kg} Bags (${fp.dap.total_kg} kg)`;
        if (mopBagsEl) mopBagsEl.textContent = `${fp.mop.bags_50kg} Bags (${fp.mop.total_kg} kg)`;
        if (totalCostEl) totalCostEl.textContent = `₹${data.total_estimated_cost_inr.toLocaleString('en-IN')}`;

        // Timeline Schedule
        const timelineEl = document.getElementById('spScheduleTimeline');
        if (timelineEl && data.application_schedule) {
            timelineEl.innerHTML = data.application_schedule.map((st, idx) => `
                <div class="relative pl-6 pb-6 last:pb-0 border-l-2 border-green-300 ml-2">
                    <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow"></div>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-green-400 transition-colors">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">${st.stage}</h4>
                            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                                <i class="fas fa-clock mr-1"></i>${st.timing}
                            </span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            ${st.fertilizers.map(f => `
                                <div class="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-gray-100">
                                    <span class="font-medium text-gray-700">${f.name}</span>
                                    <span class="font-bold text-green-700">${f.amount_kg !== undefined ? `${f.amount_kg} kg` : (f.amount || '')}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p class="text-xs text-gray-600 italic">💡 ${st.advice}</p>
                    </div>
                </div>
            `).join('');
        }

        // Organic recommendations
        const organicListEl = document.getElementById('spOrganicList');
        if (organicListEl && data.organic_recommendations) {
            organicListEl.innerHTML = data.organic_recommendations.map(rec => `
                <li class="flex items-start gap-2 text-xs text-green-900">
                    <i class="fas fa-check-circle text-green-600 mt-0.5 flex-shrink-0"></i>
                    <span>${rec}</span>
                </li>
            `).join('');
        }
    }

    // ─── Export Global API ─────────────────────────────────────────────────────

    window.AgroVisionSoil = {
        open: openSoilPrescriptionModal,
        close: closeSoilPrescriptionModal,
        onCropChange,
        onSliderChange,
        calculate: calculatePrescription
    };

    window.openSoilPrescriptionModal = openSoilPrescriptionModal;
    window.closeSoilPrescriptionModal = closeSoilPrescriptionModal;

})();
