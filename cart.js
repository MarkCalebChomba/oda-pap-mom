import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, deleteDoc, addDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { app } from './js/firebase.js';

// Initialize Firebase services using the app instance
const auth = getAuth(app);
const firestore = getFirestore(app);

// Get references to the DOM elements
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('total-price');
const checkoutButton = document.getElementById('checkout-button');
const cartIcon = document.getElementById('cart-icon');

// Function to update cart icon with item count
const updateCartIcon = (count) => {
    const notification = document.createElement('span');
    notification.className = 'cart-notification';
    notification.textContent = count;
    cartIcon.appendChild(notification);
};

// Function to load cart items from Firestore
const loadCartItems = async (user) => {
    if (!user) {
        showNotification('Please log in to view your cart.');
        return;
    }
    try {
        const cartItemsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/cart`));
        let total = 0;
        let itemCount = 0;
        cartItemsContainer.innerHTML = '';

        if (cartItemsSnapshot.empty) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            totalPriceElement.textContent = '$0.00';
            updateCartIcon(0);
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
            itemCount += item.quantity;
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <img src="${item.imageUrls}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Quantity: <button class="quantity-button" data-action="decrease" data-ids="${item.docIds.join(',')}">-</button> ${item.quantity} <button class="quantity-button" data-action="increase" data-ids="${item.docIds.join(',')}">+</button></p>
                    <p>Price: Kes${item.totalPrice.toFixed(2)}</p>
                    <button class="remove-button" data-ids="${item.docIds.join(',')}">Remove</button>
                </div>
            `;
            cartItemElement.addEventListener('click', () => {
                window.location.href = `product.html?id=${item.listingId}`;
            });
            cartItemsContainer.appendChild(cartItemElement);
        });

        totalPriceElement.textContent = `Kes${total.toFixed(2)}`;
        updateCartIcon(itemCount);
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
        const itemIds = event.target.getAttribute('data-ids').split(',');
        const user = auth.currentUser;
        if (user) {
            try {
                for (const itemId of itemIds) {
                    await deleteDoc(doc(firestore, `users/${user.uid}/cart/${itemId}`));
                }
                loadCartItems(user); // Reload cart items after removal
            } catch (error) {
                console.error('Error removing cart item:', error);
            }
        }
    } else if (event.target.classList.contains('quantity-button')) {
        const action = event.target.getAttribute('data-action');
        const itemIds = event.target.getAttribute('data-ids').split(',');
        const user = auth.currentUser;
        if (user) {
            try {
                for (const itemId of itemIds) {
                    const itemRef = doc(firestore, `users/${user.uid}/cart/${itemId}`);
                    const itemSnapshot = await getDoc(itemRef);
                    const itemData = itemSnapshot.data();
                    if (action === 'increase') {
                        await updateDoc(itemRef, { quantity: itemData.quantity + 1 });
                    } else if (action === 'decrease' && itemData.quantity > 1) {
                        await updateDoc(itemRef, { quantity: itemData.quantity - 1 });
                    }
                }
                loadCartItems(user); // Reload cart items after quantity change
            } catch (error) {
                console.error('Error updating cart item quantity:', error);
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
            loadCartItems(user); // Reload cart items after adding new item
        } catch (error) {
            console.error('Error adding item to cart:', error);
            showNotification('Failed to add item to cart. Please try again.');
        }
    } else {
        showNotification('Please log in to add items to the cart.');
    }
};
