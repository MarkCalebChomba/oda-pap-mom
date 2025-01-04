 // Import the functions you need from the SDKs you need
import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries
//  import dotenv from './dotenv'; 

 // dotenv.config();
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDez809vabqwQrGi5KaQ1-crKvk8oL5x90",
    authDomain: "oda-pap-46469.firebaseapp.com",
    databaseURL: "https://oda-pap-46469-default-rtdb.firebaseio.com",
    projectId: "oda-pap-46469",
    storageBucket: "oda-pap-46469.appspot.com",
    messagingSenderId: "104112612296",
    appId: "1:104112612296:web:0d7893046b3fadcf2d56fd"
  };

  // Initialize Firebase
 
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const firestore = getFirestore(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


