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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 AgriFarmers App Initializing...');
    
    // Immediately hide loading screen and show app
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        initApp();
    }, 800);
    
    // Load saved language preference
    const savedLang = localStorage.getItem('agrifarmers_language') || 'hi';
    changeLanguage(savedLang);
    
    // Update online status
    updateOnlineStatus();
    
    // Add event listeners for online/offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    console.log('✅ AgriFarmers App Loaded Successfully');
});

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
    
    // Initialize state dropdown
    const stateSelect = document.getElementById('signUpState');
    if (stateSelect) {
        stateSelect.addEventListener('change', function() {
            const state = this.value;
            const districtSelect = document.getElementById('signUpDistrict');
            const districts = {
                Punjab: [
                    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 
                    'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 
                    'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 
                    'Sri Muktsar Sahib', 'Pathankot', 'Patiala', 'Rupnagar', 
                    'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur', 
                    'Shaheed Bhagat Singh Nagar', 'Tarn Taran'
                ],
                Haryana: [
                    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 
                    'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 
                    'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 
                    'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
                ],
                Rajasthan: [
                    'Ajmer', 'Alwar', 'Balotra', 'Baran', 'Barmer', 'Banswara', 
                    'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 
                    'Chittorgarh', 'Churu', 'Dausa', 'Deeg', 'Dholpur', 
                    'Didwana-Kuchaman', 'Dungarpur', 'Ganganagar (Sri Ganganagar)', 
                    'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 
                    'Jhunjhunu', 'Jodhpur', 'Karauli', 'Khairthal-Tijara', 'Kota', 
                    'Kotputli-Behror', 'Nagaur', 'Pali', 'Phalodi', 'Pratapgarh', 
                    'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'
                ]
            };
            
            districtSelect.innerHTML = `<option value="">${translations[currentLanguage].selectDistrict}</option>`;
            
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
    
    if (farmerName) farmerName.textContent = currentUser.name;
    if (farmerLocation) {
        farmerLocation.textContent = `${currentUser.district}, ${currentUser.state}`;
    }
}

// Get user location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                
                if (currentUser) {
                    currentUser.location = userLocation;
                    localStorage.setItem('agrifarmers_user', JSON.stringify(currentUser));
                }
                
                loadWeatherData(userLocation.lat, userLocation.lon);
            },
            () => {
                // Use default location (Delhi) or user's district
                userLocation = { lat: 28.6139, lon: 77.2090 };
                loadWeatherData(userLocation.lat, userLocation.lon);
                
                const farmerLocation = document.getElementById('farmerLocation');
                if (farmerLocation && currentUser) {
                    farmerLocation.textContent = `${currentUser.district}, ${currentUser.state}`;
                }
                showToast('Using default location. Enable GPS for accurate data.', 'info');
            }
        );
    } else {
        userLocation = { lat: 28.6139, lon: 77.2090 };
        loadWeatherData(userLocation.lat, userLocation.lon);
        showToast('Location services not available', 'info');
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
async function loadWeatherData(lat, lon) {
    try {
        // Real OpenWeatherMap API key
        const apiKey = '5a4b2d457ecbef9eb2a71e480b947604';
        
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        
        if (response.ok) {
            const weatherData = await response.json();
            updateWeatherCard(weatherData);
            updateWeatherModal(weatherData);
            
            // Update farming tips based on weather
            updateFarmingTips(weatherData);
        } else {
            throw new Error('Weather API failed');
        }
    } catch (error) {
        console.error('Error loading weather data:', error);
        showToast('Unable to fetch live weather. Using sample data.', 'info');
        
        // Fallback to realistic sample data based on location
        const sampleWeather = {
            main: {
                temp: getRandomTemp(lat, lon),
                feels_like: getRandomTemp(lat, lon) + 2,
                humidity: Math.floor(Math.random() * 30) + 50,
                pressure: 1013
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
            name: currentUser?.district || 'Your Location'
        };
        
        updateWeatherCard(sampleWeather);
        updateWeatherModal(sampleWeather);
        updateFarmingTips(sampleWeather);
    }
}

// Helper functions for realistic fallback data
function getRandomTemp(lat, lon) {
    // Generate temperatures based on approximate latitude
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
        tip = 'Rain expected. Good time for irrigation. Avoid chemical spraying today.';
    } else if (temp > 30) {
        tip = 'Hot day ahead. Water crops in early morning or late evening to prevent evaporation.';
    } else if (temp < 15) {
        tip = 'Cool weather. Ideal for sowing winter crops. Protect sensitive plants from cold.';
    } else if (humidity > 80) {
        tip = 'High humidity. Monitor for fungal diseases. Good for leafy vegetables.';
    } else {
        tip = 'Good weather for farming activities. Ideal for irrigation and fertilization.';
    }
    
    tipsElement.textContent = tip;
}

// Update weather card
function updateWeatherCard(weatherData) {
    const content = document.getElementById('weatherCardContent');
    if (!content) return;
    
    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    
    let icon = 'fa-cloud';
    if (condition.includes('Clear')) icon = 'fa-sun';
    if (condition.includes('Rain')) icon = 'fa-cloud-rain';
    if (condition.includes('Snow')) icon = 'fa-snowflake';
    if (condition.includes('Mist') || condition.includes('Fog')) icon = 'fa-smog';
    if (condition.includes('Thunderstorm')) icon = 'fa-bolt';
    
    content.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <i class="fas ${icon} text-4xl text-blue-500"></i>
                <p class="text-3xl font-bold mt-2">${temp}°C</p>
                <p class="text-gray-600 capitalize">${weatherData.weather[0].description}</p>
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-600">Humidity</p>
                <p class="font-bold">${weatherData.main.humidity}%</p>
                <p class="text-sm text-gray-600 mt-2">Wind</p>
                <p class="font-bold">${weatherData.wind.speed} km/h</p>
            </div>
        </div>
    `;
}

// Update weather modal
function updateWeatherModal(weatherData) {
    const content = document.getElementById('weatherModalContent');
    if (!content) return;
    
    const temp = Math.round(weatherData.main.temp);
    const sunrise = new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const sunset = new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let icon = 'fa-cloud-sun';
    const condition = weatherData.weather[0].main;
    if (condition.includes('Clear')) icon = 'fa-sun';
    if (condition.includes('Rain')) icon = 'fa-cloud-rain';
    if (condition.includes('Snow')) icon = 'fa-snowflake';
    if (condition.includes('Thunderstorm')) icon = 'fa-bolt';
    
    content.innerHTML = `
        <div class="text-center mb-6">
            <i class="fas ${icon} text-6xl text-blue-500 mb-4"></i>
            <h4 class="text-2xl font-bold">${temp}°C</h4>
            <p class="text-gray-600 capitalize">${weatherData.weather[0].description}</p>
            <p class="text-sm text-gray-500 mt-2">${weatherData.name}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">Feels Like</p>
                <p class="text-lg font-bold">${Math.round(weatherData.main.feels_like)}°C</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">Humidity</p>
                <p class="text-lg font-bold">${weatherData.main.humidity}%</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">Wind Speed</p>
                <p class="text-lg font-bold">${weatherData.wind.speed} km/h</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">Pressure</p>
                <p class="text-lg font-bold">${weatherData.main.pressure} hPa</p>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t">
            <div class="flex justify-between">
                <div class="text-center">
                    <i class="fas fa-sunrise text-yellow-500 text-2xl"></i>
                    <p class="text-sm text-gray-600 mt-2">Sunrise</p>
                    <p class="font-bold">${sunrise}</p>
                </div>
                <div class="text-center">
                    <i class="fas fa-sunset text-orange-500 text-2xl"></i>
                    <p class="text-sm text-gray-600 mt-2">Sunset</p>
                    <p class="font-bold">${sunset}</p>
                </div>
            </div>
        </div>
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
    