import React, { useState } from "react";
import HomeFeed from "./components/HomeFeed";
import CreatePost from "./components/CreatePost";
import SocialFeed from "./SocialFeed";

export default function App() {
  const [currentTab, setCurrentTab] = useState("home");
  const [posts, setPosts] = useState([]);

  const handleAddPost = (newPost) => {
    setPosts((previousPosts) => [newPost, ...previousPosts]);
    setCurrentTab("home");
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setPosts((previousPosts) =>
        previousPosts.filter((post) => post.id !== postId)
      );
    }
  };

  return (
    <>
      <nav aria-label="Choose feed" style={{ padding: "12px", display: "flex", gap: "12px" }}>
        <button type="button" onClick={() => setCurrentTab("home")}>
          Alyna's home feed
        </button>
        <button type="button" onClick={() => setCurrentTab("august-feed")}>
          August's social feed
        </button>
      </nav>

      {currentTab === "home" && (
        <HomeFeed
          posts={posts}
          onNavigate={setCurrentTab}
          onDeletePost={handleDeletePost}
        />
      )}

      {currentTab === "create" && (
        <CreatePost
          onAddPost={handleAddPost}
          onNavigate={setCurrentTab}
        />
      )}

      {currentTab === "august-feed" && <SocialFeed />}

      {!["home", "create", "august-feed"].includes(currentTab) && (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h2>{currentTab.toUpperCase()} panel coming soon!</h2>
          <button type="button" onClick={() => setCurrentTab("home")}>
            Return Home Feed
          </button>
        </div>
      )}
    </>
  );
}
