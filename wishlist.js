import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, deleteDoc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { app } from './js/firebase.js';
import { showNotification } from './notifications.js';

// Initialize Firebase services using the app instance
const auth = getAuth(app);
const firestore = getFirestore(app);

// Get references to the DOM elements
const wishlistItemsContainer = document.getElementById('wishlist-items');
const wishlistIcon = document.getElementById('wishlist-icon');

// Function to update wishlist icon with item count
const updateWishlistIcon = (count) => {
    const notification = document.createElement('span');
    notification.className = 'cart-notification';
    notification.textContent = count;
    wishlistIcon.appendChild(notification);
};

// Function to load wishlist items from Firestore
const loadWishlistItems = async (user) => {
    if (!user) {
        showNotification('Please log in to view your wishlist.');
        return;
    }
    try {
        const wishlistItemsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/wishlist`));
        let itemCount = 0;
        wishlistItemsContainer.innerHTML = '';

        if (wishlistItemsSnapshot.empty) {
            wishlistItemsContainer.innerHTML = '<p>Your wishlist is empty.</p>';
            updateWishlistIcon(0);
            return;
        }

        wishlistItemsSnapshot.forEach(doc => {
            const item = doc.data();
            itemCount += 1;
            const wishlistItemElement = document.createElement('div');
            wishlistItemElement.className = 'wishlist-item';
            wishlistItemElement.innerHTML = `
                <img src="${item.imageUrls[0]}" alt="${item.name}" class="wishlist-item-image">
                <div class="wishlist-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Price: Kes${item.price.toFixed(2)}</p>
                    <button class="remove-button" data-id="${doc.id}">Remove</button>
                </div>
            `;
            wishlistItemElement.addEventListener('click', (event) => {
                if (!event.target.classList.contains('remove-button')) {
                    window.location.href = `product.html?id=${item.listingId}`;
                }
            });
            wishlistItemsContainer.appendChild(wishlistItemElement);
        });

        updateWishlistIcon(itemCount);
    } catch (error) {
        console.error('Error loading wishlist items:', error);
    }
};

// Add an auth state observer to check user login status
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Load wishlist items when the user is logged in
        loadWishlistItems(user);
    } else {
        // Redirect to login page if not logged in
        showNotification('You must be logged in to view your wishlist.');
        window.location.href = 'login.html';
    }
});

// Function to remove an item from the wishlist
wishlistItemsContainer.addEventListener('click', async (event) => {
    if (event.target.classList.contains('remove-button')) {
        const itemId = event.target.getAttribute('data-id');
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(firestore, `users/${user.uid}/wishlist/${itemId}`));
                loadWishlistItems(user); // Reload wishlist items after removal
            } catch (error) {
                console.error('Error removing wishlist item:', error);
            }
        }
    }
});

// Function to add item to wishlist
window.addToWishlist = async function (listingId) {
    const user = auth.currentUser;
    if (user) {
        const listingRef = doc(firestore, `Listings/${listingId}`);
        const snapshot = await getDoc(listingRef);
        const listing = snapshot.data();

        try {
            await addDoc(collection(firestore, `users/${user.uid}/wishlist`), {
                userId: user.uid,
                listingId: listingId,
                ...listing
            });
            showNotification('Item added to wishlist!');
            loadWishlistItems(user); // Reload wishlist items after adding new item
        } catch (error) {
            console.error('Error adding item to wishlist:', error);
            showNotification('Failed to add item to wishlist. Please try again.');
        }
    } else {
        showNotification('Please log in to add items to the wishlist.');
    }
};