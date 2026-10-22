
import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "./firebase";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import HomeFeed from "./pages/HomeFeed";
import CreatePost from "./pages/CreatePost";
import StudentProfile from "./pages/StudentProfile";

import {
  createPost,
  subscribeToPosts,
  deletePost,
} from "./services/postService";
import { addComment } from "./services/commentService";

import defaultProfile from "./assets/profile.png";
import "./AppShell.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login");

  const [currentTab, setCurrentTab] = useState("home");
  const [profileUserId, setProfileUserId] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [posts, setPosts] = useState([]);
  const [followingUsers, setFollowingUsers] = useState({});

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  // Current student's profile.
  useEffect(() => {
    if (!user?.uid) {
      setOwnProfile(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setOwnProfile(
          snapshot.exists() ? snapshot.data() : null
        );
      },
      (error) => {
        console.error("Could not load profile:", error);
      }
    );
  }, [user?.uid]);

  // Posts stay synchronized with Firestore.
  useEffect(() => {
    if (!user?.uid) {
      setPosts([]);
      return;
    }

    setPosts([]);

    return subscribeToPosts(
      user.uid,
      setPosts,
      (error) => {
        console.error("Could not load posts:", error);
      }
    );
  }, [user?.uid]);

  const navigate = (tab) => {
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

  const handleAddPost = async (postData) => {
    if (!user) {
      throw new Error("Please log in first.");
    }

    await createPost(user, postData);
    navigate("home");
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;

    try {
      await deletePost(postId);
    } catch (error) {
      console.error("Could not delete post:", error);
      alert("Could not delete this post.");
    }
  };

  const handleAddComment = async (
    postId,
    text,
    parentId = null
  ) => {
    await addComment(postId, user, text, parentId);
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
      <CreateAccount
        goToLogin={() => setAuthPage("login")}
      />
    ) : (
      <Login
        goToCreate={() => setAuthPage("create")}
      />
    );
  }

  const isTestAccount =
    import.meta.env.DEV &&
    user.email?.toLowerCase() === "morchor.test@example.com";

  const isVerifiedCMU =
    user.email?.toLowerCase().endsWith("@cmu.ac.th") &&
    user.emailVerified;

  if (!isTestAccount && !isVerifiedCMU) {
    return (
      <div className="mc-verification-page">
        <h2>Email verification required</h2>

        <p>
          Please verify your CMU email address before
          accessing MorChorConnect.
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

        <button
          type="button"
          onClick={handleLogout}
        >
          Return to login
        </button>
      </div>
    );
  }

  const realName =
    ownProfile?.fullName ||
    ownProfile?.displayName ||
    user.displayName ||
    posts.find((post) => post.authorId === user.uid)
      ?.userName ||
    user.email?.split("@")[0] ||
    "Student";

  const nickname = (ownProfile?.nickname || "").trim();

  const displayName =
    nickname &&
    nickname.toLowerCase() !== realName.toLowerCase()
      ? `${realName} (${nickname})`
      : realName;

  const avatar =
    ownProfile?.photoURL ||
    user.photoURL ||
    defaultProfile;

  return (
    <div className="mc-app-shell">
      <header className="mc-account-bar">
        <span className="mc-account-bar-label">
          MorChorConnect · CMU community
        </span>

        <div className="mc-account-menu-wrap">
          <button
            type="button"
            className="mc-account-trigger"
            onClick={() =>
              setAccountMenuOpen((open) => !open)
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
      </header>

      <main>
        {currentTab === "home" && (
          <HomeFeed
            posts={posts}
            currentUserId={user.uid}
            currentProfile={ownProfile}
            onNavigate={navigate}
            onOpenProfile={openProfile}
            onDeletePost={handleDeletePost}
            onAddComment={handleAddComment}
            onToggleFriend={handleToggleFriend}
            followingUsers={followingUsers}
          />
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
            onDeletePost={handleDeletePost}
            onAddComment={handleAddComment}
          />
        )}

        {!["home", "create", "profile"].includes(
          currentTab
        ) && (
          <div className="mc-coming-soon">
            <h2>
              {currentTab === "message"
                ? "Messages"
                : currentTab}
            </h2>

            <p>
              We'll connect this page when your
              teammate's code is integrated.
            </p>

            <button
              type="button"
              onClick={() => navigate("home")}
            >
              Back to Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
