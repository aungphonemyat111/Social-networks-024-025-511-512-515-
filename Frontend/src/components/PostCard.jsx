import React, { useState } from "react";
import "./PostCard.css";

// One post display: Alyna's data fields + August's interaction features.
export default function PostCard({
  post,
  isLiked,
  isFollowing,
  onLike,
  onDelete,
  onAddComment,
  onToggleFriend,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [notice, setNotice] = useState("");
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const userName = post.userName || post.name || "User";
  // Alyna's CreatePost currently hardcodes her name. Once Firebase auth is wired,
  // compare post.authorId to auth.currentUser.uid instead of usernames.
  const isOwnPost = userName === "Alyna";

  const sharePost = async () => {
    const text = `${userName}: ${post.text || "Shared a post"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MorChorConnect post", text });
        setNotice("Post shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice("Post copied to clipboard");
      } else {
        setNotice("Sharing is unavailable in this browser");
      }
    } catch (error) {
      if (error.name !== "AbortError") setNotice("Could not share this post");
    }
  };

  const submitComment = (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText);
    setCommentText("");
  };

  return (
    <article className="mc-post-card">
      <div className="mc-post-header">
        <div>
          <strong className="mc-post-author">{userName}</strong>
          {post.taggedPerson && <span className="mc-post-tag"> is with {post.taggedPerson}</span>}
          {post.feeling && <span className="mc-post-detail"> — feeling {post.feeling}</span>}
          <div className="mc-post-meta">{post.timestamp || post.time || "just now"} · {post.privacy || "public"}</div>
        </div>
        <div className="mc-post-user-actions">
          {isOwnPost ? (
            <button type="button" className="mc-delete" onClick={onDelete} aria-label="Delete post">✕</button>
          ) : (
            <button type="button" className="mc-follow" onClick={onToggleFriend}>
              {isFollowing ? "Added ✓" : "Add friend"}
            </button>
          )}
        </div>
      </div>

      {post.text && <p className="mc-post-text">{post.text}</p>}
      {post.attachedFile && (
        <img src={post.attachedFile} alt="Post attachment" className="mc-post-image" />
      )}
      <div className="mc-post-stats">
        <span>{post.likes || 0} likes</span>
        <button type="button" onClick={() => setCommentsOpen((open) => !open)}>{comments.length} comments</button>
      </div>
      <div className="mc-post-actions">
        <button type="button" aria-pressed={isLiked} className={isLiked ? "mc-liked" : ""} onClick={onLike}>
          {isLiked ? "♥" : "♡"} Like
        </button>
        <button type="button" onClick={() => setCommentsOpen((open) => !open)}>▢ Comment</button>
        <button type="button" onClick={sharePost}>↗ Share</button>
      </div>
      {notice && <div className="mc-post-notice" role="status">{notice}</div>}
      {commentsOpen && (
        <div className="mc-comments">
          {comments.map((comment, index) => (
            <div className="mc-comment" key={comment.id ?? index}>
              <strong>{comment.name || "User"}</strong>: {comment.text}
            </div>
          ))}
          <form className="mc-comment-form" onSubmit={submitComment}>
            <input
              aria-label="Write a comment"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit" disabled={!commentText.trim()}>Send</button>
          </form>
        </div>
      )}
    </article>
  );
}
