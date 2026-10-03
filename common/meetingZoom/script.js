// Adapted from the uploaded meetingZoom/script.js (JitsiMeetExternalAPI).
// The room comes from the approved helpdesk record, not a shared hardcoded name.
'use strict';
const API = 'http://127.0.0.1:3000';
const joinButton = document.getElementById('joinMeeting');
const notice = document.getElementById('meetingNotice');
const meet = document.getElementById('meet');
let session;
try { session = JSON.parse(localStorage.getItem('loggedUser') || 'null'); } catch { session = null; }
let currentMeeting = null;
let jitsi = null;
let jitsiScript = null;

function showNotice(message, error = false) {
  notice.textContent = message;
  notice.classList.toggle('is-error', error);
}

async function readMeeting() {
  const requestId = new URLSearchParams(location.search).get('request');
  if (!requestId) throw new Error('Open this page using the meeting link in Helpdesk.');
  const response = await fetch(`${API}/helpdeskRequests/${encodeURIComponent(requestId)}`);
  if (!response.ok) throw new Error('This meeting could not be loaded. Check that the API is running.');
  const ticket = await response.json();
  const ownsMeeting = String(ticket.employeeId) === String(session.id || session.employeeId);
  if (session.role !== 'HR' && !ownsMeeting) throw new Error('This meeting belongs to another employee.');
  if (!['Approved', 'Confirmed'].includes(ticket.status)) {
    throw new Error('This meeting is not approved. Check Helpdesk for its latest status or reschedule proposal.');
  }
  if (!HelpdeskMeetings.isZoomDemo(ticket) || ticket.meetingProvider !== 'Jitsi' ||
      !/^TeamSpaceHR-[A-Za-z0-9_-]+$/.test(ticket.meetingRoom || '')) {
    throw new Error('This request does not have an approved Jitsi demo room yet. Ask HR to set up the meeting.');
  }
  return ticket;
}

function loadJitsiScript() {
  if (typeof JitsiMeetExternalAPI === 'function') return Promise.resolve();
  if (jitsiScript) return jitsiScript;
  jitsiScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    const timeout = setTimeout(() => { script.remove(); reject(new Error('Jitsi took too long to load. Try again or use Open in Jitsi.')); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Jitsi could not load. Check your internet connection or use Open in Jitsi.')); };
    document.head.appendChild(script);
  }).catch(error => { jitsiScript = null; throw error; });
  return jitsiScript;
}

async function initialise() {
  if (!session || !['HR', 'EMP'].includes(session.role)) {
    location.replace('../login/login.html');
    return;
  }
  document.getElementById('backLink').href = session.role === 'HR'
    ? '../../hr/helpdesk/helpdesk.html' : '../../employee/helpDesk/helpDesk.html';
  try {
    currentMeeting = await readMeeting();
    document.getElementById('meetingTitle').textContent = currentMeeting.subject || 'Helpdesk meeting';
    document.getElementById('meetingSchedule').textContent = `${currentMeeting.date || 'Date not set'} · ${currentMeeting.timeFrom || currentMeeting.time || '—'}${currentMeeting.timeTo ? ` – ${currentMeeting.timeTo}` : ''}`;
    const externalLink = document.getElementById('externalMeeting');
    externalLink.href = `https://meet.jit.si/${currentMeeting.meetingRoom}`;
    externalLink.hidden = false;
    joinButton.hidden = false;
    showNotice('HR and the employee join the same room. The first participant may need to sign in to Jitsi to start it; the other participant can wait for the host.');
  } catch (error) { showNotice(error.message, true); }
}

joinButton.addEventListener('click', async () => {
  joinButton.disabled = true;
  showNotice('Opening your meeting…');
  try {
    // Check again in case HR rescheduled or rejected it after this page opened.
    currentMeeting = await readMeeting();
    await loadJitsiScript();
    meet.hidden = false;
    jitsi = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: currentMeeting.meetingRoom,
      width: '100%', height: '100%', parentNode: meet,
      userInfo: { displayName: session.name || 'Connectra participant' },
      configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true }
    });
    joinButton.hidden = true;
    showNotice('Meeting opened. Allow microphone and camera access when you want to speak or share video.');
    jitsi.addListener('readyToClose', () => {
      jitsi.dispose();
      jitsi = null;
      meet.hidden = true;
      joinButton.hidden = false;
      showNotice('You left the meeting. You can join again or return to Helpdesk.');
    });
  } catch (error) { showNotice(error.message, true); }
  finally { joinButton.disabled = false; }
});
window.addEventListener('pagehide', () => { if (jitsi) jitsi.dispose(); });
initialise();
