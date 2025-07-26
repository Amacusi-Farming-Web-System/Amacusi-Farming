import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

/**
 * Stores or updates the signed-in user's data in Firestore.
 * @param {Object} user - Firebase user object
 * @param {Object} db - Initialized Firestore instance
 */
export async function storeUsers(user, db) {
  try {
    const userRef = doc(db, "users", user.uid);

    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: new Date(),
      },
      { merge: true }
    );
    console.log("User data stored successfully");
  } catch (error) {
    console.error("User not stored", error);
    throw error;
  }
}
