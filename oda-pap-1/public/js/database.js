// Import necessary modules from Firebase
import { getDatabase, ref, set, get, update, remove, child } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { app } from './firebase.js'; // Adjust the path according to your project structure

// Initialize Firebase Realtime Database
const db = getDatabase(app);

/**
 * Add a document to a specific collection in the Realtime Database.
 * @param {string} collectionName - The name of the collection.
 * @param {object} data - The data to be added.
 * @returns {Promise<void>}
 */
export async function addDocument(collectionName, data) {
    const newDocRef = ref(db, `${collectionName}/` + data.id);
    await set(newDocRef, data);
}

/**
 * Get all documents from a specific collection in the Realtime Database.
 * @param {string} collectionName - The name of the collection.
 * @returns {Promise<Array>} - An array of documents.
 */
export async function getAllDocuments(collectionName) {
    const collectionRef = ref(db, collectionName);
    const snapshot = await get(collectionRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    } else {
        return [];
    }
}

/**
 * Get a specific document from a collection in the Realtime Database.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document.
 * @returns {Promise<object>} - The document data.
 */
export async function getDocument(collectionName, documentId) {
    const documentRef = ref(db, `${collectionName}/${documentId}`);
    const snapshot = await get(documentRef);

    if (snapshot.exists()) {
        return snapshot.val();
    } else {
        throw new Error(`Document with ID ${documentId} does not exist.`);
    }
}

/**
 * Update a specific document in a collection in the Realtime Database.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document to be updated.
 * @param {object} newData - The new data to update the document with.
 * @returns {Promise<void>}
 */
export async function updateDocument(collectionName, documentId, newData) {
    const documentRef = ref(db, `${collectionName}/${documentId}`);
    await update(documentRef, newData);
}

/**
 * Delete a specific document from a collection in the Realtime Database.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document to be deleted.
 * @returns {Promise<void>}
 */
export async function deleteDocument(collectionName, documentId) {
    const documentRef = ref(db, `${collectionName}/${documentId}`);
    await remove(documentRef);
}

/**
 * Get documents from a collection that match specific criteria.
 * @param {string} collectionName - The name of the collection.
 * @param {Array} filters - An array of filter conditions, each an array of [field, operator, value].
 * @returns {Promise<Array>} - An array of documents that match the criteria.
 */
export async function getDocuments(collectionName, filters = []) {
    const collectionRef = ref(db, collectionName);
    const snapshot = await get(collectionRef);

    if (snapshot.exists()) {
        let data = snapshot.val();
        let results = Object.keys(data).map(key => ({ id: key, ...data[key] }));

        // Apply filters
        filters.forEach(([field, operator, value]) => {
            results = results.filter(doc => {
                switch (operator) {
                    case '==':
                        return doc[field] === value;
                    case '>':
                        return doc[field] > value;
                    case '<':
                        return doc[field] < value;
                    default:
                        return false;
                }
            });
        });

        return results;
    } else {
        return [];
    }
}
