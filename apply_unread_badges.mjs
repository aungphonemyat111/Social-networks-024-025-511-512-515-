// One-time React/Node integration helper. NOT needed in the deployed website.
// Run from the Project repository root: node apply_unread_badges.mjs
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'Frontend', 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('Could not find Frontend/src/App.jsx. Run this from the Project repository root.');
  process.exit(1);
}
let app = fs.readFileSync(file, 'utf8');

function replaceRequired(before, after, label) {
  if (!app.includes(before)) throw new Error(`Could not locate ${label} in App.jsx; no changes were saved.`);
  app = app.replace(before, after);
}

if (!app.includes('subscribeToUnreadMessageCounts')) {
  replaceRequired(
    'import Messaging from "./Messaging";',
    'import Messaging from "./Messaging";\nimport { subscribeToUnreadMessageCounts } from "./services/messagingService";',
    'Messaging import'
  );
}
if (!app.includes('const [unreadByChat, setUnreadByChat]')) {
  replaceRequired(
    '  const [messageRecipientId, setMessageRecipientId] = useState(null);',
    '  const [messageRecipientId, setMessageRecipientId] = useState(null);\n  const [unreadByChat, setUnreadByChat] = useState({});',
    'messageRecipientId state'
  );
}
if (!app.includes('const unreadMessageTotal =')) {
  replaceRequired(
    '  // Posts stay synchronized with Firestore.',
    `  // Unread messages are independent of the notification bell and page.\n  useEffect(() => {\n    if (!user?.uid) {\n      setUnreadByChat({});\n      return;\n    }\n    return subscribeToUnreadMessageCounts(\n      user.uid,\n      setUnreadByChat,\n      (error) => console.error('Could not load unread message counts:', error)\n    );\n  }, [user?.uid]);\n\n  const unreadMessageTotal = Object.values(unreadByChat).reduce(\n    (total, count) => total + count, 0\n  );\n\n  // Posts stay synchronized with Firestore.`,
    'posts subscription marker'
  );
}
if (!app.includes('unreadByChat={unreadByChat}')) {
  const re = /<Messaging\b[\s\S]*?\/>/g;
  const matches = [...app.matchAll(re)];
  if (matches.length !== 1) throw new Error('Could not locate exactly one Messaging component; no changes saved.');
  const old = matches[0][0];
  app = app.replace(old, old.replace('/>', 'unreadByChat={unreadByChat}\n            />'));
}
if (!app.includes('className="mc-message-unread-count"')) {
  const buttonRE = /<button\s+type="button"\s+className="mc-messages-trigger"[\s\S]*?<\/button>/;
  if (!buttonRE.test(app)) throw new Error('Could not find header Messages button; no changes saved.');
  app = app.replace(buttonRE, `<button
            type="button"
            className="mc-messages-trigger"
            onClick={() => navigate("message")}
            aria-label={unreadMessageTotal > 0
              ? \`Open Messages, \${unreadMessageTotal} unread\`
              : "Open Messages"}
            title="Messages"
            style={{ position: "relative" }}
          >
            <FaRegCommentDots />
            {unreadMessageTotal > 0 && (
              <span
                className="mc-message-unread-count"
                aria-hidden="true"
                style={{
                  position: "absolute", top: -6, right: -7,
                  minWidth: 18, height: 18, padding: "0 4px",
                  borderRadius: 999, background: "#dc2626", color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 2px #fff",
                }}
              >
                {unreadMessageTotal > 99 ? "99+" : unreadMessageTotal}
              </span>
            )}
          </button>`);
}
fs.writeFileSync(file, app);
console.log('SUCCESS: App.jsx now shows an unread Messages badge and passes unread counts to the chat list.');
console.log('Next: update Firebase chat rules, npm run build, then test with two accounts.');
