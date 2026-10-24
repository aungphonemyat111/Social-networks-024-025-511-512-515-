
import React from "react";
import {
  FaHome,
  FaPlusCircle,
  FaUser,
  FaBell,
  FaEnvelope,
} from "react-icons/fa";

export default function SidebarNav({
  currentTab,
  currentUserId,
  onNavigate,
  onOpenProfile,
}) {
  const menuItems = [
    {
      id: "home",
      label: "Home",
      icon: <FaHome />,
    },
    {
      id: "create",
      label: "Create Post",
      icon: <FaPlusCircle />,
    },
    {
      id: "profile",
      label: "Profile",
      icon: <FaUser />,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <FaBell />,
    },
    {
      id: "message",
      label: "Messages",
      icon: <FaEnvelope />,
    },
  ];

  const handleNavigation = (tab) => {
    if (tab === "profile") {
      onOpenProfile(currentUserId);
    } else {
      onNavigate(tab);
    }
  };

  return (
    <aside className="sidebar mc-shared-sidebar">
      <ul>
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={
              currentTab === item.id ? "active" : ""
            }
          >
            <button
              type="button"
              className="mc-sidebar-link"
              onClick={() => handleNavigation(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
