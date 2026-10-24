
import React, { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import { subscribeToComments } from "../services/commentService";
import { createNotification } from "../services/notificationService";
import {
  subscribeToLikes,
  setPostLike,
} from "../services/likeService";
import {
  subscribeToFollow,
  setFollow,
} from "../services/followService";

import PostGallery from "./PostGallery";
import defaultProfile from "../assets/profile.png";
import "./PostCard.css";

export default function PostCard({
  post,
  focusCommentId = null,
  currentUserId,
  onOpenProfile,
  isFollowing,
  onDelete,
  onAddComment,
  onToggleFriend,
}) {
  const [authorProfile, setAuthorProfile] = useState(null);
  const [taggedProfiles, setTaggedProfiles] = useState({});

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [postLiked, setPostLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savingLike, setSavingLike] = useState(false);

  const [notice, setNotice] = useState("");
  const [followingAuthor, setFollowingAuthor] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);

  // Open the comments when a notification targets a specific comment/reply.
  useEffect(() => {
    if (focusCommentId) setCommentsOpen(true);
  }, [focusCommentId]);

  // Load the author's latest profile.
  useEffect(() => {
    if (!post.authorId) {
      setAuthorProfile(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", post.authorId),
      (snapshot) => {
        setAuthorProfile(
          snapshot.exists() ? snapshot.data() : null
        );
      },
      (error) => {
        console.error("Could not load author profile:", error);
      }
    );
  }, [post.authorId]);

  // Resolve multiple tagged students' names from their Firestore profiles.
  useEffect(() => {
    const ids = Array.isArray(post.taggedUserIds)
      ? [...new Set(post.taggedUserIds.filter(Boolean))]
      : [];
    let active = true;

    setTaggedProfiles({});
    if (ids.length > 0) {
      Promise.all(
        ids.map(async (uid) => {
          try {
            const snapshot = await getDoc(doc(db, "users", uid));
            const profile = snapshot.exists() ? snapshot.data() : {};
            const name = profile.fullName || profile.displayName ||
              profile.nickname || profile.name || "CMU Student";
            return [uid, name];
          } catch (error) {
            console.error("Could not load tagged student:", error);
            return [uid, "CMU Student"];
          }
        })
      ).then((results) => {
        if (active) setTaggedProfiles(Object.fromEntries(results));
      });
    }
    return () => { active = false; };
  }, [post.taggedUserIds]);

  // Comments and replies.
  useEffect(() => {
    if (!post.id) return;

    return subscribeToComments(
      post.id,
      setComments,
      (error) => {
        console.error("Could not load comments:", error);
      }
    );
  }, [post.id]);

  // Watch whether I follow this post's author.
useEffect(() => {
  setFollowingAuthor(false);

  if (
    !currentUserId ||
    !post.authorId ||
    currentUserId === post.authorId
  ) {
    return;
  }

  return subscribeToFollow(
    currentUserId,
    post.authorId,
    setFollowingAuthor,
    (error) => {
      console.error("Could not load follow status:", error);
    }
  );
}, [currentUserId, post.authorId]);

  // Likes and unlikes.
  useEffect(() => {
    if (!post.id || !currentUserId) return;

    return subscribeToLikes(
      post.id,
      currentUserId,
      ({ count, isLiked }) => {
        setLikesCount(count);
        setPostLiked(isLiked);
      },
      (error) => {
        console.error("Could not load likes:", error);
      }
    );
  }, [post.id, currentUserId]);

  const realName =
    authorProfile?.fullName ||
    authorProfile?.displayName ||
    authorProfile?.realName ||
    authorProfile?.name ||
    post.userName ||
    post.name ||
    "CMU Student";

  const nickname = (authorProfile?.nickname || "").trim();

  const userName =
    nickname &&
    nickname.toLowerCase() !== realName.toLowerCase()
      ? `${realName} (${nickname})`
      : realName;

  const authorAvatar =
    authorProfile?.photoURL || defaultProfile;

  const isOwnPost =
    Boolean(
      currentUserId &&
      post.authorId === currentUserId
    );

  const images =
    Array.isArray(post.images) && post.images.length > 0
      ? post.images
      : post.attachedFile
        ? [post.attachedFile]
        : [];

  const openAuthorProfile = () => {
    if (post.authorId && onOpenProfile) {
      onOpenProfile(post.authorId);
    }
  };

  const handleFollowClick = async () => {
    if (
      followSaving ||
      !currentUserId ||
      !post.authorId ||
      currentUserId === post.authorId
    ) {
      return;
    }
  
    setFollowSaving(true);
  
    try {
      await setFollow(
        currentUserId,
        post.authorId,
        !followingAuthor
      );
    } catch (error) {
      console.error("Could not update follow:", error);
      alert("Could not update follow. Please try again.");
    } finally {
      setFollowSaving(false);
    }
  };

  const handleLikeClick = async () => {
    if (savingLike || !currentUserId) return;

    const shouldLike = !postLiked;
    setSavingLike(true);

    try {
      // Only a successful new like creates a notification.
      await setPostLike(post.id, currentUserId, shouldLike);

      if (
        shouldLike &&
        post.authorId &&
        post.authorId !== currentUserId &&
        post.privacy === "public"
      ) {
        try {
          await createNotification({
            recipientId: post.authorId,
            actorId: currentUserId,
            type: "like",
            postId: post.id,
          });
        } catch (notificationError) {
          // The like stays saved even if the notification fails.
          console.error("Like saved, but notification failed:", notificationError);
        }
      }
    } catch (error) {
      console.error("Could not update like:", error);
      alert("Could not update your like.");
    } finally {
      setSavingLike(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();

    if (!commentText.trim() || sendingComment) return;

    setSendingComment(true);

    try {
      await onAddComment(commentText.trim());
      setCommentText("");
    } catch (error) {
      console.error("Could not save comment:", error);
      alert("Could not save your comment.");
    } finally {
      setSendingComment(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();

    if (!replyText.trim() || !replyingTo || sendingReply) {
      return;
    }

    setSendingReply(true);

    try {
      await onAddComment(
        replyText.trim(),
        replyingTo
      );

      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Could not save reply:", error);
      alert("Could not save your reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const mainComments = comments.filter(
    (comment) => !comment.parentId
  );

  const getReplies = (commentId) =>
    comments.filter(
      (comment) => comment.parentId === commentId
    );

  const sharePost = async () => {
    const text =
      `${userName}: ${post.text || "Shared a post"}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MorChorConnect post",
          text,
        });
        setNotice("Post shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice("Post copied to clipboard");
      } else {
        setNotice("Sharing is unavailable in this browser");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setNotice("Could not share this post.");
      }
    }
  };

  return (
    <article className="mc-post-card">
      <div className="mc-post-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
        >
          <button
            type="button"
            className="mc-author-avatar"
            onClick={openAuthorProfile}
            disabled={!post.authorId}
            aria-label={`View ${userName}'s profile`}
          >
            <img
              src={authorAvatar}
              alt={`${userName}'s profile`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = defaultProfile;
              }}
            />
          </button>

          <div>
            <button
              type="button"
              className="mc-author-name"
              onClick={openAuthorProfile}
              disabled={!post.authorId}
            >
              {userName}
            </button>

            {(Array.isArray(post.taggedUserIds) && post.taggedUserIds.length > 0
              ? post.taggedUserIds.some((uid) => taggedProfiles[uid])
              : Boolean(post.taggedPerson)) && (
              <span className="mc-post-tag">
                {" "}is with {Array.isArray(post.taggedUserIds) &&
                post.taggedUserIds.length > 0
                  ? post.taggedUserIds.map((uid) => taggedProfiles[uid] ||
                    (uid === post.taggedUserId ? post.taggedPerson : null) ||
                    "CMU Student").join(", ")
                  : post.taggedPerson}
              </span>
            )}

            {post.feeling && (
              <span className="mc-post-detail">
                {" "}— feeling {post.feeling}
              </span>
            )}

            <div className="mc-post-meta">
              {post.timestamp || post.time || "just now"}
              {" · "}
              {post.privacy || "public"}
            </div>
          </div>
        </div>

        <div className="mc-post-user-actions">
        {isOwnPost ? (
              <button
                type="button"
                className="mc-delete"
                onClick={onDelete}
                aria-label="Delete post"
              >
                ✕
              </button>
            ) : (
              <button
                type="button"
                className="mc-follow"
                onClick={handleFollowClick}
                disabled={followSaving}
              >
                {followSaving
                  ? "Saving..."
                  : followingAuthor
                    ? "✓ Following"
                    : "+ Follow"}
              </button>
            )}
        </div>
      </div>

      {post.text && (
        <p className="mc-post-text">{post.text}</p>
      )}

      <PostGallery images={images} />

      <div className="mc-post-stats">
        <span>{likesCount} likes</span>

        <button
          type="button"
          onClick={() =>
            setCommentsOpen((open) => !open)
          }
        >
          {comments.length} comments
        </button>
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

        <button
          type="button"
          onClick={() =>
            setCommentsOpen((open) => !open)
          }
        >
          ▢ Comment
        </button>

        <button
          type="button"
          onClick={sharePost}
        >
          ↗ Share
        </button>
      </div>

      {notice && (
        <div className="mc-post-notice" role="status">
          {notice}
        </div>
      )}

      {commentsOpen && (
        <div className="mc-comments">
          {mainComments.map((comment) => (
            <div
              key={comment.id}
              style={{
                marginBottom: 16,
                background: focusCommentId === comment.id ? "#f3edff" : undefined,
                borderRadius: 8,
              }}
            >
              <div className="mc-comment">
                <strong>
                  {comment.name || "User"}
                </strong>
                : {comment.text}
              </div>

              <button
                type="button"
                onClick={() => {
                  setReplyingTo(
                    replyingTo === comment.id
                      ? null
                      : comment.id
                  );
                  setReplyText("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b46c1",
                  cursor: "pointer",
                  fontSize: 12,
                  marginLeft: 12,
                  marginTop: 5,
                }}
              >
                Reply
              </button>

              <div
                style={{
                  marginLeft: 28,
                  borderLeft: "2px solid #e5e7eb",
                  paddingLeft: 12,
                  marginTop: 8,
                }}
              >
                {getReplies(comment.id).map((reply) => (
                  <div
                    className="mc-comment"
                    key={reply.id}
                    style={{
                      marginBottom: 8,
                      background: focusCommentId === reply.id ? "#f3edff" : undefined,
                      borderRadius: 8,
                    }}
                  >
                    <strong>
                      {reply.name || "User"}
                    </strong>
                    : {reply.text}
                  </div>
                ))}

                {replyingTo === comment.id && (
                  <form
                    className="mc-comment-form"
                    onSubmit={submitReply}
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
                      disabled={
                        !replyText.trim() ||
                        sendingReply
                      }
                    >
                      {sendingReply
                        ? "Sending..."
                        : "Reply"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}

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
              disabled={
                !commentText.trim() ||
                sendingComment
              }
            >
              {sendingComment ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
