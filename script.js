import { logoutUser, onAuthChange } from "./js/auth.js";
import { app } from "./js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const loadFeaturedListings = async () => {
  try {
    const listingsSnapshot = await getDocs(collection(firestore, "Listings"));
    const listingsContainer = document.getElementById("listings-container");

    listingsContainer.innerHTML = ""; // Clear previous content

    for (const listingDoc of listingsSnapshot.docs) {
      const listing = listingDoc.data();

      // Check if uploaderId exists, or fallback to userId
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
        ...listing
      });
      alert("Proceed to checkout!");
      // Redirect to checkout page or initiate the checkout process
      window.location.href = "checkout.html"; // Assuming you have a checkout page
    } catch (error) {
      console.error("Error proceeding to checkout:", error);
      alert("Failed to proceed to checkout. Please try again.");
    }
  } else {
    alert("Please log in to buy items.");
  }
};

// Function to redirect to chat with seller
window.goToChat = function (sellerId) {
  const user = auth.currentUser;
  if (user) {
    // Redirect the user to the chat page with the seller
    window.location.href = `chat.html?sellerId=${sellerId}`;
  } else {
    alert("Please log in to message the seller.");
  }
};

// Load featured listings on page load
document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedListings();
});
