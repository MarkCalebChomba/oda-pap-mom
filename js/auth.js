import { auth } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firestore = getFirestore();

// Function to log in a user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login successful:", userCredential);
    return userCredential;
  } catch (error) {
    console.error("Login error:", error.message);
    throw error; // Re-throw the error for the caller to handle
  }
};
// Function to sign up a new user
const signUpUser = async (email, phone, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store additional user information in Firestore
    await setDoc(doc(firestore, "Users", user.uid), {
      email: user.email,
      phone: phone,
      name: "",
      profilePicUrl: "images/profile-placeholder.png"
    });

    return user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Function to log out a user
const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('User logged out');
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

// Function to listen to auth state changes
const onAuthChange = (callback) => {
  onAuthStateChanged(auth, callback);
};

// Export the functions to use them in other files
export {  signUpUser, logoutUser, onAuthChange };
