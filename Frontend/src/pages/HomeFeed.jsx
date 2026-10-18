import React from "react";
import {
  FaHome,
  FaUser,
  FaPlusCircle,
  FaEnvelope,
  FaUsers,
  FaSearch,
} from "react-icons/fa";

import PostCard from "../components/PostCard";
import profileImg from "../profile.png";
import "./HomeFeed.css";

function HomeFeed({ posts = [], onNavigate, onDeletePost, onLikePost, onAddComment, onToggleFriend, followingUsers = {}, likedPosts = {} }) {
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
                    <PostCard
                      key={post.id}
                      post={post}
                      isLiked={Boolean(likedPosts[post.id])}
                      isFollowing={Boolean(followingUsers[post.userName])}
                      onLike={() => onLikePost(post.id)}
                      onDelete={() => onDeletePost(post.id)}
                      onAddComment={(text) => onAddComment(post.id, text)}
                      onToggleFriend={() => onToggleFriend(post.userName)}
                    />
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
