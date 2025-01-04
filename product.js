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
    increment 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { app } from "./js/firebase.js";
import { showNotification } from './notifications.js';

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
        this.viewCountEl = document.getElementById('viewCount');

        // Seller elements
        this.sellerImageEl = document.getElementById('sellerImage');
        this.sellerNameEl = document.getElementById('sellerName');
        this.sellerLocationEl = document.getElementById('sellerLocation');

        // Action buttons
        this.buyNowBtn = document.getElementById('buyNowBtn');
        this.addToCartBtn = document.getElementById('addToCartBtn');
        this.wishlistBtn = document.getElementById('wishlistBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.messageSellerBtn = document.getElementById('messageSellerBtn');
    }

    setupEventListeners() {
        this.prevBtn?.addEventListener('click', () => this.navigateImage(-1));
        this.nextBtn?.addEventListener('click', () => this.navigateImage(1));
        this.buyNowBtn?.addEventListener('click', () => this.handleBuyNow());
        this.addToCartBtn?.addEventListener('click', () => this.handleAddToCart());
        this.wishlistBtn?.addEventListener('click', () => this.handleWishlist());
        this.shareBtn?.addEventListener('click', () => this.handleShare());
        this.messageSellerBtn?.addEventListener('click', () => this.handleMessageSeller());

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
            await this.incrementViewCount();
            await this.loadSimilarProducts();
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
        this.productLocationEl.textContent = this.product.location || 'Location not specified';
        this.productDateEl.textContent = new Date(this.product.createdAt).toLocaleDateString();
        this.viewCountEl.textContent = this.product.views || 0;

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
        this.sellerImageEl.src = this.seller.profilePicUrl || 'images/default-profile.png';
        this.sellerNameEl.textContent = this.seller.name || 'Unknown Seller';
        this.sellerLocationEl.textContent = this.seller.location || 'Location not specified';
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

    async incrementViewCount() {
        try {
            const docRef = doc(this.db, "Listings", this.productId);
            await updateDoc(docRef, {
                views: increment(1)
            });
        } catch (error) {
            console.error('Error incrementing view count:', error);
        }
    }

    async loadSimilarProducts() {
        try {
            const q = query(
                collection(this.db, "Listings"),
                where("category", "==", this.product.category),
                where("uploaderId", "!=", this.product.uploaderId)
            );
            const querySnapshot = await getDocs(q);
            // Implementation for displaying similar products
        } catch (error) {
            console.error('Error loading similar products:', error);
        }
    }

    async handleAddToCart() {
        if (!this.auth.currentUser) {
            showNotification("Please login to add items to cart", "warning");
            return;
        }
        // Add to cart implementation
    }

    async handleBuyNow() {
        if (!this.auth.currentUser) {
            showNotification("Please login to purchase items", "warning");
            return;
        }
        // Buy now implementation
    }

    async handleWishlist() {
        if (!this.auth.currentUser) {
            showNotification("Please login to add items to wishlist", "warning");
            return;
        }
        // Wishlist implementation
    }

    async handleShare() {
        const shareData = {
            title: this.product.name,
            text: this.product.description,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                this.showShareModal();
            }
        } else {
            this.showShareModal();
        }
    }

    showShareModal() {
        // Implementation for custom share modal
    }

    async handleMessageSeller() {
        if (!this.auth.currentUser) {
            showNotification("Please login to message the seller", "warning");
            return;
        }
        // Message seller implementation
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
}

// Initialize the product page
document.addEventListener('DOMContentLoaded', () => {
    const productPage = new ProductPage();
    productPage.initialize();
});