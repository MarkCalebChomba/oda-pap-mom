import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { app } from './js/firebase.js';

// Initialize Firebase services using the app instance
const auth = getAuth(app);
const firestore = getFirestore(app);

// Get references to the DOM elements
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('total-price');
const checkoutButton = document.getElementById('checkout-button');

// Function to load cart items from Firestore
const loadCartItems = async (user) => {
    if (!user) {
        showNotification('Please log in to view your cart.');
        return;
    }
    try {
        const cartItemsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/cart`));
        let total = 0;
        cartItemsContainer.innerHTML = '';

        if (cartItemsSnapshot.empty) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            totalPriceElement.textContent = '$0.00';
            return;
        }

        // Group similar items
        const groupedItems = {};
        cartItemsSnapshot.forEach(doc => {
            const item = doc.data();
            const itemKey = `${item.name}-${item.price}`;
            if (groupedItems[itemKey]) {
                groupedItems[itemKey].quantity += 1;
                groupedItems[itemKey].docIds.push(doc.id);
                groupedItems[itemKey].totalPrice += item.price;
            } else {
                groupedItems[itemKey] = {
                    ...item,
                    quantity: 1,
                    docIds: [doc.id],
                    totalPrice: item.price
                };
            }
        });

        Object.values(groupedItems).forEach(item => {
            total += item.totalPrice;
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <img src="${item.imageUrls}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: Kes${item.totalPrice.toFixed(2)}</p>
                    <button class="remove-button" data-ids="${item.docIds.join(',')}">Remove</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemElement);
        });

        totalPriceElement.textContent = `Kes${total.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading cart items:', error);
    }
};
// Add an auth state observer to check user login status
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Load cart items when the user is logged in
        loadCartItems(user);
    } else {
        // Redirect to login page if not logged in
        showNotification('You must be logged in to view your cart.');
        window.location.href = 'login.html';
    }
});

// Function to remove an item from the cart
cartItemsContainer.addEventListener('click', async (event) => {
    if (event.target.classList.contains('remove-button')) {
        const itemId = event.target.getAttribute('data-id');
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(firestore, `users/${user.uid}/cart/${itemId}`));
                loadCartItems(user); // Reload cart items after removal
            } catch (error) {
                console.error('Error removing cart item:', error);
            }
        }
    }
});

// Event listener for checkout button
checkoutButton.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        window.location.href = 'checkout.html'; // Redirect to checkout page
    } else {
        showNotification('Please log in to proceed with checkout.');
    }
});

// Function to add item to cart
window.addToCart = async function (listingId) {
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
            showNotification('Item added to cart!');
        } catch (error) {
            console.error('Error adding item to cart:', error);
            showNotification('Failed to add item to cart. Please try again.');
        }
    } else {
        showNotification('Please log in to add items to the cart.');
    }
};
