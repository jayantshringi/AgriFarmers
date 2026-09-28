// ── PWA Core Variables ────────────────────────────────────────────────────────
let deferredPrompt = null;
let isAppInstalled = false;

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
    toast.innerHTML = `<div class="flex items-center"><i class="fas ${icon} mr-2"></i><span>${message}</span></div>`;
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
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            const alertDiv = document.createElement('div');
                            alertDiv.className = 'update-alert';
                            alertDiv.innerHTML = `
                                <div class="flex justify-between items-center">
                                    <div class="flex-1">
                                        <p class="font-bold text-gray-800">Update Available!</p>
                                        <p class="text-sm text-gray-600">A new version is ready. Click update to refresh.</p>
                                    </div>
                                    <button onclick="window.location.reload()" class="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm">Update</button>
                                </div>`;
                            document.body.appendChild(alertDiv);
                            setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 10000);
                        }
                    });
                });
            })
            .catch(err => console.error('❌ Service Worker registration failed:', err));
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

// Global Variables
let currentUser = null;
let currentLanguage = 'hi';
let userLocation = null;
let otpTimer = null;
let otpTimeLeft = 120;
let isOnline = navigator.onLine;

// Language Data
const translations = window.translations || {};

// Initialize the application
function bootstrapApp() {
    console.log('🌱 AgriFarmers App Initializing...');
    
    // Immediately hide loading screen and show app
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        const app = document.getElementById('app');
        if (app) app.style.display = 'block';
        initApp();
    }, 400);
    
    // Load saved language preference
    const savedLang = localStorage.getItem('agrifarmers_language') || 'hi';
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
        dateElement.textContent = date.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'hi-IN', options);
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

// Update user info
function updateUserInfo() {
    if (!currentUser) return;
    
    const farmerName = document.getElementById('farmerName');
    const farmerLocation = document.getElementById('farmerLocation');
    
    if (farmerName) farmerName.textContent = currentUser.name || 'Farmer';
    if (farmerLocation) {
        if (currentUser.district && currentUser.state) {
            farmerLocation.innerHTML = `<i class="fas fa-location-dot text-xs mr-1 text-green-200"></i>${currentUser.district}, ${currentUser.state}`;
        } else if (currentUser.locationName) {
            farmerLocation.innerHTML = `<i class="fas fa-location-dot text-xs mr-1 text-green-200"></i>${currentUser.locationName}`;
        }
    }
}

// Helper: Multi-tier high-accuracy reverse geocoding
async function reverseGeocodeCoords(lat, lon) {
    const apiKey = '5a4b2d457ecbef9eb2a71e480b947604';
    
    // Tier 1: OpenWeather Geocoding API (Fast & highly accurate for India)
    try {
        const owRes = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`);
        if (owRes.ok) {
            const list = await owRes.json();
            if (Array.isArray(list) && list.length > 0) {
                const item = list[0];
                const city = item.name || '';
                const state = item.state || '';
                if (city || state) {
                    return {
                        city: city || 'Your Location',
                        state: state || '',
                        formatted: state ? `${city}, ${state}` : city,
                        source: 'OpenWeather'
                    };
                }
            }
        }
    } catch (_) {}

    // Tier 2: BigDataCloud Reverse Geocoding Client
    try {
        const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (bdcRes.ok) {
            const geo = await bdcRes.json();
            const city = geo.locality || geo.city || geo.principalSubdivisionDistrict || '';
            const state = geo.principalSubdivision || '';
            if (city || state) {
                return {
                    city: city || 'Your Location',
                    state: state || '',
                    formatted: state ? `${city}, ${state}` : city,
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
            const city = addr.city || addr.town || addr.district || addr.county || addr.state_district || 'Your Location';
            const state = addr.state || '';
            return {
                city,
                state,
                formatted: state ? `${city}, ${state}` : city,
                source: 'OSM'
            };
        }
    } catch (_) {}

    return null;
}

// Auto-detect GPS location during Signup
async function autoDetectSignupLocation() {
    const btn = document.getElementById('autoDetectLocBtn');
    const stateSelect = document.getElementById('signUpState');
    const districtSelect = document.getElementById('signUpDistrict');

    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    if (btn) btn.textContent = 'Detecting GPS Location...';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            window.signupDetectedLocation = { lat, lon };

            const geo = await reverseGeocodeCoords(lat, lon);
            if (btn) btn.textContent = 'Auto-Detect State & District with GPS';

            if (geo) {
                // Try selecting state in dropdown
                if (stateSelect && geo.state) {
                    let matchedState = Array.from(stateSelect.options).find(o => 
                        o.value.toLowerCase() === geo.state.toLowerCase() || geo.state.toLowerCase().includes(o.value.toLowerCase())
                    );
                    if (matchedState) {
                        stateSelect.value = matchedState.value;
                        stateSelect.dispatchEvent(new Event('change'));
                    } else {
                        // Add state option if not present
                        const opt = document.createElement('option');
                        opt.value = geo.state;
                        opt.textContent = geo.state;
                        stateSelect.appendChild(opt);
                        stateSelect.value = geo.state;
                        stateSelect.dispatchEvent(new Event('change'));
                    }
                }

                // Add or select district
                if (districtSelect && geo.city) {
                    districtSelect.disabled = false;
                    let matchedDistrict = Array.from(districtSelect.options).find(o => 
                        o.value.toLowerCase() === geo.city.toLowerCase()
                    );
                    if (matchedDistrict) {
                        districtSelect.value = matchedDistrict.value;
                    } else {
                        const opt = document.createElement('option');
                        opt.value = geo.city;
                        opt.textContent = geo.city;
                        districtSelect.appendChild(opt);
                        districtSelect.value = geo.city;
                    }
                }

                showToast(`📍 Location detected: ${geo.formatted}`, 'success');
            } else {
                showToast(`📍 Coordinates: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`, 'info');
            }
        },
        (err) => {
            if (btn) btn.textContent = 'Auto-Detect State & District with GPS';
            console.warn('Signup geolocation error:', err.message);
            showToast('Please allow location permission in your browser', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Get real-time accurate user location with high precision GPS
function getUserLocation(forceRefresh = false) {
    const farmerLocation = document.getElementById('farmerLocation');

    if (farmerLocation) {
        farmerLocation.innerHTML = `<i class="fas fa-spinner fa-spin text-xs mr-1 text-yellow-300"></i>Detecting live GPS...`;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                userLocation = { lat, lon, accuracy };
                window.userLocation = userLocation;

                // High-precision reverse geocoding
                const geo = await reverseGeocodeCoords(lat, lon);
                const city = geo?.city || currentUser?.district || 'Your Location';
                const state = geo?.state || currentUser?.state || '';
                const formattedLoc = geo?.formatted || (state ? `${city}, ${state}` : city);

                if (farmerLocation) {
                    farmerLocation.innerHTML = `<i class="fas fa-location-crosshairs text-xs mr-1 text-yellow-300"></i><span class="font-bold">${formattedLoc}</span> <span class="text-[10px] opacity-80 font-mono">(${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)</span>`;
                }

                if (currentUser) {
                    currentUser.district = city;
                    if (state) currentUser.state = state;
                    currentUser.locationName = formattedLoc;
                    currentUser.location = userLocation;
                    localStorage.setItem('agrifarmers_user', JSON.stringify(currentUser));
                }

                if (forceRefresh) {
                    showToast(`📍 Live Location: ${formattedLoc} (Accurate to ±${Math.round(accuracy)}m)`, 'success');
                }

                // Load weather and precision agriculture data with exact GPS coordinates
                loadWeatherData(lat, lon);
            },
            (error) => {
                console.warn('Geolocation warning / permission denied:', error.message);
                
                // Fallback location based on user profile or regional default
                const fallbackCity = currentUser?.district || 'Ludhiana';
                const fallbackState = currentUser?.state || 'Punjab';
                
                userLocation = (currentUser && currentUser.state === 'Haryana') ? { lat: 29.6857, lon: 76.9905 }
                    : (currentUser && currentUser.state === 'Rajasthan') ? { lat: 26.8124, lon: 75.7623 }
                    : (currentUser && currentUser.state === 'Uttar Pradesh') ? { lat: 26.8467, lon: 80.9462 }
                    : (currentUser && currentUser.state === 'Maharashtra') ? { lat: 19.7515, lon: 75.7139 }
                    : { lat: 30.9010, lon: 75.8573 }; // Default
                
                window.userLocation = userLocation;

                if (farmerLocation) {
                    farmerLocation.innerHTML = `<i class="fas fa-location-dot text-xs mr-1 text-yellow-300"></i>${fallbackCity}, ${fallbackState}`;
                }

                if (forceRefresh) {
                    showToast('Location permission denied. Click allow in browser address bar for live GPS.', 'error');
                }

                loadWeatherData(userLocation.lat, userLocation.lon);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: forceRefresh ? 0 : 30000
            }
        );
    } else {
        userLocation = { lat: 30.9010, lon: 75.8573 };
        window.userLocation = userLocation;
        if (farmerLocation) {
            farmerLocation.innerHTML = `<i class="fas fa-location-dot text-xs mr-1 text-yellow-300"></i>${currentUser?.district || 'Ludhiana'}, ${currentUser?.state || 'Punjab'}`;
        }
        loadWeatherData(userLocation.lat, userLocation.lon);
    }
    
    loadMarketData();
    loadSeedRecommendations();
}

// Load dashboard data
function loadDashboardData() {
    if (userLocation) {
        loadWeatherData(userLocation.lat, userLocation.lon);
    } else {
        getUserLocation();
    }
    
    loadMarketData();
    loadSeedRecommendations();
}

// Load weather data using REAL API
async function loadWeatherData(lat, lon, customLocationName = null) {
    try {
        const apiKey = '5a4b2d457ecbef9eb2a71e480b947604';
        
        // 1. Fetch current weather
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        
        // 2. Fetch 5-day agricultural forecast
        let forecastData = null;
        try {
            const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
            if (fRes.ok) forecastData = await fRes.json();
        } catch (_) {}

        if (response.ok) {
            const weatherData = await response.json();
            
            // Determine accurate location display name
            const locName = customLocationName || 
                currentUser?.locationName || 
                (currentUser?.district ? (currentUser.state ? `${currentUser.district}, ${currentUser.state}` : currentUser.district) : '') ||
                weatherData.name || 
                'Your Location';
                
            weatherData._locationName = locName;
            weatherData._lat = lat;
            weatherData._lon = lon;
            
            window.latestWeatherData = weatherData;
            window.latestForecastData = forecastData;

            updateWeatherCard(weatherData);
            updateWeatherModal(weatherData, forecastData);
            updateFarmingTips(weatherData);
        } else {
            throw new Error('Weather API failed');
        }
    } catch (error) {
        console.error('Error loading weather data:', error);
        
        // Fallback to realistic sample data based on location
        const locName = customLocationName || currentUser?.locationName || currentUser?.district || 'Your Location';
        const sampleWeather = {
            main: {
                temp: getRandomTemp(lat, lon),
                feels_like: getRandomTemp(lat, lon) + 2,
                humidity: Math.floor(Math.random() * 30) + 50,
                pressure: 1013,
                temp_min: getRandomTemp(lat, lon) - 2,
                temp_max: getRandomTemp(lat, lon) + 3
            },
            weather: [{ 
                description: getWeatherDescription(lat, lon),
                main: getWeatherCondition(lat, lon)
            }],
            wind: { speed: (Math.random() * 15 + 5).toFixed(1) },
            sys: { 
                sunrise: Math.floor(Date.now() / 1000) - 21600,
                sunset: Math.floor(Date.now() / 1000) + 21600
            },
            name: locName,
            _locationName: locName,
            _lat: lat,
            _lon: lon
        };
        
        updateWeatherCard(sampleWeather);
        updateWeatherModal(sampleWeather, null);
        updateFarmingTips(sampleWeather);
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
        const apiKey = '5a4b2d457ecbef9eb2a71e480b947604';
        const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},IN&limit=1&appid=${apiKey}`);
        if (geoRes.ok) {
            const list = await geoRes.json();
            if (list.length > 0) {
                const item = list[0];
                const locDisplayName = item.state ? `${item.name}, ${item.state}` : item.name;
                await loadWeatherData(item.lat, item.lon, locDisplayName);
                showToast(`📍 Loaded weather for ${locDisplayName}`, 'success');
                return;
            }
        }
        
        // Fallback search
        const directRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`);
        if (directRes.ok) {
            const data = await directRes.json();
            await loadWeatherData(data.coord.lat, data.coord.lon, data.name);
            showToast(`📍 Loaded weather for ${data.name}`, 'success');
            return;
        }

        showToast('Could not find location. Please check spelling.', 'error');
    } catch (e) {
        console.error('Search weather error:', e);
        showToast('Failed to fetch weather for this city', 'error');
    }
}

// Helper functions for realistic fallback data
function getRandomTemp(lat, lon) {
    if (lat > 30) return Math.floor(Math.random() * 10) + 15;
    if (lat > 20) return Math.floor(Math.random() * 15) + 20;
    return Math.floor(Math.random() * 10) + 25;
}

function getWeatherDescription(lat, lon) {
    const descriptions = [
        'Clear sky', 'Few clouds', 'Scattered clouds', 'Broken clouds',
        'Shower rain', 'Rain', 'Thunderstorm', 'Snow', 'Mist'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getWeatherCondition(lat, lon) {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Thunderstorm', 'Mist'];
    return conditions[Math.floor(Math.random() * conditions.length)];
}

// Update farming tips based on weather
function updateFarmingTips(weatherData) {
    const tipsElement = document.getElementById('farmingAdvisory');
    if (!tipsElement) return;
    
    const temp = weatherData.main.temp;
    const condition = weatherData.weather[0].main;
    const humidity = weatherData.main.humidity;
    
    let tip = '';
    
    if (condition === 'Rain' || condition === 'Thunderstorm') {
        tip = '🌧️ Rain expected. Good time for irrigation. Avoid chemical spraying today.';
    } else if (temp > 30) {
        tip = '☀️ Hot day ahead. Water crops in early morning or late evening to prevent high evaporation.';
    } else if (temp < 15) {
        tip = '❄️ Cool weather. Ideal for winter rabi crops. Protect delicate seedlings from cold night frost.';
    } else if (humidity > 80) {
        tip = '💧 High humidity. Monitor for fungal leaf blights. Ensure adequate field ventilation.';
    } else {
        tip = '🌱 Favorable weather for farming activities. Ideal for soil preparation, irrigation and fertilization.';
    }
    
    tipsElement.textContent = tip;
}

// Update weather card on dashboard
function updateWeatherCard(weatherData) {
    const content = document.getElementById('weatherCardContent');
    if (!content) return;
    
    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    const locName = weatherData._locationName || currentUser?.locationName || (currentUser?.district ? `${currentUser.district}, ${currentUser.state || ''}` : '') || weatherData.name || 'Your Location';
    
    let icon = 'fa-cloud text-blue-500';
    if (condition.includes('Clear')) icon = 'fa-sun text-amber-500';
    else if (condition.includes('Rain')) icon = 'fa-cloud-showers-heavy text-blue-500';
    else if (condition.includes('Snow')) icon = 'fa-snowflake text-cyan-400';
    else if (condition.includes('Mist') || condition.includes('Fog') || condition.includes('Haze')) icon = 'fa-smog text-slate-400';
    else if (condition.includes('Thunderstorm')) icon = 'fa-bolt text-yellow-500';
    else icon = 'fa-cloud-sun text-blue-500';
    
    content.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <i class="fas ${icon} text-4xl mb-2"></i>
                <p class="text-3xl font-extrabold text-gray-900">${temp}°C</p>
                <p class="text-gray-600 capitalize text-sm font-medium">${weatherData.weather[0].description}</p>
                <p class="text-xs text-green-700 font-bold mt-1.5 flex items-center gap-1">
                    <i class="fas fa-location-crosshairs text-green-600"></i>
                    <span class="truncate max-w-[150px]">${locName}</span>
                </p>
            </div>
            <div class="text-right space-y-1">
                <div class="bg-blue-50 px-2.5 py-1 rounded-lg">
                    <p class="text-[10px] text-blue-700 font-medium uppercase">Humidity</p>
                    <p class="font-bold text-sm text-blue-900">${weatherData.main.humidity}%</p>
                </div>
                <div class="bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <p class="text-[10px] text-emerald-700 font-medium uppercase">Wind</p>
                    <p class="font-bold text-sm text-emerald-900">${weatherData.wind.speed} km/h</p>
                </div>
            </div>
        </div>
    `;
}

// Update weather modal with rich details & 5-day forecast
function updateWeatherModal(weatherData, forecastData = null) {
    const content = document.getElementById('weatherModalContent');
    if (!content) return;
    
    const temp = Math.round(weatherData.main.temp);
    const feelsLike = Math.round(weatherData.main.feels_like);
    const locName = weatherData._locationName || currentUser?.locationName || (currentUser?.district ? `${currentUser.district}, ${currentUser.state || ''}` : '') || weatherData.name || 'Your Location';
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

        forecastCardsHtml = `
            <div class="mt-6 pt-5 border-t border-gray-100">
                <h4 class="font-bold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                    <i class="fas fa-calendar-week text-blue-600"></i>
                    <span>5-Day Agricultural Weather Forecast</span>
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    ${Array.from(dailyMap.values()).map(item => {
                        const d = new Date(item.dt * 1000);
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const fTemp = Math.round(item.main.temp);
                        const fCond = item.weather[0].main;
                        let fIcon = 'fa-cloud text-gray-400';
                        if (fCond.includes('Clear')) fIcon = 'fa-sun text-amber-500';
                        else if (fCond.includes('Rain')) fIcon = 'fa-cloud-rain text-blue-500';
                        else if (fCond.includes('Clouds')) fIcon = 'fa-cloud text-blue-400';
                        const pop = Math.round((item.pop || 0) * 100);

                        return `
                            <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-center hover:bg-blue-50/50 transition-colors">
                                <p class="text-xs font-bold text-gray-700">${dayName}</p>
                                <i class="fas ${fIcon} text-2xl my-2"></i>
                                <p class="text-sm font-extrabold text-gray-900">${fTemp}°C</p>
                                <p class="text-[10px] text-gray-500 capitalize truncate">${item.weather[0].description}</p>
                                ${pop > 0 ? `<p class="text-[10px] text-blue-600 font-semibold mt-1"><i class="fas fa-droplet text-[9px]"></i> ${pop}% rain</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    content.innerHTML = `
        <!-- Live Location Banner -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white mb-5 shadow-sm">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider">Live Geo-Location</span>
                        ${lat && lon ? `<span class="text-[11px] opacity-85 font-mono">(${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)</span>` : ''}
                    </div>
                    <h3 class="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                        <i class="fas fa-location-crosshairs text-yellow-300 text-base"></i>
                        <span>${locName}</span>
                    </h3>
                </div>
                <button onclick="getUserLocation(true)"
                    class="bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-white/25">
                    <i class="fas fa-sync-alt text-yellow-300"></i>
                    <span>Refresh GPS</span>
                </button>
            </div>
        </div>

        <!-- Quick City Search for other farms/mandis -->
        <div class="flex gap-2 mb-5">
            <input type="text" id="weatherCitySearchInput" placeholder="Check weather of another city or mandi (e.g. Kota, Ludhiana, Jaipur)"
                class="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                onkeydown="if(event.key === 'Enter') searchCustomCityWeather()" />
            <button onclick="searchCustomCityWeather()" 
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                <i class="fas fa-search"></i>
                <span>Search</span>
            </button>
        </div>

        <!-- Current Main Weather Display -->
        <div class="flex flex-col sm:flex-row items-center justify-between p-4 bg-blue-50/70 rounded-xl border border-blue-100 mb-5">
            <div class="flex items-center gap-4 mb-3 sm:mb-0">
                <i class="fas ${icon} text-5xl"></i>
                <div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-4xl font-black text-gray-900">${temp}°C</span>
                        <span class="text-xs font-semibold text-gray-500">Feels like ${feelsLike}°C</span>
                    </div>
                    <p class="text-sm font-semibold text-blue-900 capitalize mt-0.5">${weatherData.weather[0].description}</p>
                </div>
            </div>
            <div class="text-center sm:text-right bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm">
                <p class="text-[10px] font-bold text-gray-500 uppercase">Min / Max Temp</p>
                <p class="text-sm font-extrabold text-gray-800">${Math.round(weatherData.main.temp_min || temp)}°C / ${Math.round(weatherData.main.temp_max || temp)}°C</p>
            </div>
        </div>
        
        <!-- Detailed Agricultural Weather Parameters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <i class="fas fa-droplet text-blue-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">Relative Humidity</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.main.humidity}%</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <i class="fas fa-wind text-teal-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">Wind Velocity</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.wind.speed} km/h</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <i class="fas fa-gauge text-indigo-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">Pressure</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${weatherData.main.pressure} hPa</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <i class="fas fa-eye text-emerald-500 text-base mb-1"></i>
                <p class="text-[10px] uppercase font-bold text-gray-500">Visibility</p>
                <p class="text-base font-black text-gray-900 mt-0.5">${(weatherData.visibility ? (weatherData.visibility / 1000).toFixed(1) : '10')} km</p>
            </div>
        </div>
        
        <!-- Sun & Farming Advisory Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div class="flex items-center justify-around bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-200">
                <div class="flex items-center gap-2">
                    <i class="fas fa-sun text-amber-500 text-xl"></i>
                    <div>
                        <p class="text-[10px] font-bold text-amber-800 uppercase">Sunrise</p>
                        <p class="font-black text-xs text-gray-900">${sunrise}</p>
                    </div>
                </div>
                <div class="h-8 w-px bg-amber-200"></div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-moon text-orange-500 text-xl"></i>
                    <div>
                        <p class="text-[10px] font-bold text-orange-800 uppercase">Sunset</p>
                        <p class="font-black text-xs text-gray-900">${sunset}</p>
                    </div>
                </div>
            </div>

            <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2.5">
                <i class="fas fa-seedling text-emerald-600 text-xl flex-shrink-0"></i>
                <div>
                    <p class="text-[10px] font-bold text-emerald-800 uppercase">Spraying Condition</p>
                    <p class="text-xs font-bold text-emerald-900">
                        ${weatherData.wind.speed < 15 && !condition.includes('Rain') ? '✅ Ideal for fertilizer & pesticide spraying' : '⚠️ Avoid chemical spraying due to wind/rain'}
                    </p>
                </div>
            </div>
        </div>

        <!-- 5-Day Forecast -->
        ${forecastCardsHtml}
    `;
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
    
    updateMarketCard(mockData.slice(0, 3));
    updateMarketModal(mockData);
}

// Update market card
function updateMarketCard(marketData) {
    const content = document.getElementById('marketPricesCard');
    if (!content) return;
    
    const items = marketData.slice(0, 3).map(item => `
        <div class="flex justify-between items-center py-2 border-b">
            <div>
                <p class="font-medium">${item.commodity || item.crop}</p>
                <p class="text-sm text-gray-600">${item.market}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600">₹${item.modal_price || item.price}</p>
                <p class="text-sm text-gray-600">/Quintal</p>
            </div>
        </div>
    `).join('');
    
    content.innerHTML = items || '<p class="text-gray-500">No data available</p>';
}

// Update market modal
function updateMarketModal(marketData) {
    const content = document.getElementById('marketPricesModalContent');
    if (!content) return;
    
    const rows = marketData.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="py-3 px-4 font-medium">${item.commodity || item.crop}</td>
            <td class="py-3 px-4 font-bold text-green-600">₹${item.modal_price || item.price}</td>
            <td class="py-3 px-4">${item.market}</td>
            <td class="py-3 px-4">${item.state || 'India'}</td>
        </tr>
    `).join('');
    
    content.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="py-3 px-4 text-left font-semibold">Crop</th>
                        <th class="py-3 px-4 text-left font-semibold">Price</th>
                        <th class="py-3 px-4 text-left font-semibold">Market</th>
                        <th class="py-3 px-4 text-left font-semibold">State</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="4" class="text-center py-4">No market data available</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

// Load seed recommendations
function loadSeedRecommendations() {
    if (!currentUser) return;
    
    const state = currentUser.state;
    const crops = translations[currentLanguage].states[state] || ['Wheat', 'Rice', 'Cotton'];
    
    // Update home page seed tags
    const seedTags = document.querySelectorAll('#homePage .rounded-full');
    seedTags.forEach((tag, index) => {
        if (crops[index]) {
            tag.textContent = crops[index];
        }
    });
    
    // Update seed modal
    updateSeedModal(crops);
}

// Update seed modal
function updateSeedModal(crops) {
    const content = document.getElementById('seedModalContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">${translations[currentLanguage].seedRecText}</h4>
            <div class="flex flex-wrap gap-2">
                ${crops.map(crop => `
                    <span class="px-4 py-2 bg-green-100 text-green-800 rounded-full">${crop}</span>
                `).join('')}
            </div>
        </div>
        
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">${translations[currentLanguage].fertilizerText}</h4>
            <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full flex">
                    <div class="bg-green-500 w-1/2"></div>
                    <div class="bg-blue-500 w-1/4"></div>
                    <div class="bg-purple-500 w-1/4"></div>
                </div>
            </div>
            <div class="flex justify-between text-sm text-gray-600 mt-2">
                <span>50% Organic</span>
                <span>25% NPK</span>
                <span>25% Urea</span>
            </div>
        </div>
        
        <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-bold text-lg mb-2">Farming Tips</h4>
            <ul class="list-disc pl-5 space-y-1">
                <li>Sow seeds 2-3 inches deep for best germination</li>
                <li>Water crops in early morning or late evening</li>
                <li>Use organic compost to improve soil health</li>
                <li>Monitor for pests weekly</li>
                <li>Rotate crops annually</li>
            </ul>
        </div>
    `;
}

// Modal functions
function openWeatherModal() {
    document.getElementById('weatherModal').classList.add('active');
    if (window.latestWeatherData) {
        updateWeatherModal(window.latestWeatherData, window.latestForecastData);
    }
    if (window.userLocation && window.userLocation.lat && window.userLocation.lon) {
        loadWeatherData(window.userLocation.lat, window.userLocation.lon);
    } else {
        getUserLocation();
    }
}

function openMarketPricesModal() {
    document.getElementById('marketPricesModal').classList.add('active');
}

function openSeedModal() {
    document.getElementById('seedModal').classList.add('active');
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
    currentLanguage = lang;
    
    // Update current language display
    const currentLanguageElement = document.getElementById('currentLanguage');
    if (currentLanguageElement) {
        currentLanguageElement.textContent = lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'ਪੰਜਾਬੀ';
    }
    
    // Update all translatable elements
    const t = translations[lang];
    
    // Update elements by ID
    Object.keys(t).forEach(key => {
        const element = document.getElementById(key);
        if (element && typeof t[key] === 'string') {
            element.textContent = t[key];
        }
    });
    
    // Update date
    updateDate();
    
    // Update seed recommendations if user is logged in
    if (currentUser) {
        loadSeedRecommendations();
    }
    
    // Save language preference
    localStorage.setItem('agrifarmers_language', lang);
    
    // Close language dropdown
    const languageDropdown = document.getElementById('languageDropdown');
    if (languageDropdown) {
        languageDropdown.classList.add('hidden');
    }
    
    showToast(`Language changed to ${lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Punjabi'}`, 'success');
}

// Update online status
function updateOnlineStatus() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (!navigator.onLine) {
        offlineIndicator.classList.add('show');
        showToast('You are offline. Some features may be limited.', 'info');
    } else {
        offlineIndicator.classList.remove('show');
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
window.changeLanguage = changeLanguage;
window.updateUserInfo = updateUserInfo;
window.getUserLocation = getUserLocation;
window.autoDetectSignupLocation = autoDetectSignupLocation;
window.loadDashboardData = loadDashboardData;
window.searchCustomCityWeather = searchCustomCityWeather;

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
    