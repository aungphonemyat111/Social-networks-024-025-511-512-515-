import {
    addDoc,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  // Notifications belong to the student receiving them.
  function getNotificationsCollection(userId) {
    return collection(db, "users", userId, "notifications");
  }
  
  // Save a new notification.
  export async function createNotification({
    recipientId,
    actorId,
    type,
    postId = null,
    commentId = null,
  }) {
    if (!recipientId || !actorId) {
      throw new Error("Notification user IDs are missing.");
    }
  
    // Don't notify someone about their own actions.
    if (recipientId === actorId) {
      return null;
    }
  
    const allowedTypes = [
      "follow",
      "like",
      "comment",
      "reply",
      "tag",
      "mention",
    ];
  
    if (!allowedTypes.includes(type)) {
      throw new Error("Invalid notification type.");
    }
  
    if (type !== "follow" && !postId) {
      throw new Error("Post ID is required.");
    }
  
    if (
      (type === "comment" || type === "reply") &&
      !commentId
    ) {
      throw new Error("Comment ID is required.");
    }
  
    return addDoc(
      getNotificationsCollection(recipientId),
      {
        actorId,
        type,
        postId,
        commentId,
        read: false,
        createdAt: serverTimestamp(),
      }
    );
  }
  
  // Listen for the latest 50 notifications.
  export function subscribeToNotifications(
    userId,
    onChange,
    onError
  ) {
    if (!userId) {
      onChange([]);
      return () => {};
    }
  
    const notificationsQuery = query(
      getNotificationsCollection(userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  
    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = snapshot.docs.map(
          (notificationDocument) => ({
            id: notificationDocument.id,
            ...notificationDocument.data(),
          })
        );
  
        onChange(notifications);
      },
      onError
    );
  }
  
  // Mark one notification as read.
  export async function markNotificationRead(
    userId,
    notificationId
  ) {
    if (!userId || !notificationId) {
      throw new Error("Notification details are missing.");
    }
  
    await updateDoc(
      doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId
      ),
      { read: true }
    );
  }
  