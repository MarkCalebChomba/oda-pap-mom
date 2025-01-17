import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { showLoader, hideLoader } from './loader.js';
import { showNotification } from './notifications.js';

// Initialize Firebase services
const auth = getAuth();
const firestore = getFirestore();

const loadOrderDetails = async (orderId) => {
  showLoader();
  try {
    const orderDoc = await getDoc(doc(firestore, "Orders", orderId));
    if (!orderDoc.exists()) {
      throw new Error("Order not found");
    }
    const orderData = orderDoc.data();
    displayOrderDetails(orderData);
  } catch (error) {
    console.error("Error loading order details:", error);
    showNotification("Failed to load order details. Please try again later.", "error");
  } finally {
    hideLoader();
  }
};

const displayOrderDetails = (orderData) => {
  const orderDetailsContainer = document.getElementById('orderDetailsContainer');
  orderDetailsContainer.innerHTML = `
    <h2>Order ID: ${orderData.id}</h2>
    <p>Status: ${orderData.status}</p>
    <p>Total: KES ${orderData.total}</p>
    <h3>Items:</h3>
    <ul>
      ${orderData.items.map(item => `
        <li>
          <p>${item.name} - KES ${item.price}</p>
        </li>
      `).join('')}
    </ul>
  `;
};

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  if (orderId) {
    loadOrderDetails(orderId);
  } else {
    showNotification("Order ID is missing from the URL.", "error");
  }
});
