# Helpdesk meeting demo

This adapts the uploaded `meetingZoom` example, which uses **Jitsi**, not the Zoom API. The employee option is labelled **Zoom (Jitsi demo)** and still stores `platform: "Zoom"` so older requests work. Google Meet keeps its existing manual-link approval flow.

1. Run `npm run api` and open the website through Live Server.
2. Employee: choose Meeting, then Zoom (Jitsi demo), fill in the date/time and submit.
3. HR Helpdesk: approve it. The API saves `status: "Approved"`, `meetingProvider: "Jitsi"`, a unique `meetingRoom`, and its public `meetingLink` in `api/db.json`.
4. HR: open the ticket's eye icon, then **Open meeting**. Employee: open Helpdesk and click **Join** in the meeting card or ticket details.
5. Both open this page with `?request=<ticket id>`. It reads the same saved room and embeds the uploaded example's `JitsiMeetExternalAPI` when **Join meeting** is clicked.

Approval saves a room name/link; Jitsi starts the actual conference when someone joins. The first participant may need to sign in to Jitsi to create the room. See [Jitsi's meeting guide](https://jitsi.github.io/handbook/docs/user-guide/user-guide-start-a-jitsi-meeting/). A real call needs internet access and two participants. Use **Open in Jitsi** if the iframe cannot load.

For an already-approved Zoom request without a room, HR sees a **Set up meeting** camera button. It saves a room without creating a second request.

HR can reschedule pending, approved, confirmed, or reschedule-requested meetings. The employee can accept HR's proposal or counter-propose; HR can approve the employee's counter-proposal. The saved room stays the same across reschedules. Rejected requests do not show Reschedule.

The page checks login, ownership (or HR role), and approval before opening. These are UI checks in the existing educational json-server setup, not server-side authorization. This integration needs no new npm packages or changes to the API command.
