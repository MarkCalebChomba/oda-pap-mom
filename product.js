import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    increment, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { app } from "./js/firebase.js";
import { showNotification } from './notifications.js';
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import { animateButton, animateIconToCart, updateCartCounter, updateWishlistCounter, updateChatCounter } from './js/utils.js';

class ProductPage {
    constructor() {
        this.auth = getAuth(app);
        this.db = getFirestore(app);
        this.productId = new URLSearchParams(window.location.search).get('id');
        this.currentImageIndex = 0;
        this.imageUrls = [];
        this.product = null;
        this.seller = null;

        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Main elements
        this.mainImage = document.getElementById('mainImage');
        this.thumbnailContainer = document.getElementById('thumbnailContainer');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.productContent = document.getElementById('productContent');
        this.errorMessage = document.getElementById('errorMessage');

        // Navigation elements
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentImageIndexEl = document.getElementById('currentImageIndex');
        this.totalImagesEl = document.getElementById('totalImages');

        // Product details elements
        this.productNameEl = document.getElementById('productName');
        this.productPriceEl = document.getElementById('productPrice');
        this.initialPriceEl = document.getElementById('initialPrice');
        this.initialPriceContainer = document.getElementById('initialPriceContainer');
        this.discountBadge = document.getElementById('discountBadge');
        this.productDateEl = document.getElementById('productDate');
        this.productDescriptionEl = document.getElementById('productDescription');
        this.productCategoryEl = document.getElementById('productCategory');
        this.productConditionEl = document.getElementById('productCondition');
        this.productAgeEl = document.getElementById('productAge');
        this.productQuantityEl = document.getElementById('productQuantity');
        this.productLocationEl = document.getElementById('productLocation');

        // Seller elements
        this.sellerImageEl = document.getElementById('sellerImage');
        this.sellerNameEl = document.getElementById('sellerName');
        // Remove seller location element
        // this.sellerLocationEl = document.getElementById('sellerLocation');

        // Action buttons
        this.buyNowBtn = document.getElementById('buyNowBtn');
        this.addToCartBtn = document.getElementById('addToCartBtn');
        this.wishlistBtn = document.getElementById('wishlistBtn');
        this.messageSellerBtn = document.getElementById('messageSellerBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
    }

    setupEventListeners() {
        this.prevBtn?.addEventListener('click', () => this.navigateImage(-1));
        this.nextBtn?.addEventListener('click', () => this.navigateImage(1));
        this.buyNowBtn?.addEventListener('click', () => this.handleBuyNow());
        this.addToCartBtn?.addEventListener('click', () => this.handleAddToCart());
        this.wishlistBtn?.addEventListener('click', () => this.handleWishlist());
        this.messageSellerBtn?.addEventListener('click', () => this.handleMessageSeller());
        this.copyLinkBtn?.addEventListener('click', () => this.handleCopyLink());

        // Touch events for image gallery
        this.mainImage?.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.mainImage?.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.mainImage?.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    async initialize() {
        try {
            if (!this.productId) {
                throw new Error('No product ID provided');
            }

            this.showLoading();
            await this.loadProduct();
            await this.loadSimilarProducts();
            if (this.auth.currentUser) {
                await this.updateCartCounter();
                await this.updateWishlistCounter();
                await this.updateChatCounter();
            }
            this.hideLoading();

        } catch (error) {
            console.error('Error initializing product page:', error);
            this.showError(error.message);
        }
    }

    async loadProduct() {
        const docRef = doc(this.db, "Listings", this.productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Product not found');
        }

        this.product = docSnap.data();
        this.imageUrls = this.product.imageUrls || [];
        
        await this.loadSellerInfo(this.product.uploaderId);
        this.displayProduct();
        this.setupImageGallery();
    }

    async loadSellerInfo(sellerId) {
        const userDoc = await getDoc(doc(this.db, "Users", sellerId));
        if (userDoc.exists()) {
            this.seller = userDoc.data();
            this.seller.id = sellerId; // Ensure seller ID is set
            this.displaySellerInfo();
        }
    }

    displayProduct() {
        // Basic info
        this.productNameEl.textContent = this.product.name;
        this.productPriceEl.textContent = `KES ${this.product.price.toLocaleString()}`;
        this.productDescriptionEl.textContent = this.product.description;
        this.productCategoryEl.textContent = this.product.category;
        this.productConditionEl.textContent = this.product.condition;
        this.productAgeEl.textContent = this.product.age;
        this.productQuantityEl.textContent = this.product.quantity;
        this.productLocationEl.textContent = `${this.seller.region || ''}, ${this.seller.county || ''}, ${this.seller.ward || ''}`;
        this.productDateEl.textContent = new Date(this.product.createdAt).toLocaleDateString();

        // Handle initial price and discount
        if (this.product.initialPrice) {
            this.initialPriceContainer.style.display = 'block';
            this.initialPriceEl.textContent = `KES ${this.product.initialPrice.toLocaleString()}`;
            
            // Calculate and display discount percentage
            const discount = ((this.product.initialPrice - this.product.price) / this.product.initialPrice * 100).toFixed(0);
            this.discountBadge.textContent = `-${discount}%`;
            this.discountBadge.style.display = 'inline-block';
        } else {
            this.initialPriceContainer.style.display = 'none';
        }

        this.productContent.style.display = 'grid';
    }

    displaySellerInfo() {
        if (this.sellerImageEl && this.sellerNameEl && this.seller) {
            this.sellerImageEl.src = this.seller.profilePicUrl || 'images/default-profile.png';
            this.sellerNameEl.textContent = this.seller.name || 'Unknown Seller';
            // Remove seller location display
            // this.sellerLocationEl.textContent = `${this.seller.region || ''}, ${this.seller.county || ''}, ${this.seller.ward || ''}, ${this.seller.specificLocation || ''}`;
            this.sellerImageEl.addEventListener('click', () => {
                window.location.href = `user.html?userId=${this.seller.id}`;
            });
        } else {
            console.error('Seller elements are not initialized or seller data is missing');
        }
    }

    setupImageGallery() {
        this.thumbnailContainer.innerHTML = '';
        this.totalImagesEl.textContent = this.imageUrls.length;

        this.imageUrls.forEach((url, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = url;
            thumbnail.classList.add('thumbnail');
            thumbnail.addEventListener('click', () => this.setMainImage(index));
            this.thumbnailContainer.appendChild(thumbnail);
        });

        this.setMainImage(0);
    }

    setMainImage(index) {
        this.currentImageIndex = index;
        this.mainImage.src = this.imageUrls[index];
        this.currentImageIndexEl.textContent = index + 1;

        // Update thumbnails
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        // Update navigation buttons
        this.prevBtn.disabled = index === 0;
        this.nextBtn.disabled = index === this.imageUrls.length - 1;
    }

    navigateImage(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.imageUrls.length) {
            this.setMainImage(newIndex);
        }
    }

    async loadSimilarProducts() {
        try {
            const similarProductsContainer = document.getElementById('similarProductsContainer');
            similarProductsContainer.innerHTML = '';

            // Ensure uploaderId and category are defined
            if (this.product.uploaderId) {
                // Query for products by the same user
                const userProductsQuery = query(
                    collection(this.db, "Listings"),
                    where("uploaderId", "==", this.product.uploaderId),
                    where("id", "!=", this.productId) // Exclude the current product
                );
                const userProductsSnapshot = await getDocs(userProductsQuery);

                userProductsSnapshot.forEach(doc => {
                    const product = doc.data();
                    similarProductsContainer.appendChild(this.createProductCard(doc.id, product));
                });
            }

            if (this.product.category) {
                // Query for products in the same category
                const categoryProductsQuery = query(
                    collection(this.db, "Listings"),
                    where("category", "==", this.product.category),
                    where("id", "!=", this.productId) // Exclude the current product
                );
                const categoryProductsSnapshot = await getDocs(categoryProductsQuery);

                categoryProductsSnapshot.forEach(doc => {
                    const product = doc.data();
                    similarProductsContainer.appendChild(this.createProductCard(doc.id, product));
                });
            }

        } catch (error) {
            console.error('Error loading similar products:', error);
        }
    }

    createProductCard(productId, product) {
        const productCard = document.createElement('div');
        productCard.classList.add('similar-product-card');
        productCard.innerHTML = `
            <div class="product-link" data-product-id="${productId}">
                <div class="product-image">
                    <img src="${product.imageUrls[0] || 'images/product-placeholder.png'}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h4 class="product-name">${product.name}</h4>
                    <p class="product-price">KES ${product.price.toLocaleString()}</p>
                    ${product.initialPrice ? `<p class="initial-price">KES ${product.initialPrice.toLocaleString()}</p>` : ''}
                </div>
            </div>
        `;
        productCard.querySelector('.product-link').addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-product-id');
            window.location.href = `product.html?id=${productId}`;
        });
        return productCard;
    }

    async handleAddToCart() {
        if (!this.auth.currentUser) {
            showNotification("Please login to add items to cart", "warning");
            return;
        }
        const listingRef = doc(this.db, `Listings/${this.productId}`);
        const snapshot = await getDoc(listingRef);
        const listing = snapshot.data();

        try {
            await addDoc(collection(this.db, `users/${this.auth.currentUser.uid}/cart`), {
                userId: this.auth.currentUser.uid,
                listingId: this.productId,
                ...listing,
            });
            showNotification("Item added to cart!");
            animateButton(this.addToCartBtn, 'sounds/pop-39222.mp3');
            animateIconToCart(this.addToCartBtn, 'cart-icon');
            await updateCartCounter(this.db, this.auth.currentUser.uid);
        } catch (error) {
            console.error("Error adding item to cart:", error);
            showNotification("Failed to add item to cart. Please try again.");
        }
    }

    async handleBuyNow() {
        if (!this.auth.currentUser) {
            showNotification("Please login to purchase items", "warning");
            return;
        }
        const listingRef = doc(this.db, `Listings/${this.productId}`);
        const snapshot = await getDoc(listingRef);
        const listing = snapshot.data();

        try {
            await addDoc(collection(this.db, `users/${this.auth.currentUser.uid}/checkout`), {
                userId: this.auth.currentUser.uid,
                listingId: this.productId,
                ...listing
            });
            showNotification("Proceed to checkout!");
            animateButton(this.buyNowBtn);
            window.location.href = "checkout.html"; // Assuming you have a checkout page
        } catch (error) {
            console.error("Error proceeding to checkout:", error);
            showNotification("Failed to proceed to checkout. Please try again.");
        }
    }

    async handleWishlist() {
        if (!this.auth.currentUser) {
            showNotification("Please login to add items to wishlist", "warning");
            return;
        }
        const listingRef = doc(this.db, `Listings/${this.productId}`);
        const snapshot = await getDoc(listingRef);
        const listing = snapshot.data();

        try {
            await addDoc(collection(this.db, `users/${this.auth.currentUser.uid}/wishlist`), {
                userId: this.auth.currentUser.uid,
                listingId: this.productId,
                ...listing,
            });
            showNotification("Item added to wishlist!");
            animateButton(this.wishlistBtn, 'sounds/pop-268648.mp3');
            animateIconToCart(this.wishlistBtn, 'wishlist-icon');
            await updateWishlistCounter(this.db, this.auth.currentUser.uid);
        } catch (error) {
            console.error("Error adding item to wishlist:", error);
            showNotification("Failed to add item to wishlist. Please try again.");
        }
    }

    async handleMessageSeller() {
        if (!this.auth.currentUser) {
            showNotification("Please login to message the seller", "warning");
            return;
        }
        window.location.href = `chat.html?sellerId=${this.seller.id}&listingId=${this.productId}`;
    }

    async handleCopyLink() {
        const productUrl = `${window.location.origin}/product.html?id=${this.productId}`;
        try {
            await navigator.clipboard.writeText(productUrl);
            showNotification("Product link copied to clipboard!");
        } catch (error) {
            console.error("Error copying link to clipboard:", error);
            showNotification("Failed to copy link. Please try again.");
        }
    }

    showLoading() {
        this.loadingSpinner.style.display = 'flex';
        this.productContent.style.display = 'none';
        this.errorMessage.style.display = 'none';
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
        this.productContent.style.display = 'grid';
    }

    showError(message) {
        this.loadingSpinner.style.display = 'none';
        this.productContent.style.display = 'none';
        this.errorMessage.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    // Touch event handlers for image gallery
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        if (!this.touchStartX) return;
        
        const touchEndX = e.touches[0].clientX;
        const diff = this.touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.navigateImage(1);
            } else {
                this.navigateImage(-1);
            }
            this.touchStartX = null;
        }
    }

    handleTouchEnd() {
        this.touchStartX = null;
    }

    async updateCartCounter() {
        if (!this.auth.currentUser) return;
        await updateCartCounter(this.db, this.auth.currentUser.uid);
    }

    async updateWishlistCounter() {
        if (!this.auth.currentUser) return;
        await updateWishlistCounter(this.db, this.auth.currentUser.uid);
    }

    async updateChatCounter() {
        if (!this.auth.currentUser) return;
        await updateChatCounter(this.db, this.auth.currentUser.uid);
    }
}

// Initialize the product page
document.addEventListener('DOMContentLoaded', () => {
    const productPage = new ProductPage();
    productPage.initialize();
});

document.addEventListener('DOMContentLoaded', () => {
    const shareButtons = document.querySelectorAll('.share-btn');
    const notification = document.getElementById('notification');

    shareButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productUrl = window.location.href;
            navigator.clipboard.writeText(productUrl).then(() => {
                notification.style.display = 'block';
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 3000);

                const platform = button.classList[1];
                let redirectUrl = '';
                switch (platform) {
                    case 'whatsapp':
                        redirectUrl = `https://wa.me/?text=${encodeURIComponent(productUrl)}`;
                        break;
                    case 'telegram':
                        redirectUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}`;
                        break;
                    case 'twitter':
                        redirectUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}`;
                        break;
                    case 'copy':
                        return; // No redirection for copy link
                }
                window.open(redirectUrl, '_blank');
            });
        });
    });
});