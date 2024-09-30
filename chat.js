import { app } from "./js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, where, onSnapshot, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);

// DOM Elements
const chatMessagesContainer = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const sellerId = new URLSearchParams(window.location.search).get("sellerId"); // Get sellerId from URL

// Function to display messages
function displayMessage(message) {
  let displayName = message.senderName;

  // Fall back to using part of the email if displayName is not available
  if (!displayName && message.senderEmail) {
    displayName = message.senderEmail.split("@")[0];
  }

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.innerHTML = `
    <p><strong>${displayName}:</strong> ${message.text}</p>
    <small>${new Date(message.timestamp?.toDate()).toLocaleString()}</small>
  `;
  chatMessagesContainer.appendChild(messageDiv);
}

// Listen to authentication changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // Fetch existing chat messages between buyer and seller
    loadMessages(user.uid, sellerId);

    // Handle sending messages
    sendButton.addEventListener("click", () => sendMessage(user.uid, user.displayName || user.email));
    chatInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        sendMessage(user.uid, user.displayName || user.email);
      }
    });
  } else {
    alert("Please log in to chat with the seller.");
    window.location.href = "login.html";
  }
});

// Function to load existing chat messages between buyer and seller
function loadMessages(buyerId, sellerId) {
  const chatRef = collection(firestore, "Chats");
  const chatQuery = query(chatRef, where("buyerId", "==", buyerId), where("sellerId", "==", sellerId));

  onSnapshot(chatQuery, (snapshot) => {
    chatMessagesContainer.innerHTML = ""; // Clear previous messages
    snapshot.forEach((doc) => {
      displayMessage(doc.data());
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to the bottom
  });
}

// Function to send a message
async function sendMessage(buyerId, senderName) {
  const messageText = chatInput.value.trim();
  if (messageText === "") return; // Do not send empty messages

  try {
    await addDoc(collection(firestore, "Chats"), {
      buyerId: buyerId,
      sellerId: sellerId,
      text: messageText,
      senderName: senderName,
      timestamp: serverTimestamp(),
    });

    chatInput.value = ""; // Clear input field after sending
  } catch (error) {
    console.error("Error sending message:", error);
  }
}
