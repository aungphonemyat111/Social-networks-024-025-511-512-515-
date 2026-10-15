import React from "react";
import { 
  FaHome, 
  FaUser, 
  FaPlusCircle, 
  FaEnvelope, 
  FaUsers, 
  FaSearch,
} from "react-icons/fa";
import "./HomeFeed.css";
import profileImg from "../profile.png";

function HomeFeed({ posts = [], onNavigate, onDeletePost }) {
  return (
    <div className="create-home-feed">
      {/* Master Flex Container */}
      <div className="home-layout">
        
        {/* Left Hand Navigation Panel Sidebar */}
        <div className="sidebar">
          <div className="logo">
            <FaUsers />
            <span>MORCHORCONNECT</span>
          </div>
          <ul>
            <li className="active" onClick={() => onNavigate && onNavigate("home")}>
              <FaHome />
              <span>Home</span>
            </li>
            <li onClick={() => onNavigate && onNavigate("create")}>
              <FaPlusCircle />
              <span>Create Post</span>
            </li>
            <li onClick={() => onNavigate && onNavigate("profile")}>
              <FaUser />
              <span>Profile</span>
            </li>
            <li onClick={() => onNavigate && onNavigate("message")}>
              <FaEnvelope />
              <span>Messages</span>
            </li>
          </ul>
        </div>

        {/* Right Content Workspace Workspace Layout Panel */}
        <div className="home-content">
          
          {/* Top Integrated Search Navigation Bar Banner Row */}
          <div className="navbar">
            <div className="search-bar">
              <FaSearch />
              <input type="text" placeholder="Search posts, people, or events..." />
            </div>

            <div className="nav-right">
              <div className="avator-small">
                <img src={profileImg} alt="User Profile" onClick={() => onNavigate && onNavigate("profile")} />
              </div>
            </div>
          </div>

          {/* Timeline Feed Container Frame Layout */}
          <div className="main-feed-grid">
            <div className="feed-stream">
              
              {/* Quick Trigger Posting Entry Box */}
              <div className="quick-post-box" onClick={() => onNavigate && onNavigate("create")}>
                <div className="quick-post-input-row">
                  <div className="avatar-wrapper" >
                    <img src={profileImg} alt="User Profile" />
                  </div>
                  <input
                    type="text"
                    placeholder="What's on your mind?"
                    className="quick-trigger-input"
                    readOnly
                  />
                </div>
              </div>

              {/* Dynamic Post Feed Map Generator Container */}
              <div className="posts-container">
                {posts.length === 0 ? (
                  <div className="empty-feed-card">
                    <p>No posts on your timeline yet. Be the first to start a discussion!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="empty-feed-card"
                      style={{
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        padding: "20px",
                        position: "relative"
                      }}
                    >
                      {/* Post Header Meta Info Block Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong style={{ color: "#110066", fontSize: "15px" }}>{post.userName || "Alyna"}</strong>
                          {post.taggedPerson && (
                            <span style={{ color: "#7b3ff2", fontWeight: "600" }}> is with {post.taggedPerson}</span>
                          )}
                          {post.feeling && <span style={{ color: "#6b7280" }}> — feeling {post.feeling}</span>}
                          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                            {post.timestamp || "just now"} • {post.privacy}
                          </div>
                        </div>

                        {/* Interactive Clickable Deletion Cross Button Trigger */}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents clicking cross from opening creation tab route redirect box
                            if (onDeletePost) onDeletePost(post.id);
                          }}
                          style={{ 
                            background: "transparent", 
                            border: "none", 
                            color: "#ef4444", 
                            fontSize: "18px", 
                            cursor: "pointer", 
                            fontWeight: "bold", 
                            padding: "5px",
                            position: "relative",
                            zIndex: 10 // Pushes item safely past any layout bounding box overlay sheets
                          }}
                          title="Delete Post"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Main Message Text Body Output */}
                      {post.text && (
                        <p style={{ fontSize: "14px", color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>
                          {post.text}
                        </p>
                      )}

                      {/* RENDERS THE ATTACHED PHOTO DIRECTLY ON THE NEWSFEED TIMELINE */}
                      {post.attachedFile && (
                        <div
                          style={{
                            width: "100%",
                            maxHeight: "360px",
                            borderRadius: "12px",
                            overflow: "hidden",
                            marginTop: "4px",
                            border: "1px solid #eeebff",
                          }}
                        >
                          <img
                            src={post.attachedFile}
                            alt="Post Attachment"
                            style={{
                              width: "100%",
                              maxHeight: "360px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default HomeFeed;
