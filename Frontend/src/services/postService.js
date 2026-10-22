
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  const postsCollection = collection(db, "posts");
  
  // Save a new text post.
  export async function createPost(user, postData) {
    if (!user) {
      throw new Error("Please log in first.");
    }
  
    const text = postData.text?.trim();
  
    if (!text || text.length > 5000) {
      throw new Error("Post text must be 1–5000 characters.");
    }
  
    if (!["public", "private"].includes(postData.privacy)) {
      throw new Error("This audience option is not available yet.");
    }
  
    return addDoc(postsCollection, {
      authorId: user.uid,
      userName: user.displayName || user.email?.split("@")[0] || "User",
      text,
      privacy: postData.privacy,
      taggedPerson: postData.taggedPerson || null,
      feeling: postData.feeling || null,
      attachedFile: null,
      likes: 0,
      comments: [],
      createdAt: serverTimestamp(),
    });
  }
  
  // Listen to public posts and the user's own posts.
  export function subscribeToPosts(userId, onPosts, onError) {
    const publicPosts = new Map();
    const ownPosts = new Map();
  
    function updateFeed() {
      const combined = new Map([...publicPosts, ...ownPosts]);
  
      const sorted = [...combined.values()].sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );
  
      onPosts(sorted);
    }
  
    function processSnapshot(target, snapshot) {
      target.clear();
  
      snapshot.forEach((item) => {
        const data = item.data();
  
        target.set(item.id, {
          ...data,
          id: item.id,
          timestamp:
            data.createdAt?.toDate?.().toLocaleString() || "just now",
        });
      });
  
      updateFeed();
    }
  
    const unsubscribePublic = onSnapshot(
      query(postsCollection, where("privacy", "==", "public")),
      (snapshot) => processSnapshot(publicPosts, snapshot),
      onError
    );
  
    const unsubscribeOwn = onSnapshot(
      query(postsCollection, where("authorId", "==", userId)),
      (snapshot) => processSnapshot(ownPosts, snapshot),
      onError
    );
  
    return () => {
      unsubscribePublic();
      unsubscribeOwn();
    };
  }
  
  // Delete a post by document ID.
  export async function deletePost(postId) {
    await deleteDoc(doc(db, "posts", postId));
  }
  