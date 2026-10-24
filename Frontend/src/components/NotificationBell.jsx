
import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { FaBell } from "react-icons/fa";

import { db } from "../firebase";
import {
  subscribeToNotifications,
  markNotificationRead,
} from "../services/notificationService";
import defaultProfile from "../assets/profile.png";
import "./NotificationBell.css";

export default function NotificationBell({
  userId,
  onOpenProfile,
  onOpenPost,
  currentTab,
  mode = "bell",
}) {  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [actors, setActors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Automatically close the bell when navigating to another page.
useEffect(() => {
  setOpen(false);
}, [currentTab]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications([]);
    setLoading(true);
    setError("");

    return subscribeToNotifications(
      userId,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error("Notification loading error:", err);
        setError("Could not load notifications.");
        setLoading(false);
      }
    );
  }, [userId]);

  useEffect(() => {
    let active = true;

    const ids = [
      ...new Set(
        notifications
          .map((notification) => notification.actorId)
          .filter(Boolean)
      ),
    ];

    async function loadProfiles() {
      const results = await Promise.all(
        ids.map(async (uid) => {
          try {
            const snapshot = await getDoc(doc(db, "users", uid));
            return [
              uid,
              snapshot.exists() ? snapshot.data() : {},
            ];
          } catch (err) {
            console.error("Profile loading error:", err);
            return [uid, {}];
          }
        })
      );

      if (active) {
        setActors(Object.fromEntries(results));
      }
    }

    setActors({});

    if (ids.length > 0) {
      loadProfiles();
    }

    return () => {
      active = false;
    };
  }, [notifications]);

  useEffect(() => {
    if (!open || mode !== "bell") return;

    const handleClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, mode]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const getActorName = (uid) => {
    const student = actors[uid] || {};

    const realName =
      student.fullName ||
      student.displayName ||
      student.realName ||
      student.name ||
      "";

    const nickname = (student.nickname || "").trim();

    if (!realName) {
      return nickname || "A CMU student";
    }

    if (
      nickname &&
      nickname.toLowerCase() !== realName.toLowerCase()
    ) {
      return `${realName} (${nickname})`;
    }

    return realName;
  };

  
const getMessage = (type) => {
    switch (type) {
      case "follow":
        return "started following you";
  
      case "like":
        return "liked your post";
  
      case "comment":
        return "commented on your post";
  
      case "reply":
        return "replied to a comment";
  
      case "tag":
        return "tagged you in a post";
  
      case "mention":
        return "mentioned you in a post";
  
      default:
        return "interacted with you";
    }
  };
  
  
  
const openNotification = (notification) => {
  setOpen(false);

  // Navigate immediately instead of waiting for Firestore.
  if (notification.postId) {
    if (typeof onOpenPost === "function") {
      onOpenPost(notification.postId);
    } else {
      console.error("Missing onOpenPost callback in App.jsx");
    }
  } else if (notification.actorId) {
    onOpenProfile?.(notification.actorId);
  }

  // Mark as read without delaying navigation.
  if (!notification.read) {
    markNotificationRead(userId, notification.id).catch(
      (error) => {
        console.error(
          "Could not mark notification as read:",
          error
        );
      }
    );
  }
};


  const notificationItems = (
    <div className="mc-notification-list">
      {loading ? (
        <p className="mc-notification-empty">
          Loading notifications...
        </p>
      ) : error ? (
        <p className="mc-notification-empty">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="mc-notification-empty">
          You're all caught up! No notifications yet.
        </p>
      ) : (
        notifications.map((notification) => {
          const actor = actors[notification.actorId] || {};
          const createdAt =
            notification.createdAt?.toDate?.();

          return (
            <button
              type="button"
              key={notification.id}
              className={`mc-notification-item ${
                !notification.read ? "mc-notification-unread" : ""
              }`}
              onClick={() => openNotification(notification)}
            >
              <img
                src={actor.photoURL || defaultProfile}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = defaultProfile;
                }}
              />

              <span className="mc-notification-content">
                <span className="mc-notification-message">
                  <strong>
                    {getActorName(notification.actorId)}
                  </strong>{" "}
                  {getMessage(notification.type)}
                </span>

                <small>
                  {createdAt
                    ? createdAt.toLocaleString()
                    : "Just now"}
                </small>
              </span>

              {!notification.read && (
                <span className="mc-notification-unread-dot" />
              )}
            </button>
          );
        })
      )}
    </div>
  );

  if (mode === "page") {
    return (
      <section className="mc-notifications-page">
        <div className="mc-notification-header">
          <h2>Notifications</h2>
          <span>{unreadCount} unread</span>
        </div>
        {notificationItems}
      </section>
    );
  }

  return (
    <div className="mc-notification-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="mc-notification-trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
      >
        <FaBell />

        {unreadCount > 0 && (
          <span className="mc-notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && currentTab !== "notifications" && (
          <div className="mc-notification-dropdown">
          <div className="mc-notification-header">
            <h2>Notifications</h2>
            <span>{unreadCount} unread</span>
          </div>

          {notificationItems}
        </div>
      )}
    </div>
  );
}
