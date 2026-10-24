import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck as Check,
  FiChevronLeft as ChevronLeft,
  FiMoreVertical as MoreVertical,
  FiSearch as Search,
  FiSend as Send,
  FiEdit as SquarePen,
  FiX as X,
} from "react-icons/fi";
import {
  createConversation,
  subscribeToStudentContacts,
  leaveGroupConversation,
  sendChatMessage,
  subscribeToChats,
  subscribeToMessages,
  markConversationRead,
} from "./services/messagingService";
import "./Messaging.css";

function studentName(student) {
  if (!student) return "CMU Student";
  const name = student.name || "CMU Student";
  const nickname = (student.nickname || "").trim();
  return nickname && nickname.toLowerCase() !== name.toLowerCase()
    ? `${name} (${nickname})`
    : name;
}

function showTime(value) {
  const date = value?.toDate?.();
  if (!date) return "Just now";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Messaging({ userId, userName = "You", initialRecipientId = null, unreadByChat = {} }) {
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const initialChatRequest = useRef({ key: null, promise: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesForChat, setMessagesForChat] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [readError, setReadError] = useState("");
  const lastMarkAttempt = useRef({ chatId: null, messageTime: 0 });

  useEffect(() => {
    setOpenId(null);
    setChats([]);
    setLoading(true);
    setError("");
    if (!userId) {
      setLoading(false);
      return;
    }
    return subscribeToChats(userId, (items) => {
      setChats(items);
      setLoading(false);
    }, (err) => {
      console.error("Couldn't load conversations:", err);
      setError("Couldn't load your conversations.");
      setLoading(false);
    });
  }, [userId]);

  // Live directory of real, registered students (Firestore /users).
  useEffect(() => {
    setContacts([]);
    setContactsLoading(true);
    setContactsError("");
    if (!userId) {
      setContactsLoading(false);
      return;
    }
    return subscribeToStudentContacts(
      userId,
      (items) => {
        setContacts(items);
        setContactsLoading(false);
      },
      (err) => {
        console.error("Couldn't load student directory:", err);
        setContactsError("Couldn't load students. Check the /users Firestore read rules.");
        setContactsLoading(false);
      }
    );
  }, [userId]);

  // Called when the Message button on another student's profile is clicked.
  useEffect(() => {
    if (!userId || !initialRecipientId || initialRecipientId === userId) return;
    const key = `${userId}:${initialRecipientId}`;
    if (initialChatRequest.current.key !== key) {
      initialChatRequest.current = {
        key,
        promise: createConversation(userId, { memberIds: [initialRecipientId] }),
      };
    }
    setRecipientError("");
    let active = true;
    initialChatRequest.current.promise
      .then((chatId) => { if (active) setOpenId(chatId); })
      .catch((err) => {
        console.error("Couldn't open direct message:", err);
        if (active) {
          setRecipientError("Couldn't open this conversation. Check your chat permissions.");
        }
      });
    return () => { active = false; };
  }, [userId, initialRecipientId]);

  useEffect(() => {
    setMessages([]);
    setMessagesForChat(null);
    setMessagesError("");
    setMessagesLoading(Boolean(openId));
    if (!openId) return;
    return subscribeToMessages(openId, (items) => {
      setMessages(items);
      setMessagesForChat(openId);
      setMessagesLoading(false);
    }, (err) => {
      console.error("Couldn't load messages:", err);
      setMessagesError("Couldn't load messages.");
      setMessagesLoading(false);
    });
  }, [openId]);

  const contactsById = useMemo(() => {
    const entries = contacts.map((item) => [item.id, item]);
    entries.push([userId, { id: userId, name: userName }]);
    return Object.fromEntries(entries);
  }, [contacts, userId, userName]);

  const chatLabel = (chat) => {
    if (chat.type === "group") return chat.name || "Group";
    const other = (chat.memberIds || []).find((id) => id !== userId);
    return studentName(contactsById[other]);
  };

  const currentChat = chats.find((item) => item.id === openId);

  // Opening the thread marks its incoming messages as read. It also handles
  // new messages received while the thread remains open.
  useEffect(() => {
    if (!openId) {
      lastMarkAttempt.current = { chatId: null, messageTime: 0 };
      setReadError("");
      return;
    }
    if (messagesLoading || messagesForChat !== openId || !currentChat) return;
    const lastReadMs = currentChat.readAt?.[userId]?.toMillis?.() ?? 0;
    const lastIncoming = [...messages].reverse().find(
      (item) => item.senderId !== userId && item.createdAt?.toMillis?.()
    );
    const incomingMs = lastIncoming?.createdAt?.toMillis?.() ?? 0;
    if (incomingMs <= lastReadMs) return;
    if (lastMarkAttempt.current.chatId === openId &&
        lastMarkAttempt.current.messageTime >= incomingMs) return;
    lastMarkAttempt.current = { chatId: openId, messageTime: incomingMs };
    setReadError("");
    markConversationRead(openId, userId, lastIncoming.createdAt).catch((error) => {
      console.error("Couldn't mark conversation as read:", error);
      setReadError("Couldn't mark this conversation as read. Check your Firestore rules.");
      lastMarkAttempt.current = { chatId: null, messageTime: 0 };
    });
  }, [openId, messages, messagesForChat, messagesLoading, currentChat, userId]);

  async function startChat(input) {
    const id = await createConversation(userId, input);
    setShowNew(false);
    setOpenId(id);
  }

  async function leaveGroup() {
    if (!currentChat || currentChat.type !== "group") return;
    await leaveGroupConversation(currentChat.id, userId);
    setShowGroupInfo(false);
    setOpenId(null);
  }

  return (
    <div className="msg-app" style={{ minHeight: 540, height: "min(76vh, 800px)" }}>
      {recipientError && <p className="msg-state msg-error-text" role="alert">{recipientError}</p>}
      {openId ? (
        currentChat ? (
          <ChatView
            key={openId}
            chat={currentChat}
            chatName={chatLabel(currentChat)}
            messages={messagesForChat === openId ? messages : []}
            loading={messagesLoading || messagesForChat !== openId}
            error={messagesError}
            currentUserId={userId}
            readError={readError}
            onBack={() => setOpenId(null)}
            onShowInfo={() => setShowGroupInfo(true)}
          />
        ) : (
          <div className="msg-state">
            <button className="msg-link" onClick={() => setOpenId(null)}>← Back to conversations</button>
            <p>{loading ? "Opening conversation…" : "Conversation unavailable or you are no longer a member."}</p>
          </div>
        )
      ) : (
        <ChatList
          chats={chats}
          getName={chatLabel}
          loading={loading}
          error={error}
          onOpen={setOpenId}
          onNew={() => setShowNew(true)}
          unreadByChat={unreadByChat}
        />
      )}

      {showNew && (
        <NewChatModal
          contacts={contacts}
          loading={contactsLoading}
          directoryError={contactsError}
          onClose={() => setShowNew(false)}
          onStart={startChat}
        />
      )}

      {showGroupInfo && currentChat?.type === "group" && (
        <GroupInfoModal
          chat={currentChat}
          contactsById={contactsById}
          onClose={() => setShowGroupInfo(false)}
          onLeave={leaveGroup}
        />
      )}
    </div>
  );
}

function ChatList({ chats, getName, loading, error, onOpen, onNew, unreadByChat }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const shown = chats.filter((chat) => (tab === "all" || chat.type === "group") &&
    getName(chat).toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <div className="msg-list-top">
        <h1>Messages</h1>
        <button type="button" className="msg-new" onClick={onNew} aria-label="New message"><SquarePen size={22} /></button>
      </div>
      <div className="msg-search">
        <Search size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
      </div>
      <div className="msg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</button>
        <button type="button" role="tab" aria-selected={tab === "groups"} className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Groups</button>
      </div>
      <div className="msg-scroll">
        {loading && <p className="msg-state">Loading conversations…</p>}
        {error && <p className="msg-state msg-error-text">{error}</p>}
        {!loading && !error && shown.length === 0 && (
          <div className="msg-state">
            <p>{search ? "No matching conversations." : "No conversations yet."}</p>
            {!search && <button type="button" className="msg-primary" onClick={onNew}>+ New Message</button>}
          </div>
        )}
        {shown.map((chat) => (
          <button type="button" key={chat.id} className="msg-item" onClick={() => onOpen(chat.id)}>
            <span className="msg-item-text">
              <b>{getName(chat)}</b>
              <span>{chat.lastMessageText || "No messages yet"}</span>
            </span>
            <span className="msg-item-side">
              {chat.lastMessageAt && <small>{showTime(chat.lastMessageAt)}</small>}
              {(unreadByChat[chat.id] || 0) > 0 && (
                <span className="msg-badge" aria-label={`${unreadByChat[chat.id]} unread messages`}>
                  {unreadByChat[chat.id] > 99 ? "99+" : unreadByChat[chat.id]}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ChatView({ chat, chatName, messages, loading, error, readError, currentUserId, onBack, onShowInfo }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottom = useRef(null);
  const textBox = useRef(null);
  const firstScroll = useRef(true);
  const isGroup = chat.type === "group";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [messages.length]);

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setSendError("");
    try {
      await sendChatMessage(chat.id, currentUserId, value);
      setText("");
      if (textBox.current) textBox.current.style.height = "auto";
    } catch (err) {
      console.error("Couldn't send message:", err);
      setSendError("Couldn't send your message. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="msg-chat-top">
        <button type="button" className="msg-icon" onClick={onBack} aria-label="Back to messages"><ChevronLeft size={28} /></button>
        <div className="msg-chat-who">
          <b>{chatName}</b>
          <span>{isGroup ? `${chat.memberIds.length} members` : "Direct message"}</span>
        </div>
        {isGroup && <button type="button" className="msg-icon" onClick={onShowInfo} aria-label="Group info"><MoreVertical size={22} /></button>}
      </div>
      <div className="msg-scroll msg-thread" role="log" aria-live="polite">
        {loading && <p className="msg-state">Loading messages…</p>}
        {error && <p className="msg-state msg-error-text">{error}</p>}
        {!loading && !error && messages.length === 0 && <p className="msg-state">No messages yet. Say hi 👋</p>}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === currentUserId}
            seen={chat.type === "individual" &&
              message.senderId === currentUserId &&
              (chat.readAt?.[chat.memberIds.find(id => id !== currentUserId)]?.toMillis?.() ?? 0) >=
                (message.createdAt?.toMillis?.() ?? Infinity)}
          />
        ))}
        <div ref={bottom} />
      </div>
      {sendError && <p className="msg-error-text" role="alert" style={{ padding: "4px 14px" }}>{sendError}</p>}
      <form className="msg-input-bar" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea
          ref={textBox}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…"
          aria-label="Message"
          maxLength={1000}
          disabled={sending}
        />
        <button type="submit" className="msg-send" disabled={!text.trim() || sending} aria-label="Send message">
          {sending ? <span>…</span> : <Send size={24} />}
        </button>
      </form>
    </>
  );
}

function MessageBubble({ message, mine, seen }) {
  return (
    <div className={`msg-row ${mine ? "mine" : ""}`}>
      <div className="msg-col">
        <div className="msg-bubble" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</div>
        <small>{showTime(message.createdAt)} {mine && (seen
          ? <span aria-label="Read by recipient">✓ Seen</span>
          : <Check size={13} aria-label="Sent" />)}</small>
      </div>
    </div>
  );
}

function NewChatModal({ contacts, loading, directoryError, onClose, onStart }) {
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [queryText, setQueryText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const group = selected.length > 1;
  const canStart = !loading && !directoryError && selected.length > 0 && selected.length <= 19 && (!group || groupName.trim().length > 0) && !busy;
  const visible = contacts.filter((item) =>
    `${item.name} ${item.nickname}`.toLowerCase().includes(queryText.trim().toLowerCase())
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function start() {
    if (!canStart) return;
    setBusy(true);
    setError("");
    try {
      await onStart({ memberIds: selected, name: group ? groupName.trim() : "" });
    } catch (err) {
      console.error("Couldn't create conversation:", err);
      setError("Couldn't start this chat. Check your Firestore rules and retry.");
      setBusy(false);
    }
  }

  return (
    <div className="msg-overlay" onClick={onClose}>
      <div className="msg-modal" role="dialog" aria-modal="true" aria-label="New message" onClick={(e) => e.stopPropagation()}>
        <div className="msg-modal-head">
          <h2>New message</h2>
          <button type="button" className="msg-icon" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <input className="msg-modal-input" value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search real CMU student accounts" aria-label="Search people" autoFocus />
        <div className="msg-modal-list">
          {loading && <p className="msg-state">Loading registered students…</p>}
          {directoryError && <p className="msg-state msg-error-text" role="alert">{directoryError}</p>}
          {!loading && !directoryError && visible.length === 0 && (
            <p className="msg-state">No matching student profiles in Firestore.</p>
          )}
          {visible.map((contact) => (
            <label key={contact.id} className="msg-contact">
              <span>{studentName(contact)}</span>
              <input type="checkbox" checked={selected.includes(contact.id)} onChange={() =>
                setSelected((previous) => previous.includes(contact.id)
                  ? previous.filter((id) => id !== contact.id)
                  : previous.length < 19 ? [...previous, contact.id] : previous
                )
              } />
            </label>
          ))}
        </div>
        {group && <input className="msg-modal-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" aria-label="Group name" maxLength={40} />}
        {error && <p className="msg-error-text">{error}</p>}
        <button type="button" className="msg-primary" disabled={!canStart} onClick={start}>
          {busy ? "Starting…" : group ? "Create group" : "Start chat"}
        </button>
      </div>
    </div>
  );
}

function GroupInfoModal({ chat, contactsById, onClose, onLeave }) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="msg-overlay" onClick={onClose}>
      <div className="msg-modal" role="dialog" aria-modal="true" aria-label="Group info" onClick={(e) => e.stopPropagation()}>
        <div className="msg-modal-head">
          <h2>{chat.name}</h2>
          <button type="button" className="msg-icon" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <p className="msg-muted">{chat.memberIds.length} members</p>
        <ul className="msg-members">
          {chat.memberIds.map((id) => <li key={id}>{studentName(contactsById[id])}</li>)}
        </ul>
        {error && <p className="msg-error-text">{error}</p>}
        <button type="button" className="msg-danger" disabled={leaving} onClick={async () => {
          setLeaving(true);
          try { await onLeave(); } catch (err) {
            console.error("Couldn't leave group:", err);
            setError("Couldn't leave group.");
            setLeaving(false);
          }
        }}>{leaving ? "Leaving…" : "Leave group"}</button>
      </div>
    </div>
  );
}
