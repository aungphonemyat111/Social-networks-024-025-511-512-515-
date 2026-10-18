import React, { useState } from "react";
import HomeFeed from "./components/HomeFeed";
import CreatePost from "./components/CreatePost";

function App() {
  const [currentTab, setCurrentTab] = useState("home");
  const [posts, setPosts] = useState([]); 

  const handleAddPost = (newPost) => {
    setPosts([newPost, ...posts]); 
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setPosts(posts.filter((post) => post.id !== postId));
    }
  };

  return (
    <>
      {currentTab === "home" && (
        <HomeFeed posts={posts} onNavigate={setCurrentTab} onDeletePost={handleDeletePost} />
      )}
      
      {currentTab === "create" && (
        <CreatePost onAddPost={handleAddPost} onNavigate={setCurrentTab} />
      )}

      {currentTab !== "home" && currentTab !== "create" && (
        <div style={{ textAlign: "center", padding: "50px", fontFamily: "Arial, sans-serif", color: "#110066" }}>
          <h2>{currentTab.toUpperCase()} panel coming soon!</h2>
          <button 
            style={{ 
              background: "linear-gradient(900deg, #7b3ff2, #9b5cff)", 
              color: "white", 
              padding: "10px 20px", 
              border: "none", 
              borderRadius: "12px", 
              cursor: "pointer", 
              marginTop: "15px", 
              fontWeight: "600" 
            }} 
            onClick={() => setCurrentTab("home")}
          >
            Return Home Feed
          </button>
        </div>
      )}
    </>
  );
}

export default App;
