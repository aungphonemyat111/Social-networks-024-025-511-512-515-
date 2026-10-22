import React, { useState } from "react";
import {
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
  const [attachedFile, setAttachedFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
  
    if (!post.trim()) {
      alert("Please write a post before submitting.");
      return;
    }
  
    if (attachedFile) {
      alert("Photo and video uploads are not available yet. Please create a text-only post for now.");
      return;
    }
  
    if (audience === "friends") {
      alert("Friends only posts are not supported yet. Please select Public or Only Me.");
      return;
    }
  
    setSaving(true);
  
    try {
      await onAddPost({
        text: post.trim(),
        privacy: audience,
        taggedPerson: taggedPerson || null,
        feeling: feeling || null,
      });
  
      setPost("");
      setTaggedPerson("");
      setFeeling("");
      setAttachedFile(null);
  
      // App.jsx navigates to Home Feed after saving.
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Could not save your post. Please try again.");
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

              {attachedFile && (
                <div style={{ position: "relative", width: "100%", maxWidth: "500px", maxHeight: "320px", borderRadius: "14px", overflow: "hidden", border: "1px solid #e1dbff", marginLeft: "68px" }}>
                  <img 
                    src={URL.createObjectURL(attachedFile)} 
                    alt="Upload Preview" 
                    style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setAttachedFile(null)}
                    style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(17, 0, 102, 0.75)", color: "white", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="post-options">
             <label className="post-option">
              <FaImage className="image" />
              <span>Photo/Video</span>
              <input type="file" accept="image/*, video/*" style={{display: "none"}}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if(file){
                          setAttachedFile(file);
                          console.log("Selected file:", file);
                        }
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
                      setAttachedFile(null); 
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
