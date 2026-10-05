// Video meeting: HR and the employee join the same Jitsi room that HR approved in the helpdesk.
// The room name comes from the helpdesk request that is saved in the API.
const API = "http://127.0.0.1:3000";

const joinButton = document.getElementById("joinMeeting");
const notice = document.getElementById("meetingNotice");
const meet = document.getElementById("meet");
let jitsi = null; // the running meeting (null when nobody joined yet)

// Who is logged in?
let session = null;
try {
  session = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  session = null;
}

// Shows a message under the title. A red message is an error.
function showNotice(message, isError) {
  notice.textContent = message;
  notice.className = isError ? "meeting-notice is-error" : "meeting-notice";
}

// Shows why there is no meeting and gives back null.
function noMeeting(message) {
  showNotice(message, true);
  return null;
}

// ----- Read the meeting from the API -----
// Gives back the helpdesk request, or null (after showing the reason).
async function readMeeting() {
  // The link looks like index.html?request=5, so the id is after the "=".
  const requestId = location.search.split("=")[1];
  if (!requestId) {
    return noMeeting("Open this page using the meeting link in Helpdesk.");
  }

  const response = await fetch(`${API}/helpdeskRequests/${requestId}`);
  if (!response.ok) {
    return noMeeting("This meeting could not be loaded. Check that the API is running.");
  }
  const ticket = await response.json();

  // HR can open every meeting. An employee can only open their own meeting.
  const ownsMeeting = String(ticket.employeeId) === String(session.id || session.employeeId);
  if (session.role !== "HR" && !ownsMeeting) {
    return noMeeting("This meeting belongs to another employee.");
  }
  if (ticket.status !== "Approved" && ticket.status !== "Confirmed") {
    return noMeeting("This meeting is not approved. Check Helpdesk for its latest status or reschedule proposal.");
  }
  const hasRoom = /^TeamSpaceHR-[A-Za-z0-9_-]+$/.test(ticket.meetingRoom || "");
  if (!HelpdeskMeetings.isZoomDemo(ticket) || ticket.meetingProvider !== "Jitsi" || !hasRoom) {
    return noMeeting("This request does not have an approved Jitsi demo room yet. Ask HR to set up the meeting.");
  }
  return ticket;
}

// ----- Show the meeting details on the page -----
async function showMeeting() {
  if (session === null || (session.role !== "HR" && session.role !== "EMP")) {
    location.replace("../login/login.html");
    return;
  }
  document.getElementById("backLink").href = session.role === "HR" ? "../../hr/helpdesk/helpdesk.html" : "../../employee/helpDesk/helpDesk.html";

  try {
    const meeting = await readMeeting();
    if (meeting === null) {
      return;
    }
    const start = meeting.timeFrom || meeting.time || "—";
    const end = meeting.timeTo ? ` – ${meeting.timeTo}` : "";
    document.getElementById("meetingTitle").textContent = meeting.subject || "Helpdesk meeting";
    document.getElementById("meetingSchedule").textContent = `${meeting.date || "Date not set"} · ${start}${end}`;

    const externalLink = document.getElementById("externalMeeting");
    externalLink.href = `https://meet.jit.si/${meeting.meetingRoom}`;
    externalLink.hidden = false;
    joinButton.hidden = false;
    showNotice("HR and the employee join the same room. The first participant may need to sign in to Jitsi to start it; the other participant can wait for the host.");
  } catch (error) {
    showNotice(error.message, true);
  }
}

// ----- Load the Jitsi script from the internet -----
// A Promise is a "later result": resolve() says "the script is ready", reject() says "it failed".
function loadJitsiScript() {
  return new Promise(function (resolve, reject) {
    if (typeof JitsiMeetExternalAPI === "function") {
      resolve(); // it is already loaded
      return;
    }
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";

    // Give up after 15 seconds.
    const timer = setTimeout(function () {
      script.remove();
      reject(new Error("Jitsi took too long to load. Try again or use Open in Jitsi."));
    }, 15000);
    script.onload = function () {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = function () {
      clearTimeout(timer);
      script.remove();
      reject(new Error("Jitsi could not load. Check your internet connection or use Open in Jitsi."));
    };
    document.head.appendChild(script);
  });
}

// ----- The Join meeting button -----
joinButton.addEventListener("click", async function () {
  this.disabled = true; // "this" is the join button that was clicked
  showNotice("Opening your meeting…", false);

  try {
    // Check again in case HR rescheduled or rejected the meeting after this page opened.
    const meeting = await readMeeting();
    if (meeting !== null) {
      await loadJitsiScript();
      meet.hidden = false;
      jitsi = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.meetingRoom,
        width: "100%",
        height: "100%",
        parentNode: meet,
        userInfo: { displayName: session.name || "Connectra participant" },
        configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true }
      });
      joinButton.hidden = true;
      showNotice("Meeting opened. Allow microphone and camera access when you want to speak or share video.", false);

      // The person left the meeting.
      jitsi.addListener("readyToClose", function () {
        jitsi.dispose();
        jitsi = null;
        meet.hidden = true;
        joinButton.hidden = false;
        showNotice("You left the meeting. You can join again or return to Helpdesk.", false);
      });
    }
  } catch (error) {
    showNotice(error.message, true);
  }
  this.disabled = false;
});

// Close the meeting when the page closes.
window.addEventListener("pagehide", function () {
  if (jitsi) {
    jitsi.dispose();
  }
});

showMeeting();
