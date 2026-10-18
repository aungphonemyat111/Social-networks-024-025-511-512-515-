import React, { useEffect, useState } from "react";
import Login from "./Login";
import CreateAccount from "./CreateAccount";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";
import HomeFeed from "./components/HomeFeed";
import CreatePost from "./components/CreatePost";


// This is temporary local React state. Replace the handlers with Firebase
// Authentication + Firestore reads/writes after the frontend is integrated.
export default function App() {
  const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [authPage, setAuthPage] = useState("login");

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

  const [currentTab, setCurrentTab] = useState("home");
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState({});
  const [followingUsers, setFollowingUsers] = useState({});

  const handleAddPost = (newPost) => {
    setPosts((previous) => [
      {
        ...newPost,
        // Alyna initially stores `comments: 0`; August needs a comment list.
        comments: Array.isArray(newPost.comments) ? newPost.comments : [],
        likes: Number(newPost.likes) || 0,
      },
      ...previous,
    ]);
    setCurrentTab("home");
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setLikedPosts((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
    }
  };

  const handleLikePost = (postId) => {
    // A single local UI user for now. Firebase will associate likes with auth.uid.
    const wasLiked = Boolean(likedPosts[postId]);
    setLikedPosts((previous) => ({ ...previous, [postId]: !wasLiked }));
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, likes: Math.max(0, (post.likes || 0) + (wasLiked ? -1 : 1)) }
          : post
      )
    );
  };

  const handleAddComment = (postId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...(Array.isArray(post.comments) ? post.comments : []),
                { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, name: "You", text: trimmed }],
            }
          : post
      )
    );
  };

  const handleToggleFriend = (userName) => {
    if (!userName) return;
    setFollowingUsers((previous) => ({ ...previous, [userName]: !previous[userName] }));
  };

  if (loading) {
    return <p>Loading MorChorConnect...</p>;
  }
  
  if (!user) {
    if (authPage === "create") {
      return (
        <CreateAccount goToLogin={() => setAuthPage("login")} />
      );
    }
  
    return (
      <Login goToCreate={() => setAuthPage("create")} />
    );
  }
  
const isTestAccount =
import.meta.env.DEV &&
user.email?.toLowerCase() === "morchor.test@example.com";

if (
!isTestAccount &&
(
  !user.email?.toLowerCase().endsWith("@cmu.ac.th") ||
  !user.emailVerified
)
) {

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Email verification required</h2>

      <p>
        Please verify your CMU email address before accessing
        MorChorConnect.
      </p>

      <button
        onClick={async () => {
          try {
            await sendEmailVerification(user);
            alert("Verification email sent! Check your CMU inbox.");
          } catch (error) {
            console.error("Verification error:", error);
            alert("Could not send verification email. Please try again later.");
          }
        }}
      >
        Resend Verification Email
      </button>

      <button
        onClick={() => signOut(auth)}
        style={{ marginLeft: "10px" }}
      >
        Return to Login
      </button>
    </div>
  );
}


  return (
    <>
      <div style={{ textAlign: "right", padding: "10px" }}>
          <button onClick={() => signOut(auth)}>
                  Log Out
          </button>
      </div>
    
      {currentTab === "home" && (
        <HomeFeed
          posts={posts}
          onNavigate={setCurrentTab}
          onDeletePost={handleDeletePost}
          onLikePost={handleLikePost}
          onAddComment={handleAddComment}
          onToggleFriend={handleToggleFriend}
          likedPosts={likedPosts}
          followingUsers={followingUsers}
        />
      )}

      {currentTab === "create" && (
        <CreatePost onAddPost={handleAddPost} onNavigate={setCurrentTab} />
      )}

      {currentTab !== "home" && currentTab !== "create" && (
        <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
          <h2>{currentTab.toUpperCase()} page coming soon</h2>
          <p>We will connect this page when CJ/Asai's components are integrated.</p>
          <button type="button" onClick={() => setCurrentTab("home")}>Return to Home Feed</button>
        </div>
      )}
    </>
  );
}


  
  

  
