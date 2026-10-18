import { useEffect, useState } from 'react'
import './App.css'

const POSTS_KEY = 'morchor-social-posts-v2'
const FRIENDS_KEY = 'morchor-social-friends-v2'
const USER_KEY = 'morchor-social-user-v2'
const examplePosts = [
  { id: 'post-1', author: 'Your Name', owner: true, time: '2 hours ago', text: 'Beautiful day at CMU today! 💜', imageType: 'campus', likes: [], comments: [], shares: [] },
  { id: 'post-2', author: 'CMU Student', time: '5 hours ago', text: 'Looking for study buddies for midterms! Anyone interested in forming a group for ECON201? 🙌', likes: Array.from({ length: 12 }, (_, i) => `sample-${i}`), comments: [], shares: [] },
  { id: 'post-3', author: 'Another Student', time: '1 day ago', text: 'The library view never gets old ☀️💜', imageType: 'library', likes: [], comments: [], shares: [] },
]
const people = [
  { id: 'mali', name: 'Mali S.', handle: '@mali.student' },
  { id: 'narin', name: 'Narin K.', handle: '@narin.k' },
  { id: 'ploy', name: 'Ploy T.', handle: '@ploy.t' },
]

function readArray(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : fallback
  } catch { return fallback }
}

function getUser() {
  try {
    const saved = JSON.parse(localStorage.getItem(USER_KEY))
    if (saved?.id) return { id: saved.id, name: saved.name || 'Your Name' }
  } catch { /* Create a local demo identity. */ }
  const user = { id: crypto.randomUUID(), name: 'Your Name' }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

function Avatar({ name, small = false }) {
  return <span className={`avatar${small ? ' avatar-small' : ''}`} aria-label={`${name} avatar`}>{(name || '?').charAt(0).toUpperCase()}</span>
}

function App() {
  const [user, setUser] = useState(getUser)
  const [posts, setPosts] = useState(() => readArray(POSTS_KEY, examplePosts))
  const [friends, setFriends] = useState(() => readArray(FRIENDS_KEY))
  const [draft, setDraft] = useState('')
  const [photo, setPhoto] = useState('')
  const [openComments, setOpenComments] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)) }, [posts])
  useEffect(() => { localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends)) }, [friends])

  function createPost(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text && !photo) return
    setPosts((current) => [{
      id: crypto.randomUUID(), author: user.name, owner: true, ownerId: user.id, time: 'Just now',
      text, image: photo, likes: [], comments: [], shares: [],
    }, ...current])
    setDraft('')
    setPhoto('')
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_200_000) {
      setMessage('Choose an image smaller than 1.2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function toggleLike(postId) {
    setPosts((current) => current.map((post) => {
      if (post.id !== postId) return post
      const likes = post.likes || []
      const liked = likes.includes(user.id) || likes.includes('you')
      return { ...post, likes: liked ? likes.filter((id) => id !== user.id && id !== 'you') : [...likes, user.id] }
    }))
  }

  function addComment(event, postId) {
    event.preventDefault()
    const field = event.currentTarget.elements.comment
    const text = field.value.trim()
    if (!text) return
    setPosts((current) => current.map((post) => post.id === postId ? {
      ...post, comments: [...post.comments, { id: crypto.randomUUID(), author: user.name, ownerId: user.id, text }],
    } : post))
    field.value = ''
  }

  async function sharePost(post) {
    if ((post.shares || []).includes(user.id)) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, shares: item.shares.filter((id) => id !== user.id) } : item))
      return
    }
    try {
      const shareInfo = { title: `${post.author} · MorchorConnect`, text: post.text || 'A post from MorchorConnect' }
      if (navigator.share) await navigator.share(shareInfo)
      else await navigator.clipboard.writeText(`${shareInfo.title}\n${shareInfo.text}`)
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, shares: [...(item.shares || []), user.id] } : item))
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Could not share this post in this browser.')
    }
  }

  function toggleFriend(personId) {
    setFriends((current) => current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId])
  }

  function saveDisplayName(event) {
    const name = event.target.value.trim()
    if (!name || name === user.name) return
    const nextUser = { ...user, name }
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }

  return (
    <main className="social-page">
      <header className="social-header">
        <a className="wordmark" href="#feed"><span className="wordmark-icon">🐘</span><span>MORCHORCONNECT<small>CMU STUDENTS ONLY</small></span></a>
        <label className="name-field">Your name<input aria-label="Your display name" defaultValue={user.name} maxLength={35} onBlur={saveDisplayName} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
        <Avatar name={user.name}/>
      </header>

      <div className="social-content" id="feed">
        <section className="feed-column">
          <div className="section-title"><div><p>CMU STUDENTS ONLY</p><h1>Social Feed</h1></div><span className="feed-label">Posts & interactions</span></div>

          <form className="composer card" onSubmit={createPost}>
            <div className="composer-top"><Avatar name={user.name}/><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What's on your mind?" aria-label="Write a post" /></div>
            {photo && <div className="photo-preview"><img src={photo} alt="Post preview"/><button type="button" onClick={() => setPhoto('')}>Remove photo</button></div>}
            <div className="composer-actions"><label className="photo-action">▧ <span>Photo</span><input type="file" accept="image/*" onChange={choosePhoto}/></label><button type="submit" className="post-button">Post</button></div>
            {message && <p className="status-message" role="status">{message}<button type="button" onClick={() => setMessage('')}>×</button></p>}
          </form>

          <div className="post-list">{posts.map((post) => {
            const liked = post.likes.includes(user.id) || post.likes.includes('you')
            const shared = (post.shares || []).includes(user.id)
            const ownPost = post.owner === true || post.ownerId === user.id
            return <article className="post-card card" key={post.id}>
              <div className="post-header"><Avatar name={post.author === 'Your Name' ? user.name : post.author}/><div className="post-author"><strong>{post.author === 'Your Name' ? user.name : post.author}</strong><span>{post.time || 'Recently'}</span></div>
                {ownPost && <button className="delete-post" type="button" aria-label="Delete post" title="Delete post" onClick={() => setPosts((current) => current.filter((item) => item.id !== post.id))}>•••<span>Delete</span></button>}
              </div>
              {post.text && <p className="post-text">{post.text}</p>}
              {post.image && <img className="post-image" src={post.image} alt="Photo attached to post"/>}
              {!post.image && post.imageType && <div className={`post-image campus-art ${post.imageType}`} role="img" aria-label={post.imageType === 'campus' ? 'CMU campus in spring' : 'Library view'}><div className="blossoms blossom-left"/><div className="blossoms blossom-right"/><div className="building"><div className="building-roof"/><div className="building-columns"/><div className="building-door"/></div></div>}
              <div className="post-summary"><span><b>♥</b> {post.likes.length}</span><button type="button" onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}>{post.comments.length} comments</button></div>
              <div className="post-actions"><button className={liked ? 'active' : ''} type="button" onClick={() => toggleLike(post.id)}><span>♡</span>Like</button><button type="button" onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}><span>▢</span>Comment</button><button className={shared ? 'active' : ''} type="button" onClick={() => sharePost(post)}><span>↗</span>{shared ? 'Unshare' : 'Share'}</button></div>
              {(openComments[post.id] || post.comments.length > 0) && <div className="comments-area">
                {post.comments.map((comment, index) => <div className="comment-row" key={comment.id || `${comment.author}-${index}`}><Avatar small name={comment.author}/><div className="comment-bubble"><strong>{comment.author}</strong><span>{comment.text}</span></div>{(comment.ownerId === user.id || comment.author === user.name) && <button className="delete-comment" type="button" aria-label="Delete comment" onClick={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, comments: item.comments.filter((_, commentIndex) => commentIndex !== index) } : item))}>×</button>}</div>)}
                <form className="comment-form" onSubmit={(event) => addComment(event, post.id)}><Avatar small name={user.name}/><input name="comment" maxLength={300} placeholder="Write a comment..." aria-label="Write a comment"/><button type="submit" aria-label="Send comment">➤</button></form>
              </div>}
            </article>
          })}</div>
        </section>

        <aside className="friends-panel card">
          <div className="friends-heading"><div><p>COMMUNITY</p><h2>Add friends</h2></div><span>{people.length}</span></div>
          <p className="friends-description">Connect with other students. You can remove a sent request any time.</p>
          {people.map((person) => <div className="person-row" key={person.id}><Avatar small name={person.name}/><div className="person-info"><strong>{person.name}</strong><span>{person.handle}</span></div><button className={friends.includes(person.id) ? 'requested' : ''} type="button" onClick={() => toggleFriend(person.id)}>{friends.includes(person.id) ? 'Requested' : 'Add friend'}</button></div>)}
          <p className="local-note">Demo friend requests are saved in this browser.</p>
        </aside>
      </div>
    </main>
  )
}

export default App
