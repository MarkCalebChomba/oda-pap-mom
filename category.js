import { logoutUser, onAuthChange } from "./js/auth.js";
import { app } from "./js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { initializeImageSliders } from './imageSlider.js';
import { showLoader, hideLoader } from './loader.js';
import { showNotification } from './notifications.js';
import { animateButton, animateIconToCart, updateCartCounter, updateWishlistCounter, updateChatCounter } from './js/utils.js';

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

// RateLimiter class definition
class RateLimiter {
  constructor(maxRequests, interval) {
    this.maxRequests = maxRequests;
    this.interval = interval;
    this.requests = [];
  }

  canProceed() {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.interval);
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
}

// Create centralized error handling
const errorHandler = {
  network: (error) => {
    showNotification('Network error', 'error');
  },
  auth: (error) => {
    showNotification('Authentication error', 'error');
  }
};

// Function to load and display filtered listings based on category
const loadFeaturedListings = async () => {
  showLoader();
  try {
    const listingsSnapshot = await getDocs(collection(firestore, "Listings"));
    const listingsContainer = document.querySelector(".listings-container");
    const category = listingsContainer.dataset.category;
    listingsContainer.innerHTML = "";

    for (const listingDoc of listingsSnapshot.docs) {
      const listing = listingDoc.data();
      if (listing.category === category) {
        const uploaderId = listing.uploaderId || listing.userId;
        let userData = {};

        if (uploaderId) {
          try {
            const userDoc = await getDoc(doc(firestore, "Users", uploaderId));
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching user data:`, error);
            showNotification('Failed to load listings. Please refresh the page.', 'error');
          } finally {
            hideLoader();
          }
        }

        const displayName = userData.name || userData.username || "Unknown User";
        const imageUrls = listing.imageUrls || [];
        const firstImageUrl = imageUrls.length > 0 ? imageUrls[0] : "images/product-placeholder.png";
        const sellerId = listing.uploaderId || listing.userId;

        const listingElement = document.createElement("div");
        listingElement.className = "listing-item";
        listingElement.innerHTML = `
          <div class="product-item">
            <div class="profile">
              <img src="${userData.profilePicUrl || "images/profile-placeholder.png"}" alt="${displayName}" onclick="goToUserProfile('${uploaderId}')">
              <div>
                <p><strong>${displayName}</strong></p>
                <p>${listing.name}</p>
              </div>
              <div class="product-actions">
                <div>
                  <i class="fas fa-comments" onclick="goToChat('${sellerId}', '${listingDoc.id}')"></i>
                  <small> Message </small>
                </div>
                <div>
                  <i class="fas fa-share" onclick="shareProduct('${listingDoc.id}', '${listing.name}', '${listing.description}', '${firstImageUrl}')"></i>
                  <small> Share </small>
                </div>
              </div>
            </div>
            <div class="product-image-container" onclick="goToProduct('${listingDoc.id}')">
              <div class="image-slider">
                ${imageUrls.map(url => `
                  <img src="${url}" alt="Product Image" class="product-image">
                `).join('')}
                <div class="product-tags">
                  ${listing.condition ? `<span class="product-condition">${listing.condition}</span>` : ''}
                  ${listing.age ? `<span class="product-age">${listing.age} </span>` : ''}
                </div>
              </div>
            </div>
            <p class="product-price">
              <strong>KES ${listing.price}</strong>
              <span class="initial-price">${listing.initialPrice ? `<s>KES ${listing.initialPrice}</s>` : ''}</span>
            </p>
            <p class="product-description">${listing.description ? listing.description : ''}</p>
            <div class="product-actions">
              <div>
                <i class="fas fa-cart-plus add-to-cart-btn" data-listing-id="${listingDoc.id}" onclick="addToCart('${listingDoc.id}')"></i>
                <p>Cart</p>
              </div>
              <div>
                <i class="fas fa-bolt buy-now-btn" data-listing-id="${listingDoc.id}" onclick="buyNow('${listingDoc.id}')"></i>
                <p>Buy Now</p>
              </div>
              <div>
                <i class="fas fa-heart wishlist-btn" data-listing-id="${listingDoc.id}" onclick="addToWishlist('${listingDoc.id}')"></i>
                <p>Wishlist</p>
              </div>
            </div>
          </div>
        `;

        listingsContainer.appendChild(listingElement);
      }
    }

    // Initialize image sliders after content is loaded
    initializeImageSliders();

  } catch (error) {
    console.error("Error loading featured listings:", error);
  }
};

// Add product navigation function
window.goToProduct = function(productId) {
  window.location.href = `product.html?id=${productId}`;
};

// Function to change images in the gallery
window.changeImage = function (direction, listingId) {
  const galleryImage = document.getElementById(`galleryImage-${listingId}`);
  const imageUrls = JSON.parse(galleryImage.dataset.imageUrls);
  let currentIndex = imageUrls.indexOf(galleryImage.src);

  currentIndex = (currentIndex + direction + imageUrls.length) % imageUrls.length;
  galleryImage.src = imageUrls[currentIndex];
};

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
        ...listing,
      });
      showNotification("Item added to cart!");
      const addToCartBtn = document.querySelector(`[data-listing-id="${listingId}"] .add-to-cart-btn`);
      if (addToCartBtn) {
        animateButton(addToCartBtn, 'sounds/pop-39222.mp3');
        animateIconToCart(addToCartBtn);
      }
      await updateCartCounter(firestore, user.uid);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      showNotification("Failed to add item to cart. Please try again.");
    }
  } else {
    showNotification("Please log in to add items to the cart.");
  }
};

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
        ...listing,
      });
      showNotification("Item added to wishlist!");
      const wishlistBtn = document.querySelector(`[data-listing-id="${listingId}"] .wishlist-btn`);
      if (wishlistBtn) {
        animateButton(wishlistBtn, 'sounds/pop-268648.mp3');
        animateIconToCart(wishlistBtn);
      }
      await updateWishlistCounter(firestore, user.uid);
    } catch (error) {
      console.error("Error adding item to wishlist:", error);
      showNotification("Failed to add item to wishlist. Please try again.");
    }
  } else {
    showNotification("Please log in to add items to the wishlist.");
  }
};

window.buyNow = async function (listingId) {
  const user = auth.currentUser;
  if (user) {
    const listingRef = doc(firestore, `Listings/${listingId}`);
    const snapshot = await getDoc(listingRef);
    const listing = snapshot.data();

    try {
      await addDoc(collection(firestore, `users/${user.uid}/checkout`), {
        userId: user.uid,
        listingId: listingId,
        ...listing
      });
      showNotification("Proceed to checkout!");
      animateButton(document.querySelector(`[data-listing-id="${listingId}"] .buy-now-btn`));
      window.location.href = "checkout.html"; // Assuming you have a checkout page
    } catch (error) {
      console.error("Error proceeding to checkout:", error);
      showNotification("Failed to proceed to checkout. Please try again.");
    }
  } else {
    showNotification("Please log in to buy items.");
  }
};

// Function to redirect to chat with seller
window.goToChat = function (sellerId, listingId) {
  const user = auth.currentUser;
  if (user) {
    window.location.href = `chat.html?sellerId=${sellerId}&listingId=${listingId}`;
  } else {
    showNotification("Please log in to message the seller.");
  }
};

// Function to redirect to user profile page
window.goToUserProfile = function(userId) {
  window.location.href = `user.html?userId=${userId}`;
};

// Search functionality
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Implement rate limiting for search
const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

const performSearch = async (searchTerm) => {
  if (!rateLimiter.canProceed()) {
    showNotification('Too many requests. Please try again later.', 'error');
    return;
  }

  if (!searchTerm || searchTerm.length < 2) {
    searchSuggestions.style.display = 'none';
    return;
  }
  try {
    const listingsRef = collection(firestore, "Listings");
    const q = query(
      listingsRef, 
      where("name", ">=", searchTerm.toLowerCase()),
      where("name", "<=", searchTerm.toLowerCase() + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    searchSuggestions.innerHTML = '';
    
    if (querySnapshot.empty) {
      searchSuggestions.style.display = 'none';
      return;
    }

    querySnapshot.forEach((doc) => {
      const listing = doc.data();
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerHTML = `
        <img src="${listing.imageUrls[0] || 'images/product-placeholder.png'}" alt="${listing.name}">
        <span>${listing.name}</span>
        <span>KES ${listing.price}</span>
      `;
      div.addEventListener('click', () => {
        window.location.href = `product.html?id=${doc.id}`;
      });
      searchSuggestions.appendChild(div);
    });
    searchSuggestions.style.display = 'block';
  } catch (error) {
    errorHandler.network(error);
  }
};

const debouncedSearch = debounce((e) => {
  performSearch(e.target.value);
}, 300);

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  await loadFeaturedListings();

  // Setup search event listeners
  if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchTerm = searchInput.value;
      window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
    });
  }

  // Setup click outside listener for search suggestions
  document.addEventListener('click', (e) => {
    if (searchSuggestions && !searchSuggestions.contains(e.target) && !searchInput.contains(e.target)) {
      searchSuggestions.style.display = 'none';
    }
  });

  // Ensure counters are always available
  if (auth.currentUser) {
    await updateCartCounter(firestore, auth.currentUser.uid);
    await updateWishlistCounter(firestore, auth.currentUser.uid);
    await updateChatCounter(firestore, auth.currentUser.uid);
  }
});
