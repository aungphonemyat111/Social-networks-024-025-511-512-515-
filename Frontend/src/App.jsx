import React, { useEffect, useState } from "react";
import Messaging from "./Messaging";
import { subscribeToUnreadMessageCounts } from "./services/messagingService";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { FaRegCommentDots } from "react-icons/fa";

import { auth, db } from "./firebase";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import HomeFeed from "./pages/HomeFeed";
import CreatePost from "./pages/CreatePost";
import StudentProfile from "./pages/StudentProfile";
import SidebarNav from "./components/SidebarNav";
import NotificationBell from "./components/NotificationBell";
import { createNotification } from "./services/notificationService";
import {
  createPost,
  subscribeToPosts,
  deletePost,
} from "./services/postService";
import { addComment } from "./services/commentService";

import morchorLogo from "./assets/morchor-logo.png";
import defaultProfile from "./assets/profile.png";
import "./AppShell.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login");

  const [currentTab, setCurrentTab] = useState("home");
  const [messageRecipientId, setMessageRecipientId] = useState(null);
  const [unreadByChat, setUnreadByChat] = useState({});
  const [focusedPostId, setFocusedPostId] = useState(null);
  const [focusedCommentId, setFocusedCommentId] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [posts, setPosts] = useState([]);
  const [followingUsers, setFollowingUsers] = useState({});

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  // Fill in missing real names for existing accounts.
  useEffect(() => {
    if (!user?.uid || !user.displayName?.trim()) {
      return;
    }

    let cancelled = false;

    const syncFullName = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (cancelled) return;

        const existingName = snapshot.data()?.fullName;

        // Never overwrite a name that already exists.
        if (
          typeof existingName === "string" &&
          existingName.trim()
        ) {
          return;
        }

        await setDoc(
          userRef,
          { fullName: user.displayName.trim() },
          { merge: true }
        );
      } catch (error) {
        console.error("Could not sync full name:", error);
      }
    };

    syncFullName();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName]);

  // Current student's profile.
  useEffect(() => {
    if (!user?.uid) {
      setOwnProfile(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setOwnProfile(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.error("Could not load profile:", error);
      }
    );
  }, [user?.uid]);

  // Unread messages are independent of the notification bell and page.
  useEffect(() => {
    if (!user?.uid) {
      setUnreadByChat({});
      return;
    }
    return subscribeToUnreadMessageCounts(
      user.uid,
      setUnreadByChat,
      (error) => console.error('Could not load unread message counts:', error)
    );
  }, [user?.uid]);

  const unreadMessageTotal = Object.values(unreadByChat).reduce(
    (total, count) => total + count, 0
  );

  // Posts stay synchronized with Firestore.
  useEffect(() => {
    if (!user?.uid) {
      setPosts([]);
      return;
    }

    setPosts([]);

    return subscribeToPosts(user.uid, setPosts, (error) => {
      console.error("Could not load posts:", error);
    });
  }, [user?.uid]);

  const navigate = (tab) => {
    setMessageRecipientId(null);
    setFocusedPostId(null);
    setFocusedCommentId(null);
  
    if (tab === "profile") {
      setProfileUserId(user.uid);
    }
  
    setCurrentTab(tab);
    setAccountMenuOpen(false);
  };

  const openProfile = (uid) => {
    if (!uid) return;

    setProfileUserId(uid);
    setCurrentTab("profile");
    setAccountMenuOpen(false);
  };
  const openMessage = (recipientId) => {
    if (!recipientId || recipientId === user?.uid) return;
    setMessageRecipientId(recipientId);
    setCurrentTab("message");
    setAccountMenuOpen(false);
  };

  const openPost = (postId, commentId = null) => {
    if (!postId) return;

    setFocusedPostId(postId);
    setFocusedCommentId(commentId);
    setCurrentTab("home");
    setAccountMenuOpen(false);
  };

  const handleAddPost = async (postData) => {
    if (!user) {
      throw new Error("Please log in first.");
    }

    // Save the post before sending any notifications.
    const savedPost = await createPost(user, postData);

    // Support the new multi-select composer and older single-tag drafts.
    const rawTags = postData.taggedUserIds ||
      (postData.taggedUserId && postData.tagType !== "mention"
        ? [postData.taggedUserId]
        : []);
    const rawMentions = postData.mentionedUserIds ||
      (postData.taggedUserId && postData.tagType === "mention"
        ? [postData.taggedUserId]
        : []);

    const taggedIds = [...new Set(rawTags)].filter(
      (id) => id && id !== user.uid
    );
    const mentionedIds = [...new Set(rawMentions)].filter(
      (id) => id && id !== user.uid && !taggedIds.includes(id)
    );

    if (savedPost?.id && postData.privacy === "public") {
      const recipients = [
        ...taggedIds.map((recipientId) => ({ recipientId, type: "tag" })),
        ...mentionedIds.map((recipientId) => ({ recipientId, type: "mention" })),
      ];

      // Each failure is isolated; a saved post is never rolled back.
      await Promise.all(
        recipients.map(async ({ recipientId, type }) => {
          try {
            await createNotification({
              recipientId,
              actorId: user.uid,
              type,
              postId: savedPost.id,
            });
          } catch (error) {
            console.error(`Could not send ${type} notification:`, error);
          }
        })
      );
    }

    navigate("home");
  };

  const handleDeletePost = (postId) => {
    setPostToDelete(postId);
    setDeleteError("");
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || deletingPost) return;

    setDeletingPost(true);
    setDeleteError("");

    try {
      await deletePost(postToDelete);
      setPostToDelete(null);
    } catch (error) {
      console.error("Could not delete post:", error);
      setDeleteError("Could not delete this post. Please try again.");
    } finally {
      setDeletingPost(false);
    }
  };

 
const handleAddComment = async (
  postId,
  text,
  parentId = null
) => {
  if (!user) {
    throw new Error("Please log in first.");
  }

  // Save the comment or reply first.
  const savedComment = await addComment(
    postId,
    user,
    text,
    parentId
  );

  // Notification failures must not undo a saved comment.
  try {
    const postSnapshot = await getDoc(
      doc(db, "posts", postId)
    );

    if (!postSnapshot.exists()) return;

    const postAuthorId = postSnapshot.data().authorId;

    let recipientId = postAuthorId;
    let notificationType = "comment";

    // For replies, notify the author of the
    // comment being replied to.
    if (parentId) {
      const parentSnapshot = await getDoc(
        doc(db, "posts", postId, "comments", parentId)
      );

      if (!parentSnapshot.exists()) return;

      recipientId = parentSnapshot.data().authorId;
      notificationType = "reply";
    }

    // No notification for your own actions.
    if (!recipientId || recipientId === user.uid) {
      return;
    }

    await createNotification({
      recipientId,
      actorId: user.uid,
      type: notificationType,
      postId,
      commentId: savedComment.id,
    });
  } catch (error) {
    console.error(
      "Comment saved, but notification failed:",
      error
    );
  }
};


  // Temporary until our Firestore follow system is ready.
  const handleToggleFriend = (userName) => {
    if (!userName) return;

    setFollowingUsers((previous) => ({
      ...previous,
      [userName]: !previous[userName],
    }));
  };

  const handleLogout = async () => {
    try {
      setAccountMenuOpen(false);
      await signOut(auth);

      setCurrentTab("home");
      setProfileUserId(null);
      setFollowingUsers({});
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Could not log out.");
    }
  };

  if (loading) {
    return (
      <div className="mc-loading-page">
        Loading MorChorConnect...
      </div>
    );
  }

  if (!user) {
    return authPage === "create" ? (
      <CreateAccount goToLogin={() => setAuthPage("login")} />
    ) : (
      <Login goToCreate={() => setAuthPage("create")} />
    );
  }

  const isTestAccount =
    import.meta.env.DEV &&
    [
      "morchor.test@example.com",
      "morchor.test2@example.com",
    ].includes(user.email?.toLowerCase());

  const isVerifiedCMU =
    user.email?.toLowerCase().endsWith("@cmu.ac.th") &&
    user.emailVerified;

  if (!isTestAccount && !isVerifiedCMU) {
    return (
      <div className="mc-verification-page">
        <h2>Email verification required</h2>

        <p>
          Please verify your CMU email address before accessing
          MorChorConnect.
        </p>

        <button
          type="button"
          onClick={async () => {
            try {
              await sendEmailVerification(user);
              alert("Verification email sent!");
            } catch (error) {
              console.error(error);
              alert("Could not send verification email.");
            }
          }}
        >
          Resend verification email
        </button>

        <button type="button" onClick={handleLogout}>
          Return to login
        </button>
      </div>
    );
  }

  const realName =
    ownProfile?.fullName ||
    ownProfile?.displayName ||
    user.displayName ||
    posts.find((post) => post.authorId === user.uid)?.userName ||
    user.email?.split("@")[0] ||
    "Student";

  const nickname = (ownProfile?.nickname || "").trim();

  const displayName =
    nickname && nickname.toLowerCase() !== realName.toLowerCase()
      ? `${realName} (${nickname})`
      : realName;

  const avatar =
    ownProfile?.photoURL || user.photoURL || defaultProfile;

  return (
    <div className="mc-app-shell">
      <header className="mc-account-bar">
        <button
          type="button"
          className="mc-brand-logo"
          onClick={() => navigate("home")}
          aria-label="MorChorConnect Home"
        >
          <img
            src={morchorLogo}
            alt="MorChorConnect — for CMU students only"
          />
        </button>

        <div className="mc-header-actions">
          {/* Notification bell and dropdown */}
          <NotificationBell
            userId={user.uid}
            onOpenProfile={openProfile}
            onOpenPost={openPost}
            currentTab={currentTab}
          />

          {/* Messages shortcut */}
          <button
            type="button"
            className="mc-messages-trigger"
            onClick={() => navigate("message")}
            aria-label={unreadMessageTotal > 0
              ? `Open Messages, ${unreadMessageTotal} unread`
              : "Open Messages"}
            title="Messages"
            style={{ position: "relative" }}
          >
            <FaRegCommentDots />
            {unreadMessageTotal > 0 && (
              <span
                className="mc-message-unread-count"
                aria-hidden="true"
                style={{
                  position: "absolute", top: -6, right: -7,
                  minWidth: 18, height: 18, padding: "0 4px",
                  borderRadius: 999, background: "#dc2626", color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 2px #fff",
                }}
              >
                {unreadMessageTotal > 99 ? "99+" : unreadMessageTotal}
              </span>
            )}
          </button>

          {/* Account dropdown */}
          <div className="mc-account-menu-wrap">
            <button
              type="button"
              className="mc-account-trigger"
              onClick={() =>
                setAccountMenuOpen((previous) => !previous)
              }
              aria-expanded={accountMenuOpen}
              aria-label="Open account menu"
            >
              <img src={avatar} alt="" />
              <span>{displayName}</span>
              <span className="mc-menu-chevron">⌄</span>
            </button>

            {accountMenuOpen && (
              <div className="mc-account-dropdown">
                <div className="mc-dropdown-heading">
                  <strong>{displayName}</strong>
                  <small>{user.email}</small>
                </div>

                <button
                  type="button"
                  onClick={() => openProfile(user.uid)}
                >
                  My profile
                </button>

                <button
                  type="button"
                  className="mc-logout-option"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mc-content-with-sidebar">
        <SidebarNav
          currentTab={currentTab}
          currentUserId={user.uid}
          onNavigate={navigate}
          onOpenProfile={openProfile}
        />

        <div className="mc-main-panel">

        {currentTab === "home" && (
              <>
                {focusedPostId && (
                  <button
                    type="button"
                    onClick={() => navigate("home")}
                    className="mc-back-to-feed"
                  >
                    ← Back to Home Feed
                  </button>
                )}

                <HomeFeed
                  focusedPostId={focusedPostId}
                  focusedCommentId={focusedCommentId}
                  posts={
                    focusedPostId
                      ? posts.filter(
                          (post) => post.id === focusedPostId
                        )
                      : posts
                  }
                  currentUserId={user.uid}
                  currentProfile={ownProfile}
                  onNavigate={navigate}
                  onOpenProfile={openProfile}
                  onDeletePost={handleDeletePost}
                  onAddComment={handleAddComment}
                  onToggleFriend={handleToggleFriend}
                  followingUsers={followingUsers}
                />
              </>
            )}


          {currentTab === "create" && (
            <CreatePost
              onAddPost={handleAddPost}
              onNavigate={navigate}
            />
          )}

          {currentTab === "profile" && (
            <StudentProfile
              currentUser={user}
              profileUserId={profileUserId || user.uid}
              posts={posts}
              onBack={() => navigate("home")}
              onOpenProfile={openProfile}
              onMessage={openMessage}
              onDeletePost={handleDeletePost}
              onAddComment={handleAddComment}
            />
          )}

          {currentTab === "notifications" && (
            <NotificationBell
              mode="page"
              userId={user.uid}
              onOpenProfile={openProfile}
              onOpenPost={openPost}
            />
          )}

          {currentTab === "message" && (
            <Messaging
              userId={user.uid}
              userName={displayName}
            initialRecipientId={messageRecipientId}
              unreadByChat={unreadByChat}
            />
          )}

          {![
            "home",
            "create",
            "profile",
            "notifications",
            "message",
          ].includes(currentTab) && (
            <div className="mc-coming-soon">
              <h2>
                {currentTab === "message" ? "Messages" : currentTab}
              </h2>

              <p>
                We'll connect this page when your teammate's code is
                integrated.
              </p>

              <button
                type="button"
                onClick={() => navigate("home")}
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </main>

      {postToDelete && (
        <div className="mc-delete-overlay">
          <div
            className="mc-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mc-delete-title"
            aria-describedby="mc-delete-description"
          >
            <div className="mc-delete-icon">!</div>

            <h2 id="mc-delete-title">Delete this post?</h2>

            <p id="mc-delete-description">
              This post and its content will be permanently deleted.
              This action cannot be undone.
            </p>

            {deleteError && (
              <p className="mc-delete-error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="mc-delete-actions">
              <button
                type="button"
                className="mc-delete-cancel"
                autoFocus
                disabled={deletingPost}
                onClick={() => setPostToDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="mc-delete-confirm"
                disabled={deletingPost}
                onClick={confirmDeletePost}
              >
                {deletingPost ? "Deleting..." : "Delete post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
