#!/usr/bin/env python3
"""Patch existing MorChorConnect App.jsx and StudentProfile.jsx without replacing unrelated code.
Run from the repository root after extracting this ZIP there, or execute this file from its directory.
"""
from pathlib import Path
import re
import sys

here = Path(__file__).resolve().parent

# A user may extract to Project/, or into Frontend/ itself.
candidates = [here / 'Frontend' / 'src', here / 'src', Path.cwd() / 'Frontend' / 'src', Path.cwd() / 'src']
src = next((p for p in candidates if (p / 'App.jsx').is_file() and (p / 'pages' / 'StudentProfile.jsx').is_file()), None)
if src is None:
    sys.exit('ERROR: Could not locate Frontend/src/App.jsx and Frontend/src/pages/StudentProfile.jsx. Extract the ZIP at the Project repository root and rerun.')

app_path = src / 'App.jsx'
profile_path = src / 'pages' / 'StudentProfile.jsx'
app = app_path.read_text()
profile = profile_path.read_text()


def insist(cond, message):
    if not cond:
        sys.exit('ERROR: ' + message + ' Nothing was changed; check that you have the expected App.jsx/StudentProfile.jsx versions.')

# App.jsx: add component import and destination-user state.
if 'import Messaging from "./Messaging";' not in app:
    anchor = 'import StudentProfile from "./pages/StudentProfile";'
    insist(anchor in app, 'Cannot find StudentProfile import in App.jsx.')
    app = app.replace(anchor, anchor + '\nimport Messaging from "./Messaging";', 1)
if 'const [messageRecipientId, setMessageRecipientId]' not in app:
    anchor = 'const [currentTab, setCurrentTab] = useState("home");'
    insist(anchor in app, 'Cannot find currentTab state.')
    app = app.replace(anchor, anchor + '\n  const [messageRecipientId, setMessageRecipientId] = useState(null);', 1)
if 'setMessageRecipientId(null);' not in app:
    pat = r'(const navigate\s*=\s*\(tab\)\s*=>\s*\{)'
    insist(re.search(pat, app), 'Cannot find navigate(tab) function.')
    app = re.sub(pat, r'\1\n    setMessageRecipientId(null);', app, count=1)
if 'const openMessage = ' not in app:
    anchor = '  const openPost = '
    insist(anchor in app, 'Cannot find openPost handler in App.jsx.')
    fn = '''  const openMessage = (recipientId) => {
    if (!recipientId || recipientId === user?.uid) return;
    setMessageRecipientId(recipientId);
    setCurrentTab("message");
    setAccountMenuOpen(false);
  };

'''
    app = app.replace(anchor, fn + anchor, 1)

# Wire StudentProfile -> App -> Messaging.
profile_component = re.search(r'<StudentProfile\b[\s\S]*?\s*/>', app)
insist(profile_component, 'Cannot locate the StudentProfile JSX element.')
if 'onMessage=' not in profile_component.group():
    original = profile_component.group()
    updated = original.replace('onOpenProfile={openProfile}', 'onOpenProfile={openProfile}\n              onMessage={openMessage}', 1)
    insist(original != updated, 'Cannot locate onOpenProfile on StudentProfile.')
    app = app.replace(original, updated, 1)

# Render the Messaging page if missing, or attach the recipient prop if already present.
matches = list(re.finditer(r'<Messaging\b[\s\S]*?\s*/>', app))
if matches:
    insist(len(matches) == 1, 'Found multiple Messaging components; patch manually.')
    match = matches[0]
    tag = match.group()
    if 'initialRecipientId=' not in tag:
        app = app[:match.start()] + tag.replace('/>', 'initialRecipientId={messageRecipientId}\n              />', 1) + app[match.end():]
else:
    anchor = '          {currentTab === "notifications" && ('
    insist(anchor in app, 'Cannot find Notifications section for Messaging insert.')
    app = app.replace(anchor, '''          {currentTab === "message" && (
            <Messaging
              userId={user.uid}
              userName={displayName}
              initialRecipientId={messageRecipientId}
            />
          )}

''' + anchor, 1)

# Prevent the Coming Soon block from displaying on the new route.
exclusion = re.search(r'\{!\[([\s\S]*?)\]\.includes\(currentTab\)', app)
insist(exclusion, 'Cannot find Coming Soon exclusion list.')
if '"message"' not in exclusion.group(1):
    new = exclusion.group().replace('"notifications",', '"notifications",\n            "message",')
    insist(new != exclusion.group(), 'Cannot insert message into Coming Soon exclusion list.')
    app = app[:exclusion.start()] + new + app[exclusion.end():]

# StudentProfile.jsx: add a callback and button only on OTHER students' profiles.
start = re.search(r'export\s+default\s+function\s+StudentProfile\s*\(\{([\s\S]*?)\}\)', profile)
insist(start, 'Cannot find StudentProfile prop declaration.')
if 'onMessage' not in start.group(1):
    original = start.group()
    updated = original.replace('onOpenProfile,', 'onOpenProfile,\n  onMessage,', 1)
    insist(original != updated, 'Cannot locate onOpenProfile prop in StudentProfile.')
    profile = profile.replace(original, updated, 1)
if 'onMessage?.(profileUserId)' not in profile:
    follow = re.search(r'\{!isOwner\s*&&\s*\(\s*<button\b[\s\S]*?handleFollowClick[\s\S]*?</button>\s*\)\}', profile)
    insist(follow, 'Cannot find Follow button on other student profiles.')
    insert = '''

            {!isOwner && (
              <button
                type="button"
                className="mc-profile-follow mc-profile-message"
                onClick={() => onMessage?.(profileUserId)}
                disabled={!onMessage}
                title="Send a direct message"
              >
                ✉ Message
              </button>
            )}'''
    profile = profile[:follow.end()] + insert + profile[follow.end():]

# The ZIP ships real Messaging files. Use those (not the Asai demo component).
source_msg = here / 'Frontend' / 'src' / 'Messaging.jsx'
source_service = here / 'Frontend' / 'src' / 'services' / 'messagingService.js'
insist(source_msg.is_file() and source_service.is_file(), 'Missing files from ZIP extraction.')
msg = source_msg.read_text()
service = source_service.read_text()
insist('subscribeToStudentContacts' in msg and 'subscribeToStudentContacts' in service,
       'Messaging files in ZIP are not the real-user versions.')

# Changes are validated before any writes to prevent partial updates.
app_path.write_text(app)
profile_path.write_text(profile)
(src / 'Messaging.jsx').write_text(msg)
(src / 'services').mkdir(exist_ok=True)
(src / 'services' / 'messagingService.js').write_text(service)
print('SUCCESS: Updated App.jsx, StudentProfile.jsx, Messaging.jsx, messagingService.js')
print('Existing post, follow and notification logic has been preserved.')
print('Next: publish the supplied chat rules if not already published, then npm run build.')
