
import React, { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { uploadPostImage } from "../services/imageService";
import PostCard from "../components/PostCard";
import defaultProfile from "../assets/profile.png";
import "./StudentProfile.css";

export default function StudentProfile({
  currentUser,
  profileUserId,
  posts = [],
  onBack,
  onOpenProfile,
  onDeletePost,
  onAddComment,
}) {
  const isOwner = currentUser.uid === profileUserId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    nickname: "",
    faculty: "",
    major: "",
    bio: "",
  });

  // Load the selected student's profile.
  useEffect(() => {
    setLoading(true);
    setEditing(false);
    setPhotoFile(null);

    const unsubscribe = onSnapshot(
      doc(db, "users", profileUserId),
      (snapshot) => {
        const data = snapshot.exists()
          ? snapshot.data()
          : null;

        setProfile(data);

        setForm({
          nickname: data?.nickname || "",
          faculty: data?.faculty || "",
          major: data?.major || "",
          bio: data?.bio || "",
        });

        setLoading(false);
      },
      (error) => {
        console.error("Could not load profile:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profileUserId]);

  // Preview a new profile picture before saving.
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Posts belonging to the profile owner.
  // Other students only see public posts.
  const studentPosts = posts.filter(
    (post) =>
      post.authorId === profileUserId &&
      (isOwner || post.privacy === "public")
  );

  // Original real name: never use nickname as its replacement.
  const postAuthorName = posts.find(
    (post) => post.authorId === profileUserId
  )?.userName;

  const registeredName =
    profile?.fullName ||
    profile?.displayName ||
    profile?.realName ||
    profile?.name ||
    (isOwner ? currentUser.displayName : null) ||
    postAuthorName ||
    "CMU Student";

  const nickname = (profile?.nickname || "").trim();

  const showNickname =
    nickname &&
    nickname.toLowerCase() !==
      registeredName.trim().toLowerCase();

  const avatar =
    photoPreview ||
    profile?.photoURL ||
    (isOwner ? currentUser.photoURL : null) ||
    defaultProfile;

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!isOwner || saving) return;

    const nicknameValue = form.nickname.trim();
    const faculty = form.faculty.trim();
    const major = form.major.trim();
    const bio = form.bio.trim();

    if (nicknameValue.length > 40) {
      alert("Nickname must be 40 characters or fewer.");
      return;
    }

    if (faculty.length > 100 || major.length > 100) {
      alert("Faculty and major must be under 100 characters.");
      return;
    }

    if (bio.length > 150) {
      alert("Bio must be 150 characters or fewer.");
      return;
    }

    setSaving(true);

    try {
      let photoURL = profile?.photoURL || null;

      if (photoFile) {
        photoURL = await uploadPostImage(photoFile);
      }

      const updates = {
        nickname: nicknameValue,
        faculty,
        major,
        bio,
        photoURL,
        updatedAt: serverTimestamp(),
      };

      // If no real name was saved in Firestore yet,
      // preserve the registered name separately.
      if (
        !profile?.fullName &&
        registeredName !== "CMU Student"
      ) {
        updates.fullName = registeredName;
      }

      await setDoc(
        doc(db, "users", currentUser.uid),
        updates,
        { merge: true }
      );

      setPhotoFile(null);
      setEditing(false);
    } catch (error) {
      console.error("Could not save profile:", error);
      alert(error.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mc-student-profile">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mc-student-profile">
      <button
        type="button"
        className="mc-profile-back"
        onClick={onBack}
      >
        ← Back to Home
      </button>

      {/* Student information */}
      <section className="mc-profile-card">
        <div
          className="mc-profile-cover"
          style={
            profile?.coverURL
              ? {
                  backgroundImage: `url("${profile.coverURL}")`,
                }
              : undefined
          }
        />

        <div className="mc-profile-body">
          <div className="mc-profile-intro">
            <img
              src={avatar}
              className="mc-profile-avatar"
              alt={`${registeredName}'s profile`}
            />

            <div className="mc-profile-heading">
              <h1>
                {registeredName}

                {showNickname && (
                  <span className="mc-profile-nickname">
                    ({nickname})
                  </span>
                )}
              </h1>

              <p>
                {[profile?.faculty, profile?.major]
                    .filter(Boolean)
                    .join(" | ") || "Chiang Mai University"}
             </p>
            </div>

            {isOwner && (
              <button
                type="button"
                className="mc-profile-edit"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            )}
          </div>

          {!editing && (
            <>

            <p className="mc-profile-bio">
                {profile?.bio || "No bio added yet."}
                </p>

                {isOwner && currentUser.email && (
                <div className="mc-profile-email">
                    <span className="mc-profile-email-label">
                    CMU Email
                    </span>
                    <span>{currentUser.email}</span>
                </div>
                )}

                <div className="mc-profile-details">


                <span>
                  <strong>{studentPosts.length}</strong>
                  {" "}Posts
                </span>

                <span>
                  CMU student community
                </span>
              </div>
            </>
          )}

          {/* Edit your own profile */}
          {isOwner && editing && (
            <form
              className="mc-profile-form"
              onSubmit={handleSave}
            >
              <label>
                Registered name
                <input
                  type="text"
                  value={registeredName}
                  disabled
                />
                <small>
                  Your nickname will appear beside this name.
                </small>
              </label>

              <label>
                Profile picture
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(event) => {
                    setPhotoFile(
                      event.target.files?.[0] || null
                    );
                  }}
                />
              </label>

              <label>
                Nickname
                <input
                  type="text"
                  value={form.nickname}
                  maxLength={40}
                  placeholder="e.g. AK"
                  onChange={(event) =>
                    updateField("nickname", event.target.value)
                  }
                />
              </label>

              <label>
                Faculty
                <input
                  type="text"
                  value={form.faculty}
                  maxLength={100}
                  placeholder="e.g. Faculty of Engineering"
                  onChange={(event) =>
                    updateField("faculty", event.target.value)
                  }
                />
              </label>

              <label>
                Major
                <input
                  type="text"
                  value={form.major}
                  maxLength={100}
                  placeholder="e.g. Computer Engineering"
                  onChange={(event) =>
                    updateField("major", event.target.value)
                  }
                />
              </label>

              <label>
                Bio
                <textarea
                  value={form.bio}
                  rows={3}
                  maxLength={150}
                  placeholder="Tell other CMU students about yourself..."
                  onChange={(event) =>
                    updateField("bio", event.target.value)
                  }
                />
                <small>{form.bio.length}/150</small>
              </label>

              <button
                type="submit"
                className="mc-profile-save"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Full posts, just like Home Feed */}
      <section className="mc-profile-posts">
        <div className="mc-profile-posts-heading">
          <h2>
            {isOwner ? "My Posts" : `${registeredName}'s Posts`}
          </h2>

          <span>
            {studentPosts.length} posts
          </span>
        </div>

        {studentPosts.length === 0 ? (
          <div className="mc-profile-empty">
            {isOwner
              ? "You haven't shared anything yet."
              : "No public posts to show."}
          </div>
        ) : (
          <div className="mc-profile-post-list">
            {studentPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser.uid}
                onOpenProfile={onOpenProfile}
                onDelete={() => onDeletePost(post.id)}
                onAddComment={(text, parentId) =>
                  onAddComment(post.id, text, parentId)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
