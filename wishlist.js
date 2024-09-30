import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { app } from './js/firebase.js';

// Initialize Firebase services using the app instance
const auth = getAuth(app);
const firestore = getFirestore(app);

// Get references to the DOM elements
const wishlistContainer = document.getElementById('wishlist-items');

// Function to load wishlist items from Firestore
const loadWishlistItems = async (user) => {
    if (!user) {
        alert('Please log in to view your wishlist.');
        return;
    }

    try {
        const wishlistItemsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/wishlist`));
        wishlistContainer.innerHTML = ''; // Clear previous items

        if (wishlistItemsSnapshot.empty) {
            wishlistContainer.innerHTML = '<p>Your wishlist is empty.</p>';
            return;
        }

        wishlistItemsSnapshot.forEach(doc => {
            const item = doc.data();
            const wishlistItemElement = document.createElement('div');
            wishlistItemElement.className = 'wishlist-item';
            wishlistItemElement.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" class="wishlist-item-image">
                <div class="wishlist-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Price: $${item.price.toFixed(2)}</p>
                    <button class="remove-button" data-id="${doc.id}">Remove</button>
                    <button class="add-to-cart-button" data-id="${item.listingId}">Add to Cart</button>
                </div>
            `;
            wishlistContainer.appendChild(wishlistItemElement);
        });
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
        alert('You must be logged in to view your wishlist.');
        window.location.href = 'login.html';
    }
});

// Function to remove an item from the wishlist
wishlistContainer.addEventListener('click', async (event) => {
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
    } else if (event.target.classList.contains('add-to-cart-button')) {
        const listingId = event.target.getAttribute('data-id');
        await addToCart(listingId);
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
            alert('Item added to wishlist!');
        } catch (error) {
            console.error('Error adding item to wishlist:', error);
            alert('Failed to add item to wishlist. Please try again.');
        }
    } else {
        alert('Please log in to add items to the wishlist.');
    }
};

// Function to add item to cart (you might want to import this from cart.js)
async function addToCart(listingId) {
    const user = auth.currentUser;
    if (user) {
        const listingRef = doc(firestore, `Listings/${listingId}`);
        const snapshot = await getDoc(listingRef);
        const listing = snapshot.data();

        try {
            await addDoc(collection(firestore, `users/${user.uid}/cart`), {
                userId: user.uid,
                listingId: listingId,
                ...listing
            });
            alert('Item added to cart!');
        } catch (error) {
            console.error('Error adding item to cart:', error);
            alert('Failed to add item to cart. Please try again.');
        }
    } else {
        alert('Please log in to add items to the cart.');
    }
}