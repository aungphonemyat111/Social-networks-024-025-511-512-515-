import React, { useEffect, useState } from "react";import {
  FaHome,
  FaUser,
  FaPlusCircle,
  FaEnvelope,
  FaUsers,
  FaSearch,
  FaImage,
  FaSmile,
  FaGlobeAmericas,
  FaUserFriends,
  FaUserLock,
} from "react-icons/fa";

import profileImg from "../assets/profile.png";
import "./CreatePost.css";

function CreatePost({ onAddPost, onNavigate }) {
  const [post, setPost] = useState("");
  const [audience, setAudience] = useState("private");
  const [taggedPerson, setTaggedPerson] = useState("");
  const [feeling, setFeeling] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [saving, setSaving] = useState(false);


useEffect(() => {
  const urls = attachedFiles.map((file) =>
    URL.createObjectURL(file)
  );

  setPreviewUrls(urls);

  return () => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  };
}, [attachedFiles]);

const removePhoto = (indexToRemove) => {
  if (saving) return;

  setAttachedFiles((previous) =>
    previous.filter((_, index) => index !== indexToRemove)
  );
};


  const renderAudienceIcon = () => {
    switch (audience) {
      case "public":
        return <FaGlobeAmericas className="globe-icon" />;
      case "friends":
        return <FaUserFriends className="friends-icon" />;
      case "private":
      default:
        return <FaUserLock className="lock-icon" />;
    }
  };


  

  const handlePostSubmit = async () => {
    if (saving) return;
  
    if (!post.trim() && attachedFiles.length === 0) {
      alert("Please write a post or choose a photo.");
      return;
    }
  
    if (audience === "friends") {
      alert("Friends only posts are not supported yet.");
      return;
    }
  
    if (attachedFiles.length > 0 && audience !== "public") {
      alert("Please select Public for photo posts.");
      return;
    }
  
    setSaving(true);
  
    try {
      await onAddPost({
        text: post.trim(),
        privacy: audience,
        taggedPerson: taggedPerson || null,
        feeling: feeling || null,
        attachedFiles,
      });
  
      setPost("");
      setTaggedPerson("");
      setFeeling("");
      setAttachedFiles([]);
  
      // App.jsx navigates to Home Feed after saving.
    } catch (error) {
      console.error("Error creating post:", error);
      alert(error.message || "Could not create your post.");
    } finally {
      setSaving(false);
    }
  };
  

  
  return (
    <div className="create-post-page">
      
      <div className="layout">
        <div className="sidebar">
          <div className="logo">
            <FaUsers />
            <span>MORCHORCONNECT</span>
          </div>

          <ul>
            <li onClick={() => onNavigate && onNavigate("home")}>
              <FaHome />
              <span>Home</span>
            </li>
            <li className="active">
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

        <div className="content">
          <div className="navbar">
            <div className="search-bar">
              <FaSearch />
              <input type="text" placeholder="Search posts, people, or events..." />
            </div>

            <div className="nav-right">
              <div className="avator-small">
                <img src={profileImg} alt="User Profile" onClick={() => onNavigate && onNavigate("profile")}/>
              </div>
            </div>
          </div>

          <div className="create-post-form">
            <h2>Create a Post
              {taggedPerson && <span style={{ color: "#5123d6", fontSize: "16px" }}> with {taggedPerson}</span>}
              {feeling && <span style={{ color: "#6b7280", fontSize: "16px" }}> — feeling {feeling}</span>}
            </h2>
            
            <div className="post-input" style={{ display: "flex", flexDirection: "column", width: "100%", gap: "15px" }}>
              <div style={{ display: "flex", gap: "20px", width: "100%", alignItems: "flex-start" }}>
                <div className="avator-main">
                  <img src={profileImg} alt="User Profile" />
                </div>
                <textarea 
                  placeholder="What's on your mind?"
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                />
              </div>

              
            {attachedFiles.length > 0 && (
              <div style={{ width: "100%", marginTop: "12px" }}>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  {attachedFiles.length} of 5 photos selected
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  {previewUrls.map((url, index) => (
                    <div
                      key={url}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "10px",
                        background: "#f1eef7",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Selected photo ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "160px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removePhoto(index)}
                        aria-label={`Remove photo ${index + 1}`}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>

            <div className="post-options">
             <label className="post-option">
              <FaImage className="image" />
              <span>Photo</span>


              <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={saving}
              style={{ display: "none" }}
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);

                if (attachedFiles.length + selected.length > 5) {
                  alert("You can select a maximum of 5 photos.");
                  event.target.value = "";
                  return;
                }

                const validTypes = [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                ];

                for (const file of selected) {
                  if (!validTypes.includes(file.type)) {
                    alert("Only JPG, PNG, and WebP photos are supported.");
                    event.target.value = "";
                    return;
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    alert("Each photo must be smaller than 5 MB.");
                    event.target.value = "";
                    return;
                  }
                }

                setAttachedFiles((previous) => [...previous, ...selected]);

                event.target.value = "";
              }}
              />

             </label>

             <label
                className="post-option"
                onClick={() => {
                  const person = prompt("Enter the name of the person that you want to tag:");
                  if(person){
                    setTaggedPerson(person);
                  }
                }}
              >
                <FaUsers className="tag" />
                <span>Tag people</span>
              </label>

              <label
                className="post-option"
                onClick={() => {
                  const userFeeling = prompt("How are you feeling? (Happy, Funny, Sad, Loved or Angry)");
                  if(userFeeling){
                    setFeeling(userFeeling);
                  }
                }}
              >
                <FaSmile className="feelings" />
                <span>Feelings</span>
              </label>
            </div>

            <div className="privacy-options">
              <div className="privacy-left">
                <label>Who can see this?</label>
                <div className="select-icons">
                  {renderAudienceIcon()}
                  <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                    <option value="public">Public</option>
                    <option value="friends">Friends only</option>
                    <option value="private">Only Me</option>
                  </select>
                </div>
              </div>
             
              <div className="action-buttons">
                <button 
                  type="button" 
                  className="discard-button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to discard this post?")) {
                      setPost(""); 
                      setTaggedPerson(""); 
                      setFeeling("");      
                      setAttachedFiles([]); 
                      if (onNavigate) {
                        onNavigate("home");
                      }
                    }
                  }}
                >
                  Discard
                </button>
                <button className="post-button"  onClick={handlePostSubmit} disabled={saving}>  {saving ? "Posting..." : "Post"}</button>


              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
