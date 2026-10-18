import React, { useState } from "react";
import HomeFeed from "./components/HomeFeed";
import CreatePost from "./components/CreatePost";

<<<<<<< HEAD
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
=======
function PostCard({
  post,
  isLiked,
  isFollowing,
  commentsAreOpen,
  commentText,
  onLike,
  onDelete,
  onShare,
  onToggleComments,
  onCommentTextChange,
  onAddComment,
  onToggleFriend,
}) {
  return (
    <article className="post-card card">
      <div className="post-head">
        <div className="avatar">{post.name === 'Your Name' ? 'N' : post.name[0]}</div>
        <div className="post-author">
          <strong>{post.name}</strong>
          <span>{post.time}</span>
        </div>

        {post.name === 'Your Name' ? (
          <button className="more-button" onClick={onDelete} aria-label="Delete post">
            Delete
          </button>
        ) : (
          <button
            className={isFollowing ? 'friend-button added' : 'friend-button'}
            onClick={onToggleFriend}
          >
            {isFollowing ? 'Added ✓' : 'Add friend'}
          </button>
        )}
      </div>

      <p className="post-text">{post.text}</p>

      <div className="post-stats">
        <span>{post.likes} likes</span>
        <button onClick={onToggleComments}>
          {post.comments.length} comments
        </button>
      </div>

      <div className="post-actions">
        <button className={isLiked ? 'action liked' : 'action'} onClick={onLike}>
          {isLiked ? '♥' : '♡'} Like
        </button>
        <button className="action" onClick={onToggleComments}>
          ▢ Comment
        </button>
        <button className="action" onClick={onShare}>
          ↗ Share
        </button>
      </div>

      {commentsAreOpen && (
        <div className="comments-area">
          {post.comments.map((comment, index) => (
            <div className="comment" key={`${post.id}-${index}`}>
              <span className="avatar avatar-tiny">{comment.name[0]}</span>
              <p>
                <strong>{comment.name}</strong>
                <br />
                {comment.text}
              </p>
            </div>
          ))}

          <form className="comment-form" onSubmit={onAddComment}>
            <span className="avatar avatar-tiny">N</span>
            <input
              aria-label="Write a comment"
              placeholder="Write a comment..."
              value={commentText}
              onChange={onCommentTextChange}
            />
            <button type="submit" aria-label="Send comment">
              ➤
            </button>
          </form>
        </div>
      )}
    </article>
  )
}

function SocialFeed() {
  const [posts, setPosts] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [commentTexts, setCommentTexts] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [likedPosts, setLikedPosts] = useState({})
  const [friends, setFriends] = useState({})
  const [notice, setNotice] = useState('')

  function addPost(event) {
    event.preventDefault()

    const text = newPostText.trim()
    if (!text) return

    const newPost = {
      id: Date.now(),
      name: 'Your Name',
      time: 'just now',
      text,
      likes: 0,
      comments: [],
    }

    setPosts([newPost, ...posts])
    setNewPostText('')
  }

  function toggleLike(postId) {
    const wasLiked = likedPosts[postId] || false

    setLikedPosts({ ...likedPosts, [postId]: !wasLiked })
    setPosts(
      posts.map((item) =>
        item.id === postId
          ? { ...item, likes: item.likes + (wasLiked ? -1 : 1) }
          : item,
      ),
    )
  }

  function toggleComments(postId) {
    setOpenComments({
      ...openComments,
      [postId]: !openComments[postId],
    })
  }

  function addComment(event, postId) {
    event.preventDefault()
    const text = (commentTexts[postId] || '').trim()
    if (!text) return

    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, { name: 'Your Name', text }],
            }
          : post,
      ),
    )
    setCommentTexts({ ...commentTexts, [postId]: '' })
  }

  async function sharePost(post) {
    const text = `${post.name}: ${post.text}`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'MorChorConnect post', text })
        setNotice('Post shared')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setNotice('Post copied to clipboard')
      } else {
        setNotice('Sharing is unavailable in this browser')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setNotice('Could not share this post')
      }
    }

    window.setTimeout(() => setNotice(''), 2200)
  }

  function toggleFriend(name) {
    setFriends({ ...friends, [name]: !friends[name] })
  }

  return (
    <main className="social-page">
      <header className="page-heading">
        <p className="eyebrow">MORCHORCONNECT | CMU STUDENTS ONLY</p>
        <h1>Social Feed</h1>
      </header>

      <div className="social-layout">
        <section className="feed-column" aria-label="Social feed">
          <form className="composer card" onSubmit={addPost}>
            <div className="avatar">N</div>
            <div className="composer-main">
              <textarea
                aria-label="What's on your mind?"
                placeholder="What's on your mind?"
                value={newPostText}
                onChange={(event) => setNewPostText(event.target.value)}
                rows="2"
              />
              <div className="composer-footer">
                <span className="composer-hint">Share something with your community</span>
                <button className="primary-button" disabled={!newPostText.trim()}>
                  Post
                </button>
              </div>
            </div>
          </form>

          {notice && <div className="toast" role="status">{notice}</div>}

          {posts.length === 0 && (
            <div className="empty-feed card">
              <span className="empty-feed-icon">♡</span>
              <h2>Your feed starts here</h2>
              <p>Show your post</p>
            </div>
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLiked={likedPosts[post.id] || false}
              isFollowing={friends[post.name] || false}
              commentsAreOpen={openComments[post.id] || false}
              commentText={commentTexts[post.id] || ''}
              onLike={() => toggleLike(post.id)}
              onDelete={() => setPosts(posts.filter((item) => item.id !== post.id))}
              onShare={() => sharePost(post)}
              onToggleComments={() => toggleComments(post.id)}
              onCommentTextChange={(event) =>
                setCommentTexts({ ...commentTexts, [post.id]: event.target.value })
              }
              onAddComment={(event) => addComment(event, post.id)}
              onToggleFriend={() => toggleFriend(post.name)}
            />
          ))}
        </section>

        <aside className="right-column">
          <section className="card friends-card">
            <h2>Add friends</h2>
            <p>Add your friends</p>
          </section>
        </aside>
      </div>
    </main>
  )
}

// Keep the original Vite starter available for future work.
export function StarterTemplate() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>

        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>

        <button
          type="button"
          className="counter"
          onClick={() => setCount((value) => value + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <a href="https://vite.dev/" target="_blank" rel="noreferrer">
            Explore Vite
          </a>
          <a href="https://react.dev/" target="_blank" rel="noreferrer">
            Learn more
          </a>
        </div>
        <div id="social">
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
>>>>>>> origin/august
    </>
  );
}

<<<<<<< HEAD
export default App;
=======
export default function App() {
  return <SocialFeed />
}
>>>>>>> origin/august
