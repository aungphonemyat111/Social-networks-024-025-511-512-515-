import React, { useEffect, useState } from "react";
import { subscribeToComments } from "../services/commentService";
import "./PostCard.css";
import {
  subscribeToLikes,
  setPostLike,
} from "../services/likeService";

// One post display: Alyna's data fields + August's interaction features.
export default function PostCard({
  post,
  currentUserId,
  isLiked,
  isFollowing,
  onLike,
  onDelete,
  onAddComment,
  onToggleFriend,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [notice, setNotice] = useState("");
  const [postLiked, setPostLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savingLike, setSavingLike] = useState(false);

  const [comments, setComments] = useState([]);


useEffect(() => {
  if (!post.id) return;

  const unsubscribe = subscribeToComments(
    post.id,
    (firestoreComments) => {
      setComments(firestoreComments);
    },
    (error) => {
      console.error("Error loading comments:", error);
    }
  );

  return () => unsubscribe();
}, [post.id]);


  
useEffect(() => {
  if (!post.id || !currentUserId) return;

  const unsubscribe = subscribeToLikes(
    post.id,
    currentUserId,
    ({ count, isLiked }) => {
      setLikesCount(count);
      setPostLiked(isLiked);
    },
    (error) => {
      console.error("Error loading likes:", error);
    }
  );

  return () => unsubscribe();
}, [post.id, currentUserId]);


const handleLikeClick = async () => {
  if (savingLike || !currentUserId) return;

  setSavingLike(true);

  try {
    await setPostLike(
      post.id,
      currentUserId,
      !postLiked
    );
  } catch (error) {
    console.error("Error updating like:", error);
    alert("Could not update your like.");
  } finally {
    setSavingLike(false);
  }
};

  const userName = post.userName || post.name || "User";

  // compare post.authorId to auth.currentUser.uid instead of usernames.
  const isOwnPost = Boolean(
    currentUserId && post.authorId === currentUserId
  );

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

  
const submitComment = async (event) => {
  event.preventDefault();

  if (!commentText.trim()) return;

  try {
    await onAddComment(commentText);
    setCommentText("");
  } catch (error) {
    console.error("Error saving comment:", error);
    alert("Could not save your comment.");
  }
};


const submitReply = async (event) => {
  event.preventDefault();

  if (!replyText.trim() || !replyingTo || sendingReply) {
    return;
  }

  setSendingReply(true);

  try {
    await onAddComment(replyText.trim(), replyingTo);

    setReplyText("");
    setReplyingTo(null);
  } catch (error) {
    console.error("Error saving reply:", error);
    alert("Could not save your reply.");
  } finally {
    setSendingReply(false);
  }
};

// Separate main comments from replies.
const mainComments = comments.filter(
  (comment) => !comment.parentId
);

const getReplies = (commentId) =>
  comments.filter(
    (comment) => comment.parentId === commentId
  );


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
        <span>{likesCount} likes</span>
        <button type="button" onClick={() => setCommentsOpen((open) => !open)}>{comments.length} comments</button>
      </div>
      <div className="mc-post-actions">

      <button
        type="button"
        aria-pressed={postLiked}
        className={postLiked ? "mc-liked" : ""}
        onClick={handleLikeClick}
        disabled={savingLike || !currentUserId}
        >
    
      {postLiked ? "♥" : "♡"} Like
    </button>

        <button type="button" onClick={() => setCommentsOpen((open) => !open)}>▢ Comment</button>
        <button type="button" onClick={sharePost}>↗ Share</button>
      </div>
      {notice && <div className="mc-post-notice" role="status">{notice}</div>}

      {commentsOpen && (
  <div className="mc-comments">

    {/* Main comments */}
    {mainComments.map((comment) => (
      <div key={comment.id} style={{ marginBottom: "16px" }}>

        <div className="mc-comment">
          <strong>{comment.name || "User"}</strong>
          : {comment.text}
        </div>

        {/* Reply button */}
        <button
          type="button"
          onClick={() => {
            setReplyingTo(
              replyingTo === comment.id ? null : comment.id
            );
            setReplyText("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#6b46c1",
            cursor: "pointer",
            fontSize: "12px",
            marginLeft: "12px",
            marginTop: "5px",
          }}
        >
          Reply
        </button>

        {/* Replies displayed below the parent comment */}
        <div
          style={{
            marginLeft: "28px",
            borderLeft: "2px solid #e5e7eb",
            paddingLeft: "12px",
            marginTop: "8px",
          }}
        >
          {getReplies(comment.id).map((reply) => (
            <div
              className="mc-comment"
              key={reply.id}
              style={{ marginBottom: "8px" }}
            >
              <strong>{reply.name || "User"}</strong>
              : {reply.text}
            </div>
          ))}

          {/* Input for replying */}
          {replyingTo === comment.id && (
            <form
              onSubmit={submitReply}
              className="mc-comment-form"
            >
              <input
                type="text"
                value={replyText}
                onChange={(event) =>
                  setReplyText(event.target.value)
                }
                placeholder={`Reply to ${comment.name || "User"}...`}
                maxLength={1000}
                autoFocus
              />

              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
              >
                {sendingReply ? "Sending..." : "Reply"}
              </button>
            </form>
          )}
        </div>
      </div>
    ))}

    {/* Normal comment input */}
    <form
      className="mc-comment-form"
      onSubmit={submitComment}
    >
      <input
        aria-label="Write a comment"
        value={commentText}
        onChange={(event) =>
          setCommentText(event.target.value)
        }
        placeholder="Write a comment..."
        maxLength={1000}
      />

      <button
        type="submit"
        disabled={!commentText.trim()}
      >
        Send
      </button>
    </form>

  </div>
)}

    </article>
  );
}
