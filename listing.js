import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { app } from "./js/firebase.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Check if profile is complete and user is authenticated
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
      if (user) {
          const userDoc = await getDoc(doc(db, "Users", user.uid));
          if (userDoc.exists()) {
              const userData = userDoc.data();
              document.getElementById("profile-pic").src = userData.profilePicUrl|| "Unknown";
              document.getElementById("seller-name").textContent = userData.name || "Unknown";
              document.getElementById("seller-email").textContent = userData.email || "Unknown";
              document.getElementById("seller-location").textContent = userData.location || "Location Unknown";
          } else {
              document.getElementById("profile-incomplete-message").style.display = 'block';
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
                    ${listing.imageUrls ? listing.imageUrls.map(url => `<img src="${url}" class="listing-img" />`).join('') : ''}
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
        document.getElementById('quantity').value = listing.quantity;
        document.getElementById('category').value = listing.category;
        document.getElementById('description').value = listing.description;

        // Change the submit button to 'Update' and store listing ID
        document.getElementById('submit-button').innerText = 'Update Item';
        document.getElementById('submit-button').dataset.id = listingId;
    } else {
        alert("Listing not found!");
    }
}

// Handle form submission (for both adding new items and updating existing items)
document.getElementById('item-listing-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("You need to be logged in to list an item.");
        return;
    }

    const itemName = document.getElementById('item-name').value;
    const itemPrice = document.getElementById('item-price').value;
    const quantity = document.getElementById('quantity').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const mediaFiles = document.getElementById('media-upload').files;

    let imageUrls = [];
    for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const storageRefPath = storageRef(storage, `listings/${user.uid}/${file.name}`);
        const snapshot = await uploadBytes(storageRefPath, file);
        const imageUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(imageUrl);
    }

    // Dynamic price adjustment
    let finalPrice = parseFloat(itemPrice);
    if (finalPrice < 10000) {
        finalPrice += finalPrice * 0.05;
    } else {
        finalPrice += finalPrice * 0.025;
    }

    const listingId = document.getElementById('submit-button').dataset.id;

    if (listingId) {
        // Update existing listing
        const docRef = doc(db, "Listings", listingId);
        await updateDoc(docRef, {
            name: itemName,
            price: finalPrice,
            quantity: quantity,
            category: category,
            description: description,
            imageUrls: imageUrls.length ? imageUrls : undefined // Update only if media exists
        });
        alert("Item updated successfully!");
    } else {
        // Add new listing
        await addDoc(collection(db, "Listings"), {
            uploaderId: user.uid,
            name: itemName,
            price: finalPrice,
            quantity: quantity,
            category: category,
            description: description,
            imageUrls: imageUrls,
            createdAt: new Date().toISOString()
        });
        alert("Item listed successfully!");
    }

    event.target.reset();
    document.getElementById('submit-button').innerText = 'List Item';
    loadUserListings(); // Reload listings after update
});

// Function to delete a listing
async function deleteListing(listingId) {
    if (confirm("Are you sure you want to delete this item?")) {
        await deleteDoc(doc(db, "Listings", listingId));
        alert("Item deleted successfully!");
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
