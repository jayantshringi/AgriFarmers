// ── AgriFarmers Main Application Engine (js/app.js) ──────────────────────────
window.__AGRIFARMERS_APP_LOADED__ = true;

// ── PWA Core Variables ────────────────────────────────────────────────────────
let deferredPrompt = null;
let isAppInstalled = false;
let offlineIndicatorTimer = null;

// Check if app is already installed
function checkIfAppIsInstalled() {
    // Method 1: Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 App is running in standalone mode (already installed)');
        return true;
    }

    // Method 2: Check for iOS standalone
    if (window.navigator.standalone === true) {
        console.log('📱 App is running in iOS standalone mode (already installed)');
        return true;
    }

    // Method 3: Check localStorage
    if (localStorage.getItem('pwa_installed') === 'true') {
        console.log('📱 App marked as installed in localStorage');
        return true;
    }

    return false;
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('🎯 beforeinstallprompt event fired!');
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
    setTimeout(() => {
        if (deferredPrompt && !checkIfAppIsInstalled()) {
            showInstallBanner();
        }
    }, 5000);
    console.log('✅ Install prompt is available');
});

// Listen for appinstalled event
window.addEventListener('appinstalled', (evt) => {
    console.log('🎉 PWA was installed successfully!');
    isAppInstalled = true;
    localStorage.setItem('pwa_installed', 'true');
    hideInstallUI();
    updatePWAStatus();
    showToast('AgriFarmers installed successfully!', 'success');
});

function showInstallButton() {
    if (checkIfAppIsInstalled()) { hideInstallUI(); return; }
    const installButton = document.getElementById('installButton');
    if (installButton && deferredPrompt) {
        installButton.classList.remove('hidden');
    }
}

function showInstallBanner() {
    if (checkIfAppIsInstalled() || !deferredPrompt) return;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('show');
}

function hideInstallUI() {
    const installButton = document.getElementById('installButton');
    const banner = document.getElementById('installBanner');
    if (installButton) installButton.classList.add('hidden');
    if (banner) banner.classList.remove('show');
}

async function installPWA() {
    if (!deferredPrompt) {
        showToast('Installation not available in this browser', 'info');
        return;
    }
    hideInstallUI();
    deferredPrompt.prompt();
    try {
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('✅ User accepted the PWA installation');
        } else {
            showToast('Installation cancelled', 'info');
            setTimeout(() => {
                if (!checkIfAppIsInstalled()) showInstallButton();
            }, 30000);
        }
        deferredPrompt = null;
    } catch (error) {
        console.error('❌ Error during installation:', error);
        showToast('Installation failed. Please try again.', 'error');
    }
}

function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
}

function forcePWAInstall() {
    if (!deferredPrompt) {
        alert('Installation not available. Try using:\n1. Chrome/Edge on desktop\n2. Visit this page again\n3. Make sure you are online');
        return;
    }
    installPWA();
}

function diagnosePWA() {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const displayMode  = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' :
                         window.navigator.standalone ? 'iOS standalone' : 'browser';
    const results = [
        `📄 Manifest: ${manifestLink ? '✅ FOUND' : '❌ NOT FOUND'}`,
        `🛠️ Service Worker: ${'serviceWorker' in navigator ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`,
        `🎯 Install Prompt: ${deferredPrompt ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`,
        `📱 Display Mode: ${displayMode}`,
        `🔒 HTTPS: ${window.location.protocol === 'https:' ? '✅ YES' : '❌ NO'}`
    ];
    alert('PWA Diagnostic Results:\n\n' + results.join('\n'));
}

function updatePWAStatus() {
    const statusEl = document.getElementById('pwaStatus');
    if (!statusEl) return;
    if (checkIfAppIsInstalled()) {
        statusEl.textContent = '✅ Installed as PWA';
        statusEl.className = 'text-green-300';
    } else if (deferredPrompt) {
        statusEl.textContent = '⚠️ Can be installed';
        statusEl.className = 'text-yellow-300';
    } else {
        statusEl.textContent = '❌ Not installable';
        statusEl.className = 'text-red-300';
    }
}

// HTML escaping utility to neutralize XSS in dynamic DOM interpolations
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getOpenWeatherApiKey() {
    return window.AGRIFARMERS_CONFIG?.openWeatherApiKey || window.AGRIFARMERS_OPENWEATHER_KEY || '';
}

function getBackendWeatherBaseUrl() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return null;
    }
    return window.AGRIFARMERS_CONFIG?.otpApiBaseUrl || '';
}

// Show toast notification (single definition — used by both PWA and app sections)
function showToast(message, type = 'success') {
    document.querySelectorAll('.custom-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-green-100 text-green-800 border border-green-200'
                     : type === 'error'   ? 'bg-red-100 text-red-800 border border-red-200'
                     :                      'bg-blue-100 text-blue-800 border border-blue-200';
    const icon = type === 'success' ? 'fa-check-circle'
               : type === 'error'   ? 'fa-exclamation-circle'
               :                      'fa-info-circle';
    toast.className = `custom-toast ${colorClass}`;
    toast.innerHTML = `<div class="flex items-center"><i class="fas ${icon} mr-2"></i><span>${escapeHtml(message)}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3000);
}

function initPWA() {
    console.log('🌱 Initializing PWA...');
    isAppInstalled = checkIfAppIsInstalled();
    updatePWAStatus();
    setInterval(updatePWAStatus, 5000);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js?v=7.5')
            .then(registration => {
                console.log('✅ Service Worker v7.5 registered:', registration.scope);
                // Immediately check server for new worker
                registration.update().catch(() => {});
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ action: 'skipWaiting' });
                                console.log('🔄 New Service Worker installed & activated');
                            }
                        });
                    }
                });
            })
            .catch(err => console.error('❌ Service Worker registration failed:', err));

        // Purge obsolete caches on window side to clear old assets
        if ('caches' in window) {
            caches.keys().then(keys => {
                keys.forEach(k => {
                    if (k !== 'agrifarmers-static-v7.5' && k !== 'agrifarmers-v7.5') {
                        console.log('🧹 Purging obsolete window cache:', k);
                        caches.delete(k);
                    }
                });
            }).catch(() => {});
        }
    }
}

// Expose PWA functions globally
window.installPWA = installPWA;
window.hideInstallBanner = hideInstallBanner;
window.forcePWAInstall = forcePWAInstall;
window.diagnosePWA = diagnosePWA;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', initPWA);

// ── Main Application Script ────────────────────────────────────────────────────
console.log('🚜 AgriFarmers App Initializing...');

// Clean and humanize administrative names (e.g. "Jaipur Municipal Corporation" -> "Jaipur")
function cleanLocationName(rawName) {
    if (!rawName) return '';
    let cleaned = rawName
        .replace(/\bRajsthan\b/gi, 'Rajasthan')
        .replace(/\s*Municipal Corporation\b/gi, '')
        .replace(/\s*Nagar Nigam\b/gi, '')
        .replace(/\s*Mahanagar Palika\b/gi, '')
        .replace(/\s*Municipal Council\b/gi, '')
        .replace(/\s*Municipality\b/gi, '')
        .replace(/\s*Cantonment Board\b/gi, '')
        .replace(/\s*Tehsil\b/gi, '')
        .replace(/\s*Resgil\b/gi, '')
        .replace(/\s*Sub-district\b/gi, '')
        .replace(/\s*Subdistrict\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,+/g, ',')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^,\s*|\s*,\s*$/g, '')
        .trim();

    // Reconcile Amer / Amber and sub-localities/tehsils of Jaipur to the unified district "Jaipur, Rajasthan"
    if (/\b(Amber|Amer|Sanganer|Jhotwara|Sodala|Mansarovar|Malviya Nagar|Vaishali Nagar|Vidyadhar Nagar|Jagatpura|Durgapura|Sitapura)\b/i.test(cleaned)) {
        if (/\bRajasthan\b/i.test(cleaned)) {
            cleaned = 'Jaipur, Rajasthan';
        } else {
            cleaned = cleaned.replace(/\b(Amber|Amer|Sanganer|Jhotwara|Sodala|Mansarovar|Malviya Nagar|Vaishali Nagar|Vidyadhar Nagar|Jagatpura|Durgapura|Sitapura)\b/gi, 'Jaipur');
        }
    }

    // Clean up any formatting artifacts and duplicated city/state names
    cleaned = cleaned
        .replace(/Jaipur(?:\s*,\s*|\s+)Jaipur/gi, 'Jaipur')
        .replace(/Rajasthan(?:\s*,\s*|\s+)Rajasthan/gi, 'Rajasthan')
        .replace(/,\s*,+/g, ',')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^,\s*|\s*,\s*$/g, '')
        .trim();

    return cleaned;
}
window.cleanLocationName = cleanLocationName;

// Automatically purge and sanitize obsolete administrative strings stored in localStorage
function sanitizeStoredUserData() {
    try {
        const raw = localStorage.getItem('agrifarmers_user');
        if (raw) {
            const u = JSON.parse(raw);
            let changed = false;
            if (u.locationName) {
                const cleaned = cleanLocationName(u.locationName);
                if (cleaned !== u.locationName) { u.locationName = cleaned; changed = true; }
            }
            if (u.district) {
                const cleaned = cleanLocationName(u.district);
                if (cleaned !== u.district) { u.district = cleaned; changed = true; }
            }
            if (u.location) {
                if (u.location.formatted) {
                    const cleaned = cleanLocationName(u.location.formatted);
                    if (cleaned !== u.location.formatted) { u.location.formatted = cleaned; changed = true; }
                }
                if (u.location.city) {
                    const cleaned = cleanLocationName(u.location.city);
                    if (cleaned !== u.location.city) { u.location.city = cleaned; changed = true; }
                }
            }
            if (changed) {
                console.log('🧹 Cleaned obsolete administrative location labels from stored profile');
                localStorage.setItem('agrifarmers_user', JSON.stringify(u));
            }
        }
    } catch (_) {}
}
// Execute immediately on script parse
sanitizeStoredUserData();

// Global Variables
let currentUser = null;
let currentLanguage = localStorage.getItem('agrifarmers_language') || 'hi';
window.currentLanguage = currentLanguage;
let userLocation = null;
let otpTimer = null;
let otpTimeLeft = 120;
let isOnline = navigator.onLine;

// Language Data
const translations = window.translations || {};

// Initialize the application
function bootstrapApp() {
    console.log('🌱 AgriFarmers App Initializing...');
    
    // Immediately hide loading screen and show app without artificial delay
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    const app = document.getElementById('app');
    if (app && app.style.display === 'none') app.style.display = 'block';
    initApp();
    
    // Load saved language preference - strictly default to Hindi ('hi')
    let savedLang = localStorage.getItem('agrifarmers_language');
    if (!savedLang || savedLang === 'undefined' || savedLang === 'null') {
        savedLang = 'hi';
    }
    currentLanguage = savedLang;
    window.currentLanguage = currentLanguage;
    changeLanguage(savedLang);
    
    // Update online status
    updateOnlineStatus();
    
    // Add event listeners for online/offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    console.log('✅ AgriFarmers App Loaded Successfully');
}

// Fallback safety: ensure loading screen never hangs
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && loadingScreen.style.display !== 'none') {
        loadingScreen.style.display = 'none';
        const app = document.getElementById('app');
        if (app) app.style.display = 'block';
    }
}, 1500);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
    bootstrapApp();
}

// Simple initialization
function initApp() {
    // Remove legacy agroVisionBadge element if present from cached DOM
    const agroBadge = document.getElementById('agroVisionBadge');
    if (agroBadge) agroBadge.remove();

    // Set current date
    updateDate();

    // Session restore is handled by initAuthListener() in auth.js
    // which runs automatically via the <script type="module"> block in <head>.
    // We still keep a fast localStorage check so the UI doesn't flash welcome page:
    const savedUser = localStorage.getItem('agrifarmers_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showPage('homePage');
            updateUserInfo();
            loadDashboardData();
            const logoutBtn = document.getElementById('logoutButton');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
        } catch (e) {
            console.log('Error parsing saved user, clearing cache:', e);
            localStorage.removeItem('agrifarmers_user');
        }
    }
    
    // Initialize OTP inputs if OTP page exists
    const otpContainer = document.getElementById('otpContainer');
    if (otpContainer) {
        initOTPInputs();
    }
    
    // Complete 28 Indian States & 8 Union Territories with verified districts
    const INDIAN_DISTRICTS = {
        // 28 States
        'Andhra Pradesh': [
            'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
            'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
            'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'NTR',
            'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Srikakulam', 'Sri Potti Sriramulu Nellore',
            'Sri Sathya Sai', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
        ],
        'Arunachal Pradesh': [
            'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
            'Itanagar Capital Complex', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Leparada',
            'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri',
            'Namsai', 'Pakke-Kessang', 'Papum Pare', 'Shi-Yomi', 'Siang',
            'Tawang', 'Tirap', 'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri',
            'West Kameng', 'West Siang'
        ],
        'Assam': [
            'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon',
            'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji',
            'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat',
            'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup Metropolitan', 'Kamrup Rural',
            'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli',
            'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur',
            'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'
        ],
        'Bihar': [
            'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
            'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
            'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
            'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
            'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
            'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
            'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
            'Supaul', 'Vaishali', 'West Champaran'
        ],
        'Chhattisgarh': [
            'Balod', 'Baloda Bazar-Bhatapara', 'Balrampur-Ramanujganj', 'Bastar', 'Bemetara',
            'Bijapur', 'Bilaspur', 'Dakshin Bastar Dantewada', 'Dhamtari', 'Durg',
            'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
            'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Koriya',
            'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur',
            'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh',
            'Sukma', 'Surajpur', 'Surguja'
        ],
        'Goa': [
            'North Goa', 'South Goa'
        ],
        'Gujarat': [
            'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
            'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
            'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
            'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana',
            'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
            'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
            'Tapi', 'Vadodara', 'Valsad'
        ],
        'Haryana': [
            'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
            'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal',
            'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
            'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
            'Sonipat', 'Yamunanagar'
        ],
        'Himachal Pradesh': [
            'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur',
            'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur',
            'Solan', 'Una'
        ],
        'Jharkhand': [
            'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
            'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
            'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
            'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
            'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
        ],
        'Karnataka': [
            'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
            'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
            'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
            'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
            'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
            'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'
        ],
        'Kerala': [
            'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
            'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
            'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
        ],
        'Madhya Pradesh': [
            'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat',
            'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
            'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
            'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
            'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
            'Khandwa', 'Khargone', 'Maihar', 'Mandla', 'Mandsaur',
            'Mauganj', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari',
            'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
            'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni',
            'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi',
            'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
        ],
        'Maharashtra': [
            'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara',
            'Buldhana', 'Chandrapur', 'Chhatrapati Sambhaji Nagar', 'Dharashiv', 'Dhule',
            'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
            'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
            'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani',
            'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
            'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
        ],
        'Manipur': [
            'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
            'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney',
            'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
        ],
        'Meghalaya': [
            'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills',
            'Ri-Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills',
            'West Jaintia Hills', 'West Khasi Hills'
        ],
        'Mizoram': [
            'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib',
            'Lawngtlai', 'Lunglei', 'Mamit', 'Saitual', 'Serchhip', 'Siaha'
        ],
        'Nagaland': [
            'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng',
            'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren',
            'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha', 'Zunheboto'
        ],
        'Odisha': [
            'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak',
            'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati',
            'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
            'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput',
            'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
            'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
        ],
        'Punjab': [
            'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
            'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
            'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
            'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur',
            'Shaheed Bhagat Singh Nagar (Nawanshahr)', 'Sri Muktsar Sahib', 'Tarn Taran'
        ],
        'Rajasthan': [
            'Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara',
            'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara',
            'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
            'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu', 'Dungarpur',
            'Gangapur City', 'Hanumangarh', 'Jaipur', 'Jaipur Rural', 'Jaisalmer',
            'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Jodhpur Rural',
            'Karauli', 'Kekri', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror',
            'Nagaur', 'Neem Ka Thana', 'Pali', 'Phalodi', 'Pratapgarh',
            'Rajsamand', 'Salumbar', 'Sanchore', 'Sawai Madhopur', 'Shahpura',
            'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'
        ],
        'Sikkim': [
            'Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'
        ],
        'Tamil Nadu': [
            'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
            'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
            'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
            'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
            'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
            'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
            'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
            'Vellore', 'Viluppuram', 'Virudhunagar'
        ],
        'Telangana': [
            'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial',
            'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
            'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial',
            'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
            'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
            'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
            'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
        ],
        'Tripura': [
            'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala',
            'South Tripura', 'Unakoti', 'West Tripura'
        ],
        'Uttar Pradesh': [
            'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha',
            'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich',
            'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly',
            'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr',
            'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
            'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
            'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur',
            'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi',
            'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar',
            'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba',
            'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur',
            'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj',
            'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
            'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
            'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
        ],
        'Uttarakhand': [
            'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
            'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag',
            'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'
        ],
        'West Bengal': [
            'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
            'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram',
            'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia',
            'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
            'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'
        ],
        // Union Territories
        'Andaman and Nicobar Islands': [
            'Nicobar', 'North and Middle Andaman', 'South Andaman'
        ],
        'Chandigarh': [
            'Chandigarh'
        ],
        'Dadra and Nagar Haveli and Daman and Diu': [
            'Dadra and Nagar Haveli', 'Daman', 'Diu'
        ],
        'Delhi': [
            'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
            'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
        ],
        'Jammu & Kashmir': [
            'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda',
            'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam',
            'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban',
            'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
        ],
        'Ladakh': [
            'Kargil', 'Leh'
        ],
        'Lakshadweep': [
            'Lakshadweep'
        ],
        'Puducherry': [
            'Karaikal', 'Mahe', 'Puducherry', 'Yanam'
        ]
    };
    INDIAN_DISTRICTS['Jammu and Kashmir'] = INDIAN_DISTRICTS['Jammu & Kashmir'];
    window.INDIAN_DISTRICTS = INDIAN_DISTRICTS;

    const stateSelect = document.getElementById('signUpState');
    if (stateSelect) {
        stateSelect.addEventListener('change', function() {
            const state = this.value;
            const districtSelect = document.getElementById('signUpDistrict');
            const districts = INDIAN_DISTRICTS;
            
            districtSelect.innerHTML = `<option value="">${translations[currentLanguage]?.selectDistrict || 'Select District'}</option>`;
            
            if (state && districts[state]) {
                districts[state].forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
                districtSelect.disabled = false;
            } else {
                districtSelect.disabled = true;
            }

            // Auto-switch to native state language if defined
            if (state && window.STATE_TO_LANGUAGE && window.STATE_TO_LANGUAGE[state]) {
                const nativeLang = window.STATE_TO_LANGUAGE[state];
                if (nativeLang && nativeLang !== currentLanguage) {
                    changeLanguage(nativeLang);
                }
            }
        });
    }
    
    // Initialize language dropdown toggle
    const languageButton = document.getElementById('languageButton');
    const languageDropdown = document.getElementById('languageDropdown');
    if (languageButton && languageDropdown) {
        languageButton.addEventListener('click', function(e) {
            e.stopPropagation();
            languageDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!languageButton.contains(event.target) && !languageDropdown.contains(event.target)) {
                languageDropdown.classList.add('hidden');
            }
        });
    }
    
    // Initialize features slider with auto-slide and dots
    initFeaturesSlider();
}

function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const localeMap = {
            en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', bn: 'bn-IN',
            mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', gu: 'gu-IN',
            kn: 'kn-IN', ml: 'ml-IN', or: 'or-IN', as: 'as-IN', ur: 'ur-IN'
        };
        const locale = localeMap[currentLanguage] || 'hi-IN';
        try {
            dateElement.textContent = date.toLocaleDateString(locale, options);
        } catch (e) {
            dateElement.textContent = date.toLocaleDateString('hi-IN', options);
        }
    }
}

// Initialize features slider with auto-slide and active dots
function initFeaturesSlider() {
    const slider = document.getElementById('featuresSlider');
    const dots = document.querySelectorAll('.scroll-dot');
    
    if (!slider || !dots.length) return;
    
    // Update dots based on scroll position
    function updateDots() {
        const scrollLeft = slider.scrollLeft;
        const slideWidth = slider.clientWidth;
        const slideIndex = Math.round(scrollLeft / slideWidth);
        
        dots.forEach((dot, index) => {
            if (index === slideIndex) {
                dot.classList.remove('bg-gray-300');
                dot.classList.add('bg-green-500');
                dot.classList.add('active');
            } else {
                dot.classList.remove('bg-green-500');
                dot.classList.remove('active');
                dot.classList.add('bg-gray-300');
            }
        });
    }
    
    // Auto slide every 5 seconds
    let slideInterval = setInterval(() => {
        const scrollAmount = slider.scrollLeft + slider.clientWidth;
        if (scrollAmount >= slider.scrollWidth) {
            slider.scrollLeft = 0;
        } else {
            slider.scrollLeft = scrollAmount;
        }
        updateDots();
    }, 5000);
    
    // Update dots on scroll
    slider.addEventListener('scroll', updateDots);
    
    // Pause auto-slide on hover
    slider.addEventListener('mouseenter', () => {
        clearInterval(slideInterval);
    });
    
    slider.addEventListener('mouseleave', () => {
        slideInterval = setInterval(() => {
            const scrollAmount = slider.scrollLeft + slider.clientWidth;
            if (scrollAmount >= slider.scrollWidth) {
                slider.scrollLeft = 0;
            } else {
                slider.scrollLeft = scrollAmount;
            }
            updateDots();
        }, 5000);
    });
    
    // Dot click events
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            slider.scrollLeft = index * slider.clientWidth;
            updateDots();
            // Reset auto-slide timer
            clearInterval(slideInterval);
            slideInterval = setInterval(() => {
                const scrollAmount = slider.scrollLeft + slider.clientWidth;
                if (scrollAmount >= slider.scrollWidth) {
                    slider.scrollLeft = 0;
                } else {
                    slider.scrollLeft = scrollAmount;
                }
                updateDots();
            }, 5000);
        });
    });
    
    // Initial update
    updateDots();
}

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Handle logout button visibility
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        if (pageId === 'homePage') {
            logoutBtn.classList.remove('hidden');
        } else {
            logoutBtn.classList.add('hidden');
        }
    }
    
    // Special handling for different pages
    if (pageId === 'homePage') {
        updateUserInfo();
        loadDashboardData();
    } else if (pageId === 'otpPage') {
        startOTPTimer();
        // Initialize OTP inputs when showing OTP page
        initOTPInputs();
    }
}

// Initialize OTP inputs
function initOTPInputs() {
    const container = document.getElementById('otpContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'otp-digit';
        input.dataset.index = i;
        input.id = 'otpDigit_' + i;
        input.name = 'otp_' + i;
        input.setAttribute('aria-label', 'Digit ' + (i + 1));
        input.autocomplete = i === 0 ? 'one-time-code' : 'off';
        input.inputMode = 'numeric';
        
        input.addEventListener('input', function(e) {
            // Only allow numbers
            this.value = this.value.replace(/\D/g, '');
            
            if (this.value.length === 1) {
                const nextIndex = parseInt(this.dataset.index) + 1;
                const nextInput = container.querySelector(`[data-index="${nextIndex}"]`);
                if (nextInput) nextInput.focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0) {
                const prevIndex = parseInt(this.dataset.index) - 1;
                const prevInput = container.querySelector(`[data-index="${prevIndex}"]`);
                if (prevInput) {
                    prevInput.focus();
                    prevInput.value = '';
                }
            }
        });
        
        container.appendChild(input);
    }
    
    // Focus first input
    const firstInput = container.querySelector('[data-index="0"]');
    if (firstInput) firstInput.focus();
}

// ── Handle Login (sends TextBee OTP) ──────────────────

// ── Handle Sign Up (validates form, then sends TextBee OTP) ──

// Start OTP timer
function startOTPTimer() {
    clearInterval(otpTimer);
    otpTimeLeft = 120;
    
    const timerElement = document.getElementById('otpTimer');
    const resendButton = document.getElementById('resendOTP');
    
    if (timerElement) {
        timerElement.textContent = '02:00';
    }
    
    if (resendButton) {
        resendButton.disabled = true;
        resendButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            if (resendButton) {
                resendButton.disabled = false;
                resendButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
        
        otpTimeLeft--;
    }, 1000);
}

// ── Verify OTP (server-side TextBee OTP check) ────────────────────────

// ── Resend OTP ───────────────────────────────────────────────

// ─── Real-Time Precision Location & GPS Tracking Engine ──────────────────────

let liveWatchId = null;

// Distance calculation using Haversine formula (km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

// Multi-tier real-time client IP Geolocation fallback
async function fetchIpGeolocation() {
    // Tier 1: BigDataCloud client IP geolocation (Fast, CORS-friendly, accurate for India)
    try {
        const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                const city = data.locality || data.city || data.principalSubdivisionDistrict || '';
                const state = data.principalSubdivision || '';
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    accuracy: 2500,
                    city: city || 'Your Location',
                    state: state || '',
                    formatted: (city && state) ? `${city}, ${state}` : (city || state || 'Your Location'),
                    source: 'ip'
                };
            }
        }
    } catch (e) {
        console.warn('BigDataCloud IP geolocation error:', e.message);
    }

    // Tier 2: ipwho.is client IP geolocation
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                const city = data.city || '';
                const state = data.region || '';
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    accuracy: 5000,
                    city: city || 'Your Location',
                    state: state || '',
                    formatted: (city && state) ? `${city}, ${state}` : (city || state || 'Your Location'),
                    source: 'ip'
                };
            }
        }
    } catch (e) {
        console.warn('ipwho.is IP geolocation error:', e.message);
    }

    return null;
}

// Multi-tier high-accuracy reverse geocoding
async function reverseGeocodeCoords(lat, lon) {
    const apiKey = getOpenWeatherApiKey();
    const backendBase = getBackendWeatherBaseUrl();

    // Tier 1: OpenWeather Geocoding (via client key if set, or secure backend /api/weather/reverse proxy)
    const owReverseUrl = apiKey
        ? `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
        : (backendBase !== null ? `${backendBase}/api/weather/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` : null);

    if (owReverseUrl) {
        try {
            const owRes = await fetch(owReverseUrl);
            if (owRes.ok) {
                const payload = await owRes.json();
                const list = Array.isArray(payload) ? payload : payload?.results;
                if (Array.isArray(list) && list.length > 0) {
                    const item = list[0];
                    const rawCity = item.name || '';
                    const city = cleanLocationName(rawCity) || rawCity;
                    const state = item.state || '';
                    if (city || state) {
                        const formatted = cleanLocationName(state ? `${city}, ${state}` : city);
                        return {
                            city: city || 'Your Location',
                            state: state || '',
                            formatted: formatted || `${city}, ${state}`,
                            source: 'OpenWeather'
                        };
                    }
                }
            }
        } catch (_) {}
    }

    // Tier 2: BigDataCloud Reverse Geocoding Client
    try {
        const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (bdcRes.ok) {
            const geo = await bdcRes.json();
            const rawLocality = geo.locality || geo.city || geo.principalSubdivisionDistrict || '';
            const city = cleanLocationName(rawLocality) || rawLocality;
            const state = geo.principalSubdivision || '';
            if (city || state) {
                const formatted = cleanLocationName(state ? `${city}, ${state}` : city);
                return {
                    city: city || 'Your Location',
                    state: state || '',
                    formatted: formatted || `${city}, ${state}`,
                    source: 'BigDataCloud'
                };
            }
        }
    } catch (_) {}

    // Tier 3: OpenStreetMap Nominatim
    try {
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
        });
        if (nomRes.ok) {
            const data = await nomRes.json();
            const addr = data.address || {};
            const rawCity = addr.city || addr.town || addr.village || addr.suburb || addr.district || addr.county || addr.state_district || 'Your Location';
            const city = cleanLocationName(rawCity) || rawCity;
            const state = addr.state || '';
            const formatted = cleanLocationName(state ? `${city}, ${state}` : city);
            return {
                city,
                state,
                formatted: formatted || `${city}, ${state}`,
                source: 'OSM'
            };
        }
    } catch (_) {}

    return null;
}

// Render formatted location in header badge without duplicate icons
function renderLocationUI(loc, isLive = true) {
    const farmerLocation = document.getElementById('farmerLocation');
    const statusIcon = document.getElementById('locationStatusIcon');
    if (!farmerLocation) return;

    if (!loc) {
        farmerLocation.textContent = 'Location unavailable';
        return;
    }

    const rawFormatted = loc.formatted || (loc.state ? `${loc.city}, ${loc.state}` : loc.city);
    const formattedLoc = cleanLocationName(rawFormatted) || rawFormatted;
    const coordsStr = (typeof loc.lat === 'number' && typeof loc.lon === 'number')
        ? `${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E`
        : '';

    const sourceBadge = (loc.source === 'gps')
        ? `<span class="bg-emerald-500/40 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono ml-1 font-bold">● Live GPS</span>`
        : (loc.source === 'verified_farm' || loc.source === 'manual_verified')
            ? `<span class="bg-emerald-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono ml-1 font-bold">● Farm (Synced)</span>`
            : loc.source === 'ip'
                ? `<span class="bg-sky-500/40 text-sky-100 text-[10px] px-1.5 py-0.5 rounded font-mono ml-1 font-bold">● Net IP</span>`
                : `<span class="bg-amber-500/40 text-amber-100 text-[10px] px-1.5 py-0.5 rounded font-mono ml-1 font-bold">Profile</span>`;

    farmerLocation.innerHTML = `<span class="font-bold">${escapeHtml(formattedLoc)}</span> ${coordsStr ? `<span class="text-[10px] opacity-80 font-mono">(${coordsStr})</span>` : ''} ${sourceBadge}`;

    if (statusIcon) {
        statusIcon.className = (loc.source === 'gps' || loc.source === 'verified_farm' || loc.source === 'manual_verified')
            ? 'fas fa-location-crosshairs text-yellow-300' 
            : 'fas fa-location-dot text-emerald-200';
    }
}

// Update user info - preserves live location if detected
function updateUserInfo() {
    if (!currentUser) return;
    
    const farmerName = document.getElementById('farmerName');
    const farmerLocation = document.getElementById('farmerLocation');
    
    if (farmerName) farmerName.textContent = currentUser.name || 'Farmer';
    
    if (farmerLocation) {
        // If live userLocation exists, preserve live location in header
        if (window.userLocation && window.userLocation.formatted) {
            renderLocationUI(window.userLocation, window.userLocation.source !== 'fallback');
        } else if (currentUser.locationName) {
            farmerLocation.innerHTML = `<span class="font-bold">${escapeHtml(cleanLocationName(currentUser.locationName))}</span>`;
        } else if (currentUser.district && currentUser.state) {
            farmerLocation.innerHTML = `<span class="font-bold">${escapeHtml(cleanLocationName(currentUser.district))}, ${escapeHtml(currentUser.state)}</span>`;
        }
    }
}

// Acquire live location: High Accuracy GPS -> Standard Accuracy GPS -> IP Geolocation
async function acquireLivePosition(forceRefresh = false) {
    if (navigator.geolocation) {
        // 1. High Accuracy GPS (fast 6s timeout)
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 6000,
                    maximumAge: forceRefresh ? 0 : 30000
                });
            });
            return {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                source: 'gps'
            };
        } catch (highErr) {
            console.warn('High-accuracy GPS timeout/unavailable, falling back to standard accuracy:', highErr.message);
            // 2. Standard accuracy (Wi-Fi/Cell tower location - works indoors and on laptops)
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 5000,
                        maximumAge: forceRefresh ? 0 : 60000
                    });
                });
                return {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    source: 'gps'
                };
            } catch (stdErr) {
                console.warn('Standard geolocation failed or denied:', stdErr.message);
            }
        }
    }

    // 3. Fallback: Real-time IP Geolocation (Zero permission needed, instant live coordinates)
    console.log('🌐 Querying live IP Geolocation fallback...');
    const ipGeo = await fetchIpGeolocation();
    if (ipGeo) {
        return ipGeo;
    }

    return null;
}

// Start continuous background GPS watching for farmers moving on fields
function startLiveLocationTracking() {
    if (!navigator.geolocation || liveWatchId !== null) return;
    
    try {
        liveWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const accuracy = pos.coords.accuracy;

                // Update if moved more than 200m or if previous location was IP/fallback
                const distanceMoved = userLocation 
                    ? calculateDistanceKm(userLocation.lat, userLocation.lon, lat, lon) 
                    : 1;

                if (distanceMoved > 0.2 || userLocation?.source !== 'gps') {
                    console.log(`📍 Live GPS position updated (moved ${distanceMoved.toFixed(2)} km)`);
                    const geo = await reverseGeocodeCoords(lat, lon);
                    const city = geo?.city || userLocation?.city || 'Your Location';
                    const state = geo?.state || userLocation?.state || '';
                    const formatted = geo?.formatted || ((city && state) ? `${city}, ${state}` : city);

                    userLocation = {
                        lat,
                        lon,
                        accuracy,
                        source: 'gps',
                        city,
                        state,
                        formatted,
                        timestamp: Date.now()
                    };
                    window.userLocation = userLocation;

                    renderLocationUI(userLocation, true);
                    window.dispatchEvent(new CustomEvent('agrifarmers:location-updated', { detail: userLocation }));
                    loadWeatherData(lat, lon, formatted);
                }
            },
            (err) => {
                console.warn('Geolocation watch notice:', err.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 15000
            }
        );
    } catch (_) {}
}

function stopLiveLocationTracking() {
    if (liveWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(liveWatchId);
        liveWatchId = null;
    }
}

// Auto-detect GPS/Network location during Signup
async function autoDetectSignupLocation() {
    const btn = document.getElementById('autoDetectLocBtn');
    const stateSelect = document.getElementById('signUpState');
    const districtSelect = document.getElementById('signUpDistrict');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin text-emerald-600"></i> Detecting Live Location...`;
    }

    try {
        const pos = await acquireLivePosition(true);
        if (!pos) {
            showToast('Could not detect location. Please select State & District manually.', 'info');
            return;
        }

        const lat = pos.coords ? pos.coords.latitude : pos.lat;
        const lon = pos.coords ? pos.coords.longitude : pos.lon;
        window.signupDetectedLocation = { lat, lon, source: pos.source || 'gps' };

        // Reverse geocode
        const geo = await reverseGeocodeCoords(lat, lon);
        const detectedState = geo?.state || pos.state || '';
        const detectedCity = geo?.city || pos.city || '';

        // Match state in dropdown
        if (stateSelect && detectedState) {
            let matchedOption = Array.from(stateSelect.options).find(o => 
                o.value && (
                    o.value.toLowerCase() === detectedState.toLowerCase() ||
                    detectedState.toLowerCase().includes(o.value.toLowerCase()) ||
                    o.value.toLowerCase().includes(detectedState.toLowerCase())
                )
            );

            if (matchedOption) {
                stateSelect.value = matchedOption.value;
                stateSelect.dispatchEvent(new Event('change'));
            } else {
                const opt = document.createElement('option');
                opt.value = detectedState;
                opt.textContent = detectedState;
                stateSelect.appendChild(opt);
                stateSelect.value = detectedState;
                stateSelect.dispatchEvent(new Event('change'));
            }
        }

        // Match district in dropdown
        if (districtSelect && detectedCity) {
            districtSelect.disabled = false;
            let matchedDistrict = Array.from(districtSelect.options).find(o => 
                o.value && (
                    o.value.toLowerCase() === detectedCity.toLowerCase() ||
                    detectedCity.toLowerCase().includes(o.value.toLowerCase()) ||
                    o.value.toLowerCase().includes(detectedCity.toLowerCase())
                )
            );

            if (matchedDistrict) {
                districtSelect.value = matchedDistrict.value;
            } else {
                const opt = document.createElement('option');
                opt.value = detectedCity;
                opt.textContent = detectedCity;
                districtSelect.appendChild(opt);
                districtSelect.value = detectedCity;
            }
        }

        const formatted = geo?.formatted || pos.formatted || (detectedState ? `${detectedCity}, ${detectedState}` : detectedCity);
        const sourceLabel = pos.source === 'gps' ? 'Live GPS' : 'Live Network';
        showToast(`📍 Location auto-detected (${sourceLabel}): ${formatted}`, 'success');

    } catch (e) {
        console.error('Signup autodetect error:', e);
        showToast('Location detection error. Please select State & District manually.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-crosshairs text-emerald-600"></i> <span id="autoDetectLocBtn">Auto-Detect State & District with GPS</span>`;
        }
    }
}

// Get real-time accurate user location with high precision GPS & IP fallback
async function getUserLocation(forceRefresh = false) {
    const farmerLocation = document.getElementById('farmerLocation');
    const updateIcon = document.getElementById('updateGpsIcon');
    const modalRefreshBtn = document.getElementById('weatherModalRefreshBtn');
    const modalRefreshIcon = document.getElementById('weatherModalRefreshIcon');

    if (farmerLocation) {
        farmerLocation.innerHTML = `<i class="fas fa-spinner fa-spin text-xs mr-1 text-yellow-300"></i>Detecting live location...`;
    }
    if (updateIcon) updateIcon.classList.add('fa-spin');
    if (modalRefreshIcon) modalRefreshIcon.classList.add('fa-spin');
    if (modalRefreshBtn) modalRefreshBtn.disabled = true;

    try {
        const rawPos = await acquireLivePosition(forceRefresh);
        
        let lat, lon, accuracy, source;
        let city, state, formatted;

        if (rawPos) {
            lat = rawPos.lat;
            lon = rawPos.lon;
            accuracy = rawPos.accuracy || 100;
            source = rawPos.source || 'gps';

            const savedLoc = currentUser?.location || window.userLocation;
            const hasSavedCoords = Boolean(savedLoc && typeof savedLoc.lat === 'number' && typeof savedLoc.lon === 'number');
            const hasPinnedFarm = hasSavedCoords && (savedLoc.source === 'manual_verified' || savedLoc.source === 'verified_farm');

            // Cross-device Cloud Farm Sync:
            // If only IP geolocation is available (GPS unavailable/denied), preserve verified/pinned farm coordinates
            // so coarse ISP routing does not overwrite the farmer's real farm location.
            if (source === 'ip' && hasSavedCoords && (!forceRefresh || hasPinnedFarm)) {
                console.log('🌾 Using verified farm location from cloud profile');
                lat = savedLoc.lat;
                lon = savedLoc.lon;
                accuracy = savedLoc.accuracy || 20;
                source = savedLoc.source === 'manual_verified' ? 'manual_verified' : 'verified_farm';
                city = cleanLocationName(currentUser?.district || savedLoc.city || 'Your Farm');
                state = currentUser?.state || savedLoc.state || '';
                formatted = cleanLocationName(currentUser?.locationName || savedLoc.formatted || ((city && state) ? `${city}, ${state}` : city));
            } else {
                // High precision reverse geocode to get real-time city & district
                const geo = await reverseGeocodeCoords(lat, lon);
                city = cleanLocationName(geo?.city || rawPos.city || currentUser?.district || 'Your Location');
                state = geo?.state || rawPos.state || currentUser?.state || '';
                formatted = cleanLocationName(geo?.formatted || rawPos.formatted || ((city && state) ? `${city}, ${state}` : city));
            }
        } else {
            // Regional default fallback or user registered location
            if (currentUser?.location && currentUser.location.lat && currentUser.location.lon) {
                lat = currentUser.location.lat;
                lon = currentUser.location.lon;
                accuracy = 50;
                source = currentUser.location.source === 'manual_verified' ? 'manual_verified' : 'verified_farm';
                city = cleanLocationName(currentUser.district || currentUser.location.city || 'Your Farm');
                state = currentUser.state || currentUser.location.state || '';
                formatted = cleanLocationName(currentUser.locationName || currentUser.location.formatted || `${city}, ${state}`);
            } else {
                source = 'fallback';
                const fallbackCity = currentUser?.district || 'Jaipur';
                const fallbackState = currentUser?.state || 'Rajasthan';
                const stateCenters = {
                    'Haryana': { lat: 29.6857, lon: 76.9905 },
                    'Rajasthan': { lat: 26.8124, lon: 75.7623 },
                    'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
                    'Maharashtra': { lat: 19.7515, lon: 75.7139 },
                    'Punjab': { lat: 30.9010, lon: 75.8573 }
                };
                const defaultCoords = (currentUser?.state && stateCenters[currentUser.state]) || { lat: 26.8124, lon: 75.7623 };
                lat = defaultCoords.lat;
                lon = defaultCoords.lon;
                accuracy = 10000;
                city = fallbackCity;
                state = fallbackState;
                formatted = `${fallbackCity}, ${fallbackState}`;
            }
        }

        userLocation = {
            lat,
            lon,
            accuracy,
            source,
            city,
            state,
            formatted,
            timestamp: Date.now()
        };
        window.userLocation = userLocation;

        // Render UI
        renderLocationUI(userLocation, source !== 'fallback');

        // Persist to user profile
        if (currentUser) {
            // Only update district/state if this was genuine GPS or manual verified location (NOT rough laptop IP override)
            if (source !== 'ip') {
                currentUser.district = cleanLocationName(city);
                if (state) currentUser.state = state;
                currentUser.locationName = cleanLocationName(formatted);
                currentUser.location = { lat, lon, accuracy, source, city: cleanLocationName(city), state, formatted: cleanLocationName(formatted) };
                localStorage.setItem('agrifarmers_user', JSON.stringify(currentUser));

                // If mobile detected accurate GPS, automatically sync to cloud profile so laptop sees it!
                if (source === 'gps' && currentUser.mobile && window._updateUserLocation) {
                    window._updateUserLocation(currentUser.mobile, {
                        location: currentUser.location,
                        district: cleanLocationName(city),
                        state: state
                    }).catch(err => console.warn('Cloud location sync error:', err.message));
                }
            } else {
                // For laptop IP, store in session but preserve registered farm profile
                currentUser.location = currentUser.location || { lat, lon, accuracy, source, city: cleanLocationName(city), state, formatted: cleanLocationName(formatted) };
            }
        }

        // Notify user if force refreshed
        if (forceRefresh) {
            if (source === 'gps') {
                showToast(`📍 Live GPS: ${formatted} (±${Math.round(accuracy)}m)`, 'success');
            } else if (source === 'verified_farm' || source === 'manual_verified') {
                showToast(`🌾 Device GPS unavailable — using Verified Farm: ${formatted}`, 'info');
            } else if (source === 'ip') {
                showToast(`📍 Network Location: ${formatted}. Set your exact farm location to sync across devices.`, 'info');
            } else {
                showToast(`📍 Location set to ${formatted}.`, 'info');
            }
        }

        // Broadcast location update to features (map, irrigation, etc.)
        window.dispatchEvent(new CustomEvent('agrifarmers:location-updated', { detail: userLocation }));

        // Load weather with live coordinates and accurate location display
        await loadWeatherData(lat, lon, formatted);

        // Start background watchPosition for ongoing movement tracking
        startLiveLocationTracking();

    } catch (err) {
        console.error('Error fetching live location:', err);
        if (farmerLocation) {
            farmerLocation.textContent = currentUser?.district || 'Location Error';
        }
    } finally {
        if (updateIcon) updateIcon.classList.remove('fa-spin');
        const activeModalRefreshIcon = document.getElementById('weatherModalRefreshIcon');
        const activeModalRefreshBtn = document.getElementById('weatherModalRefreshBtn');
        if (activeModalRefreshIcon) activeModalRefreshIcon.classList.remove('fa-spin');
        if (activeModalRefreshBtn) activeModalRefreshBtn.disabled = false;
    }

    loadMarketData();
    loadSeedRecommendations();
}

// Open Set Farm Location modal
function openSetLocationModal() {
    const modal = document.getElementById('setFarmLocationModal');
    if (!modal) return;

    const activeDisplay = document.getElementById('currentActiveLocDisplay');
    const activeDetails = document.getElementById('currentActiveLocDetails');
    const input = document.getElementById('farmLocationSearchInput');

    if (activeDisplay) {
        activeDisplay.textContent = window.userLocation?.formatted || currentUser?.locationName || (currentUser?.district ? `${currentUser.district}, ${currentUser.state || ''}` : 'Location not set');
    }
    if (activeDetails) {
        const src = window.userLocation?.source || 'profile';
        const srcText = src === 'gps' ? 'Live Mobile GPS' : (src === 'verified_farm' || src === 'manual_verified') ? 'Verified Farm (Synced Across Devices)' : src === 'ip' ? 'Laptop Network / ISP' : 'Profile Default';
        const coords = (window.userLocation?.lat && window.userLocation?.lon) ? `${window.userLocation.lat.toFixed(3)}°N, ${window.userLocation.lon.toFixed(3)}°E` : '';
        activeDetails.textContent = coords ? `${srcText} • ${coords}` : srcText;
    }
    if (input) input.value = '';

    modal.classList.add('active');
}

// Shared multi-provider geocoding for city/village/mandi queries (India-prioritized)
async function geocodeLocationQuery(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return null;

    const apiKey = getOpenWeatherApiKey();
    const backendBase = getBackendWeatherBaseUrl();

    // Tier 1: OpenWeather Direct Geocoding (via client key if set, or secure backend /api/weather/geocode proxy)
    const owGeoUrl = apiKey
        ? `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(trimmed)},IN&limit=1&appid=${apiKey}`
        : (backendBase !== null ? `${backendBase}/api/weather/geocode?q=${encodeURIComponent(trimmed)}` : null);

    if (owGeoUrl) {
        try {
            const owRes = await fetch(owGeoUrl);
            if (owRes.ok) {
                const payload = await owRes.json();
                const list = Array.isArray(payload) ? payload : payload?.results;
                if (Array.isArray(list) && list.length > 0) {
                    const item = list[0];
                    const city = cleanLocationName(item.name) || item.name;
                    const state = item.state || '';
                    return {
                        lat: item.lat,
                        lon: item.lon,
                        city,
                        state,
                        formatted: cleanLocationName(state ? `${city}, ${state}` : city) || (state ? `${city}, ${state}` : city)
                    };
                }
            }
        } catch (_) {}
    }

    // Tier 2: Open-Meteo Geocoding API (Free, no API key required, CORS-enabled)
    try {
        const omRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`);
        if (omRes.ok) {
            const data = await omRes.json();
            const results = Array.isArray(data?.results) ? data.results : [];
            if (results.length > 0) {
                const item = results.find(r => r.country_code === 'IN') || results[0];
                const city = cleanLocationName(item.name) || item.name;
                const state = item.admin1 || '';
                return {
                    lat: item.latitude,
                    lon: item.longitude,
                    city,
                    state,
                    formatted: cleanLocationName(state ? `${city}, ${state}` : city) || (state ? `${city}, ${state}` : city)
                };
            }
        }
    } catch (_) {}

    // Tier 3: OpenStreetMap Nominatim Search
    try {
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&countrycodes=in&format=json&addressdetails=1&limit=1`, {
            headers: { 'Accept-Language': 'en' }
        });
        if (nomRes.ok) {
            const list = await nomRes.json();
            if (Array.isArray(list) && list.length > 0) {
                const item = list[0];
                const addr = item.address || {};
                const rawCity = addr.city || addr.town || addr.village || addr.county || addr.state_district || item.name || trimmed;
                const city = cleanLocationName(rawCity) || rawCity;
                const state = addr.state || '';
                return {
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    city,
                    state,
                    formatted: cleanLocationName(state ? `${city}, ${state}` : city) || (state ? `${city}, ${state}` : city)
                };
            }
        }
    } catch (_) {}

    return null;
}

// Search any city, district, village or mandi and lock it as farm location
async function searchAndSetFarmLocation() {
    const input = document.getElementById('farmLocationSearchInput');
    const btn = document.getElementById('searchLocBtn');
    const query = input?.value?.trim();

    if (!query) {
        showToast('Please enter a village, city or district name', 'error');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; }

    try {
        const item = await geocodeLocationQuery(query);
        if (!item || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) {
            showToast('Location not found. Please try entering a district or major town nearby.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-check"></i><span>Set</span>`; }
            return;
        }

        const city = item.city;
        const state = item.state || '';
        const formatted = item.formatted || (state ? `${city}, ${state}` : city);
        const newLocation = {
            lat: item.lat,
            lon: item.lon,
            accuracy: 15,
            source: 'manual_verified',
            city,
            state,
            formatted,
            timestamp: Date.now()
        };

        window.userLocation = newLocation;
        userLocation = newLocation;

        if (currentUser) {
            currentUser.district = city;
            if (state) currentUser.state = state;
            currentUser.locationName = formatted;
            currentUser.location = newLocation;
            localStorage.setItem('agrifarmers_user', JSON.stringify(currentUser));

            // Sync to cloud so other devices (e.g. mobile/laptop) immediately inherit it
            if (currentUser.mobile && window._updateUserLocation) {
                window._updateUserLocation(currentUser.mobile, {
                    location: newLocation,
                    district: city,
                    state: state
                }).catch(err => console.warn('Cloud sync error:', err.message));
            }
        }

        renderLocationUI(newLocation, true);
        window.dispatchEvent(new CustomEvent('agrifarmers:location-updated', { detail: newLocation }));
        await loadWeatherData(newLocation.lat, newLocation.lon, formatted);

        closeModal('setFarmLocationModal');
        showToast(`🌾 Farm location set to ${formatted} and synced across all devices!`, 'success');

    } catch (err) {
        console.error('Error setting farm location:', err);
        showToast('Failed to set location. Please try again.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-check"></i><span>Set</span>`; }
    }
}

// Trigger device GPS detection and close modal
function detectDeviceGpsAndSet() {
    closeModal('setFarmLocationModal');
    getUserLocation(true);
}

// Load dashboard data - reuses fresh location (< 5 min old) or fetches live
function loadDashboardData() {
    if (userLocation && userLocation.timestamp && (Date.now() - userLocation.timestamp < 300000)) {
        loadWeatherData(userLocation.lat, userLocation.lon, userLocation.formatted);
        loadMarketData();
        loadSeedRecommendations();
    } else {
        getUserLocation();
    }
}

let weatherRequestSeq = 0;

// Map WMO Weather Interpretation Codes (Open-Meteo) to OpenWeather-compatible condition + description
function mapWmoWeatherCode(code) {
    const c = Number(code);
    if (c === 0) return { main: 'Clear', description: 'clear sky', visibility: 10000 };
    if (c === 1) return { main: 'Clouds', description: 'few clouds', visibility: 10000 };
    if (c === 2) return { main: 'Clouds', description: 'scattered clouds', visibility: 10000 };
    if (c === 3) return { main: 'Clouds', description: 'overcast clouds', visibility: 9000 };
    if (c === 45 || c === 48) return { main: 'Fog', description: 'fog', visibility: 2000 };
    if (c >= 51 && c <= 57) return { main: 'Rain', description: 'light rain', visibility: 7000 };
    if (c === 61) return { main: 'Rain', description: 'light rain', visibility: 7000 };
    if (c === 63) return { main: 'Rain', description: 'moderate rain', visibility: 6000 };
    if (c >= 65 && c <= 67) return { main: 'Rain', description: 'heavy intensity rain', visibility: 4500 };
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { main: 'Snow', description: 'snow', visibility: 4000 };
    if (c >= 80 && c <= 82) return { main: 'Rain', description: 'shower rain', visibility: 5500 };
    if (c >= 95 && c <= 99) return { main: 'Thunderstorm', description: 'thunderstorm', visibility: 4500 };
    return { main: 'Clouds', description: 'scattered clouds', visibility: 10000 };
}

function parseLocalIsoToUnix(isoStr, fallbackUnix) {
    if (!isoStr || typeof isoStr !== 'string') return fallbackUnix;
    const ms = Date.parse(isoStr);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : fallbackUnix;
}

function getWeatherCacheKey(lat, lon) {
    return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}

function getCachedWeather(lat, lon) {
    try {
        const raw = localStorage.getItem('agrifarmers_weather_cache');
        if (!raw) return null;
        const store = JSON.parse(raw);
        const entry = store?.[getWeatherCacheKey(lat, lon)];
        if (!entry || !entry.weatherData) return null;
        // Reuse cached live weather for up to 12 hours when offline
        if (Date.now() - (entry.savedAt || 0) > 12 * 60 * 60 * 1000) return null;
        return entry;
    } catch (_) {
        return null;
    }
}

function saveCachedWeather(lat, lon, weatherData, forecastData) {
    try {
        const raw = localStorage.getItem('agrifarmers_weather_cache');
        const store = raw ? JSON.parse(raw) : {};
        store[getWeatherCacheKey(lat, lon)] = {
            savedAt: Date.now(),
            weatherData,
            forecastData
        };
        const keys = Object.keys(store);
        if (keys.length > 10) {
            keys.sort((a, b) => (store[a].savedAt || 0) - (store[b].savedAt || 0));
            for (let i = 0; i < keys.length - 10; i++) {
                delete store[keys[i]];
            }
        }
        localStorage.setItem('agrifarmers_weather_cache', JSON.stringify(store));
    } catch (_) {}
}

// Fetch live current weather + 5-day forecast from Open-Meteo (free, no API key required)
async function fetchOpenMeteoWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=6`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data || !data.current) {
        throw new Error('Open-Meteo returned incomplete weather payload');
    }

    const cur = data.current;
    const daily = data.daily || {};
    const mappedCur = mapWmoWeatherCode(cur.weather_code);
    const temp = Number(cur.temperature_2m);
    const feelsLike = Number.isFinite(Number(cur.apparent_temperature)) ? Number(cur.apparent_temperature) : temp;
    const tempMin = Array.isArray(daily.temperature_2m_min) && Number.isFinite(Number(daily.temperature_2m_min[0]))
        ? Number(daily.temperature_2m_min[0])
        : temp - 2;
    const tempMax = Array.isArray(daily.temperature_2m_max) && Number.isFinite(Number(daily.temperature_2m_max[0]))
        ? Number(daily.temperature_2m_max[0])
        : temp + 2;

    const nowSec = Math.floor(Date.now() / 1000);
    const sunriseSec = parseLocalIsoToUnix(daily.sunrise?.[0], nowSec - 21600);
    const sunsetSec = parseLocalIsoToUnix(daily.sunset?.[0], nowSec + 21600);

    const weatherData = {
        main: {
            temp,
            feels_like: feelsLike,
            humidity: Math.round(Number(cur.relative_humidity_2m ?? 55)),
            pressure: Math.round(Number(cur.surface_pressure ?? 1013)),
            temp_min: tempMin,
            temp_max: tempMax
        },
        weather: [{
            main: mappedCur.main,
            description: mappedCur.description
        }],
        wind: {
            speed: Math.round(Number(cur.wind_speed_10m ?? 0) * 10) / 10
        },
        visibility: mappedCur.visibility,
        sys: {
            sunrise: sunriseSec,
            sunset: sunsetSec
        },
        _provider: 'open-meteo'
    };

    let forecastData = null;
    if (Array.isArray(daily.time) && daily.time.length > 0) {
        const list = [];
        const count = Math.min(5, daily.time.length);
        for (let i = 0; i < count; i++) {
            const dateStr = daily.time[i];
            const dCode = daily.weather_code?.[i] ?? cur.weather_code;
            const dMapped = mapWmoWeatherCode(dCode);
            const dMax = Number(daily.temperature_2m_max?.[i] ?? temp);
            const dMin = Number(daily.temperature_2m_min?.[i] ?? dMax);
            const dAvg = Math.round(((dMax + dMin) / 2) * 10) / 10;
            const popPct = Number(daily.precipitation_probability_max?.[i] ?? 0);
            list.push({
                dt: parseLocalIsoToUnix(`${dateStr}T12:00:00`, nowSec + i * 86400),
                dt_txt: `${dateStr} 12:00:00`,
                main: { temp: dAvg, temp_min: dMin, temp_max: dMax },
                weather: [{ main: dMapped.main, description: dMapped.description }],
                pop: Math.max(0, Math.min(1, popPct / 100))
            });
        }
        forecastData = { list };
    }

    return { weatherData, forecastData };
}

// Fetch live weather from OpenWeatherMap when API key is configured
async function fetchOpenWeatherData(lat, lon, apiKey) {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    if (!response.ok) {
        throw new Error(`OpenWeather HTTP ${response.status}`);
    }
    const weatherData = await response.json();
    if (weatherData?.wind && typeof weatherData.wind.speed === 'number') {
        // OpenWeather metric wind.speed is m/s; UI displays km/h
        weatherData.wind.speed = Math.round(weatherData.wind.speed * 3.6 * 10) / 10;
    }

    let forecastData = null;
    try {
        const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        if (fRes.ok) forecastData = await fRes.json();
    } catch (_) {}

    weatherData._provider = 'openweathermap';
    return { weatherData, forecastData };
}

// Deterministic offline fallback (never randomizes on repeated clicks)
function buildDeterministicOfflineWeather(lat, lon, locName) {
    const seedInput = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)},${new Date().toISOString().slice(0, 10)}`;
    let hash = 0;
    for (let i = 0; i < seedInput.length; i++) {
        hash = ((hash << 5) - hash) + seedInput.charCodeAt(i);
        hash |= 0;
    }
    const norm = Math.abs(hash) % 100;
    const baseTemp = getDeterministicTemp(lat, lon, norm);
    const conds = [
        { main: 'Clear', description: 'clear sky' },
        { main: 'Clouds', description: 'few clouds' },
        { main: 'Clouds', description: 'scattered clouds' }
    ];
    const cond = conds[norm % conds.length];

    return {
        main: {
            temp: baseTemp,
            feels_like: baseTemp + 1,
            humidity: 48 + (norm % 25),
            pressure: 1012 + (norm % 5),
            temp_min: baseTemp - 4,
            temp_max: baseTemp + 4
        },
        weather: [cond],
        wind: { speed: Math.round((6 + (norm % 9)) * 10) / 10 },
        visibility: 10000,
        sys: {
            sunrise: Math.floor(Date.now() / 1000) - 21600,
            sunset: Math.floor(Date.now() / 1000) + 21600
        },
        name: locName,
        _locationName: locName,
        _lat: lat,
        _lon: lon,
        _provider: 'offline-fallback'
    };
}

// Load weather data using live weather APIs (OpenWeather direct/proxy -> Open-Meteo -> offline cache)
async function loadWeatherData(lat, lon, customLocationName = null) {
    const reqId = ++weatherRequestSeq;
    const numLat = Number(lat);
    const numLon = Number(lon);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) return;

    try {
        const apiKey = getOpenWeatherApiKey();
        const backendBase = getBackendWeatherBaseUrl();
        let result = null;

        if (apiKey) {
            try {
                result = await fetchOpenWeatherData(numLat, numLon, apiKey);
            } catch (owErr) {
                console.warn('OpenWeather direct unavailable, trying fallback:', owErr.message);
            }
        } else if (backendBase !== null) {
            try {
                const proxyRes = await fetch(`${backendBase}/api/weather?lat=${encodeURIComponent(numLat)}&lon=${encodeURIComponent(numLon)}`);
                if (proxyRes.ok) {
                    const proxyData = await proxyRes.json();
                    if (proxyData?.weatherData) {
                        result = {
                            weatherData: proxyData.weatherData,
                            forecastData: proxyData.forecastData || null
                        };
                    }
                }
            } catch (proxyErr) {
                console.warn('Backend weather proxy unavailable, falling back to Open-Meteo:', proxyErr.message);
            }
        }

        if (!result) {
            result = await fetchOpenMeteoWeather(numLat, numLon);
        }

        if (reqId !== weatherRequestSeq) return;

        const { weatherData, forecastData } = result;
        const locName = customLocationName ||
            window.userLocation?.formatted ||
            currentUser?.locationName ||
            weatherData.name ||
            (currentUser?.district ? (currentUser.state ? `${currentUser.district}, ${currentUser.state}` : currentUser.district) : '') ||
            'Your Location';

        weatherData._locationName = locName;
        weatherData._lat = numLat;
        weatherData._lon = numLon;

        saveCachedWeather(numLat, numLon, weatherData, forecastData);

        window.latestWeatherData = weatherData;
        window.latestForecastData = forecastData;
        window.userWeatherTemp = Math.round(weatherData.main.temp);

        updateWeatherCard(weatherData);
        updateWeatherModal(weatherData, forecastData);
        updateFarmingTips(weatherData);
    } catch (error) {
        if (reqId !== weatherRequestSeq) return;
        console.error('Error loading weather data:', error);

        const locName = customLocationName || window.userLocation?.formatted || currentUser?.locationName || currentUser?.district || 'Your Location';
        const cached = getCachedWeather(numLat, numLon);
        const fallbackWeather = cached?.weatherData
            ? { ...cached.weatherData, _locationName: locName, _lat: numLat, _lon: numLon }
            : buildDeterministicOfflineWeather(numLat, numLon, locName);
        const fallbackForecast = cached?.forecastData || null;

        window.latestWeatherData = fallbackWeather;
        window.latestForecastData = fallbackForecast;
        window.userWeatherTemp = Math.round(fallbackWeather.main.temp);

        updateWeatherCard(fallbackWeather);
        updateWeatherModal(fallbackWeather, fallbackForecast);
        updateFarmingTips(fallbackWeather);
    }
}

// Search weather for any city or mandi
async function searchCustomCityWeather() {
    const input = document.getElementById('weatherCitySearchInput');
    const city = input?.value?.trim();
    if (!city) {
        showToast('Please enter a city or district name', 'error');
        return;
    }

    try {
        const item = await geocodeLocationQuery(city);
        if (item && Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
            const locDisplayName = item.formatted || (item.state ? `${item.city}, ${item.state}` : item.city);
            await loadWeatherData(item.lat, item.lon, locDisplayName);
            showToast(`📍 Loaded weather for ${locDisplayName}`, 'success');
            return;
        }

        const apiKey = getOpenWeatherApiKey();
        if (apiKey) {
            const directRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`);
            if (directRes.ok) {
                const data = await directRes.json();
                await loadWeatherData(data.coord.lat, data.coord.lon, data.name);
                showToast(`📍 Loaded weather for ${data.name}`, 'success');
                return;
            }
        }

        showToast('Could not find location. Please check spelling.', 'error');
    } catch (e) {
        console.error('Search weather error:', e);
        showToast('Failed to fetch weather for this city', 'error');
    }
}

// Deterministic seasonal temperature baseline for offline fallback
function getDeterministicTemp(lat, lon, seedOffset = 0) {
    const month = new Date().getMonth(); // 0=Jan .. 11=Dec
    const isWinter = month <= 1 || month >= 10;
    const isSummer = month >= 3 && month <= 5;
    const base = lat > 30 ? (isWinter ? 16 : isSummer ? 33 : 25)
        : lat > 20 ? (isWinter ? 21 : isSummer ? 36 : 28)
        : (isWinter ? 25 : isSummer ? 33 : 29);
    return base + (seedOffset % 3) - 1;
}

// Update farming tips based on weather
function updateFarmingTips(weatherData) {
    const tipsElement = document.getElementById('farmingAdvisory');
    if (!tipsElement || !weatherData || !weatherData.main || !weatherData.weather) return;
    
    const temp = weatherData.main.temp;
    const condition = weatherData.weather[0].main;
    const humidity = weatherData.main.humidity;
    
    let tipKey = '';
    let icon = '🌱';
    
    if (condition === 'Rain' || condition === 'Thunderstorm') {
        tipKey = 'Rain expected. Good time for irrigation. Avoid chemical spraying today.';
        icon = '🌧️';
    } else if (temp > 30) {
        tipKey = 'Hot day ahead. Water crops in early morning or late evening to prevent high evaporation.';
        icon = '☀️';
    } else if (temp < 15) {
        tipKey = 'Cool weather. Ideal for winter rabi crops. Protect delicate seedlings from cold night frost.';
        icon = '❄️';
    } else if (humidity > 80) {
        tipKey = 'High humidity. Monitor for fungal leaf blights. Ensure adequate field ventilation.';
        icon = '💧';
    } else {
        tipKey = 'Favorable weather for farming activities. Ideal for soil preparation, irrigation and fertilization.';
        icon = '🌱';
    }
    
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    const translatedTip = (window.t && targetLang !== 'en') ? window.t(tipKey, targetLang) : tipKey;
    tipsElement.textContent = `${icon} ${translatedTip}`;
}

// Update weather card on dashboard
function updateWeatherCard(weatherData) {
    const content = document.getElementById('weatherCardContent');
    if (!content || !weatherData || !weatherData.main || !weatherData.weather) return;
    
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    const rawDesc = weatherData.weather[0].description || condition;
    const weatherDesc = window.getTranslatedWeatherDesc ? window.getTranslatedWeatherDesc(rawDesc, targetLang) : (window.t ? window.t(rawDesc, targetLang) : rawDesc);
    const locName = weatherData._locationName || window.userLocation?.formatted || currentUser?.locationName || weatherData.name || (currentUser?.district ? `${currentUser.district}, ${currentUser.state || ''}` : '') || 'Your Location';
    
    let icon = 'fa-cloud text-blue-500';
    if (condition.includes('Clear')) icon = 'fa-sun text-amber-500';
    else if (condition.includes('Rain')) icon = 'fa-cloud-showers-heavy text-blue-500';
    else if (condition.includes('Snow')) icon = 'fa-snowflake text-cyan-400';
    else if (condition.includes('Mist') || condition.includes('Fog') || condition.includes('Haze')) icon = 'fa-smog text-slate-400';
    else if (condition.includes('Thunderstorm')) icon = 'fa-bolt text-yellow-500';
    else icon = 'fa-cloud-sun text-blue-500';
    
    const humidityLabel = window.t ? window.t('Humidity', targetLang) : 'Humidity';
    const windLabel = window.t ? window.t('Wind', targetLang) : 'Wind';

    content.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <i class="fas ${icon} text-4xl mb-2"></i>
                <p class="text-3xl font-extrabold text-gray-900">${temp}°C</p>
                <p class="text-gray-600 capitalize text-sm font-medium">${weatherDesc}</p>
                <p class="text-xs text-green-700 font-bold mt-1.5 flex items-center gap-1">
                    <i class="fas fa-location-crosshairs text-green-600"></i>
                    <span class="truncate max-w-[150px]">${escapeHtml(locName)}</span>
                </p>
            </div>
            <div class="text-right space-y-1">
                <div class="bg-blue-50 px-2.5 py-1 rounded-lg">
                    <p class="text-[10px] text-blue-700 font-medium uppercase">${humidityLabel}</p>
                    <p class="font-bold text-sm text-blue-900">${weatherData.main.humidity}%</p>
                </div>
                <div class="bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <p class="text-[10px] text-emerald-700 font-medium uppercase">${windLabel}</p>
                    <p class="font-bold text-sm text-emerald-900">${weatherData.wind.speed} km/h</p>
                </div>
            </div>
        </div>
    `;
    if (window.translateContainer) {
        window.translateContainer(content, targetLang);
    }
}

// Update weather modal with rich details & 5-day forecast
function updateWeatherModal(weatherData, forecastData = null) {
    const content = document.getElementById('weatherModalContent');
    if (!content || !weatherData || !weatherData.main || !weatherData.weather) return;
    
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    const temp = Math.round(weatherData.main.temp);
    const feelsLike = Math.round(weatherData.main.feels_like || weatherData.main.temp);
    const locName = weatherData._locationName || window.userLocation?.formatted || currentUser?.locationName || weatherData.name || (currentUser?.district ? `${currentUser.district}, ${currentUser.state || ''}` : '') || 'Your Location';
    const lat = weatherData._lat || window.userLocation?.lat || 0;
    const lon = weatherData._lon || window.userLocation?.lon || 0;
    
    const sunrise = weatherData.sys?.sunrise ? new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '06:00 AM';
    const sunset = weatherData.sys?.sunset ? new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '06:30 PM';
    
    let icon = 'fa-cloud-sun text-blue-500';
    const condition = weatherData.weather[0].main;
    if (condition.includes('Clear')) icon = 'fa-sun text-amber-500';
    else if (condition.includes('Rain')) icon = 'fa-cloud-showers-heavy text-blue-500';
    else if (condition.includes('Snow')) icon = 'fa-snowflake text-cyan-400';
    else if (condition.includes('Thunderstorm')) icon = 'fa-bolt text-yellow-500';
    else if (condition.includes('Mist') || condition.includes('Fog') || condition.includes('Haze')) icon = 'fa-smog text-slate-400';
    
    const rawModalDesc = weatherData.weather[0].description || condition;
    const weatherDesc = window.getTranslatedWeatherDesc ? window.getTranslatedWeatherDesc(rawModalDesc, targetLang) : (window.t ? window.t(rawModalDesc, targetLang) : rawModalDesc);

    const localeMap = {
        en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', bn: 'bn-IN',
        mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', gu: 'gu-IN',
        kn: 'kn-IN', ml: 'ml-IN', or: 'or-IN', as: 'as-IN', ur: 'ur-IN'
    };
    const currentLocale = localeMap[targetLang] || 'hi-IN';

    // Process 5-day forecast (1 entry per day)
    let forecastCardsHtml = '';
    if (forecastData && Array.isArray(forecastData.list)) {
        const dailyMap = new Map();
        forecastData.list.forEach(item => {
            const dateStr = item.dt_txt.split(' ')[0];
            if (!dailyMap.has(dateStr) && dailyMap.size < 5) {
                dailyMap.set(dateStr, item);
            }
        });

        const forecastTitle = window.t ? window.t('5-Day Agricultural Weather Forecast', targetLang) : '5-Day Agricultural Weather Forecast';
        const rainWord = window.t ? window.t('rain', targetLang) : 'rain';

        forecastCardsHtml = `
            <div class="mt-6 pt-5 border-t border-gray-100">
                <h4 class="font-bold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                    <i class="fas fa-calendar-week text-blue-600"></i>
                    <span>${forecastTitle}</span>
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    ${Array.from(dailyMap.values()).map(item => {
                        const d = new Date(item.dt * 1000);
                        let dayName = '';
                        try {
                            dayName = d.toLocaleDateString(currentLocale, { weekday: 'short', month: 'short', day: 'numeric' });
                        } catch (e) {
                            dayName = d.toLocaleDateString('hi-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                        }
                        const fTemp = Math.round(item.main.temp);
                        const fCond = item.weather[0].main;
                        let fIcon = 'fa-cloud text-gray-400';
                        if (fCond.includes('Clear')) fIcon = 'fa-sun text-amber-500';
                        else if (fCond.includes('Rain')) fIcon = 'fa-cloud-rain text-blue-500';
                        else if (fCond.includes('Clouds')) fIcon = 'fa-cloud text-blue-400';
                        const pop = Math.round((item.pop || 0) * 100);
                        const itemRawDesc = item.weather[0].description || fCond;
                        const fDesc = window.getTranslatedWeatherDesc ? window.getTranslatedWeatherDesc(itemRawDesc, targetLang) : (window.t ? window.t(itemRawDesc, targetLang) : itemRawDesc);

                        return `
                            <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-center hover:bg-blue-50/50 transition-colors">
                                <p class="text-xs font-bold text-gray-700">${dayName}</p>
                                <i class="fas ${fIcon} text-2xl my-2"></i>
                                <p class="text-sm font-extrabold text-gray-900">${fTemp}°C</p>
                                <p class="text-[10px] text-gray-500 capitalize truncate">${fDesc}</p>
                                ${pop > 0 ? `<p class="text-[10px] text-blue-600 font-semibold mt-1"><i class="fas fa-droplet text-[9px]"></i> ${pop}% ${rainWord}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const liveGeoLabel = window.t ? window.t('Live Geo-Location', targetLang) : 'Live Geo-Location';
    const refreshGpsLabel = window.t ? window.t('Refresh GPS', targetLang) : 'Refresh GPS';
    const cityPlaceholder = window.t ? window.t('Check weather of another city or mandi (e.g. Kota, Ludhiana, Jaipur)', targetLang) : 'Check weather of another city or mandi (e.g. Kota, Ludhiana, Jaipur)';
    const searchLabel = window.t ? window.t('Search', targetLang) : 'Search';
    const feelsLikeLabel = window.t ? window.t('Feels like', targetLang) : 'Feels like';
    const minMaxLabel = window.t ? window.t('Min / Max Temp', targetLang) : 'Min / Max Temp';
    const humidityLabel = window.t ? window.t('Relative Humidity', targetLang) : 'Relative Humidity';
    const windVelocityLabel = window.t ? window.t('Wind Velocity', targetLang) : 'Wind Velocity';
    const pressureLabel = window.t ? window.t('Pressure', targetLang) : 'Pressure';
    const visibilityLabel = window.t ? window.t('Visibility', targetLang) : 'Visibility';
    const sunriseLabel = window.t ? window.t('Sunrise', targetLang) : 'Sunrise';
    const sunsetLabel = window.t ? window.t('Sunset', targetLang) : 'Sunset';
    const sprayLabel = window.t ? window.t('Spraying Condition', targetLang) : 'Spraying Condition';
    
    const isSprayingIdeal = weatherData.wind.speed < 15 && !condition.includes('Rain');
    const sprayingText = isSprayingIdeal ?
        `✅ ${window.t ? window.t('Ideal for fertilizer & pesticide spraying', targetLang) : 'Ideal for fertilizer & pesticide spraying'}` :
        `⚠️ ${window.t ? window.t('Avoid chemical spraying due to wind/rain', targetLang) : 'Avoid chemical spraying due to wind/rain'}`;

    content.innerHTML = `
        <!-- Live Location Banner -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white mb-5 shadow-sm">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider">${liveGeoLabel}</span>
                        ${lat && lon ? `<span class="text-[11px] opacity-85 font-mono">(${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)</span>` : ''}
                    </div>
                    <h3 class="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                        <i class="fas fa-location-crosshairs text-yellow-300 text-base"></i>
                        <span>${escapeHtml(locName)}</span>
                    </h3>
                </div>
                <button id="weatherModalRefreshBtn" onclick="getUserLocation(true)"
                    class="bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-white/25 disabled:opacity-60">
                    <i id="weatherModalRefreshIcon" class="fas fa-sync-alt text-yellow-300"></i>
                    <span>${refreshGpsLabel}</span>
                </button>
            </div>
        </div>

        <!-- Quick City Search for other farms/mandis -->
        <div class="flex gap-2 mb-5">
            <input type="text" id="weatherCitySearchInput" placeholder="${cityPlaceholder}"
                class="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                onkeydown="if(event.key === 'Enter') searchCustomCityWeather()" />
            <button onclick="searchCustomCityWeather()" 
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                <i class="fas fa-search"></i>
                <span>${searchLabel}</span>
            </button>
        </div>

        <!-- Current Main Weather Display -->
        <div class="flex flex-col sm:flex-row items-center justify-between p-4 bg-blue-50/70 rounded-xl border border-blue-100 mb-5">
            <div class="flex items-center gap-4 mb-3 sm:mb-0">
                <i class="fas ${icon} text-5xl"></i>
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-4xl font-black text-gray-900">${temp}°C</span>
                        <span class="text-xs font-semibold text-gray-500">${feelsLikeLabel} ${feelsLike}°C</span>
                    </div>
                    <p class="text-sm font-semibold text-blue-900 capitalize mt-0.5">${weatherDesc}</p>
                </div>
            </div>
            <div class="text-center sm:text-right bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm">
                <p class="text-[10px] font-bold text-gray-500 uppercase">${minMaxLabel}</p>
                <p class="text-sm font-extrabold text-gray-800">${Math.round(weatherData.main.temp_min || temp)}°C / ${Math.round(weatherData.main.temp_max || temp)}°C</p>
            </div>
        </div>
        
        <!-- Detailed Agricultural Weather Parameters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <i class="fas fa-droplet text-blue-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">${humidityLabel}</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.main.humidity}%</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-teal-100 text-center">
                <i class="fas fa-wind text-teal-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">${windVelocityLabel}</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.wind.speed} km/h</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-indigo-100 text-center">
                <i class="fas fa-gauge text-indigo-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">${pressureLabel}</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.main.pressure} hPa</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-emerald-100 text-center">
                <i class="fas fa-eye text-emerald-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">${visibilityLabel}</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${(weatherData.visibility ? (weatherData.visibility / 1000).toFixed(1) : '10')} km</p>
            </div>
        </div>
        
        <!-- Sun & Farming Advisory Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div class="flex items-center justify-around bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-200">
                <div class="flex items-center gap-2">
                    <i class="fas fa-sun text-amber-500 text-xl"></i>
                    <div>
                        <p class="text-[10px] font-bold text-amber-800 uppercase">${sunriseLabel}</p>
                        <p class="font-black text-xs text-gray-900">${sunrise}</p>
                    </div>
                </div>
                <div class="h-8 w-px bg-amber-200"></div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-moon text-orange-500 text-xl"></i>
                    <div>
                        <p class="text-[10px] font-bold text-orange-800 uppercase">${sunsetLabel}</p>
                        <p class="font-black text-xs text-gray-900">${sunset}</p>
                    </div>
                </div>
            </div>

            <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2.5">
                <i class="fas fa-seedling text-emerald-600 text-xl flex-shrink-0"></i>
                <div>
                    <p class="text-[10px] font-bold text-emerald-800 uppercase">${sprayLabel}</p>
                    <p class="text-xs font-bold text-emerald-900">
                        ${sprayingText}
                    </p>
                </div>
            </div>
        </div>

        <!-- 5-Day Forecast -->
        ${forecastCardsHtml}
    `;

    if (window.translateContainer) {
        window.translateContainer(content, targetLang);
    }
}

// Load market data
function loadMarketData() {
    // Fallback to mock data
    const mockData = [
        { commodity: 'Wheat', modal_price: '2150', market: 'Mandi Gobindgarh', state: 'Punjab' },
        { commodity: 'Rice', modal_price: '1850', market: 'Khanna', state: 'Punjab' },
        { commodity: 'Cotton', modal_price: '6200', market: 'Sirsa', state: 'Haryana' },
        { commodity: 'Mustard', modal_price: '5200', market: 'Sri Ganganagar', state: 'Rajasthan' },
        { commodity: 'Barley', modal_price: '1800', market: 'Jaipur', state: 'Rajasthan' },
        { commodity: 'Sugarcane', modal_price: '3500', market: 'Muzaffarnagar', state: 'Uttar Pradesh' },
        { commodity: 'Maize', modal_price: '1950', market: 'Karnal', state: 'Haryana' }
    ];
    window.latestMarketData = mockData;
    updateMarketCard(mockData.slice(0, 3));
    updateMarketModal(mockData);
}

// Update market card
function updateMarketCard(marketData) {
    const content = document.getElementById('marketPricesCard');
    if (!content) return;
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    const quintalLabel = window.t ? window.t('/Quintal', targetLang) : '/Quintal';
    
    const items = (marketData || []).slice(0, 3).map(item => {
        const rawComm = item.commodity || item.crop;
        const comm = window.t ? window.t(rawComm, targetLang) : rawComm;
        const rawMarket = item.market;
        const market = window.t ? window.t(rawMarket, targetLang) : rawMarket;
        return `
        <div class="flex justify-between items-center py-2 border-b">
            <div>
                <p class="font-medium">${comm}</p>
                <p class="text-sm text-gray-600">${market}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600">₹${item.modal_price || item.price}</p>
                <p class="text-sm text-gray-600">${quintalLabel}</p>
            </div>
        </div>
    `}).join('');
    
    content.innerHTML = items || `<p class="text-gray-500">${window.t ? window.t('No data available', targetLang) : 'No data available'}</p>`;
    if (window.translateContainer) {
        window.translateContainer(content, targetLang);
    }
}

// Update market modal
function updateMarketModal(marketData) {
    const content = document.getElementById('marketPricesModalContent');
    if (!content) return;
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    
    const cropHeader = window.t ? window.t('Crop', targetLang) : 'Crop';
    const priceHeader = window.t ? window.t('Price', targetLang) : 'Price';
    const marketHeader = window.t ? window.t('Market', targetLang) : 'Market';
    const stateHeader = window.t ? window.t('State', targetLang) : 'State';
    const noDataText = window.t ? window.t('No market data available', targetLang) : 'No market data available';

    const rows = (marketData || []).map(item => {
        const rawComm = item.commodity || item.crop;
        const comm = window.t ? window.t(rawComm, targetLang) : rawComm;
        const rawMarket = item.market;
        const market = window.t ? window.t(rawMarket, targetLang) : rawMarket;
        const rawState = item.state || 'India';
        const state = window.t ? window.t(rawState, targetLang) : rawState;

        return `
        <tr class="hover:bg-gray-50">
            <td class="py-3 px-4 font-medium">${comm}</td>
            <td class="py-3 px-4 font-bold text-green-600">₹${item.modal_price || item.price}</td>
            <td class="py-3 px-4">${market}</td>
            <td class="py-3 px-4">${state}</td>
        </tr>
    `}).join('');
    
    content.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="py-3 px-4 text-left font-semibold">${cropHeader}</th>
                        <th class="py-3 px-4 text-left font-semibold">${priceHeader}</th>
                        <th class="py-3 px-4 text-left font-semibold">${marketHeader}</th>
                        <th class="py-3 px-4 text-left font-semibold">${stateHeader}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="4" class="text-center py-4">${noDataText}</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
    if (window.translateContainer) {
        window.translateContainer(content, targetLang);
    }
}

// Load seed recommendations
function loadSeedRecommendations() {
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    const state = currentUser?.state || 'Punjab';
    
    // Get state crops from translations or default
    const cropsStateMap = (translations[targetLang] && translations[targetLang].states) ||
                          (translations['hi'] && translations['hi'].states) || {};
    let crops = cropsStateMap[state] || cropsStateMap['Uttar Pradesh'] || cropsStateMap['Punjab'];
    
    if (!crops || !Array.isArray(crops)) {
        crops = ['Wheat', 'Rice', 'Mustard', 'Cotton'];
    }
    
    const localizedCrops = crops.map(c => window.t ? window.t(c, targetLang) : c);
    
    // Update home page seed tags in #seedCardTags
    const seedContainer = document.getElementById('seedCardTags') || document.querySelector('#homePage .dashboard-card:has(#seedTitle)');
    if (seedContainer) {
        const seedTags = seedContainer.querySelectorAll('span.rounded-full, .rounded-full');
        seedTags.forEach((tag, index) => {
            if (localizedCrops[index]) {
                tag.textContent = localizedCrops[index];
            }
        });
    }

    // Localize the fertilizerRatio element
    const ratioEl = document.getElementById('fertilizerRatio');
    if (ratioEl) {
        const ratioText = window.t ? window.t('50% Organic | 25% NPK | 25% Urea', targetLang) : '50% Organic | 25% NPK | 25% Urea';
        ratioEl.textContent = ratioText;
    }
    
    // Update seed modal
    updateSeedModal(localizedCrops);
}

// Update seed modal
function updateSeedModal(crops) {
    const content = document.getElementById('seedModalContent');
    if (!content) return;
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    
    const seedRecTitle = window.t ? window.t('Recommended Seeds & Varieties:', targetLang) : 'Recommended Seeds & Varieties:';
    const fertTitle = window.t ? window.t('Soil & Fertilizer Advisory:', targetLang) : 'Soil & Fertilizer Advisory:';
    const organicLabel = window.t ? window.t('50% Organic', targetLang) : '50% Organic';
    const npkLabel = window.t ? window.t('25% NPK', targetLang) : '25% NPK';
    const ureaLabel = window.t ? window.t('25% Urea', targetLang) : '25% Urea';
    const tipsTitle = window.t ? window.t('Farming Tips', targetLang) : 'Farming Tips';
    
    const tip1 = window.t ? window.t('Sow seeds 2-3 inches deep for best germination', targetLang) : 'Sow seeds 2-3 inches deep for best germination';
    const tip2 = window.t ? window.t('Water crops in early morning or late evening', targetLang) : 'Water crops in early morning or late evening';
    const tip3 = window.t ? window.t('Use organic compost to improve soil health', targetLang) : 'Use organic compost to improve soil health';
    const tip4 = window.t ? window.t('Monitor for pests weekly', targetLang) : 'Monitor for pests weekly';
    const tip5 = window.t ? window.t('Rotate crops annually', targetLang) : 'Rotate crops annually';

    content.innerHTML = `
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">${seedRecTitle}</h4>
            <div class="flex flex-wrap gap-2">
                ${(crops || []).map(crop => `
                    <span class="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">${crop}</span>
                `).join('')}
            </div>
        </div>
        
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">${fertTitle}</h4>
            <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full flex">
                    <div class="bg-green-500 w-1/2"></div>
                    <div class="bg-blue-500 w-1/4"></div>
                    <div class="bg-purple-500 w-1/4"></div>
                </div>
            </div>
            <div class="flex justify-between text-sm text-gray-600 mt-2 font-medium">
                <span>${organicLabel}</span>
                <span>${npkLabel}</span>
                <span>${ureaLabel}</span>
            </div>
        </div>
        
        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 class="font-bold text-lg mb-2 text-blue-900">${tipsTitle}</h4>
            <ul class="list-disc pl-5 space-y-1.5 text-sm text-gray-800">
                <li>${tip1}</li>
                <li>${tip2}</li>
                <li>${tip3}</li>
                <li>${tip4}</li>
                <li>${tip5}</li>
            </ul>
        </div>
    `;

    if (window.translateContainer) {
        window.translateContainer(content, targetLang);
    }
}

// Modal functions
function openWeatherModal() {
    const modal = document.getElementById('weatherModal');
    if (!modal) return;
    modal.classList.add('active');
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    if (window.latestWeatherData) {
        updateWeatherModal(window.latestWeatherData, window.latestForecastData);
    }
    if (window.translateContainer) {
        window.translateContainer(modal, targetLang);
    }
    if (window.userLocation && typeof window.userLocation.lat === 'number' && typeof window.userLocation.lon === 'number') {
        loadWeatherData(window.userLocation.lat, window.userLocation.lon, window.userLocation.formatted);
    } else {
        getUserLocation();
    }
}

function openMarketPricesModal() {
    const modal = document.getElementById('marketPricesModal');
    if (!modal) return;
    modal.classList.add('active');
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    if (window.latestMarketData) {
        updateMarketModal(window.latestMarketData);
    } else {
        loadMarketData();
    }
    if (window.translateContainer) {
        window.translateContainer(modal, targetLang);
    }
}

function openSeedModal() {
    const modal = document.getElementById('seedModal');
    if (!modal) return;
    modal.classList.add('active');
    const targetLang = currentLanguage || window.currentLanguage || 'hi';
    loadSeedRecommendations();
    if (window.translateContainer) {
        window.translateContainer(modal, targetLang);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Handle logout
function handleLogout() {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
        if (window._signOut) window._signOut();
        currentUser = null;
        userLocation = null;
        showPage('welcomePage');
        showToast('Logged out successfully', 'success');
        
        // Clear any timers
        clearInterval(otpTimer);
        
        // Reset forms
        document.getElementById('loginMobile').value = '';
        document.getElementById('signUpName').value = '';
        document.getElementById('signUpMobile').value = '';
        document.getElementById('signUpState').selectedIndex = 0;
        const districtSelect = document.getElementById('signUpDistrict');
        districtSelect.innerHTML = '<option value="">Select District</option>';
        districtSelect.disabled = true;
        
        // Clear OTP inputs
        document.querySelectorAll('.otp-digit').forEach(input => {
            input.value = '';
        });
    }
}

// Change language
function changeLanguage(lang) {
    if (!lang) lang = 'hi';
    currentLanguage = lang;
    window.currentLanguage = lang;
    
    // Save language preference
    localStorage.setItem('agrifarmers_language', lang);
    
    // Run comprehensive DOM translation engine
    if (window.applyTranslations) {
        window.applyTranslations(lang);
    } else {
        // Fallback for ID elements
        const t = (window.translations && window.translations[lang]) || {};
        Object.keys(t).forEach(key => {
            const element = document.getElementById(key);
            if (element && typeof t[key] === 'string') {
                element.textContent = t[key];
            }
        });
        const currentLanguageElement = document.getElementById('currentLanguage');
        if (currentLanguageElement) {
            const meta = window.LANGUAGE_LIST?.find(l => l.code === lang);
            currentLanguageElement.textContent = meta ? meta.native : lang.toUpperCase();
        }
    }
    
    // Update date
    updateDate();
    
    // Re-render dynamic dashboard and modal content
    if (window.latestWeatherData) {
        updateWeatherCard(window.latestWeatherData);
        updateWeatherModal(window.latestWeatherData, window.latestForecastData);
        updateFarmingTips(window.latestWeatherData);
    }
    if (window.latestMarketData) {
        updateMarketCard(window.latestMarketData);
        updateMarketModal(window.latestMarketData);
    } else {
        loadMarketData();
    }
    loadSeedRecommendations();
    
    // Re-translate any currently active modals
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (window.translateContainer) {
            window.translateContainer(modal, lang);
        }
    });
    
    // Close language dropdown
    const languageDropdown = document.getElementById('languageDropdown');
    if (languageDropdown) {
        languageDropdown.classList.add('hidden');
    }
    
    // Friendly localized toast message
    const langMeta = window.LANGUAGE_LIST?.find(l => l.code === lang);
    const langLabel = langMeta ? `${langMeta.native} (${langMeta.name})` : lang;
    const toastMsgMap = {
        en: `Language switched to ${langLabel}`,
        hi: `भाषा बदलकर ${langLabel} कर दी गई है`,
        pa: `ਭਾਸ਼ਾ ਬਦਲ ਕੇ ${langLabel} ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ`,
        bn: `ভাষা পরিবর্তন করে ${langLabel} করা হয়েছে`,
        mr: `भाषा बदलून ${langLabel} करण्यात आली आहे`,
        te: `భాష ${langLabel} కి మార్చబడింది`,
        ta: `மொழி ${langLabel} ஆக மாற்றப்பட்டது`,
        gu: `ભાષા બદલીને ${langLabel} કરવામાં આવી છે`,
        kn: `ಭಾಷೆಯನ್ನು ${langLabel} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`,
        ml: `ഭാഷ ${langLabel} ആക്കി മാറ്റി`,
        or: `ଭାଷା ${langLabel} କୁ ପରିବର୍ତ୍ତନ କରାଗଲା`,
        as: `ভাষা সলনি কৰি ${langLabel} কৰা হ’ল`,
        ur: `زبان تبدیل کر کے ${langLabel} کر دی گئی ہے`
    };
    showToast(toastMsgMap[lang] || `Language changed to ${langLabel}`, 'success');
}

// Offline indicator auto-dismiss logic
function hideOfflineIndicator() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (!offlineIndicator) return;
    offlineIndicator.classList.remove('show');
    offlineIndicator.classList.add('fade-out');
    if (offlineIndicatorTimer) {
        clearTimeout(offlineIndicatorTimer);
        offlineIndicatorTimer = null;
    }
}

function showOfflineIndicator() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (!offlineIndicator) return;
    offlineIndicator.classList.remove('fade-out');
    offlineIndicator.classList.add('show');

    if (offlineIndicatorTimer) {
        clearTimeout(offlineIndicatorTimer);
    }
    // Automatically fades out after 4.5 seconds
    offlineIndicatorTimer = setTimeout(() => {
        hideOfflineIndicator();
    }, 4500);
}

// Update online status
function updateOnlineStatus() {
    if (!navigator.onLine) {
        showOfflineIndicator();
    } else {
        hideOfflineIndicator();
        if (isOnline === false) {
            showToast('You are back online!', 'success');
        }
    }
    isOnline = navigator.onLine;
}

// Make functions globally available
window.showPage = showPage;
window.startOTPTimer = startOTPTimer;
window.clearOTPTimer = () => clearInterval(otpTimer);
window.initOTPInputs = initOTPInputs;
window.openWeatherModal = openWeatherModal;
window.openMarketPricesModal = openMarketPricesModal;
window.openSeedModal = openSeedModal;
window.closeModal = closeModal;
window.handleLogout = handleLogout;
window.hideOfflineIndicator = hideOfflineIndicator;
window.showOfflineIndicator = showOfflineIndicator;
window.changeLanguage = changeLanguage;
window.updateUserInfo = updateUserInfo;
window.getUserLocation = getUserLocation;
window.startLiveLocationTracking = startLiveLocationTracking;
window.stopLiveLocationTracking = stopLiveLocationTracking;
window.acquireLivePosition = acquireLivePosition;
window.fetchIpGeolocation = fetchIpGeolocation;
window.reverseGeocodeCoords = reverseGeocodeCoords;
window.calculateDistanceKm = calculateDistanceKm;
window.autoDetectSignupLocation = autoDetectSignupLocation;
window.loadDashboardData = loadDashboardData;
window.loadWeatherData = loadWeatherData;
window.searchCustomCityWeather = searchCustomCityWeather;
window.openSetLocationModal = openSetLocationModal;
window.searchAndSetFarmLocation = searchAndSetFarmLocation;
window.detectDeviceGpsAndSet = detectDeviceGpsAndSet;
window.cleanLocationName = cleanLocationName;

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (modal.classList.contains('active') && 
            event.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Close modals with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
    