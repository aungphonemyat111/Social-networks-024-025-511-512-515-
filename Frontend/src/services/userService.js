import {
    doc,
    getDoc,
    onSnapshot,
    setDoc,
    serverTimestamp,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  const userDocument = (uid) => doc(db, "users", uid);
  
  // Get another student's profile.
  export async function getUserProfile(uid) {
    if (!uid) {
      throw new Error("User ID is missing.");
    }
  
    const snapshot = await getDoc(userDocument(uid));
  
    if (!snapshot.exists()) {
      return null;
    }
  
    return {
      uid: snapshot.id,
      ...snapshot.data(),
    };
  }
  
  // Listen for changes to a student's profile.
  export function subscribeToUserProfile(uid, onUpdate, onError) {
    if (!uid) {
      throw new Error("User ID is missing.");
    }
  
    return onSnapshot(
      userDocument(uid),
      (snapshot) => {
        onUpdate(
          snapshot.exists()
            ? { uid: snapshot.id, ...snapshot.data() }
            : null
        );
      },
      onError
    );
  }
  
  // Save the current student's profile information.
  export async function saveUserProfile(uid, profileData) {
    if (!uid) {
      throw new Error("Please log in first.");
    }
  
    const nickname = (profileData.nickname || "").trim();
    const faculty = (profileData.faculty || "").trim();
    const major = (profileData.major || "").trim();
    const bio = (profileData.bio || "").trim();
  
    if (!nickname) {
      throw new Error("Please enter your nickname.");
    }
  
    if (nickname.length > 40) {
      throw new Error("Nickname must be 40 characters or fewer.");
    }
  
    if (faculty.length > 100 || major.length > 100) {
      throw new Error("Faculty and major must be 100 characters or fewer.");
    }
  
    if (bio.length > 150) {
      throw new Error("Bio must be 150 characters or fewer.");
    }
  
    const updates = {
      nickname,
      faculty,
      major,
      bio,
      updatedAt: serverTimestamp(),
    };
  
    // Only update photos when a new URL is supplied.
    if (typeof profileData.photoURL === "string") {
      updates.photoURL = profileData.photoURL;
    }
  
    if (typeof profileData.coverURL === "string") {
      updates.coverURL = profileData.coverURL;
    }
  
    await setDoc(userDocument(uid), updates, {
      merge: true,
    });
  }
  