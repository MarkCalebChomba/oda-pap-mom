import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Initialize Firebase services
const auth = getAuth();
const database = getDatabase();

// Fetch and display the chat list
function displayChatList(chatList) {
  const chatSidebar = document.getElementById('chat-sidebar');
  chatSidebar.innerHTML = ''; // Clear existing chat list

  Object.entries(chatList).forEach(([chatId, chatData]) => {
    const chatDiv = document.createElement('div');
    chatDiv.classList.add('chat-item');
    chatDiv.textContent = chatData.name; // Assuming chatData has a name property
    chatDiv.onclick = () => loadChatMessages(chatId);
    chatSidebar.appendChild(chatDiv);
  });
}

// Load chat messages for the selected chat
function loadChatMessages(chatId) {
  const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
  const chatWindow = document.getElementById('chat-window');
  chatWindow.innerHTML = ''; // Clear existing messages

  onValue(chatMessagesRef, (snapshot) => {
    const messages = snapshot.val();
    if (messages) {
      Object.values(messages).forEach((message) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-bubble');
        messageDiv.textContent = message.content;
        chatWindow.appendChild(messageDiv);
      });
    }
  });
}

// Send a message
function sendMessage(chatId, messageContent) {
  const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
  const newMessageRef = push(chatMessagesRef);
  set(newMessageRef, {
    senderId: auth.currentUser.uid,
    content: messageContent,
    timestamp: Date.now(),
  });
}

// Example usage: Sending a message when the form is submitted
document.getElementById('send-button').onclick = () => {
  const chatId =('') /* get the current chat ID */;
  const messageContent = document.getElementById('message-input').value;
  if (messageContent.trim() !== '') {
    sendMessage(chatId, messageContent);
  }
};

// Fetch chat list on page load
const chatListRef = ref(database, `users/${auth.currentUser.uid}/chats`);
onValue(chatListRef, (snapshot) => {
  const chatList = snapshot.val();
  if (chatList) {
    displayChatList(chatList);
  }
});
