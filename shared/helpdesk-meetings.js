// helpdesk-meetings.js - small helper functions for helpdesk meetings (Zoom demo and Google Meet).
// The HR and employee helpdesk screens and the workspace screen use them.
// A page reads them like this:  window.HelpdeskMeetings.canApprove(ticket)
//
// The project tests (api/database.test.js) also load this file, so keep its function names.

var HelpdeskMeetings = {
  // The address of this script. joinLink() uses it to find the meeting screen,
  // so it still works when the Live Server port or the project folder changes.
  scriptUrl: typeof document !== "undefined" && document.currentScript ? document.currentScript.src : null,

  // Is this meeting a Zoom demo (the demo room is made with Jitsi)?
  isZoomDemo: function (ticket) {
    return ticket.type === "meeting" && (ticket.platform || ticket.channel) === "Zoom";
  },

  // Can the meeting still be moved to another time?
  canReschedule: function (ticket) {
    const statuses = ["Pending", "In Review", "Approved", "Confirmed", "Reschedule Requested"];
    return ticket.type === "meeting" && statuses.includes(ticket.status);
  },

  // Can HR approve it now?
  canApprove: function (ticket) {
    const waiting = ["Pending", "In Review"].includes(ticket.status);
    // The employee proposed a new time and HR has not answered yet.
    const employeeProposedTime = ticket.status === "Reschedule Requested" &&
      (!ticket.rescheduleRequest || ticket.rescheduleRequest.proposedBy !== "HR");
    // An approved Zoom demo that still has no room.
    const needsRoom = HelpdeskMeetings.isZoomDemo(ticket) && ["Approved", "Confirmed"].includes(ticket.status) &&
      !ticket.meetingRoom && !ticket.meetingLink;
    return waiting || employeeProposedTime || needsRoom;
  },

  // The text shown for the meeting platform.
  platformLabel: function (ticket) {
    if (HelpdeskMeetings.isZoomDemo(ticket)) {
      return "Zoom (Jitsi demo)";
    }
    return ticket.platform || ticket.channel || "—";
  },

  // Turns "02:30 PM" or "14:30" into "14:30". Returns "" when the time is not valid.
  normaliseTime: function (value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) {
      return "";
    }
    let hour = Number(match[1]);
    const period = match[3];
    if (Number(match[2]) > 59 || hour > 23) {
      return "";
    }
    if (period) {
      if (hour < 1 || hour > 12) {
        return "";
      }
      hour = (hour % 12) + (period.toUpperCase() === "PM" ? 12 : 0);
    }
    return String(hour).padStart(2, "0") + ":" + match[2];
  },

  // The meeting room fields for a Zoom demo. An existing valid room is kept.
  roomPatch: function (ticket) {
    if (!HelpdeskMeetings.isZoomDemo(ticket)) {
      return {};
    }
    let room = "TeamSpaceHR-" + crypto.randomUUID();
    if (ticket.meetingProvider === "Jitsi" && /^[A-Za-z0-9_-]+$/.test(ticket.meetingRoom || "")) {
      room = ticket.meetingRoom;
    }
    return { meetingProvider: "Jitsi", meetingRoom: room, meetingLink: "https://meet.jit.si/" + room };
  },

  // The changes to save when HR approves a meeting request.
  approvalPatch: function (ticket, hrReply, googleMeetLink) {
    if (!HelpdeskMeetings.canApprove(ticket)) {
      throw new Error("This request is no longer awaiting approval. Refresh the page.");
    }
    const patch = { status: "Approved", hrReply: hrReply || null, rescheduleRequest: null };

    // HR accepts the new time that the employee proposed.
    if (ticket.status === "Reschedule Requested" && ticket.rescheduleRequest) {
      patch.date = ticket.rescheduleRequest.date;
      patch.timeFrom = ticket.rescheduleRequest.timeFrom;
      patch.timeTo = ticket.rescheduleRequest.timeTo;
    }

    if (HelpdeskMeetings.isZoomDemo(ticket)) {
      const room = HelpdeskMeetings.roomPatch(ticket);
      patch.meetingProvider = room.meetingProvider;
      patch.meetingRoom = room.meetingRoom;
      patch.meetingLink = room.meetingLink;
    } else if (ticket.type === "meeting" && (ticket.platform || ticket.channel) === "Google Meet") {
      let link = null;
      try {
        link = new URL(googleMeetLink);
      } catch (error) {
        link = null;
      }
      if (link === null || link.protocol !== "https:" || link.hostname !== "meet.google.com") {
        throw new Error("Enter a valid Google Meet link (https://meet.google.com/...).");
      }
      patch.meetingLink = link.href;
    }
    return patch;
  },

  // The address to open for "Join meeting" (or null when there is none).
  joinLink: function (ticket) {
    const isDemoRoom = HelpdeskMeetings.isZoomDemo(ticket) && ticket.meetingProvider === "Jitsi" && ticket.meetingRoom;
    if (isDemoRoom && HelpdeskMeetings.scriptUrl) {
      const meetingPage = new URL("../common/meetingZoom/index.html", HelpdeskMeetings.scriptUrl);
      return meetingPage.href + "?request=" + encodeURIComponent(ticket.id);
    }
    try {
      const url = new URL(ticket.meetingLink);
      return url.protocol === "https:" ? url.href : null;
    } catch (error) {
      return null;
    }
  }
};

// The browser uses window.HelpdeskMeetings. The tests (Node) use module.exports.
if (typeof module !== "undefined" && module.exports) {
  module.exports = HelpdeskMeetings;
} else {
  window.HelpdeskMeetings = HelpdeskMeetings;
}
