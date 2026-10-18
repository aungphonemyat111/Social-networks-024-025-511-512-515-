import { useEffect, useRef, useState } from "react";
import {
  Check, ChevronLeft, FileText, MoreVertical, Paperclip, Phone,
  RotateCcw, Search, Send, SquarePen, Video, X,
} from "lucide-react";
import "./Messaging.css";

/*
  HOW THIS FILE IS ORGANIZED
  1. Messaging      the main component: holds ALL the data (state) and the actions
  2. ChatList       the list of conversations
  3. ChatView       one open chat (works for both individual and group chats)
  4. MessageBubble  one message
  5. NewChatModal   the "new message" popup
  6. GroupInfoModal the group members popup
  7. Helpers        small functions for times and sizes
  8. server         FAKE backend. Your backend teammate replaces this part.

  Drop <Messaging /> into a parent that has a height.
*/

// The logged-in user. Replace with the real user from your login later.
const ME = { id: "me", name: "You" };

// ───────────────────────── 1. Main component ─────────────────────────

export default function Messaging() {
  const [chats, setChats] = useState([]);        // every conversation, with its messages
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);    // which chat is open (null = show the list)
  const [typing, setTyping] = useState({});      // { chatId: "Napat" } = who is typing
  const [showNew, setShowNew] = useState(false);

  // The listener below is created once, so it reads the open chat from a ref
  const openIdRef = useRef(null);
  const openChat = chats.find((c) => c.id === openId);

  // Load the conversations when the page opens
  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    setLoading(true);
    setError("");
    try {
      setChats(await server.getChats());
    } catch {
      setError("Couldn't load your messages.");
    }
    setLoading(false);
  }

  // RECEIVING: the server tells us when something arrives
  useEffect(() => {
    return server.listen((event) => {
      if (event.type === "typing") {
        setTyping((prev) => ({ ...prev, [event.chatId]: event.isTyping ? event.name : "" }));
      }
      if (event.type === "message") {
        const isOpen = openIdRef.current === event.chatId;
        addMessage(event.chatId, event.message, !isOpen); // not open = counts as unread
        setTyping((prev) => ({ ...prev, [event.chatId]: "" }));
        if (isOpen) server.markAsRead(event.chatId);
      }
    });
  }, []);

  // Small helpers that change the chats list
  function addMessage(chatId, message, unread = false) {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], unread: unread ? c.unread + 1 : c.unread }
          : c
      )
    );
  }

  function updateMessage(chatId, messageId, changes) {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...changes } : m)) }
          : c
      )
    );
  }

  // Opening a chat clears its unread badge
  function open(chatId) {
    openIdRef.current = chatId;
    setOpenId(chatId);
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)));
    server.markAsRead(chatId);
  }

  function close() {
    openIdRef.current = null;
    setOpenId(null);
  }

  // SENDING: show the message right away as "sending", then mark it sent or failed
  function send(chatId, content) {
    const message = {
      id: "m" + Date.now() + Math.random(),
      from: ME.id,
      fromName: ME.name,
      time: new Date().toISOString(),
      status: "sending",
      ...content, // { text } or { file }
    };
    addMessage(chatId, message);
    deliver(chatId, message);
  }

  async function deliver(chatId, message) {
    try {
      await server.sendMessage(chatId, message);
      updateMessage(chatId, message.id, { status: "sent" });
    } catch {
      updateMessage(chatId, message.id, { status: "failed" });
    }
  }

  function retry(chatId, message) {
    updateMessage(chatId, message.id, { status: "sending" });
    deliver(chatId, message);
  }

  // New conversation (from the popup)
  async function startChat(input) {
    const chat = await server.createChat(input);
    setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : [chat, ...prev]));
    open(chat.id);
  }

  async function leaveGroup(chatId) {
    await server.leaveGroup(chatId);
    close();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  }

  return (
    <div className="msg-app">
      {openChat ? (
        <ChatView
          key={openChat.id}
          chat={openChat}
          typingName={typing[openChat.id]}
          onBack={close}
          onSend={send}
          onRetry={retry}
          onLeave={leaveGroup}
        />
      ) : (
        <ChatList
          chats={chats}
          typing={typing}
          loading={loading}
          error={error}
          onOpen={open}
          onNew={() => setShowNew(true)}
          onReload={loadChats}
        />
      )}

      {showNew && <NewChatModal onClose={() => setShowNew(false)} onStart={startChat} />}
    </div>
  );
}

// ───────────────────────── 2. Conversation list ─────────────────────────

const lastTime = (chat) => chat.messages[chat.messages.length - 1]?.time ?? chat.created;

function previewText(chat, typingName) {
  if (typingName) return chat.type === "group" ? `${typingName} is typing…` : "typing…";
  const last = chat.messages[chat.messages.length - 1];
  if (!last) return "No messages yet";
  const body = last.file ? `📎 ${last.file.name}` : last.text;
  if (last.from === ME.id) return `You: ${body}`;
  if (chat.type === "group") return `${last.fromName}: ${body}`;
  return body;
}

function ChatList({ chats, typing, loading, error, onOpen, onNew, onReload }) {
  const [tab, setTab] = useState("all"); // "all" or "groups"
  const [query, setQuery] = useState("");
  const [, refresh] = useState(0);

  // Re-draw every 30 seconds so "2m" becomes "3m" on its own
  useEffect(() => {
    const id = setInterval(() => refresh((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Apply the tab and the search, newest conversation first
  const shown = chats
    .filter((c) => tab === "all" || c.type === "group")
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => new Date(lastTime(b)) - new Date(lastTime(a)));

  return (
    <>
      <div className="msg-list-top">
        <h1>Messages</h1>
        <button className="msg-new" onClick={onNew} aria-label="New message">
          <SquarePen size={22} />
        </button>
      </div>

      <div className="msg-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      </div>

      <div className="msg-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>
          All
        </button>
        <button role="tab" aria-selected={tab === "groups"} className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>
          Groups
        </button>
      </div>

      <div className="msg-scroll">
        {loading && <p className="msg-state">Loading…</p>}

        {error && (
          <div className="msg-state">
            <p>{error}</p>
            <button className="msg-link" onClick={onReload}>Try again</button>
          </div>
        )}

        {!loading && !error && shown.length === 0 && (
          <p className="msg-state">{query ? "No conversations match your search." : "No conversations yet."}</p>
        )}

        {shown.map((chat) => (
          <button key={chat.id} className="msg-item" onClick={() => onOpen(chat.id)}>
            <span className="msg-item-text">
              <b>{chat.name}</b>
              <span className={`${typing[chat.id] ? "typing" : ""} ${chat.unread ? "unread" : ""}`}>
                {previewText(chat, typing[chat.id])}
              </span>
            </span>
            <span className="msg-item-side">
              {chat.messages.length > 0 && <small>{timeAgo(lastTime(chat))}</small>}
              {chat.unread > 0 && <span className="msg-badge" aria-label={`${chat.unread} unread`}>{chat.unread}</span>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ───────────────────────── 3. One open chat ─────────────────────────

function ChatView({ chat, typingName, onBack, onSend, onRetry, onLeave }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);       // file waiting to be sent
  const [fileError, setFileError] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const fileInput = useRef(null);
  const textBox = useRef(null);
  const bottom = useRef(null);
  const lastTypingSent = useRef(0);
  const firstScroll = useRef(true);
  const isGroup = chat.type === "group";

  // Scroll to the newest message whenever one arrives
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [chat.messages.length, typingName]);

  function handleTextChange(e) {
    setText(e.target.value);
    // grow the box as the user types more lines (up to 120px)
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    // tell the server we're typing (at most once every 2 seconds)
    if (Date.now() - lastTypingSent.current > 2000) {
      lastTypingSent.current = Date.now();
      server.sendTyping(chat.id);
    }
  }

  function pickFile(e) {
    const picked = e.target.files[0];
    e.target.value = ""; // so the same file can be picked again later
    if (!picked) return;
    if (picked.size > 10 * 1024 * 1024) {
      setFileError("That file is over 10 MB.");
      return;
    }
    setFileError("");
    setFile({ name: picked.name, size: picked.size, type: picked.type, url: URL.createObjectURL(picked), raw: picked });
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    if (file) onSend(chat.id, { file });
    if (trimmed) onSend(chat.id, { text: trimmed });
    setText("");
    setFile(null);
    if (textBox.current) textBox.current.style.height = "auto";
  }

  // Enter sends, Shift+Enter makes a new line
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <>
      <div className="msg-chat-top">
        <button className="msg-icon" onClick={onBack} aria-label="Back to messages">
          <ChevronLeft size={28} />
        </button>

        <div className="msg-chat-who">
          <b>{chat.name}</b>
          {isGroup ? (
            <span>{chat.members.length} members</span>
          ) : (
            <span><i className={`msg-dot ${chat.online ? "on" : ""}`} />{chat.online ? "Online" : "Offline"}</span>
          )}
        </div>

        {!isGroup && <button className="msg-icon" aria-label="Video call"><Video size={24} /></button>}
        <button className="msg-icon" aria-label="Voice call"><Phone size={22} /></button>
        {isGroup && (
          <button className="msg-icon" onClick={() => setShowInfo(true)} aria-label="Group info">
            <MoreVertical size={22} />
          </button>
        )}
      </div>

      <div className="msg-scroll msg-thread" role="log" aria-live="polite">
        {chat.messages.length === 0 && <p className="msg-state">No messages yet. Say hi 👋</p>}

        {chat.messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            showName={isGroup && m.from !== ME.id}
            onRetry={() => onRetry(chat.id, m)}
          />
        ))}

        {typingName && (
          <div className="msg-row">
            <div className="msg-col">
              <div className="msg-bubble msg-typing"><span className="msg-dots"><i /><i /><i /></span></div>
              <small>{isGroup ? `${typingName} is typing…` : "typing…"}</small>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {(file || fileError) && (
        <div className="msg-attach">
          {file ? (
            <>
              <FileText size={20} />
              <span>{file.name} <small>({formatSize(file.size)})</small></span>
              <button className="msg-icon" onClick={() => setFile(null)} aria-label="Remove attachment">
                <X size={18} />
              </button>
            </>
          ) : (
            <span className="msg-error-text">{fileError}</span>
          )}
        </div>
      )}

      <form className="msg-input-bar" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input ref={fileInput} type="file" hidden onChange={pickFile} />
        <button type="button" className="msg-icon" onClick={() => fileInput.current.click()} aria-label="Attach a file">
          <Paperclip size={24} />
        </button>
        <textarea
          ref={textBox}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <button type="submit" className="msg-send" disabled={!text.trim() && !file} aria-label="Send message">
          <Send size={26} />
        </button>
      </form>

      {showInfo && <GroupInfoModal chat={chat} onClose={() => setShowInfo(false)} onLeave={() => onLeave(chat.id)} />}
    </>
  );
}

// ───────────────────────── 4. One message ─────────────────────────

function MessageBubble({ message, showName, onRetry }) {
  const mine = message.from === ME.id;
  const file = message.file;

  // Decide what goes inside the bubble: a photo, a file card, or plain text
  let content;
  if (file && file.type.startsWith("image/") && file.url) {
    content = (
      <a href={file.url} target="_blank" rel="noreferrer">
        <img className="msg-image" src={file.url} alt={file.name} />
      </a>
    );
  } else if (file) {
    content = (
      <a className="msg-bubble msg-file" href={file.url || undefined} download={file.name} target="_blank" rel="noreferrer">
        <FileText size={26} />
        <span><b>{file.name}</b><small>{formatSize(file.size)}</small></span>
      </a>
    );
  } else {
    content = <div className="msg-bubble">{message.text}</div>;
  }

  return (
    <div className={`msg-row ${mine ? "mine" : ""}`}>
      <div className="msg-col">
        {showName && <b>{message.fromName}</b>}
        {content}

        {message.status === "sending" && <small>Sending…</small>}
        {message.status === "failed" && (
          <span className="msg-failed">
            Failed to send
            <button onClick={onRetry}><RotateCcw size={14} /> Retry</button>
          </span>
        )}
        {message.status === "sent" && (
          <small>{formatTime(message.time)}{mine && <Check size={14} aria-label="Sent" />}</small>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 5. New message popup ─────────────────────────
// Pick one person for a direct chat, or two or more for a group.

function NewChatModal({ onClose, onStart }) {
  const [contacts, setContacts] = useState(null);
  const [selected, setSelected] = useState([]); // ids of the picked people
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    server.getContacts().then(setContacts).catch(() => setError("Couldn't load contacts."));
  }, []);
  useEscapeKey(onClose);

  const isGroup = selected.length > 1;
  const canStart = selected.length > 0 && (!isGroup || groupName.trim() !== "") && !busy;
  const visible = (contacts || []).filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(id) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function start() {
    setBusy(true);
    setError("");
    try {
      await onStart(
        isGroup
          ? { type: "group", name: groupName.trim(), memberIds: selected }
          : { type: "individual", memberIds: selected }
      );
      onClose();
    } catch {
      setError("Couldn't start the chat. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="msg-overlay" onClick={onClose}>
      <div className="msg-modal" role="dialog" aria-modal="true" aria-label="New message" onClick={(e) => e.stopPropagation()}>
        <div className="msg-modal-head">
          <h2>New message</h2>
          <button className="msg-icon" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>

        <input
          className="msg-modal-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          autoFocus
        />

        <div className="msg-modal-list">
          {!contacts && !error && <p className="msg-state">Loading…</p>}
          {visible.map((c) => (
            <label key={c.id} className="msg-contact">
              <span>{c.name}</span>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
            </label>
          ))}
        </div>

        {isGroup && (
          <input
            className="msg-modal-input"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            aria-label="Group name"
            maxLength={40}
          />
        )}

        {error && <p className="msg-error-text">{error}</p>}

        <button className="msg-primary" disabled={!canStart} onClick={start}>
          {busy ? "Starting…" : isGroup ? "Create group" : "Start chat"}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── 6. Group info popup ─────────────────────────

function GroupInfoModal({ chat, onClose, onLeave }) {
  useEscapeKey(onClose);

  return (
    <div className="msg-overlay" onClick={onClose}>
      <div className="msg-modal" role="dialog" aria-modal="true" aria-label="Group info" onClick={(e) => e.stopPropagation()}>
        <div className="msg-modal-head">
          <h2>{chat.name}</h2>
          <button className="msg-icon" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>

        <p className="msg-muted">{chat.members.length} members</p>
        <ul className="msg-members">
          {chat.members.map((m) => (
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>

        <button className="msg-danger" onClick={onLeave}>Leave group</button>
      </div>
    </div>
  );
}

// Close a popup when Escape is pressed
function useEscapeKey(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

// ───────────────────────── 7. Helpers ─────────────────────────

// "2:15 PM" for today, "Oct 17, 2:15 PM" for older messages
function formatTime(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

// "now", "2m", "3h", "2d" for the list
function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ───────────────────────── 8. FAKE SERVER ─────────────────────────
//
// Hand this part to your backend teammate. They replace what is inside each
// function with fetch() / WebSocket calls and keep the same inputs and outputs.
// Nothing above this line needs to change.
//
// A chat looks like:
//   { id, type: "individual" | "group", name, online (individual only),
//     members: [{ id, name }] (group only), unread, created, messages: [...] }
// A message looks like:
//   { id, from (user id), fromName, text, file: { name, size, type, url }, time (ISO), status }
//
// The server pushes two kinds of events through listen():
//   { type: "message", chatId, message }
//   { type: "typing", chatId, name, isTyping }

const SHOW_RANDOM_INCOMING_EVERY_MS = 25000; // set to 0 to turn off the random incoming messages

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const contacts = [
  { id: "napat", name: "Napat", online: true },
  { id: "praew", name: "Praew", online: false },
  { id: "tonn", name: "Tonn", online: true },
  { id: "ploy", name: "Ploy", online: false },
  { id: "jane", name: "Jane", online: true },
];
const nameOf = (id) => (id === ME.id ? ME.name : contacts.find((c) => c.id === id)?.name ?? "Unknown");
const people = (...ids) => ids.map((id) => ({ id, name: nameOf(id) }));

let idCounter = 0;
const msg = (from, text, minAgo) => ({
  id: "s" + ++idCounter, from, fromName: nameOf(from), text, time: minutesAgo(minAgo), status: "sent",
});
const fileMsg = (from, file, minAgo) => ({
  id: "s" + ++idCounter, from, fromName: nameOf(from), file, time: minutesAgo(minAgo), status: "sent",
});

const db = [
  {
    id: "napat", type: "individual", name: "Napat", online: true, unread: 0, created: minutesAgo(10),
    messages: [
      msg("napat", "Hey! Are you free tomorrow?", 8),
      msg("me", "Yes! What's up?", 7),
      msg("napat", "Do you want to go to the library together?", 7),
      msg("me", "Sure! What time?", 6),
      msg("napat", "Maybe around 1 PM?", 6),
      msg("me", "Sounds good! See you then 🙂", 5),
    ],
  },
  {
    id: "isne-friends", type: "group", name: "ISNE Friends", unread: 2, created: minutesAgo(70),
    members: people("me", "ploy", "tonn", "jane", "napat"),
    messages: [
      msg("ploy", "See you at the library later!", 62),
      msg("tonn", "Don't forget the assignment deadline is this Friday.", 58),
      msg("me", "Got it! Thanks!", 57),
      fileMsg("jane", { name: "project_outline.pdf", size: 2516582, type: "application/pdf", url: null }, 56),
      msg("ploy", "Let's meet at 1 PM tomorrow at the library.", 15),
    ],
  },
  {
    id: "cmu-sports-club", type: "group", name: "CMU Sports Club", unread: 1, created: minutesAgo(90),
    members: people("me", "napat", "praew", "tonn"),
    messages: [msg("napat", "Game this Friday! 🏀", 60)],
  },
  {
    id: "praew", type: "individual", name: "Praew", online: false, unread: 0, created: minutesAgo(200),
    messages: [msg("praew", "Sent a photo", 180)],
  },
  {
    id: "tonn", type: "individual", name: "Tonn", online: true, unread: 0, created: minutesAgo(320),
    messages: [msg("tonn", "Thanks! 🙏", 300)],
  },
  {
    id: "eng241", type: "group", name: "ENG241 Group", unread: 0, created: minutesAgo(1500),
    members: people("me", "jane", "ploy", "tonn"),
    messages: [msg("jane", "I uploaded the file.", 1440)],
  },
  {
    id: "cmu-event-updates", type: "group", name: "CMU Event Updates", unread: 0, created: minutesAgo(2900),
    members: people("me", "napat", "praew", "tonn", "jane", "ploy"),
    messages: [msg("jane", "Don't forget to register!", 2880)],
  },
];

// Real-time pushes (a WebSocket in the real version)
let listeners = [];
const emit = (event) => listeners.forEach((fn) => fn(event));

function receive(chat, sender, text) {
  const message = msg(sender.id, text, 0);
  chat.messages.push(message);
  emit({ type: "message", chatId: chat.id, message });
}

const REPLIES = ["Okay!", "Sounds good 👍", "Haha nice", "Let me check and get back to you.", "See you there!", "Thanks!"];
const RANDOM = ["Are you coming later?", "Did you see the announcement?", "Lunch at 12?", "Don't forget your laptop 💻"];

// After you send something, someone "types" for a moment and then replies
function scheduleReply(chat) {
  const replier =
    chat.type === "individual"
      ? contacts.find((c) => c.id === chat.id)
      : Math.random() < 0.6 ? contacts.find((c) => c.id === pick(chat.members.filter((m) => m.id !== ME.id)).id) : null;
  if (!replier) return;
  setTimeout(() => emit({ type: "typing", chatId: chat.id, name: replier.name, isTyping: true }), 800);
  setTimeout(() => {
    emit({ type: "typing", chatId: chat.id, name: replier.name, isTyping: false });
    receive(chat, replier, pick(REPLIES));
  }, 2600);
}

let randomTimer = null;

const server = {
  async getChats() {
    await wait();
    return structuredClone(db);
  },

  async getContacts() {
    await wait(200);
    return structuredClone(contacts);
  },

  // message.file.raw is the real File object: upload it in the real version
  async sendMessage(chatId, message) {
    await wait(400);
    if (message.text === "/fail") throw new Error("Mock network error"); // type /fail to test a failed send
    const chat = db.find((c) => c.id === chatId);
    const saved = { ...message, status: "sent" };
    if (saved.file) saved.file = { ...saved.file, raw: undefined };
    chat.messages.push(saved);
    scheduleReply(chat);
  },

  async markAsRead() {},
  async sendTyping() {},

  // { type: "individual", memberIds: ["napat"] } or { type: "group", name, memberIds: [...] }
  async createChat({ type, name, memberIds }) {
    await wait();
    if (type === "individual") {
      const person = contacts.find((c) => c.id === memberIds[0]);
      const existing = db.find((c) => c.id === person.id);
      if (existing) return structuredClone(existing);
      const chat = { id: person.id, type, name: person.name, online: person.online, unread: 0, created: minutesAgo(0), messages: [] };
      db.push(chat);
      return structuredClone(chat);
    }
    const chat = { id: "group-" + Date.now(), type: "group", name, unread: 0, created: minutesAgo(0), members: people("me", ...memberIds), messages: [] };
    db.push(chat);
    return structuredClone(chat);
  },

  async leaveGroup(chatId) {
    await wait(200);
    db.splice(db.findIndex((c) => c.id === chatId), 1);
  },

  // Start listening. Returns a function that stops listening.
  listen(callback) {
    listeners.push(callback);
    if (SHOW_RANDOM_INCOMING_EVERY_MS && !randomTimer) {
      randomTimer = setInterval(() => {
        const chat = pick(db);
        const senderId = chat.type === "individual" ? chat.id : pick(chat.members.filter((m) => m.id !== ME.id)).id;
        receive(chat, contacts.find((c) => c.id === senderId), pick(RANDOM));
      }, SHOW_RANDOM_INCOMING_EVERY_MS);
    }
    return () => {
      listeners = listeners.filter((fn) => fn !== callback);
      if (listeners.length === 0) {
        clearInterval(randomTimer);
        randomTimer = null;
      }
    };
  },
};