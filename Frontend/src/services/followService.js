  import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  import { createNotification } from "./notificationService";
  
  const followsCollection = collection(db, "follows");
  
  // Each student can follow another student only once.
  function getFollowDocument(followerId, followingId) {
    return doc(
      db,
      "follows",
      `${followerId}_${followingId}`
    );
  }
  
  // Check whether the logged-in student follows someone.
  export function subscribeToFollow(
    followerId,
    followingId,
    onChange,
    onError
  ) {
    if (
      !followerId ||
      !followingId ||
      followerId === followingId
    ) {
      onChange(false);
      return () => {};
    }
  
    return onSnapshot(
      getFollowDocument(followerId, followingId),
      (snapshot) => {
        onChange(snapshot.exists());
      },
      onError
    );
  }
  
  // Get the real follower and following counts.
  export function subscribeToFollowCounts(
    userId,
    onChange,
    onError
  ) {
    if (!userId) {
      onChange({ followers: 0, following: 0 });
      return () => {};
    }
  
    let followers = 0;
    let following = 0;
    let followersLoaded = false;
    let followingLoaded = false;
  
    const updateCounts = () => {
      if (followersLoaded && followingLoaded) {
        onChange({ followers, following });
      }
    };
  
    const followersQuery = query(
      followsCollection,
      where("followingId", "==", userId)
    );
  
    const followingQuery = query(
      followsCollection,
      where("followerId", "==", userId)
    );
  
    const unsubscribeFollowers = onSnapshot(
      followersQuery,
      (snapshot) => {
        followers = snapshot.size;
        followersLoaded = true;
        updateCounts();
      },
      onError
    );
  
    const unsubscribeFollowing = onSnapshot(
      followingQuery,
      (snapshot) => {
        following = snapshot.size;
        followingLoaded = true;
        updateCounts();
      },
      onError
    );
  
    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }
  
  // Follow or unfollow another student.
  export async function setFollow(
    followerId,
    followingId,
    shouldFollow
  ) {
    if (!followerId || !followingId) {
      throw new Error("Both user IDs are required.");
    }

    if (followerId === followingId) {
      throw new Error("You cannot follow yourself.");
    }

    const followReference = getFollowDocument(
      followerId,
      followingId
    );

    if (shouldFollow) {
      // Save the follow relationship first.
      await setDoc(followReference, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });

      // Then notify the student who gained a follower.
      try {
        console.log("Creating follow notification for:", followingId);
      
        const notificationRef = await createNotification({
          recipientId: followingId,
          actorId: followerId,
          type: "follow",
        });
      
        console.log(
          "Notification saved successfully!",
          notificationRef.id
        );
      } catch (error) {
        console.error(
          "Follow saved, but notification failed:",
          error
        );
      }
    } else {
      // Unfollowing does not create a notification.
      await deleteDoc(followReference);
    }
  }

  // Get the students in a Followers or Following list.
export function subscribeToFollowUsers(
  userId,
  listType,
  onChange,
  onError
) {
  if (
    !userId ||
    !["followers", "following"].includes(listType)
  ) {
    onChange([]);
    return () => {};
  }

  const searchField =
    listType === "followers"
      ? "followingId"
      : "followerId";

  const personField =
    listType === "followers"
      ? "followerId"
      : "followingId";

  const followQuery = query(
    followsCollection,
    where(searchField, "==", userId)
  );

  let active = true;
  let latestRequest = 0;

  const unsubscribe = onSnapshot(
    followQuery,
    async (snapshot) => {
      const requestNumber = ++latestRequest;

      try {
        const students = await Promise.all(
          snapshot.docs.map(async (followDocument) => {
            const uid = followDocument.data()[personField];

            if (!uid) return null;

            const studentSnapshot = await getDoc(
              doc(db, "users", uid)
            );

            return {
              ...(studentSnapshot.exists()
                ? studentSnapshot.data()
                : {}),
              uid,
            };
          })
        );

        if (active && requestNumber === latestRequest) {
          onChange(students.filter(Boolean));
        }
      } catch (error) {
        if (active) {
          onError?.(error);
        }
      }
    },
    (error) => {
      if (active) {
        onError?.(error);
      }
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}
  