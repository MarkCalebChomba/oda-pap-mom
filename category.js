import { logoutUser, onAuthChange } from "./js/auth.js";
import { app } from "./js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

// Function to load and display filtered listings based on category
const loadFeaturedListings = async () => {
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
            } else {
              console.warn("User data not found for uploaderId:", uploaderId);
            }
          } catch (error) {
            console.error(
              `Error fetching user data for uploaderId: ${uploaderId}`,
              error
            );
          }
        } else {
          console.warn("Listing missing uploaderId and userId:", listingDoc.id);
        }

        const displayName =
          userData.name || userData.username || "Unknown User";
        const imageUrls = listing.imageUrls || [];
        const firstImageUrl =
          imageUrls.length > 0
            ? imageUrls[0]
            : "images/product-placeholder.png";
        const imageUrlsJSON = JSON.stringify(imageUrls);
        const sellerId = listing.uploaderId || listing.userId; // Assuming sellerId is stored here

        const listingElement = document.createElement("div");
        listingElement.className = "listing-item";

        listingElement.innerHTML = `
        <div class="product-item">
          <div class="profile">
            <img src="${
              userData.profilePicUrl || "images/profile-placeholder.png"
            }" alt="${displayName}">
            <div>
              <p><strong>${displayName}</strong></p>
              <p>${listing.name}</p>
            </div>
             <div class="product-actions">
              <i class="fas fa-comments" onclick="goToChat('${sellerId
              }')"></i>
              <p>Message seller</p>
            </div>
          </div>
           <div class="product-image-container">
    <img src="${firstImageUrl}" alt="Product Image" class="product-image" onclick="toggleDropdown('${
        listingDoc.id
      }')">
    <div class="image-dropdown" id="dropdown-${listingDoc.id}">
      <div class="image-navigation">
        <button class="prev" onclick="changeImage(-1, '${
          listingDoc.id
        }')">&#10094;</button>
        <img id="galleryImage-${
          listingDoc.id
        }" src="${listing.imageUrls[1]}" alt="Gallery Image" data-image-urls='${imageUrlsJSON}'>
        <button class="next" onclick="changeImage(1, '${
          listingDoc.id
        }')">&#10095;</button>
      </div>
      <div class="description">
        <p>${listing.description}</p>
              </div>
            </div>
          </div>
          <p class="product-price"><strong>KES ${listing.price}</strong></p>
          <div class="product-actions">
            <div>
              <i class="fas fa-cart-plus" onclick="addToCart('${
                listingDoc.id
              }')"></i>
              <p>Cart</p>
            </div>
            <div>
              <i class="fas fa-bolt" onclick="buyNow('${listingDoc.id}')"></i>
              <p>Buy Now</p>
            </div>
            <div>
              <i class="fas fa-heart" onclick="addToWishlist('${
                listingDoc.id
              }')"></i>
              <p>Wishlist</p>
            </div>
           
            
            
          </div>
        </div>
      `;

        listingsContainer.appendChild(listingElement);
      }
    }
  } catch (error) {
    console.error("Error loading featured listings:", error);
  }
};

// Function to toggle dropdown gallery
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
      alert("Item added to cart!");
    } catch (error) {
      console.error("Error adding item to cart:", error);
      alert("Failed to add item to cart. Please try again.");
    }
  } else {
    alert("Please log in to add items to the cart.");
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
      alert("Item added to wishlist!");
    } catch (error) {
      console.error("Error adding item to wishlist:", error);
      alert("Failed to add item to wishlist. Please try again.");
    }
  } else {
    alert("Please log in to add items to the wishlist.");
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
      alert("Failed to proceed to checkout. Please try again.");
    }
  } else {
    alert("Please log in to proceed with the purchase.");
  }
};

// Load featured listings on page load
window.onload = loadFeaturedListings;

// DOM elements for search bar
const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById("searchSuggestions");
const searchForm = document.getElementById("searchForm");

// Function to fetch search results from Firestore based on the input
async function fetchSearchResults(query) {
  try {
    const listingsSnapshot = await getDocs(collection(firestore, "Listings"));
    const usersSnapshot = await getDocs(collection(firestore, "Users"));

    const suggestions = [];

    // Search listings for matching name, category, or description
    listingsSnapshot.forEach((listingDoc) => {
      const listing = listingDoc.data();
      if (
        listing.name.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      ) {
        suggestions.push({
          type: "listing",
          id: listingDoc.id,
          name: listing.name,
          description: listing.description,
          category: listing.category,
        });
      }
    });

    // Search users for matching profile names
    usersSnapshot.forEach((userDoc) => {
      const user = userDoc.data();
      if (
        user.name && user.name.toLowerCase().includes(query) ||
        user.username && user.username.toLowerCase().includes(query)
      ) {
        suggestions.push({
          type: "user",
          id: userDoc.id,
          name: user.name || user.username,
        });
      }
    });

    return suggestions;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}

// Function to display suggestions
function displaySuggestions(filteredSuggestions) {
  searchSuggestions.innerHTML = ""; // Clear previous suggestions
  filteredSuggestions.forEach((suggestion) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.className = "suggestion-item";
    suggestionItem.innerText = suggestion.name;
    
    // Handle the click event on suggestion items
    suggestionItem.onclick = function () {
      if (suggestion.type === "listing") {
        // Redirect to the listing item
        window.location.href = `listing.html?listingId=${suggestion.id}`;
      } else if (suggestion.type === "user") {
        // Redirect to the user's profile
        window.location.href = `profile.html?userId=${suggestion.id}`;
      }
    };
    searchSuggestions.appendChild(suggestionItem);
  });
}

// Event listener for search input changes
searchInput.addEventListener("input", async function () {
  const input = searchInput.value.trim().toLowerCase();
  if (input.length > 0) {
    const filteredSuggestions = await fetchSearchResults(input);
    displaySuggestions(filteredSuggestions);
  } else {
    searchSuggestions.innerHTML = ""; // Clear suggestions when input is empty
  }
});

// Prevent form submission for search bar
searchForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission for search
});
