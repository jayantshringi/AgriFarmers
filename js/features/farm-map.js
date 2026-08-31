/**
 * AgroVision Interactive Farm Map — Nearby Mandis, KVKs & Certified Dealers
 * Standalone ES/Global Feature Module using Leaflet.js
 */

(function () {
    'use strict';

    // Comprehensive agricultural facility registry for northern & central India
    const AGRI_FACILITIES = [
        // Punjab
        {
            id: 'mandi-khanna',
            name: 'Khanna Grain Market (Asia’s Largest)',
            category: 'mandi',
            state: 'Punjab',
            district: 'Ludhiana',
            lat: 30.7071,
            lng: 76.2166,
            address: 'APMC Yard, Grand Trunk Rd, Khanna, Punjab 141401',
            phone: '+91 1628 226100',
            hours: '06:00 AM - 07:00 PM',
            commodities: 'Wheat (₹2450/Q), Paddy (₹2280/Q), Maize (₹2150/Q)',
            rating: '4.8'
        },
        {
            id: 'mandi-sirhind',
            name: 'Fatehgarh Sahib APMC Mandi',
            category: 'mandi',
            state: 'Punjab',
            district: 'Fatehgarh Sahib',
            lat: 30.6425,
            lng: 76.3980,
            address: 'Main Mandi Complex, Sirhind, Punjab',
            phone: '+91 1763 232210',
            hours: '07:00 AM - 06:00 PM',
            commodities: 'Wheat (₹2440/Q), Mustard (₹5400/Q)',
            rating: '4.6'
        },
        {
            id: 'kvk-ludhiana',
            name: 'ICAR - Krishi Vigyan Kendra (PAU)',
            category: 'lab',
            state: 'Punjab',
            district: 'Ludhiana',
            lat: 30.9010,
            lng: 75.8073,
            address: 'Punjab Agricultural University Campus, Ludhiana',
            phone: '+91 161 2401960',
            hours: '09:00 AM - 05:00 PM',
            services: 'Free Soil Testing, Seed Certification, Agronomy Advisory',
            rating: '4.9'
        },
        {
            id: 'dealer-iffco-ludhiana',
            name: 'IFFCO Farmer Service Center (Ludhiana)',
            category: 'dealer',
            state: 'Punjab',
            district: 'Ludhiana',
            lat: 30.8850,
            lng: 75.8450,
            address: 'Near Railway Overbridge, Ludhiana Central',
            phone: '+91 161 2774433',
            hours: '08:30 AM - 06:30 PM',
            products: 'Nano Urea, DAP (Subsidized), Bio-fertilizers, Quality Hybrid Seeds',
            rating: '4.7'
        },

        // Haryana
        {
            id: 'mandi-karnal',
            name: 'Karnal Anaj Mandi',
            category: 'mandi',
            state: 'Haryana',
            district: 'Karnal',
            lat: 29.6857,
            lng: 76.9905,
            address: 'New Grain Market, Sector 12, Karnal, Haryana',
            phone: '+91 184 2252130',
            hours: '06:30 AM - 07:30 PM',
            commodities: 'Basmati Rice (₹3850/Q), Wheat (₹2460/Q)',
            rating: '4.7'
        },
        {
            id: 'mandi-sirsa',
            name: 'Sirsa Cotton & Grain Market',
            category: 'mandi',
            state: 'Haryana',
            district: 'Sirsa',
            lat: 29.5349,
            lng: 75.0298,
            address: 'Mandi Dabwali Rd, Sirsa, Haryana',
            phone: '+91 1666 220045',
            hours: '06:00 AM - 08:00 PM',
            commodities: 'Raw Cotton (₹7150/Q), Mustard (₹5450/Q), Guar',
            rating: '4.8'
        },
        {
            id: 'kvk-karnal',
            name: 'ICAR-CSSRI Central Soil Salinity Research Institute',
            category: 'lab',
            state: 'Haryana',
            district: 'Karnal',
            lat: 29.7042,
            lng: 76.9586,
            address: 'Zarifa Farm, Kachhwa Road, Karnal, Haryana 132001',
            phone: '+91 184 2290501',
            hours: '09:00 AM - 05:00 PM',
            services: 'Alkaline/Saline Soil Remediation, Gypsum Advisory, Water Testing',
            rating: '4.9'
        },
        {
            id: 'dealer-nsc-hisar',
            name: 'National Seeds Corporation (NSC) Regional Store',
            category: 'dealer',
            state: 'Haryana',
            district: 'Hisar',
            lat: 29.1492,
            lng: 75.7217,
            address: 'Opp. CCS HAU Gate 4, Hisar, Haryana',
            phone: '+91 1662 276450',
            hours: '09:00 AM - 06:00 PM',
            products: 'Certified Wheat (HD 3086, DBW 187), Hybrid Bajra, Moong Seeds',
            rating: '4.8'
        },

        // Rajasthan
        {
            id: 'mandi-ganganagar',
            name: 'Sri Ganganagar Krishi Upaj Mandi',
            category: 'mandi',
            state: 'Rajasthan',
            district: 'Ganganagar',
            lat: 29.9038,
            lng: 73.8772,
            address: 'Grain Market Yard, Sri Ganganagar, Rajasthan',
            phone: '+91 154 2460120',
            hours: '06:00 AM - 07:00 PM',
            commodities: 'Mustard (₹5480/Q), Wheat (₹2430/Q), Kinnow',
            rating: '4.7'
        },
        {
            id: 'mandi-jaipur',
            name: 'Jaipur Muhana Mandi',
            category: 'mandi',
            state: 'Rajasthan',
            district: 'Jaipur',
            lat: 26.8124,
            lng: 75.7623,
            address: 'Muhana Terminal Market, Sanganer, Jaipur',
            phone: '+91 141 2731800',
            hours: '05:00 AM - 08:00 PM',
            commodities: 'Vegetables, Pulses, Barley (₹1950/Q), Mustard',
            rating: '4.6'
        },
        {
            id: 'kvk-jaipur',
            name: 'KVK Durgapura Soil Testing Lab',
            category: 'lab',
            state: 'Rajasthan',
            district: 'Jaipur',
            lat: 26.8485,
            lng: 75.7925,
            address: 'Agricultural Research Station, Durgapura, Jaipur',
            phone: '+91 141 2550229',
            hours: '09:30 AM - 05:00 PM',
            services: 'Soil Micro-Nutrient Mapping, Organic Carbon Testing',
            rating: '4.8'
        },
        {
            id: 'dealer-kribhco-jaipur',
            name: 'KRIBHCO Fertilizer & Seed Depot',
            category: 'dealer',
            state: 'Rajasthan',
            district: 'Jaipur',
            lat: 26.8850,
            lng: 75.8050,
            address: 'Industrial Area, 22 Godam, Jaipur',
            phone: '+91 141 2212345',
            hours: '08:30 AM - 06:00 PM',
            products: 'Urea, Zinc Sulfate, Potassium Schoenite, Bio-NPK',
            rating: '4.7'
        },

        // Custom Hiring Centers (Farm Machinery)
        {
            id: 'chc-ludhiana',
            name: 'Punjab Agro Custom Hiring Center (CHC)',
            category: 'chc',
            state: 'Punjab',
            district: 'Ludhiana',
            lat: 30.8200,
            lng: 75.8800,
            address: 'Rural Development Block, Ludhiana',
            phone: '+91 161 2890123',
            hours: '07:00 AM - 07:00 PM',
            services: 'Super Seeder, Happy Seeder, Laser Land Leveler, Drone Spraying (₹250/acre)',
            rating: '4.9'
        }
    ];

    let map = null;
    let markersLayer = null;
    let activeFilter = 'all';
    let userCoords = { lat: 30.7071, lng: 76.2166 }; // Default: Punjab agricultural hub
    let searchQuery = '';

    // ─── Modal Open/Close ───────────────────────────────────────────────────────

    function openFarmMapModal() {
        const modal = document.getElementById('farmMapModal');
        if (!modal) return;
        modal.classList.add('active');

        // Resolve user coordinates from AgriFarmers state if available
        if (window.userLocation && window.userLocation.lat && window.userLocation.lon) {
            userCoords = { lat: window.userLocation.lat, lng: window.userLocation.lon };
        } else if (window.currentUser && window.currentUser.state === 'Haryana') {
            userCoords = { lat: 29.6857, lng: 76.9905 };
        } else if (window.currentUser && window.currentUser.state === 'Rajasthan') {
            userCoords = { lat: 26.8124, lng: 75.7623 };
        }

        setTimeout(initMap, 200);
    }

    function closeFarmMapModal() {
        const modal = document.getElementById('farmMapModal');
        if (modal) modal.classList.remove('active');
    }

    // ─── Map Initialization (Leaflet.js) ───────────────────────────────────────

    function initMap() {
        const mapContainer = document.getElementById('farmMapContainer');
        if (!mapContainer || typeof L === 'undefined') {
            console.warn('Leaflet or map container not ready');
            return;
        }

        if (map) {
            map.invalidateSize();
            return;
        }

        // Initialize Leaflet Map
        map = L.map('farmMapContainer', {
            center: [userCoords.lat, userCoords.lng],
            zoom: 9,
            zoomControl: true
        });

        // OpenStreetMap clean tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors | AgroVision AgriFarmers'
        }).addTo(map);

        // Marker Group Layer
        markersLayer = L.layerGroup().addTo(map);

        // User Location Marker
        const userIcon = L.divIcon({
            className: 'custom-user-pin',
            html: `
                <div class="relative flex items-center justify-center w-8 h-8">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-6 w-6 bg-green-600 border-2 border-white shadow-lg items-center justify-center text-white text-xs">
                        <i class="fas fa-user"></i>
                    </span>
                </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('<b>Your Farm Location</b><br>Centering precision mandi & dealer search')
            .openPopup();

        renderFacilityMarkers();
        renderFacilityList();
    }

    // ─── Marker Rendering ──────────────────────────────────────────────────────

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    }

    function getCategoryConfig(category) {
        switch (category) {
            case 'mandi':
                return { label: 'APMC Mandi', icon: 'fa-wheat-awn', color: '#16a34a', bg: '#dcfce7' };
            case 'lab':
                return { label: 'Soil Testing / KVK', icon: 'fa-flask-vial', color: '#2563eb', bg: '#dbeafe' };
            case 'dealer':
                return { label: 'Seed & Fertilizer', icon: 'fa-seedling', color: '#9333ea', bg: '#f3e8ff' };
            case 'chc':
                return { label: 'Drone & Machinery', icon: 'fa-tractor', color: '#ea580c', bg: '#ffedd5' };
            default:
                return { label: 'Agri Facility', icon: 'fa-location-dot', color: '#4b5563', bg: '#f3f4f6' };
        }
    }

    function renderFacilityMarkers() {
        if (!map || !markersLayer) return;
        markersLayer.clearLayers();

        const filtered = getFilteredFacilities();

        filtered.forEach(fac => {
            const cfg = getCategoryConfig(fac.category);
            const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, fac.lat, fac.lng);

            const iconHtml = `
                <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md text-white font-bold" style="background-color: ${cfg.color}">
                    <i class="fas ${cfg.icon} text-xs"></i>
                </div>
            `;

            const customIcon = L.divIcon({
                className: 'custom-mandi-pin',
                html: iconHtml,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });

            const popupContent = `
                <div class="p-1 max-w-xs">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background-color: ${cfg.bg}; color: ${cfg.color};">
                            ${cfg.label}
                        </span>
                        <span class="text-xs font-bold text-gray-500">${dist} km</span>
                    </div>
                    <h4 class="font-bold text-sm text-gray-900 leading-tight mb-1">${fac.name}</h4>
                    <p class="text-xs text-gray-600 mb-2">${fac.address}</p>
                    
                    ${fac.commodities ? `<p class="text-xs font-semibold text-green-700 bg-green-50 p-1.5 rounded mb-2">🌾 ${fac.commodities}</p>` : ''}
                    ${fac.services ? `<p class="text-xs font-semibold text-blue-700 bg-blue-50 p-1.5 rounded mb-2">🧪 ${fac.services}</p>` : ''}
                    ${fac.products ? `<p class="text-xs font-semibold text-purple-700 bg-purple-50 p-1.5 rounded mb-2">📦 ${fac.products}</p>` : ''}

                    <div class="flex items-center justify-between pt-2 border-t text-xs">
                        <a href="tel:${fac.phone}" class="font-bold text-green-600 hover:underline">
                            <i class="fas fa-phone mr-1"></i>${fac.phone}
                        </a>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${fac.lat},${fac.lng}" target="_blank" rel="noopener"
                            class="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md">
                            Directions
                        </a>
                    </div>
                </div>
            `;

            const marker = L.marker([fac.lat, fac.lng], { icon: customIcon });
            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
        });
    }

    function getFilteredFacilities() {
        return AGRI_FACILITIES.filter(fac => {
            const matchesCat = activeFilter === 'all' || fac.category === activeFilter;
            const matchesSearch = !searchQuery || 
                fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                fac.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (fac.commodities && fac.commodities.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCat && matchesSearch;
        });
    }

    // ─── Render Facility Sidebar List ──────────────────────────────────────────

    function renderFacilityList() {
        const listContainer = document.getElementById('farmFacilityList');
        if (!listContainer) return;

        const filtered = getFilteredFacilities().map(fac => {
            fac._distance = calculateDistanceKm(userCoords.lat, userCoords.lng, fac.lat, fac.lng);
            return fac;
        }).sort((a, b) => a._distance - b._distance);

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-500 text-sm">No facilities match your search.</div>`;
            return;
        }

        listContainer.innerHTML = filtered.map(fac => {
            const cfg = getCategoryConfig(fac.category);
            return `
                <div onclick="window.AgroVisionMap.focusFacility('${fac.id}')"
                    class="p-3 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-400 rounded-xl cursor-pointer transition-all">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white" style="background-color: ${cfg.color}">
                                <i class="fas ${cfg.icon}"></i>
                            </span>
                            <span class="text-[11px] font-bold uppercase tracking-wider" style="color: ${cfg.color}">${cfg.label}</span>
                        </div>
                        <span class="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">${fac._distance} km</span>
                    </div>
                    <h4 class="font-bold text-sm text-gray-800 mb-1">${fac.name}</h4>
                    <p class="text-xs text-gray-500 mb-2 line-clamp-1">${fac.address}</p>
                    ${fac.commodities ? `<div class="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded mb-2">${fac.commodities}</div>` : ''}
                    <div class="flex items-center justify-between text-xs pt-1 border-t">
                        <span class="text-gray-500"><i class="fas fa-clock mr-1"></i>${fac.hours}</span>
                        <a href="tel:${fac.phone}" onclick="event.stopPropagation()" class="font-semibold text-green-600">
                            <i class="fas fa-phone mr-1"></i>Call
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setFilter(cat) {
        activeFilter = cat;
        ['all', 'mandi', 'lab', 'dealer', 'chc'].forEach(c => {
            const btn = document.getElementById(`mapFilterBtn_${c}`);
            if (btn) {
                if (c === cat) {
                    btn.classList.add('bg-green-600', 'text-white');
                    btn.classList.remove('bg-gray-100', 'text-gray-700');
                } else {
                    btn.classList.remove('bg-green-600', 'text-white');
                    btn.classList.add('bg-gray-100', 'text-gray-700');
                }
            }
        });

        renderFacilityMarkers();
        renderFacilityList();
    }

    function onSearchInput(query) {
        searchQuery = query.trim();
        renderFacilityMarkers();
        renderFacilityList();
    }

    function focusFacility(facId) {
        const fac = AGRI_FACILITIES.find(f => f.id === facId);
        if (!fac || !map) return;

        map.flyTo([fac.lat, fac.lng], 13, { duration: 1.2 });
    }

    // ─── Export Global API ─────────────────────────────────────────────────────

    window.AgroVisionMap = {
        open: openFarmMapModal,
        close: closeFarmMapModal,
        setFilter,
        onSearchInput,
        focusFacility
    };

    window.openFarmMapModal = openFarmMapModal;
    window.closeFarmMapModal = closeFarmMapModal;

})();
