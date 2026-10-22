
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
import defaultProfile from "../assets/profile.png";
import "./HomeFeed.css";
import "./HomeFeedExtras.css";

export default function HomeFeed({
  posts = [],
  currentUserId,
  currentProfile,
  onNavigate,
  onOpenProfile,
  onDeletePost,
  onAddComment,
  onToggleFriend,
  followingUsers = {},
}) {
  const myAvatar =
    currentProfile?.photoURL || defaultProfile;

  return (
    <div className="create-home-feed">
      <div className="home-layout">
        <aside className="sidebar">
          <div className="logo">
            <FaUsers />
            <span>MORCHORCONNECT</span>
          </div>

          <ul>
            <li
              className="active"
              onClick={() => onNavigate("home")}
            >
              <FaHome />
              <span>Home</span>
            </li>

            <li onClick={() => onNavigate("create")}>
              <FaPlusCircle />
              <span>Create Post</span>
            </li>

            <li
              onClick={() => onOpenProfile(currentUserId)}
            >
              <FaUser />
              <span>Profile</span>
            </li>

            <li onClick={() => onNavigate("message")}>
              <FaEnvelope />
              <span>Messages</span>
            </li>
          </ul>
        </aside>

        <div className="home-content">
          <div className="navbar">
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search posts, people, or events..."
              />
            </div>

            <div className="nav-right">
              <div className="avator-small">
                <button
                  type="button"
                  onClick={() =>
                    onOpenProfile(currentUserId)
                  }
                  aria-label="View my profile"
                  style={{
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={myAvatar}
                    alt="My profile"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="main-feed-grid">
            <div className="feed-stream">
              <div
                className="quick-post-box"
                onClick={() => onNavigate("create")}
              >
                <div className="quick-post-input-row">
                  <div className="avatar-wrapper">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenProfile(currentUserId);
                      }}
                      aria-label="Open my profile"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={myAvatar}
                        alt="Your profile"
                      />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="What's on your mind?"
                    className="quick-trigger-input"
                    readOnly
                  />
                </div>
              </div>

              <div className="posts-container">
                {posts.length === 0 ? (
                  <div className="empty-feed-card">
                    <p>
                      No posts on your timeline yet.
                      Be the first to start a discussion!
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onOpenProfile={onOpenProfile}
                      isFollowing={Boolean(
                        followingUsers[post.userName]
                      )}
                      onDelete={() =>
                        onDeletePost(post.id)
                      }
                      onAddComment={(text, parentId) =>
                        onAddComment(
                          post.id,
                          text,
                          parentId
                        )
                      }
                      onToggleFriend={() =>
                        onToggleFriend(post.userName)
                      }
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
