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
            const itemKey = `${item.name}-${item.price}`; // Ensure itemKey is defined here
            total += item.totalPrice;
            itemCount += item.quantity;
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <img src="${item.imageUrls[0]}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Quantity: <button class="quantity-button" data-action="decrease" data-key="${itemKey}">-</button> <span class="quantity">${item.quantity}</span> <button class="quantity-button" data-action="increase" data-key="${itemKey}">+</button></p>
                    <p data-price-per-item="${item.price}">Price: Kes${item.totalPrice.toFixed(2)}</p>
                    <button class="remove-button" data-ids="${item.docIds.join(',')}">Remove</button>
                </div>
            `;
            cartItemElement.addEventListener('click', (event) => {
                if (!event.target.classList.contains('remove-button') && !event.target.classList.contains('quantity-button')) {
                    window.location.href = `product.html?id=${item.listingId}`;
                }
            });
            cartItemsContainer.appendChild(cartItemElement);
        });

        totalPriceElement.textContent = `Kes${total.toFixed(2)}`;
        updateCartIcon(itemCount);
    } catch (error) {
        console.error('Error loading cart items:', error);
    }
};

// Function to save cart data locally
const saveCartDataLocally = () => {
    const cartData = Array.from(document.querySelectorAll('.cart-item')).map(cartItem => {
        const itemDetails = cartItem.querySelector('.cart-item-details');
        return {
            name: itemDetails.querySelector('p strong').textContent,
            quantity: parseInt(itemDetails.querySelector('.quantity').textContent),
            price: parseFloat(itemDetails.querySelector('p[data-price-per-item]').getAttribute('data-price-per-item')),
            imageUrls: cartItem.querySelector('.cart-item-image').src,
            listingId: new URL(cartItem.querySelector('.cart-item-image').parentElement.href).searchParams.get('id')
        };
    });
    localStorage.setItem('cartData', JSON.stringify(cartData));
};

// Function to load cart data from local storage
const loadCartDataFromLocalStorage = () => {
    const cartData = JSON.parse(localStorage.getItem('cartData')) || [];
    cartData.forEach(item => {
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <img src="${item.imageUrls}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <p><strong>${item.name}</strong></p>
                <p>Quantity: <button class="quantity-button" data-action="decrease" data-key="${item.name}-${item.price}">-</button> <span class="quantity">${item.quantity}</span> <button class="quantity-button" data-action="increase" data-key="${item.name}-${item.price}">+</button></p>
                <p data-price-per-item="${item.price}">Price: Kes${(item.price * item.quantity).toFixed(2)}</p>
                <button class="remove-button" data-ids="">Remove</button>
            </div>
        `;
        cartItemElement.addEventListener('click', (event) => {
            if (!event.target.classList.contains('remove-button') && !event.target.classList.contains('quantity-button')) {
                window.location.href = `product.html?id=${item.listingId}`;
            }
        });
        cartItemsContainer.appendChild(cartItemElement);
    });

    // Update total price and item count
    const totalPrice = cartData.reduce((total, item) => total + (item.price * item.quantity), 0);
    totalPriceElement.textContent = `Kes${totalPrice.toFixed(2)}`;

    const itemCount = cartData.reduce((count, item) => count + item.quantity, 0);
    updateCartIcon(itemCount);
};

// Add an auth state observer to check user login status
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Load cart items when the user is logged in
        loadCartItems(user);
    } else {
        // Load cart data from local storage if not logged in
        loadCartDataFromLocalStorage();
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
    }
});

// Function to handle quantity changes locally
cartItemsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('quantity-button')) {
        const action = event.target.getAttribute('data-action');
        const itemKey = event.target.getAttribute('data-key');
        const quantityElement = event.target.parentElement.querySelector('.quantity');
        let quantity = parseInt(quantityElement.textContent);

        if (action === 'increase') {
            quantity += 1;
        } else if (action === 'decrease' && quantity > 1) {
            quantity -= 1;
        }

        quantityElement.textContent = quantity;

        // Update price for the item
        const priceElement = event.target.parentElement.nextElementSibling;
        const pricePerItem = parseFloat(priceElement.getAttribute('data-price-per-item'));
        priceElement.textContent = `Kes${(pricePerItem * quantity).toFixed(2)}`;

        // Update total price and item count
        const totalPrice = Array.from(document.querySelectorAll('.cart-item .cart-item-details p[data-price-per-item]'))
            .reduce((total, priceElem) => total + (parseFloat(priceElem.getAttribute('data-price-per-item')) * parseInt(priceElem.previousElementSibling.querySelector('.quantity').textContent)), 0);
        totalPriceElement.textContent = `Kes${totalPrice.toFixed(2)}`;

        const itemCount = Array.from(document.querySelectorAll('.cart-item .quantity'))
            .reduce((count, quantityElem) => count + parseInt(quantityElem.textContent), 0);
        updateCartIcon(itemCount);

        // Save updated cart data locally
        saveCartDataLocally();
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