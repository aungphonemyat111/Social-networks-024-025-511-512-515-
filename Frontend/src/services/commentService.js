
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
  
export async function addComment(
    postId,
    user,
    text,
    parentId = null
  ) {
    if (!user) {
      throw new Error("Please log in first.");
    }
  
    const trimmed = text.trim();
  
    if (!trimmed || trimmed.length > 1000) {
      throw new Error(
        "Comment must contain 1–1000 characters."
      );
    }
  
    // Check that the reply belongs to a valid top-level comment.
    if (parentId) {
      const parentRef = doc(
        db,
        "posts",
        postId,
        "comments",
        parentId
      );
  
      const parentSnapshot = await getDoc(parentRef);
  
      if (
        !parentSnapshot.exists() ||
        parentSnapshot.data().parentId
      ) {
        throw new Error("Reply target is invalid.");
      }
    }
  
    return addDoc(
      collection(db, "posts", postId, "comments"),
      {
        authorId: user.uid,
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",
        text: trimmed,
        parentId: parentId || null,
        createdAt: serverTimestamp(),
      }
    );
  }
  
  
  export function subscribeToComments(postId, onComments, onError) {
    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc")
    );
  
    return onSnapshot(
      commentsQuery,
      (snapshot) => {
        const comments = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
  
        onComments(comments);
      },
      onError
    );
  }
  