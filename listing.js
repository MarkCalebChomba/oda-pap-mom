import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import { app } from "./js/firebase.js";
import { showNotification } from './notifications.js';

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let imageUrls = []; // Add this line to declare imageUrls

// Function to preview image and replace the plus button
window.previewImage = function(event, index) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(`image-upload-label-${index}`).style.backgroundImage = `url(${e.target.result})`;
            document.getElementById(`image-upload-label-${index}`).textContent = '';
        };
        reader.readAsDataURL(file);
    }
};

// Function to remove image and reset the plus button
window.removeImage = function(index) {
    document.getElementById(`media-upload-${index}`).value = '';
    document.getElementById(`image-upload-label-${index}`).style.backgroundImage = '';
    document.getElementById(`image-upload-label-${index}`).textContent = '+';
};

// Function to open the modal with the clicked image
window.openModal = function(imageUrl) {
    document.getElementById('modal-image').src = imageUrl;
    document.getElementById('imageModal').style.display = "block";
};

// Function to close the modal
window.closeModal = function() {
    document.getElementById('imageModal').style.display = "none";
};

// Check if profile is complete and user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "Users", user.uid));
            const userloc = await getDoc(doc(db, "Users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                document.getElementById("profile-pic").src = userData.profilePicUrl || "Unknown";
                document.getElementById("seller-name").textContent = userData.name || "Unknown";
                document.getElementById("seller-email").textContent = userData.email || "Unknown";
                document.getElementById("seller-location").textContent = userData.county || "Location Unknown";
                document.getElementById("user-ward").textContent = userData.ward || "Location Unknown";

                if (!userData.profilePicUrl || !userData.name || !userData.email || !userData.county || !userData.ward) {
                    document.getElementById("profile-incomplete-message").style.display = 'block';
                    setTimeout(() => {
                        window.location.href = 'profile.html';
                    }, 5000);
                }
            } else {
                document.getElementById("profile-incomplete-message").style.display = 'block';
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 5000);
            }
        } else {
            window.location.href = 'login.html'; // Redirect if no user is logged in
        }
    });
});

// Function to display listings for the authenticated user
async function loadUserListings() {
    const user = auth.currentUser;
    const listingsContainer = document.getElementById('listings-container');
    listingsContainer.innerHTML = ''; // Clear existing listings

    if (user) {
        const q = query(collection(db, "Listings"), where("uploaderId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const listing = doc.data();
            const listingElement = document.createElement('div');
            listingElement.className = 'listing';
            listingElement.innerHTML = `
                <div class="listing-media">
                    ${listing.imageUrls ? listing.imageUrls.map(url => `<img src="${url}" class="listing-img" onclick="openModal('${url}')" />`).join('') : ''}
                </div>
                <h4>${listing.name}</h4>
                <p><strong>Price:</strong> KES ${listing.price}</p>
                <p><strong>Category:</strong> ${listing.category}</p>
                <p><strong>Description:</strong> ${listing.description}</p>
                <button class="edit-btn" data-id="${doc.id}">Edit</button>
                <button class="delete-btn" data-id="${doc.id}">Delete</button>
            `;

            listingsContainer.appendChild(listingElement);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => loadEditForm(button.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => deleteListing(button.dataset.id));
        });
    }
}

// Load and populate the edit form with the current listing details
async function loadEditForm(listingId) {
    const docRef = doc(db, "Listings", listingId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const listing = docSnap.data();
        document.getElementById('item-name').value = listing.name;
        document.getElementById('item-price').value = listing.price;
        document.getElementById('initial-price').value = listing.initialPrice; // Capture initial price
        document.getElementById('condition').value = listing.condition;
        document.getElementById('age').value = listing.age;
        document.getElementById('category').value = listing.category; // Capture category
        document.getElementById('quantity').value = listing.quantity; // Capture quantity
        document.getElementById('description').value = listing.description;

        // Change the submit button to 'Update' and store listing ID
        document.getElementById('submit-button').innerText = 'Update Item';
        document.getElementById('submit-button').dataset.id = listingId;
    } else {
        showNotification("Listing not found!");
    }
}

// Handle form submission (for both adding new items and updating existing items)
document.getElementById('item-listing-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        showNotification("You need to be logged in to list an item.");
        return;
    }

    document.getElementById('spinner').style.display = 'block'; // Show spinner

    const itemName = document.getElementById('item-name').value;
    const itemPrice = parseFloat(document.getElementById('item-price').value);
    const initialPrice = parseFloat(document.getElementById('initial-price').value); // Capture initial price
    const condition = document.getElementById('condition').value;
    const age = document.getElementById('age').value; // Capture age
    const category = document.getElementById('category').value; // Capture category
    const quantity = parseInt(document.getElementById('quantity').value); // Capture quantity
    const fullDescription = document.getElementById('description').value;

    let finalPrice = itemPrice;
    if (finalPrice < 10000) {
        finalPrice += finalPrice * 0.05;
    } else {
        finalPrice += finalPrice * 0.025;
    }

    const listingId = document.getElementById('submit-button').dataset.id;

    // Handle file uploads
    const mediaFiles = [
        document.getElementById('media-upload-1').files[0],
        document.getElementById('media-upload-2').files[0],
        document.getElementById('media-upload-3').files[0],
        document.getElementById('media-upload-4').files[0],
        document.getElementById('media-upload-5').files[0]
    ].filter(file => file !== undefined);

    imageUrls = [];
    for (const file of mediaFiles) {
        const fileRef = storageRef(storage, `listings/${user.uid}/${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        imageUrls.push(fileUrl);
    }

    if (listingId) {
        // Update existing listing
        const docRef = doc(db, "Listings", listingId);
        await updateDoc(docRef, {
            name: itemName,
            price: finalPrice,
            initialPrice: initialPrice, // Include initial price
            condition: condition,
            age: age,
            category: category, // Include category
            quantity: quantity, // Include quantity
            description: fullDescription,
            imageUrls: imageUrls.length ? imageUrls : undefined // Update only if media exists
        });
        showNotification("Item updated successfully!");
    } else {
        // Add new listing
        await addDoc(collection(db, "Listings"), {
            uploaderId: user.uid,
            name: itemName,
            price: finalPrice,
            initialPrice: initialPrice, // Include initial price
            condition: condition,
            age: age,
            category: category, // Include category
            quantity: quantity, // Include quantity
            description: fullDescription,
            imageUrls: imageUrls,
            createdAt: new Date().toISOString()
        });
        showNotification("Item listed successfully!");
    }

    document.getElementById('spinner').style.display = 'none'; // Hide spinner

    event.target.reset();
    document.getElementById('submit-button').innerText = 'List Item';
    loadUserListings(); // Reload listings after update
});

// Function to delete a listing
async function deleteListing(listingId) {
    if (confirm("Are you sure you want to delete this item?")) {
        await deleteDoc(doc(db, "Listings", listingId));
        showNotification("Item deleted successfully!");
        loadUserListings(); // Reload listings after delete
    }
}

// Ensure user authentication and load listings on page load
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadUserListings(); // Load the user's listings
        } else {
            window.location.href = 'login.html'; // Redirect to login if not authenticated
        }
    });
});