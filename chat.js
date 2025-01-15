// chat.js
import { app } from './js/firebase.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDoc, doc } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js';

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const fileInput = document.getElementById('file-input');
const sendButton = document.getElementById('send-button');
const sendFileButton = document.getElementById('send-file-button');

let chatHeaderDisplayed = false; // Track if chat header is already displayed

// Function to send a message
async function sendMessage() {
    const messageText = chatInput.value;
    if (messageText.trim() === '') return;

    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to send a message.');
        return;
    }

    const chatId = getChatId(); // Function to retrieve or generate chat ID
    const buyerId = user.uid; // Assuming the current user is the buyer
    const sellerId = getSellerId(); // Function to retrieve seller ID
    const listingId = getListingId(); // Function to retrieve listing ID

    // Show loading spinner
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const userDoc = await getDoc(doc(firestore, "Users", user.uid));
    const userName = userDoc.exists() ? userDoc.data().name : user.displayName || 'Anonymous';

    const messageData = {
        chatId,
        buyerId,
        sellerId,
        senderId: user.uid,
        senderName: userName, // Use the fetched user name
        message: messageText,
        timestamp: serverTimestamp(),
    };

    const listingDoc = await getDoc(doc(firestore, "Listings", listingId));
    if (listingDoc.exists()) {
        const listing = listingDoc.data();
        const imageUrl = listing.imageUrls ? listing.imageUrls[0] : 'images/product-placeholder.png';
        messageData.fileUrl = imageUrl;
        messageData.fileType = 'image/jpeg';
        messageData.listingId = listingId; // Include listing ID in the message data
    }

    await addDoc(collection(firestore, 'Messages'), messageData);

    chatInput.value = ''; // Clear the input field
    document.getElementById('attached-image').style.display = 'none'; // Hide the attached image

    // Hide loading spinner
    sendButton.innerHTML = 'Send';
}

// Function to send a file
async function sendFile(file) {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to send a file.');
        return;
    }

    const chatId = getChatId(); // Function to retrieve or generate chat ID
    const buyerId = user.uid; // Assuming the current user is the buyer
    const sellerId = getSellerId(); // Function to retrieve seller ID

    // Show loading spinner
    sendFileButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const fileRef = ref(storage, `chat_files/${chatId}/${file.name}`);
    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    const userDoc = await getDoc(doc(firestore, "Users", user.uid));
    const userName = userDoc.exists() ? userDoc.data().name : user.displayName || 'Anonymous';

    await addDoc(collection(firestore, 'Messages'), {
        chatId,
        buyerId,
        sellerId,
        senderId: user.uid,
        senderName: userName, // Use the fetched user name
        fileUrl,
        fileType: file.type,
        timestamp: serverTimestamp(),
    });

    // Hide loading spinner
    sendFileButton.innerHTML = '<i class="fas fa-paperclip"></i>';
}

sendButton.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

sendFileButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        sendFile(file);
    }
});

// Function to load chat messages
function loadChatMessages(chatId) {
    // Ensure the required Firestore index is created:
    // https://console.firebase.google.com/v1/r/project/oda-pap-46469/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9vZGEtcGFwLTQ2NDY5L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9NZXNzYWdlcy9pbmRleGVzL18QARoKCgZjaGF0SWQQARoNCgl0aW1lc3RhbXAQARoMCghfX25hbWVfXxAB
    const messagesQuery = query(
        collection(firestore, 'Messages'),
        where('chatId', '==', chatId),
        orderBy('timestamp') // Order messages by timestamp
    );

    onSnapshot(messagesQuery, async (snapshot) => {
        chatContainer.innerHTML = ''; // Clear existing messages
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push(doc.data());
        });

        // Display messages in order
        messages.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)); // Sort messages by timestamp
        messages.forEach((messageData) => {
            displayMessage(messageData);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
    });
}

// Function to display chat header
function displayChatHeader(userData) {
    if (chatHeaderDisplayed) return; // Ensure only one chat header is displayed

    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
        <img src="${userData.profilePicUrl || 'images/profile-placeholder.png'}" alt="Profile Picture" class="profile-picture" onclick="window.location.href='user.html?userId=${userData.userId}'" style="cursor: pointer;">
        <span class="profile-name">${userData.name}</span>
    `;
    chatContainer.parentNode.insertBefore(chatHeader, chatContainer);
    chatHeaderDisplayed = true;
}

// Function to display a message
async function displayMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    const isSender = messageData.senderId === auth.currentUser.uid;
    const bubbleClass = isSender ? 'sender' : 'receiver';
    
    // Fetch sender's name if not available in messageData
    let senderName = messageData.senderName;
    if (!senderName) {
        const senderDoc = await getDoc(doc(firestore, "Users", messageData.senderId));
        senderName = senderDoc.exists() ? senderDoc.data().name : "Unknown User";
    }

    if (messageData.fileUrl) {
        const fileType = messageData.fileType.startsWith('image/') ? 'img' : 'video';
        messageElement.innerHTML = `
            <div class="message-bubble ${bubbleClass}">
                <div class="sender-name">${isSender ? 'You' : senderName}</div>
                <${fileType} src="${messageData.fileUrl}" controls onclick="window.location.href='product.html?id=${messageData.listingId}'" style="cursor: pointer; max-width: 200px; max-height: 200px;"></${fileType}>
                <p>${messageData.message}</p>
                <span class="timestamp">${new Date(messageData.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-bubble ${bubbleClass}">
                <div class="sender-name">${isSender ? 'You' : senderName}</div>
                <p>${messageData.message}</p>
                <span class="timestamp">${new Date(messageData.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
            </div>
        `;
    }
    chatContainer.appendChild(messageElement);
}

// Function to get or create chat ID
function getChatId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sellerId') || 'defaultChatId';
}

// Function to get seller ID
function getSellerId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sellerId');
}

// Function to get listing ID
function getListingId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('listingId');
}

// Initialize chat loading
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const chatId = getChatId();
        loadChatMessages(chatId);

        // Check if there's an image to attach to the message input
        const listingId = getListingId();
        if (listingId) {
            const listingDoc = await getDoc(doc(firestore, "Listings", listingId));
            if (listingDoc.exists()) {
                const listing = listingDoc.data();
                const imageUrl = listing.imageUrls ? listing.imageUrls[0] : 'images/product-placeholder.png';
                const attachedImage = document.getElementById('attached-image');
                attachedImage.src = imageUrl;
                attachedImage.style.display = 'block';
            }
        }

        // Fetch and display chat header
        const otherUserId = getSellerId() === user.uid ? getBuyerId() : getSellerId();
        const otherUserDoc = await getDoc(doc(firestore, "Users", otherUserId));
        if (otherUserDoc.exists()) {
            const otherUserData = otherUserDoc.data();
            otherUserData.userId = otherUserId; // Include userId in the data
            displayChatHeader(otherUserData);
        }
    } else {
        alert('Please log in to view your chats.');
        window.location.href = 'login.html';
    }
});
