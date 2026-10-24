import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  limitToLast,
  getDocs,
  FieldPath,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const chats = collection(db, "chats");

export function subscribeToChats(userId, onChange, onError) {
  if (!userId) {
    onChange([]);
    return () => {};
  }
  const q = query(chats, where("memberIds", "array-contains", userId));
  return onSnapshot(q, (snapshot) => {
    const result = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    result.sort((a, b) =>
      (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)
    );
    onChange(result);
  }, onError);
}

export function subscribeToMessages(chatId, onChange, onError) {
  if (!chatId) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limitToLast(250)
  );
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}


// Listen for actual user-profile documents, not Asai's demo contacts.
export function subscribeToStudentContacts(currentUserId, onChange, onError) {
  if (!currentUserId) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(collection(db, "users"), (snapshot) => {
    const students = snapshot.docs
      .filter((item) => item.id !== currentUserId)
      .map((item) => {
        const data = item.data();
        return {
          id: item.id,
          name: data.fullName || data.displayName || data.realName || data.name || data.nickname || "CMU Student",
          nickname: data.nickname || "",
          photoURL: data.photoURL || null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    onChange(students);
  }, onError);
}

export async function getStudentContacts(currentUserId) {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .filter((item) => item.id !== currentUserId)
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        name: data.fullName || data.displayName || data.nickname || "CMU Student",
        nickname: data.nickname || "",
        photoURL: data.photoURL || null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Deterministic direct-chat ID avoids duplicate conversations between the same pair.
export async function createConversation(currentUserId, { memberIds, name = "" }) {
  if (!currentUserId) throw new Error("Please log in first.");
  const otherIds = [...new Set(memberIds || [])].filter((id) => id && id !== currentUserId);
  if (otherIds.length < 1 || otherIds.length > 19) {
    throw new Error("Choose between 1 and 19 other students.");
  }
  const allIds = [currentUserId, ...otherIds].sort();
  const isGroup = otherIds.length > 1;
  const groupName = name.trim();
  if (isGroup && (!groupName || groupName.length > 40)) {
    throw new Error("Give your group a name (1–40 characters).");
  }

  if (!isGroup) {
    const id = `dm_${allIds.join("_")}`;
    const chatRef = doc(db, "chats", id);
    try {
      // This is a create-only attempt: existing chats cannot be overwritten
      // because the Firestore rules prohibit changing their core fields.
      await setDoc(chatRef, {
        type: "individual",
        name: null,
        memberIds: allIds,
        createdBy: currentUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageText: "",
        lastMessageSenderId: null,
        lastMessageAt: null,
      });
    } catch (error) {
      // The same pair might already have an existing DM. Check that it is
      // readable by the current user before treating the conflict as success.
      if (error.code !== "permission-denied") throw error;
      const existing = await getDoc(chatRef);
      if (!existing.exists() || !existing.data().memberIds?.includes(currentUserId)) {
        throw error;
      }
    }
    return id;
  }

  const result = await addDoc(chats, {
    type: "group",
    name: groupName,
    memberIds: allIds,
    createdBy: currentUserId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageText: "",
    lastMessageSenderId: null,
    lastMessageAt: null,
  });
  return result.id;
}

export async function sendChatMessage(chatId, senderId, text) {
  const message = (text || "").trim();
  if (!chatId || !senderId) throw new Error("Conversation details are missing.");
  if (!message || message.length > 1000) {
    throw new Error("Messages must be between 1 and 1000 characters.");
  }
  const chatRef = doc(db, "chats", chatId);
  const messageRef = doc(collection(chatRef, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    text: message,
    createdAt: serverTimestamp(),
  });
  batch.update(chatRef, {
    lastMessageText: message,
    lastMessageSenderId: senderId,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef.id;
}

export async function leaveGroupConversation(chatId, userId) {
  if (!chatId || !userId) return;
  await updateDoc(doc(db, "chats", chatId), {
    memberIds: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}


// Live, per-conversation unread *message* counts. The read cursor is stored
// in chats/{chatId}.readAt.{userId}, so counts survive page reloads and work
// even while the Messages page is closed. No Notifications documents are made.
export function subscribeToUnreadMessageCounts(userId, onChange, onError) {
  if (!userId) {
    onChange({});
    return () => {};
  }
  const live = new Map();
  const counts = {};
  let active = true;
  const emit = () => { if (active) onChange({ ...counts }); };
  const stopChats = subscribeToChats(userId, (chatList) => {
    const ids = new Set(chatList.map((chat) => chat.id));
    for (const [id, entry] of live) {
      if (!ids.has(id)) {
        entry.stop();
        live.delete(id);
        delete counts[id];
      }
    }
    for (const chat of chatList) {
      const readTime = chat.readAt?.[userId];
      const cursor = readTime?.toMillis?.() ?? 0;
      const previous = live.get(chat.id);
      if (previous?.cursor === cursor) continue;
      if (previous) previous.stop();
      counts[chat.id] = 0;
      const messagesRef = collection(db, "chats", chat.id, "messages");
      const unreadQuery = query(
        messagesRef,
        where("createdAt", ">", readTime?.toMillis ? readTime : Timestamp.fromMillis(0))
      );
      // A participant can read messages in this conversation. Filter the user's
      // own messages on the client; Firestore has no NOT sender query here.
      const stop = onSnapshot(unreadQuery, (snapshot) => {
        if (!active || live.get(chat.id)?.cursor !== cursor) return;
        counts[chat.id] = snapshot.docs.filter((item) => item.data().senderId !== userId).length;
        emit();
      }, (error) => {
        if (active) onError?.(error);
      });
      live.set(chat.id, { stop, cursor });
    }
    emit();
  }, onError);
  return () => {
    active = false;
    stopChats();
    for (const entry of live.values()) entry.stop();
    live.clear();
  };
}

// Mark one conversation as read through the most recent displayed incoming message.
// The Firestore rule below allows changing only this user's own read cursor.
export async function markConversationRead(chatId, userId, readThroughTimestamp) {
  if (!chatId || !userId || !readThroughTimestamp) return;
  // Use the timestamp of the newest message actually displayed, not the time
  // this update finishes. This avoids accidentally reading unseen messages.
  await updateDoc(
    doc(db, "chats", chatId),
    new FieldPath("readAt", userId),
    readThroughTimestamp
  );
}
