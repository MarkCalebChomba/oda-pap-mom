import { getDocumentById, updateDocumentById, setDocumentById } from "./js/firestore.js";
import { auth, storage } from "./js/firebase.js";
import { onAuthChange } from "./js/auth.js";
///import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showNotification } from './notifications.js';

// DOM Elements
const elements = {
    profilePic: document.getElementById('profile-pic'),
    profilePicInput: document.getElementById('profile-pic-input'),
    changePicButton: document.getElementById('change-pic-button'),
    editNameButton: document.getElementById('edit-name-button'),
    editNameContainer: document.getElementById('edit-name-container'),
    newNameInput: document.getElementById('new-name-input'),
    saveNameButton: document.getElementById('save-name-button'),
    cancelNameButton: document.getElementById('cancel-name-button'),
    editPhoneButton: document.getElementById('edit-phone-button'),
    editPhoneContainer: document.getElementById('edit-phone-container'),
    newPhoneInput: document.getElementById('new-phone-input'),
    savePhoneButton: document.getElementById('save-phone-button'),
    cancelPhoneButton: document.getElementById('cancel-phone-button'),
    editLocationButton: document.getElementById('edit-location-button'),
    locationEditContainer: document.getElementById('location-edit-container'),
    regionSelect: document.getElementById('region-select'),
    countySelect: document.getElementById('county-select'),
    wardSelect: document.getElementById('ward-select'),
    specificDetails: document.getElementById('specific-details'),
    saveLocationButton: document.getElementById('save-location-button'),
    cancelLocationButton: document.getElementById('cancel-location-button'),
    userEmail: document.getElementById('user-email'),
    userName: document.getElementById('user-name'),
    userPhone: document.getElementById('user-phone'),
    userRegion: document.getElementById('user-region'),
    userCounty: document.getElementById('user-county'),
    userWard: document.getElementById('user-ward'),
    userSpecificLocation: document.getElementById('user-specific-location'),
    accountBalance: document.getElementById('account-balance'),
    toggleBalance: document.getElementById('toggle-balance'),
    saveInfoButton: document.getElementById('save-info-button')
};

// Location data
const counties = {
    "coast": {
        "Mombasa": ["Changamwe", "Jomvu", "Nyali"],
        "Kwale": ["Matuga", "Msambweni", "Lunga Lunga"],
        "Kilifi": ["Kilifi North", "Kilifi South", "Malindi"]
    },
    "nairobi": {
        "Nairobi": ["Westlands", "Kibra", "Lang'ata"]
    },
    // Add other regions as needed
};

// Profile Picture Handling
elements.changePicButton.addEventListener('click', () => {
    elements.profilePicInput.click();
});

elements.profilePicInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            const storageRef = ref(storage, `profile-pics/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            await updateDocumentById("Users", auth.currentUser.uid, {
                profilePicUrl: downloadURL
            });
            
            elements.profilePic.src = downloadURL;
            showNotification("Profile picture updated successfully!");
        } catch (error) {
            console.error("Error updating profile picture:", error);
            showNotification("Failed to update profile picture", "error");
        }
    }
});

// Name Edit Handling
elements.editNameButton.addEventListener('click', () => {
    elements.editNameContainer.style.display = 'block';
    elements.newNameInput.value = elements.userName.textContent;
});

elements.saveNameButton.addEventListener('click', async () => {
    const newName = elements.newNameInput.value.trim();
    if (newName) {
        try {
            await updateDocumentById("Users", auth.currentUser.uid, { name: newName });
            elements.userName.textContent = newName;
            elements.editNameContainer.style.display = 'none';
            showNotification("Name updated successfully!");
        } catch (error) {
            showNotification("Failed to update name", "error");
        }
    }
});

elements.cancelNameButton.addEventListener('click', () => {
    elements.editNameContainer.style.display = 'none';
});

// Phone Edit Handling
elements.editPhoneButton.addEventListener('click', () => {
    elements.editPhoneContainer.style.display = 'block';
    elements.newPhoneInput.value = elements.userPhone.textContent;
});

elements.savePhoneButton.addEventListener('click', async () => {
    const newPhone = elements.newPhoneInput.value.trim();
    if (newPhone) {
        try {
            await updateDocumentById("Users", auth.currentUser.uid, { phone: newPhone });
            elements.userPhone.textContent = newPhone;
            elements.editPhoneContainer.style.display = 'none';
            showNotification("Phone number updated successfully!");
        } catch (error) {
            showNotification("Failed to update phone number", "error");
        }
    }
});

elements.cancelPhoneButton.addEventListener('click', () => {
    elements.editPhoneContainer.style.display = 'none';
});

// Location Edit Handling
elements.editLocationButton.addEventListener('click', () => {
    elements.locationEditContainer.style.display = 'block';
    elements.wardSelect.disabled = false;
    elements.specificDetails.disabled = false;
    elements.saveLocationButton.style.display = 'block';
});

elements.regionSelect.addEventListener('change', () => {
    populateCounties();
});

elements.countySelect.addEventListener('change', () => {
    populateWards();
});

elements.saveLocationButton.addEventListener('click', async () => {
    const locationData = {
        region: elements.regionSelect.value,
        county: elements.countySelect.value,
        ward: elements.wardSelect.value,
        specificLocation: elements.specificDetails.value
    };

    try {
        await updateDocumentById("Users", auth.currentUser.uid, locationData);
        updateLocationDisplay(locationData);
        elements.locationEditContainer.style.display = 'none';
        showNotification("Location updated successfully!");
    } catch (error) {
        showNotification("Failed to update location", "error");
    }
});

elements.cancelLocationButton.addEventListener('click', () => {
    elements.locationEditContainer.style.display = 'none';
});

document.getElementById('edit-location-button').addEventListener('click', () => {
  document.getElementById('ward-select').disabled = false;
  document.getElementById('specific-details').disabled = false;
  document.getElementById('save-location-button').style.display = 'block';
});

elements.saveInfoButton.addEventListener('click', async () => {
  const name = document.getElementById('update-name').value;
  const number = document.getElementById('update-number').value;

  if (!name || !number) {
    alert('Please fill in both fields.');
    return;
  }

  try {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'Users', user.uid);
      await updateDoc(userRef, {
        name: name,
        phoneNumber: number
      });
      alert('Information updated successfully!');
    } else {
      alert('No user is logged in.');
    }
  } catch (error) {
    console.error('Error updating information:', error);
    alert('Failed to update information.');
  }
});

// Balance Toggle
let isBalanceHidden = true;
elements.toggleBalance.addEventListener('click', () => {
    isBalanceHidden = !isBalanceHidden;
    elements.accountBalance.textContent = isBalanceHidden ? "XXXX" : "10,000";
    elements.toggleBalance.innerHTML = `<i class="fas fa-eye${isBalanceHidden ? '' : '-slash'}"></i>`;
});

// Helper Functions
function populateCounties() {
    elements.countySelect.innerHTML = '<option value="" disabled selected>Select County</option>';
    elements.wardSelect.innerHTML = '<option value="" disabled selected>Select Ward</option>';
    
    const region = elements.regionSelect.value;
    if (region && counties[region]) {
        Object.keys(counties[region]).forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            elements.countySelect.appendChild(option);
        });
        elements.countySelect.disabled = false;
    }
}

function populateWards() {
    elements.wardSelect.innerHTML = '<option value="" disabled selected>Select Ward</option>';
    
    const region = elements.regionSelect.value;
    const county = elements.countySelect.value;
    
    if (region && county && counties[region][county]) {
        counties[region][county].forEach(ward => {
            const option = document.createElement('option');
            option.value = ward;
            option.textContent = ward;
            elements.wardSelect.appendChild(option);
        });
        elements.wardSelect.disabled = false;
    }
}

function updateLocationDisplay(locationData) {
    elements.userRegion.textContent = locationData.region || "Not Set";
    elements.userCounty.textContent = locationData.county || "Not Set";
    elements.userWard.textContent = locationData.ward || "Not Set";
    elements.userSpecificLocation.textContent = locationData.specificLocation || "Not Set";
}

// Initialize user data
onAuthChange((user) => {
    if (user) {
        getDocumentById("Users", user.uid)
            .then((userData) => {
                if (!userData) {
                    return setDocumentById("Users", user.uid, {
                        email: user.email,
                        name: user.displayName || "",
                        phone: "",
                        profilePicUrl: "images/profile-placeholder.png"
                    });
                }
                return userData;
            })
            .then((userData) => {
                elements.profilePic.src = userData.profilePicUrl || "images/profile-placeholder.png";
                elements.userEmail.textContent = userData.email || user.email;
                elements.userName.textContent = userData.name || "Not Set";
                elements.userPhone.textContent = userData.phone || "Not Set";
                updateLocationDisplay(userData);
            })
            .catch(error => {
                console.error("Error initializing user data:", error);
                showNotification("Error loading user data", "error");
            });
    }
});