
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  FaImage,
  FaUsers,
  FaSmile,
  FaGlobeAmericas,
  FaUserFriends,
  FaUserLock,
  FaTimes,
  FaSearch,
} from "react-icons/fa";

import { db } from "../firebase";
import profileImg from "../assets/profile.png";
import "./CreatePost.css";

const feelingOptions = [
  "Happy",
  "Funny",
  "Sad",
  "Loved",
  "Angry",
  "Excited",
  "Tired",
  "Thankful",
];

function getStudentName(student) {
  return (
    student.fullName ||
    student.displayName ||
    student.nickname ||
    "CMU Student"
  );
}

const MAX_PEOPLE_PER_TYPE = 20;

function CreatePost({ onAddPost, onNavigate }) {
  const [post, setPost] = useState("");
  const [audience, setAudience] = useState("private");
  const [taggedStudents, setTaggedStudents] = useState([]);
  const [mentionedStudents, setMentionedStudents] = useState([]);
  const [feeling, setFeeling] = useState("");

  const [attachedFiles, setAttachedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [saving, setSaving] = useState(false);

  const [notice, setNotice] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [feelingsOpen, setFeelingsOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    const urls = attachedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachedFiles]);

  const showError = (message) => {
    setNotice(message);
  };

  const removePhoto = (indexToRemove) => {
    if (saving) return;

    setAttachedFiles((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  };

  const handlePhotoChange = (event) => {
    if (saving) return;

    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    setNotice("");

    if (attachedFiles.length + selected.length > 5) {
      showError("You can upload a maximum of 5 photos.");
      return;
    }

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    for (const file of selected) {
      if (!validTypes.includes(file.type)) {
        showError("Please choose JPG, PNG, or WebP photos.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showError("Each photo must be smaller than 5 MB.");
        return;
      }
    }

    setAttachedFiles((previous) => [
      ...previous,
      ...selected,
    ]);
  };

  // Load real student accounts from Firestore.
  const openPeoplePicker = async () => {
    if (saving) return;

    if (peopleOpen) {
      setPeopleOpen(false);
      return;
    }

    setPeopleOpen(true);
    setFeelingsOpen(false);
    setNotice("");

    if (students.length > 0 || peopleLoading) return;

    setPeopleLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, "users")
      );

      const actualStudents = snapshot.docs.map((userDoc) => ({
        uid: userDoc.id,
        ...userDoc.data(),
      }));

      actualStudents.sort((a, b) =>
        getStudentName(a).localeCompare(getStudentName(b))
      );

      setStudents(actualStudents);
    } catch (error) {
      console.error("Could not load students:", error);
      showError(
        "Could not load student accounts. Please try again."
      );
    } finally {
      setPeopleLoading(false);
    }
  };

  const filteredStudents = students
    .filter((student) => {
      const search = studentSearch.trim().toLowerCase();

      const name = getStudentName(student).toLowerCase();
      const nickname = (
        student.nickname || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        nickname.includes(search)
      );
    })
    .slice(0, 8);

  // Select multiple students. A student can be tagged OR mentioned,
  // not both, so they receive only one notification per post.
  const selectStudent = (student, addMention = false) => {
    if (saving) return;

    const target = addMention ? mentionedStudents : taggedStudents;
    if (target.some((person) => person.uid === student.uid)) {
      showError(
        addMention
          ? "This student is already mentioned."
          : "This student is already tagged."
      );
      return;
    }

    if (target.length >= MAX_PEOPLE_PER_TYPE) {
      showError(
        `You can ${addMention ? "mention" : "tag"} up to ${MAX_PEOPLE_PER_TYPE} people per post.`
      );
      return;
    }

    if (addMention) {
      setMentionedStudents((previous) => [...previous, student]);
      setTaggedStudents((previous) =>
        previous.filter((person) => person.uid !== student.uid)
      );

      const mentionName = (
        student.nickname || getStudentName(student)
      ).trim().replace(/\s+/g, "");
      const mention = `@${mentionName}`;

      setPost((previous) =>
        previous.includes(mention)
          ? previous
          : `${previous}${previous && !/\s$/.test(previous) ? " " : ""}${mention} `
      );
    } else {
      setTaggedStudents((previous) => [...previous, student]);
      setMentionedStudents((previous) =>
        previous.filter((person) => person.uid !== student.uid)
      );
    }

    // Keep the picker open so another person can be selected.
    setStudentSearch("");
    setNotice("");
  };

  const renderAudienceIcon = () => {
    switch (audience) {
      case "public":
        return <FaGlobeAmericas />;
      case "friends":
        return <FaUserFriends />;
      default:
        return <FaUserLock />;
    }
  };

  const resetDraft = () => {
    setPost("");
    setAudience("private");
    setTaggedStudents([]);
    setMentionedStudents([]);
    setFeeling("");
    setAttachedFiles([]);
    setNotice("");
    setPeopleOpen(false);
    setFeelingsOpen(false);
  };

  const handlePostSubmit = async () => {
    if (saving) return;

    setNotice("");

    if (!post.trim() && attachedFiles.length === 0) {
      showError("Please write something or choose a photo.");
      return;
    }

    if (audience === "friends") {
      showError(
        "Friends-only posts are coming soon. Please choose Public or Only Me."
      );
      return;
    }

    if (attachedFiles.length > 0 && audience !== "public") {
      showError(
        "Photo posts currently require Public privacy."
      );
      return;
    }

    setSaving(true);

    try {
      // The array fields will be saved by the upgraded postService.
      // Legacy fields are sent temporarily for compatibility with the
      // current single-recipient App.jsx until the next integration step.
      const firstPerson = taggedStudents[0] || mentionedStudents[0] || null;
      const firstType = taggedStudents.length > 0 ? "tag" : "mention";

      await onAddPost({
        text: post.trim(),
        privacy: audience,
        taggedUserIds: taggedStudents.map((student) => student.uid),
        mentionedUserIds: mentionedStudents.map((student) => student.uid),
        taggedPerson: firstPerson ? getStudentName(firstPerson) : null,
        taggedUserId: firstPerson?.uid || null,
        tagType: firstPerson ? firstType : null,
        feeling: feeling || null,
        attachedFiles,
      });

      resetDraft();
    } catch (error) {
      console.error("Error creating post:", error);
      showError(error.message || "Could not create your post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (saving) return;

    const hasDraft =
      post.trim() ||
      attachedFiles.length > 0 ||
      taggedStudents.length > 0 ||
      mentionedStudents.length > 0 ||
      feeling;

    if (hasDraft) {
      setDiscardOpen(true);
    } else {
      onNavigate?.("home");
    }
  };

  const confirmDiscard = () => {
    resetDraft();
    setDiscardOpen(false);
    onNavigate?.("home");
  };

  return (
    <div className="create-post-page">
      <div className="mc-create-post-layout">
        <div className="mc-create-post-content">
          <section className="mc-create-post-form">
            <div className="mc-create-post-heading">
              <h2>Create a Post</h2>

              {(taggedStudents.length > 0 ||
                mentionedStudents.length > 0 || feeling) && (
                <div className="mc-create-post-details">
                  {taggedStudents.map((student) => (
                    <span key={`tag-${student.uid}`} className="mc-create-post-tagged">
                      With {getStudentName(student)}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setTaggedStudents((previous) =>
                          previous.filter((person) => person.uid !== student.uid)
                        )}
                        aria-label={`Remove tag for ${getStudentName(student)}`}
                      >
                        <FaTimes />
                      </button>
                    </span>
                  ))}

                  {mentionedStudents.map((student) => (
                    <span key={`mention-${student.uid}`} className="mc-create-post-tagged">
                      Mentioned @{(student.nickname || getStudentName(student)).replace(/\s+/g, "")}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setMentionedStudents((previous) =>
                          previous.filter((person) => person.uid !== student.uid)
                        )}
                        aria-label={`Remove mention for ${getStudentName(student)}`}
                      >
                        <FaTimes />
                      </button>
                    </span>
                  ))}

                  {feeling && (
                    <span className="mc-create-post-feeling">
                      Feeling {feeling}
                      <button
                        type="button"
                        onClick={() => setFeeling("")}
                        aria-label="Remove feeling"
                      >
                        <FaTimes />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Inline notification instead of alert() */}
            {notice && (
              <div
                className="mc-create-post-notice"
                role="alert"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss message"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            <div className="mc-create-post-input">
              <div className="mc-create-post-avatar">
                <img src={profileImg} alt="Your profile" />
              </div>

              <textarea
                placeholder="What's on your mind?"
                value={post}
                onChange={(event) => setPost(event.target.value)}
                disabled={saving}
                maxLength={5000}
                aria-label="Write your post"
              />
            </div>

            {previewUrls.length > 0 && (
              <div className="mc-create-post-previews">
                <p className="mc-create-post-photo-count">
                  {attachedFiles.length} of 5 photos selected
                </p>

                <div className="mc-create-post-photo-grid">
                  {previewUrls.map((url, index) => (
                    <div
                      key={url}
                      className="mc-create-post-photo-item"
                    >
                      <img
                        src={url}
                        alt={`Selected photo ${index + 1}`}
                        className="mc-create-post-preview-img"
                      />

                      <button
                        type="button"
                        className="mc-create-post-remove-photo"
                        disabled={saving}
                        onClick={() => removePhoto(index)}
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mc-create-post-options">
              <label
                className={`mc-create-post-option ${
                  saving ? "mc-create-post-disabled" : ""
                }`}
              >
                <FaImage className="mc-create-post-image-icon" />
                <span>Photo</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={saving}
                  onChange={handlePhotoChange}
                  className="mc-create-post-file-input"
                />
              </label>

              <button
                type="button"
                className="mc-create-post-option"
                onClick={openPeoplePicker}
                disabled={saving}
              >
                <FaUsers className="mc-create-post-tag-icon" />
                <span>Tag People</span>
              </button>

              <button
                type="button"
                className="mc-create-post-option"
                onClick={() => {
                  setFeelingsOpen((previous) => !previous);
                  setPeopleOpen(false);
                }}
                disabled={saving}
              >
                <FaSmile className="mc-create-post-feeling-icon" />
                <span>Feelings</span>
              </button>
            </div>

            {/* Search real CMU students */}
            {peopleOpen && (
              <div className="mc-create-post-picker">
                <div className="mc-create-post-picker-heading">
                  <strong>Tag or mention students (up to 20 each)</strong>
                  <button
                    type="button"
                    onClick={() => setPeopleOpen(false)}
                    aria-label="Close student search"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="mc-create-post-student-search">
                  <FaSearch />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search name or nickname..."
                    value={studentSearch}
                    onChange={(event) =>
                      setStudentSearch(event.target.value)
                    }
                  />
                </div>

                <div className="mc-create-post-student-list">
                  {peopleLoading ? (
                    <p className="mc-create-post-picker-empty">
                      Loading students...
                    </p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="mc-create-post-picker-empty">
                      No matching students found.
                    </p>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.uid}
                        className="mc-create-post-student-row"
                      >
                        <img
                          src={student.photoURL || profileImg}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = profileImg;
                          }}
                        />

                        <div className="mc-create-post-student-info">
                          <strong>
                            {getStudentName(student)}
                          </strong>

                          {student.nickname && (
                            <small>
                              {student.nickname}
                            </small>
                          )}
                        </div>

                        <div className="mc-create-post-student-actions">
                          <button
                            type="button"
                            disabled={saving || taggedStudents.some((person) => person.uid === student.uid)}
                            onClick={() => selectStudent(student)}
                          >
                            {taggedStudents.some((person) => person.uid === student.uid)
                              ? "Tagged"
                              : "Tag"}
                          </button>

                          <button
                            type="button"
                            disabled={saving || mentionedStudents.some((person) => person.uid === student.uid)}
                            onClick={() => selectStudent(student, true)}
                          >
                            {mentionedStudents.some((person) => person.uid === student.uid)
                              ? "Mentioned"
                              : "@ Mention"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Feeling picker instead of prompt() */}
            {feelingsOpen && (
              <div className="mc-create-post-picker">
                <div className="mc-create-post-picker-heading">
                  <strong>How are you feeling?</strong>
                  <button
                    type="button"
                    onClick={() => setFeelingsOpen(false)}
                    aria-label="Close feelings"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="mc-create-post-feeling-choices">
                  {feelingOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => {
                        setFeeling(option);
                        setFeelingsOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mc-create-post-footer">
              <div className="mc-create-post-privacy">
                <label htmlFor="mc-post-audience">
                  Who can see this?
                </label>

                <div className="mc-create-post-select-wrap">
                  <span className="mc-create-post-audience-icon">
                    {renderAudienceIcon()}
                  </span>

                  <select
                    id="mc-post-audience"
                    value={audience}
                    onChange={(event) =>
                      setAudience(event.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="public">Public</option>
                    <option value="friends">
                      Friends only (coming soon)
                    </option>
                    <option value="private">Only Me</option>
                  </select>
                </div>
              </div>

              <div className="mc-create-post-actions">
                <button
                  type="button"
                  className="mc-create-post-discard"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  Discard
                </button>

                <button
                  type="button"
                  className="mc-create-post-submit"
                  onClick={handlePostSubmit}
                  disabled={saving}
                >
                  {saving ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Discard confirmation instead of confirm() */}
      {discardOpen && (
        <div className="mc-create-post-dialog-backdrop">
          <div
            className="mc-create-post-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mc-discard-title"
            aria-describedby="mc-discard-description"
          >
            <h3 id="mc-discard-title">
              Discard this post?
            </h3>

            <p id="mc-discard-description">
              Your draft, photos, tags, and mentions will be removed.
            </p>

            <div className="mc-create-post-dialog-actions">
              <button
                type="button"
                onClick={() => setDiscardOpen(false)}
              >
                Keep editing
              </button>

              <button
                type="button"
                className="mc-create-post-danger"
                onClick={confirmDiscard}
              >
                Discard post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatePost;
