import React, { useState } from "react";
import HomeFeed from "./components/HomeFeed";
import CreatePost from "./components/CreatePost";

// This is temporary local React state. Replace the handlers with Firebase
// Authentication + Firestore reads/writes after the frontend is integrated.
export default function App() {
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

  return (
    <>
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
