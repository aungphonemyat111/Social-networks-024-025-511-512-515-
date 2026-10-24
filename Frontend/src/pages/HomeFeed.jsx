import React from "react";
import { FaSearch } from "react-icons/fa";
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
  focusedPostId = null,
  focusedCommentId = null,
}) {
  const myAvatar = currentProfile?.photoURL || defaultProfile;

  return (
    <div className="create-home-feed">
      <div className="home-layout">
        <div className="home-content">
          {!focusedPostId && (
            <>
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
                      onClick={() => onOpenProfile(currentUserId)}
                      aria-label="View my profile"
                      style={{
                        padding: 0,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      <img src={myAvatar} alt="My profile" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="main-feed-grid">
            <div className="feed-stream">
              {!focusedPostId && (
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
                        <img src={myAvatar} alt="Your profile" />
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
              )}

              <div className="posts-container">
                {posts.length === 0 ? (
                  <div className="empty-feed-card">
                    <p>
                      {focusedPostId
                        ? "This post is unavailable or you don't have access to it."
                        : "No posts on your timeline yet. Be the first to start a discussion!"}
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      focusCommentId={focusedCommentId}
                      currentUserId={currentUserId}
                      onOpenProfile={onOpenProfile}
                      isFollowing={Boolean(followingUsers[post.userName])}
                      onDelete={() => onDeletePost(post.id)}
                      onAddComment={(text, parentId) =>
                        onAddComment(post.id, text, parentId)
                      }
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
