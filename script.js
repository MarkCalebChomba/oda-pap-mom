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
  where
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { initializeImageSliders } from './imageSlider.js';
import { showLoader, hideLoader } from './loader.js';

import { showNotification } from './notifications.js';
// Initialize Firebase services using the app instance
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

// DOM elements
const profilePic = document.getElementById("profile-pic");
const userEmail = document.getElementById("user-email");
const userName = document.getElementById("user-name");
const userPhone = document.getElementById("user-phone");


// Toggle menu dropdown
export function toggleMenu() {
  const dropdown = document.getElementById("dropdown");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

// Close dropdown if clicked outside
window.onclick = function (event) {
  if (
    !event.target.matches(".menu-icon") &&
    !event.target.matches(".menu-icon *")
  ) {
    const dropdown = document.getElementById("dropdown");
    if (dropdown.style.display === "block") {
      dropdown.style.display = "none";
    }
  }
};

// Function to display user status and logout button
const displayAuthStatus = (user) => {
  const authStatusDiv = document.getElementById("auth-status");
  authStatusDiv.innerHTML = ""; // Clear the current content

  if (user) {
    const logoutButton = document.createElement("button");
    logoutButton.innerText = "Logout";
    logoutButton.addEventListener("click", async () => {
      await logoutUser();
      window.location.reload(); // Reload the page after logout
    });

    const welcomeMessage = document.createElement("span");
    welcomeMessage.innerText = `Welcome to Oda-Pap, ${user.email}`;

    authStatusDiv.appendChild(welcomeMessage);
    authStatusDiv.appendChild(logoutButton);
  } else {
    authStatusDiv.innerHTML =
      '<a href="login.html">Login</a> | <a href="signup.html">Sign Up</a>';
  }
};

// Listen to authentication state changes
onAuthChange(displayAuthStatus);

// Function to load and display featured listings with gallery dropdown
// DOM elements remain the same...

// Share functionality
async function shareProduct(listingId, productName, productDescription, imageUrl) {
  try {
    if (navigator.share) {
      await navigator.share({
        title: productName,
        text: productDescription,
        url: `${window.location.origin}/product.html?id=${listingId}`
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const shareUrl = `${window.location.origin}/product.html?id=${listingId}`;
      const shareModal = document.createElement('div');
      shareModal.className = 'share-modal';
      shareModal.innerHTML = `
        <div class="share-modal-content">
          <h3>Share via:</h3>
          <div class="share-buttons">
            <a href="https://wa.me/?text=${encodeURIComponent(`Check out ${productName}: ${shareUrl}`)}" target="_blank">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(productName)}" target="_blank">
              <i class="fab fa-telegram"></i> Telegram
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${productName}`)}&url=${encodeURIComponent(shareUrl)}" target="_blank">
              <i class="fab fa-twitter"></i> Twitter
            </a>
            <button onclick="copyToClipboard('${shareUrl}')">
              <i class="fas fa-copy"></i> Copy Link
            </button>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="close-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      document.body.appendChild(shareModal);
    }
  } catch (error) {
    console.error('Error sharing:', error);
  }
}

// Copy to clipboard function
window.copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Link copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const loadFeaturedListings = async () => {
  showLoader();
  try {
    const listingsSnapshot = await getDocs(collection(firestore, "Listings"));
    const listingsContainer = document.getElementById("listings-container");
    listingsContainer.innerHTML = "";

    for (const listingDoc of listingsSnapshot.docs) {
      const listing = listingDoc.data();
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
            <img src="${userData.profilePicUrl || "images/profile-placeholder.png"}" alt="${displayName}">
            <div>
              <p><strong>${displayName}</strong></p>
              <p>${listing.name}</p>
            </div>
            <div class="product-actions">
              <div>
                <i class="fas fa-comments" onclick="goToChat('${sellerId}')"></i>
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
            </div>
          </div>
          <p class="product-price"><strong>KES ${listing.price}</strong></p>
          <div class="product-actions">
            <div>
              <i class="fas fa-cart-plus" onclick="addToCart('${listingDoc.id}')"></i>
              <p>Cart</p>
            </div>
            <div>
              <i class="fas fa-bolt" onclick="buyNow('${listingDoc.id}')"></i>
              <p>Buy Now</p>
            </div>
            <div>
              <i class="fas fa-heart" onclick="addToWishlist('${listingDoc.id}')"></i>
              <p>Wishlist</p>
            </div>
          </div>
        </div>
      `;

      listingsContainer.appendChild(listingElement);
    }
    
    // Initialize image sliders after content is loaded
    initializeImageSliders();

  } catch (error) {
    console.error("Error loading featured listings:", error);
  }
};

// Make shareProduct available globally
window.shareProduct = shareProduct;

/*// Function to toggle dropdown gallery
window.toggleDropdown = function (listingId) {
  const dropdown = document.getElementById(`dropdown-${listingId}`);
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
};

// Function to change images in the gallery
window.changeImage = function (direction, listingId) {
  const galleryImage = document.getElementById(`galleryImage-${listingId}`);
  const imageUrls = JSON.parse(galleryImage.dataset.imageUrls);
  let currentIndex = imageUrls.indexOf(galleryImage.src);

  currentIndex = (currentIndex + direction + imageUrls.length) % imageUrls.length;
  galleryImage.src = imageUrls[currentIndex];
};*/
// Add this function to handle product navigation
window.goToProduct = function(productId) {
  window.location.href = `product.html?id=${productId}`;
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
      // Redirect to checkout page or initiate the checkout process
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
window.goToChat = function (sellerId) {
  const user = auth.currentUser;
  if (user) {
    // Redirect the user to the chat page with the seller
    window.location.href = `chat.html?sellerId=${sellerId}`;
  } else {
    showNotification("Please log in to message the seller.");
  }
};



//search
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

const performSearch = async (searchTerm) => {
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
        console.error("Search error:", error);
    }
};

const debouncedSearch = debounce((e) => {
    performSearch(e.target.value);
}, 300);

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Load featured listings
    loadFeaturedListings();

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
});
  