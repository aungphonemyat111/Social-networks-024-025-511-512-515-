import Messaging from "./Messaging";

export default function App() {
  return (
    // Fills the whole browser window so the chat has a height to work with
    <div style={{ position: "fixed", inset: 0 }}>
      <Messaging />
    </div>
  );
}