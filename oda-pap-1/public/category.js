import { logoutUser, onAuthChange } from "./js/auth.js";
import { app } from "./js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { initializeImageSliders } from './imageSlider.js';
import { showLoader, hideLoader } from './loader.js';

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

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
                          <img src="${userData.profilePicUrl || "images/profile-placeholder.png"}" alt="${displayName}">
                          <div>
                              <p><strong>${displayName}</strong></p>
                              <p>${listing.name}</p>
                          </div>
                          <div class="product-actions">
                              <div>
                                  <i class="fas fa-comments" onclick="goToChat('${sellerId}')"></i>
                                  <p>Message</p>
                              </div>
                              <div>
                                  <i class="fas fa-share" onclick="shareProduct('${listingDoc.id}', '${listing.name}', '${listing.description}', '${firstImageUrl}')"></i>
                                  <p>Share</p>
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
        ...listing,
      });
      window.location.href = "checkout.html";
    } catch (error) {
      console.error("Error adding item to checkout:", error);
      showNotification("Failed to proceed to checkout. Please try again.");
    }
  } else {
    showNotification("Please log in to proceed with the purchase.");
  }
};

// Update the page load event listener
document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedListings();
  
  // Setup search event listeners if search elements exist
  if (searchInput && searchForm) {
      searchInput.addEventListener("input", async function() {
          const input = searchInput.value.trim().toLowerCase();
          if (input.length > 0) {
              const filteredSuggestions = await fetchSearchResults(input);
              displaySuggestions(filteredSuggestions);
          } else {
              searchSuggestions.innerHTML = "";
          }
      });

      searchForm.addEventListener("submit", function(event) {
          event.preventDefault();
      });
  }
});
