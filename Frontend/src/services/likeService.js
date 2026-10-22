
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    deleteDoc,
    serverTimestamp,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  // Get the number of likes and check if the current user liked.
  export function subscribeToLikes(
    postId,
    userId,
    onUpdate,
    onError
  ) {
    const likesRef = collection(
      db,
      "posts",
      postId,
      "likes"
    );
  
    return onSnapshot(
      likesRef,
      (snapshot) => {
        onUpdate({
          count: snapshot.size,
          isLiked: snapshot.docs.some(
            (item) => item.id === userId
          ),
        });
      },
      onError
    );
  }
  
  // Like or unlike a post.
  export async function setPostLike(
    postId,
    userId,
    shouldLike
  ) {
    if (!userId) {
      throw new Error("Please log in first.");
    }
  
    const likeRef = doc(
      db,
      "posts",
      postId,
      "likes",
      userId
    );
  
    if (shouldLike) {
      await setDoc(likeRef, {
        userId,
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(likeRef);
    }
  }
  