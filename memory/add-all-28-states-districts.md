# Add All 28 Indian States & Districts

## Context
The app currently only has 12 states in the signup dropdown. Users from the remaining 16 states cannot select their state, which blocks signups and makes location-based features unavailable. This task adds all 28 Indian states with their complete district lists, plus crop recommendations and representative agri-facility data.

## Files to Modify

### 1. `script.js` — districts object (lines 274-367)
**Current:** 12 states (Punjab, Haryana, Rajasthan, Uttar Pradesh, Madhya Pradesh, Maharashtra, Gujarat, Bihar, Delhi, Karnataka, Tamil Nadu, West Bengal)
**Add:** 16 missing states: Andhra Pradesh, Arunachal Pradesh, Assam, Chhattisgarh, Goa, Himachal Pradesh, Jharkhand, Kerala, Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Sikkim, Telangana, Tripura, Uttarakhand (+ all 8 Union Territories)

### 2. `js/translations.js` — states.crops mapping
**Current:** 3 states (Punjab, Haryana, Rajasthan) with crops in en/hi/pa
**Add:** Crop recommendations for all 28 states based on ICAR regional patterns

### 3. `js/features/farm-map.js` — AGRI_FACILITIES array
**Current:** 13 facilities across 3 states (Punjab, Haryana, Rajasthan)
**Add:** Representative mandis/KVKs/dealers for remaining major agricultural states

## Implementation Status: Completed ✅
1. **index.html:** Added all 28 Indian States (under `States (28)` optgroup) and all 8 Union Territories (under `Union Territories (8)` optgroup) to the `#signUpState` dropdown.
2. **script.js:** Defined `INDIAN_DISTRICTS` (and `window.INDIAN_DISTRICTS`) with complete, verified, alphabetically sorted district lists for all 28 states and 8 union territories. When any state is selected, `#signUpDistrict` populates dynamically.
3. **translations.js:** All 28 states + 8 Union Territories have regional crop recommendations in English (`en`), Hindi (`hi`), and Punjabi (`pa`).
4. **farm-map.js:** Comprehensive facility registry across agricultural states with automatic state coordinate centering.

## Verification Checklist
- [x] State dropdown in `#signUpPage` displays all 28 Indian states + 8 UTs (previously only 20 were visible)
- [x] Selecting any of the 28 states populates the district dropdown with official districts
- [x] Dynamic translation works seamlessly across English, Hindi, and Punjabi
- [x] GPS auto-detection matches both state and district accurately