// The uploaded meetingZoom example uses Jitsi. Only the Zoom demo option uses it.
(function () {
  'use strict';
  const scriptUrl = typeof document !== 'undefined' ? document.currentScript?.src : null;
  const approvedStatuses = ['Approved', 'Confirmed'];

  function isZoomDemo(ticket) {
    return ticket.type === 'meeting' && (ticket.platform || ticket.channel) === 'Zoom';
  }

  function canReschedule(ticket) {
    return ticket.type === 'meeting' &&
      ['Pending', 'In Review', 'Approved', 'Confirmed', 'Reschedule Requested'].includes(ticket.status);
  }

  function canApprove(ticket) {
    return ['Pending', 'In Review'].includes(ticket.status) ||
      (ticket.status === 'Reschedule Requested' && ticket.rescheduleRequest?.proposedBy !== 'HR') ||
      (isZoomDemo(ticket) && approvedStatuses.includes(ticket.status) && !ticket.meetingRoom && !ticket.meetingLink);
  }

  function platformLabel(ticket) {
    return isZoomDemo(ticket) ? 'Zoom (Jitsi demo)' : (ticket.platform || ticket.channel || '—');
  }

  function normaliseTime(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return '';
    let hour = Number(match[1]);
    if (Number(match[2]) > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return '';
    if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return `${String(hour).padStart(2, '0')}:${match[2]}`;
  }

  function roomPatch(ticket) {
    if (!isZoomDemo(ticket)) return {};
    const room = ticket.meetingProvider === 'Jitsi' && /^[A-Za-z0-9_-]+$/.test(ticket.meetingRoom || '')
      ? ticket.meetingRoom : `TeamSpaceHR-${crypto.randomUUID()}`;
    return { meetingProvider: 'Jitsi', meetingRoom: room, meetingLink: `https://meet.jit.si/${room}` };
  }

  function approvalPatch(ticket, hrReply, googleMeetLink = '') {
    if (!canApprove(ticket)) throw new Error('This request is no longer awaiting approval. Refresh the page.');
    const patch = { status: 'Approved', hrReply: hrReply || null, rescheduleRequest: null };
    // Accept an employee counter-proposal when HR approves it.
    if (ticket.status === 'Reschedule Requested' && ticket.rescheduleRequest) {
      const proposed = ticket.rescheduleRequest;
      patch.date = proposed.date;
      patch.timeFrom = proposed.timeFrom;
      patch.timeTo = proposed.timeTo;
    }
    if (isZoomDemo(ticket)) {
      Object.assign(patch, roomPatch(ticket));
    } else if (ticket.type === 'meeting' && (ticket.platform || ticket.channel) === 'Google Meet') {
      let link;
      try { link = new URL(googleMeetLink); } catch { /* Show the same clear validation error below. */ }
      if (!link || link.protocol !== 'https:' || link.hostname !== 'meet.google.com') {
        throw new Error('Enter a valid Google Meet link (https://meet.google.com/...).');
      }
      patch.meetingLink = link.href;
    }
    return patch;
  }

  function joinLink(ticket) {
    if (isZoomDemo(ticket) && ticket.meetingProvider === 'Jitsi' && ticket.meetingRoom && scriptUrl) {
      // Resolve from the shared file so Live Server ports and deployment folders can change.
      const url = new URL('../common/meetingZoom/index.html', scriptUrl);
      url.searchParams.set('request', ticket.id);
      return url.href;
    }
    try {
      const url = new URL(ticket.meetingLink);
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }

  const helpers = { isZoomDemo, canReschedule, canApprove, platformLabel, normaliseTime, roomPatch, approvalPatch, joinLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  else window.HelpdeskMeetings = helpers;
})();
