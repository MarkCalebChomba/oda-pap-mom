// /src/js/firestore.js
import { db } from './firebase.js';
import { collection, addDoc, getDocs, getDoc, setDoc, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Function to add a new document to a collection
const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    console.log(`Document added to ${collectionName} with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

// Function to get a document by ID from a collection
const getDocumentById = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`Document data from ${collectionName}:`, docSnap.data());
      return docSnap.data();
    } else {
      console.log(`No such document in ${collectionName}!`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

// Function to update a document by ID in a collection
const updateDocumentById = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    console.log(`Document in ${collectionName} with ID ${docId} updated`);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// Function to get all documents from a collection with optional query filters
const getDocuments = async (collectionName, filters = []) => {
  try {
    let q = query(collection(db, collectionName));
    
    // Apply filters if any
    filters.forEach(filter => {
      q = query(q, where(...filter));
    });

    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Documents from ${collectionName}:`, documents);
    return documents;
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};
// Function to set a document with a specific ID
const setDocumentById = async (collectionName, docId, data) => {
  try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, data);
      console.log(`Document set in ${collectionName} with ID: ${docId}`);
      return docId;
  } catch (error) {
      console.error(`Error setting document in ${collectionName}:`, error);
      throw error;
  }
};


// Export the functions to use them in other files
export { addDocument, getDocumentById, updateDocumentById, getDocuments,setDocumentById };

export const createDocumentById = async (collection, id, data) => {
  try {
      await setDoc(doc(db, collection, id), data);
      console.log(`Document created in ${collection} with ID: ${id}`);
  } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
  }
};

