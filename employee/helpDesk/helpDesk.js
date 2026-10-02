// =========================================================
// API
// =========================================================

const API =
    "http://127.0.0.1:3000";



// =========================================================
// المستخدم الحالي
// =========================================================

let loggedEmployee =
    JSON.parse(
        localStorage.getItem("loggedUser") ||
        "null"
    );



// =========================================================
// Variables
// =========================================================

let helpdeskRequests = [];

let helpdeskDraft = null;

let selectedRequestType =
    "ticket";

let selectedAttachmentName =
    "";

let selectedMeetingId =
    "";



// =========================================================
// تاريخ الجهاز
// =========================================================

function getDeviceDate() {

    let today =
        new Date();


    let year =
        today.getFullYear();


    let month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    let day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}



// =========================================================
// حماية النص
// =========================================================

function escapeHtml(text) {

    let div =
        document.createElement("div");


    div.textContent =
        text || "";


    return div.innerHTML;

}



// =========================================================
// تشغيل الصفحة
// =========================================================

async function startEmployeeHelpdeskPage() {

    // نحدد أقل تاريخ للاجتماع.
    document
        .getElementById(
            "meeting-date-input"
        )
        .min =
        getDeviceDate();


    document
        .getElementById(
            "reschedule-date-input"
        )
        .min =
        getDeviceDate();


    // نتأكد أن Employee مسجل.
    if (
        !loggedEmployee ||
        loggedEmployee.role != "EMP"
    ) {

        showEmployeePageMessage(
            "Please sign in with an employee account first."
        );

        return;

    }


    // نحمل البيانات.
    await loadEmployeeHelpdeskData();

}



// =========================================================
// تحميل بيانات Employee
// =========================================================

async function loadEmployeeHelpdeskData() {

    try {

        let employeeId =
            loggedEmployee.id;


        let responses =
            await Promise.all([

                fetch(
                    API +
                    "/helpdeskRequests?employeeId=" +
                    employeeId
                ),

                fetch(
                    API +
                    "/helpdeskDrafts?employeeId=" +
                    employeeId
                )

            ]);


        if (
            !responses[0].ok ||
            !responses[1].ok
        ) {

            throw new Error(
                "Could not load data."
            );

        }


        helpdeskRequests =
            await responses[0].json();


        let drafts =
            await responses[1].json();


        helpdeskDraft =
            drafts[0] || null;


        sortRequestsNewestFirst();


        loadDraftIntoForm();


        showEmployeeStatistics();


        showMyRequests();


        showUpcomingMeeting();

    }

    catch (error) {

        console.log(error);


        showEmployeePageMessage(
            "Could not load Helpdesk data."
        );

    }

}



// =========================================================
// ترتيب الطلبات
// =========================================================

function sortRequestsNewestFirst() {

    helpdeskRequests.sort(
        function (first, second) {

            return (
                new Date(
                    second.createdAt
                ) -
                new Date(
                    first.createdAt
                )
            );

        }
    );

}



// =========================================================
// Standard Ticket
// =========================================================

function standardTicketButton() {

    selectedRequestType =
        "ticket";


    document
        .getElementById(
            "standard-ticket-button"
        )
        .classList
        .add(
            "selected-request-type"
        );


    document
        .getElementById(
            "meeting-request-button"
        )
        .classList
        .remove(
            "selected-request-type"
        );


    document
        .getElementById(
            "meeting-information-section"
        )
        .classList
        .add(
            "hide-element"
        );

}



// =========================================================
// Meeting
// =========================================================

function meetingRequestButton() {

    selectedRequestType =
        "meeting";


    document
        .getElementById(
            "meeting-request-button"
        )
        .classList
        .add(
            "selected-request-type"
        );


    document
        .getElementById(
            "standard-ticket-button"
        )
        .classList
        .remove(
            "selected-request-type"
        );


    document
        .getElementById(
            "meeting-information-section"
        )
        .classList
        .remove(
            "hide-element"
        );

}



// =========================================================
// Attachment
// =========================================================

function attachmentFileChanged() {

    let fileInput =
        document.getElementById(
            "attachment-file-input"
        );


    if (
        fileInput.files.length > 0
    ) {

        selectedAttachmentName =
            fileInput.files[0].name;


        document
            .getElementById(
                "attachment-file-name"
            )
            .textContent =
            selectedAttachmentName;

    }

    else {

        selectedAttachmentName =
            "";


        document
            .getElementById(
                "attachment-file-name"
            )
            .textContent =
            "No file selected";

    }

}



// =========================================================
// قراءة Form
// =========================================================

function readRequestForm() {

    return {

        category:
            document
                .getElementById(
                    "request-category-select"
                )
                .value,

        subject:
            document
                .getElementById(
                    "request-subject-input"
                )
                .value
                .trim(),

        details:
            document
                .getElementById(
                    "request-details-input"
                )
                .value
                .trim(),

        meetingDate:
            document
                .getElementById(
                    "meeting-date-input"
                )
                .value,

        startTime:
            document
                .getElementById(
                    "meeting-start-time-input"
                )
                .value,

        endTime:
            document
                .getElementById(
                    "meeting-end-time-input"
                )
                .value,

        channel:
            document
                .getElementById(
                    "meeting-channel-select"
                )
                .value

    };

}



// =========================================================
// Validation
// =========================================================

function validateRequestForm(
    formData
) {

    if (
        formData.subject == "" ||
        formData.details == ""
    ) {

        showEmployeePageMessage(
            "Please enter subject and details."
        );

        return false;

    }


    if (
        selectedRequestType ==
        "meeting"
    ) {

        if (
            formData.meetingDate == "" ||
            formData.startTime == "" ||
            formData.endTime == ""
        ) {

            showEmployeePageMessage(
                "Please complete meeting date and time."
            );

            return false;

        }


        if (
            formData.meetingDate <
            getDeviceDate()
        ) {

            showEmployeePageMessage(
                "Past dates are not allowed."
            );

            return false;

        }


        if (
            formData.endTime <=
            formData.startTime
        ) {

            showEmployeePageMessage(
                "End time must be after start time."
            );

            return false;

        }

    }


    return true;

}



// =========================================================
// Submit Request
// =========================================================

async function submitRequestButton() {

    let formData =
        readRequestForm();


    if (
        !validateRequestForm(
            formData
        )
    ) {

        return;

    }


    let request = {

        ticket:
            "TKT-" +
            Math.floor(
                1000 +
                Math.random() * 9000
            ),

        employeeId:
            loggedEmployee.id,

        employeeName:
            loggedEmployee.name,

        department:
            loggedEmployee.department ||
            loggedEmployee.position ||
            "",

        type:
            selectedRequestType,

        category:
            formData.category,

        subject:
            formData.subject,

        details:
            formData.details,

        attachmentName:
            selectedAttachmentName,

        createdBy:
            "Employee",

        date:
            getDeviceDate(),

        createdAt:
            new Date()
                .toISOString(),

        hrReply:
            ""

    };


    // إذا Meeting.
    if (
        selectedRequestType ==
        "meeting"
    ) {

        request.meetingDate =
            formData.meetingDate;


        request.startTime =
            formData.startTime;


        request.endTime =
            formData.endTime;


        request.channel =
            formData.channel;


        request.status =
            "Pending Meeting";

    }

    else {

        request.status =
            "In Review";

    }


    try {

        let response =
            await fetch(
                API +
                "/helpdeskRequests",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            request
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not save request."
            );

        }


        let savedRequest =
            await response.json();


        helpdeskRequests.unshift(
            savedRequest
        );


        await deleteSavedDraft();


        clearRequestForm();


        showEmployeeStatistics();


        showMyRequests();


        showUpcomingMeeting();


        showEmployeePageMessage(
            "Request sent to HR successfully."
        );

    }

    catch (error) {

        console.log(error);


        showEmployeePageMessage(
            "Could not send request."
        );

    }

}



// =========================================================
// Save Draft
// =========================================================

async function saveDraftButton() {

    let formData =
        readRequestForm();


    let draft = {

        employeeId:
            loggedEmployee.id,

        type:
            selectedRequestType,

        category:
            formData.category,

        subject:
            formData.subject,

        details:
            formData.details,

        attachmentName:
            selectedAttachmentName,

        meetingDate:
            formData.meetingDate,

        startTime:
            formData.startTime,

        endTime:
            formData.endTime,

        channel:
            formData.channel,

        updatedAt:
            new Date()
                .toISOString()

    };


    try {

        let url =
            API +
            "/helpdeskDrafts";


        let method =
            "POST";


        if (helpdeskDraft) {

            url +=
                "/" +
                helpdeskDraft.id;


            method =
                "PATCH";

        }


        let response =
            await fetch(
                url,
                {

                    method:
                        method,

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            draft
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not save draft."
            );

        }


        helpdeskDraft =
            await response.json();


        showEmployeePageMessage(
            "Draft saved."
        );

    }

    catch (error) {

        console.log(error);


        showEmployeePageMessage(
            "Could not save draft."
        );

    }

}



// =========================================================
// Load Draft
// =========================================================

function loadDraftIntoForm() {

    if (!helpdeskDraft) {

        return;

    }


    document
        .getElementById(
            "request-category-select"
        )
        .value =
        helpdeskDraft.category ||
        "General HR Support";


    document
        .getElementById(
            "request-subject-input"
        )
        .value =
        helpdeskDraft.subject ||
        "";


    document
        .getElementById(
            "request-details-input"
        )
        .value =
        helpdeskDraft.details ||
        "";


    if (
        helpdeskDraft.type ==
        "meeting"
    ) {

        meetingRequestButton();


        document
            .getElementById(
                "meeting-date-input"
            )
            .value =
            helpdeskDraft.meetingDate ||
            "";


        document
            .getElementById(
                "meeting-start-time-input"
            )
            .value =
            helpdeskDraft.startTime ||
            "";


        document
            .getElementById(
                "meeting-end-time-input"
            )
            .value =
            helpdeskDraft.endTime ||
            "";

    }

}



// =========================================================
// Delete Draft
// =========================================================

async function deleteSavedDraft() {

    if (!helpdeskDraft) {

        return;

    }


    try {

        await fetch(
            API +
            "/helpdeskDrafts/" +
            helpdeskDraft.id,
            {
                method:
                    "DELETE"
            }
        );


        helpdeskDraft =
            null;

    }

    catch (error) {

        console.log(error);

    }

}



// =========================================================
// Clear Form
// =========================================================

function clearRequestForm() {

    document
        .getElementById(
            "request-subject-input"
        )
        .value = "";


    document
        .getElementById(
            "request-details-input"
        )
        .value = "";


    document
        .getElementById(
            "attachment-file-input"
        )
        .value = "";


    document
        .getElementById(
            "attachment-file-name"
        )
        .textContent =
        "No file selected";


    document
        .getElementById(
            "meeting-date-input"
        )
        .value = "";


    document
        .getElementById(
            "meeting-start-time-input"
        )
        .value = "";


    document
        .getElementById(
            "meeting-end-time-input"
        )
        .value = "";


    selectedAttachmentName =
        "";


    standardTicketButton();

}



// =========================================================
// Statistics
// =========================================================

function showEmployeeStatistics() {

    let activeTickets =
        helpdeskRequests.filter(
            function (request) {

                return (
                    request.type ==
                    "ticket" &&

                    request.status !=
                    "Resolved" &&

                    request.status !=
                    "Rejected"
                );

            }
        ).length;


    let scheduledMeetings =
        helpdeskRequests.filter(
            function (request) {

                return (
                    request.type ==
                    "meeting" &&

                    request.status ==
                    "Confirmed"
                );

            }
        ).length;


    document
        .getElementById(
            "active-tickets-number"
        )
        .textContent =
        activeTickets;


    document
        .getElementById(
            "scheduled-meetings-number"
        )
        .textContent =
        scheduledMeetings;


    document
        .getElementById(
            "my-requests-number"
        )
        .textContent =
        helpdeskRequests.length;

}



// =========================================================
// Status Class
// =========================================================

function getStatusClass(
    status
) {

    if (
        status == "Confirmed" ||
        status == "Resolved"
    ) {

        return "status-green";

    }


    if (
        status == "Pending Meeting" ||
        status ==
        "Reschedule Requested"
    ) {

        return "status-yellow";

    }


    if (
        status == "Rejected"
    ) {

        return "status-red";

    }


    return "status-blue";

}



// =========================================================
// My Requests
// =========================================================

function showMyRequests() {

    let container =
        document.getElementById(
            "my-requests-container"
        );


    container.innerHTML =
        "";


    if (
        helpdeskRequests.length == 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No requests yet.
            </div>
        `;

        return;

    }


    for (
        let i = 0;
        i < helpdeskRequests.length;
        i++
    ) {

        let request =
            helpdeskRequests[i];


        let meetingInformation =
            "";


        if (
            request.type ==
            "meeting"
        ) {

            meetingInformation = `
                <div class="request-meta">

                    <span>
                        ${escapeHtml(request.meetingDate)}
                    </span>

                    <span>
                        ${escapeHtml(request.startTime)}
                        -
                        ${escapeHtml(request.endTime)}
                    </span>

                    <span>
                        ${escapeHtml(request.channel)}
                    </span>

                </div>
            `;

        }


        let hrReply =
            "";


        if (request.hrReply) {

            hrReply = `
                <div class="hr-reply">

                    <strong>
                        HR Reply
                    </strong>

                    <p>
                        ${escapeHtml(request.hrReply)}
                    </p>

                </div>
            `;

        }


        let buttons =
            "";


        if (
            request.type ==
            "meeting" &&
            request.status ==
            "Confirmed"
        ) {

            buttons = `
                <div class="form-actions">

                    <button
                        class="secondary-button"
                        onclick="openRescheduleDialog('${request.id}')">

                        Reschedule

                    </button>

                    <button
                        class="primary-button"
                        onclick="joinMeetingButton('${request.id}')">

                        Join Meeting

                    </button>

                </div>
            `;

        }


        container.innerHTML += `

            <article class="request-card">

                <div class="request-card-header">

                    <div>

                        <small>
                            ${escapeHtml(request.ticket)}
                        </small>

                        <h3>
                            ${escapeHtml(request.subject)}
                        </h3>

                    </div>

                    <span
                        class="status ${getStatusClass(request.status)}">

                        ${escapeHtml(request.status)}

                    </span>

                </div>


                <p>
                    ${escapeHtml(request.details)}
                </p>


                <div class="request-meta">

                    <span>
                        ${escapeHtml(request.category)}
                    </span>

                    <span>
                        ${escapeHtml(request.date)}
                    </span>

                </div>


                ${meetingInformation}

                ${hrReply}

                ${buttons}

            </article>
        `;

    }

}



// =========================================================
// Upcoming Meeting
// =========================================================

function showUpcomingMeeting() {

    let container =
        document.getElementById(
            "upcoming-meeting-container"
        );


    let meetings =
        helpdeskRequests.filter(
            function (request) {

                return (
                    request.type ==
                    "meeting" &&

                    request.status ==
                    "Confirmed" &&

                    request.meetingDate >=
                    getDeviceDate()
                );

            }
        );


    meetings.sort(
        function (first, second) {

            return (
                first.meetingDate +
                first.startTime
            ).localeCompare(
                second.meetingDate +
                second.startTime
            );

        }
    );


    if (
        meetings.length == 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No upcoming confirmed meeting.
            </div>
        `;

        return;

    }


    let meeting =
        meetings[0];


    container.innerHTML = `

        <div class="request-card">

            <h3>
                ${escapeHtml(meeting.subject)}
            </h3>

            <p>
                ${escapeHtml(meeting.meetingDate)}
            </p>

            <p>
                ${escapeHtml(meeting.startTime)}
                -
                ${escapeHtml(meeting.endTime)}
            </p>

            <p>
                ${escapeHtml(meeting.channel)}
            </p>

            <button
                class="primary-button"
                onclick="joinMeetingButton('${meeting.id}')">

                Join Meeting

            </button>

        </div>
    `;

}



// =========================================================
// My Requests Button
// =========================================================

function myRequestsButton() {

    document
        .getElementById(
            "my-requests-section"
        )
        .scrollIntoView({

            behavior:
                "smooth"

        });

}



// =========================================================
// Reschedule
// =========================================================

function openRescheduleDialog(
    requestId
) {

    let meeting =
        helpdeskRequests.find(
            function (request) {

                return (
                    String(request.id) ==
                    String(requestId)
                );

            }
        );


    if (!meeting) {

        return;

    }


    selectedMeetingId =
        meeting.id;


    document
        .getElementById(
            "reschedule-date-input"
        )
        .value =
        meeting.meetingDate ||
        "";


    document
        .getElementById(
            "reschedule-start-time-input"
        )
        .value =
        meeting.startTime ||
        "";


    document
        .getElementById(
            "reschedule-end-time-input"
        )
        .value =
        meeting.endTime ||
        "";


    document
        .getElementById(
            "reschedule-channel-select"
        )
        .value =
        meeting.channel ||
        "Zoom";


    document
        .getElementById(
            "reschedule-dialog"
        )
        .showModal();

}



function closeRescheduleDialog() {

    document
        .getElementById(
            "reschedule-dialog"
        )
        .close();

}



// =========================================================
// Save Reschedule
// =========================================================

async function saveRescheduleButton() {

    let meetingDate =
        document
            .getElementById(
                "reschedule-date-input"
            )
            .value;


    let startTime =
        document
            .getElementById(
                "reschedule-start-time-input"
            )
            .value;


    let endTime =
        document
            .getElementById(
                "reschedule-end-time-input"
            )
            .value;


    let channel =
        document
            .getElementById(
                "reschedule-channel-select"
            )
            .value;


    if (
        meetingDate == "" ||
        startTime == "" ||
        endTime == ""
    ) {

        showEmployeePageMessage(
            "Complete meeting information."
        );

        return;

    }


    if (
        meetingDate <
        getDeviceDate()
    ) {

        showEmployeePageMessage(
            "Past dates are not allowed."
        );

        return;

    }


    if (
        endTime <= startTime
    ) {

        showEmployeePageMessage(
            "End time must be after start time."
        );

        return;

    }


    let changes = {

        meetingDate:
            meetingDate,

        startTime:
            startTime,

        endTime:
            endTime,

        channel:
            channel,

        status:
            "Reschedule Requested",

        updatedAt:
            new Date()
                .toISOString()

    };


    try {

        let response =
            await fetch(
                API +
                "/helpdeskRequests/" +
                selectedMeetingId,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            changes
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not update meeting."
            );

        }


        closeRescheduleDialog();


        await loadEmployeeHelpdeskData();


        showEmployeePageMessage(
            "Reschedule request sent to HR."
        );

    }

    catch (error) {

        console.log(error);


        showEmployeePageMessage(
            "Could not send reschedule request."
        );

    }

}



// =========================================================
// Join Meeting
// =========================================================

function joinMeetingButton(
    requestId
) {

    let meeting =
        helpdeskRequests.find(
            function (request) {

                return (
                    String(request.id) ==
                    String(requestId)
                );

            }
        );


    if (
        !meeting ||
        meeting.status !=
        "Confirmed"
    ) {

        showEmployeePageMessage(
            "Meeting is not confirmed."
        );

        return;

    }


    if (
        meeting.channel ==
        "Zoom"
    ) {

        window.open(
            "https://zoom.us/",
            "_blank"
        );

    }


    else if (
        meeting.channel ==
        "Google Meet"
    ) {

        window.open(
            "https://meet.google.com/",
            "_blank"
        );

    }

}



// =========================================================
// Message
// =========================================================

function showEmployeePageMessage(
    message
) {

    let messageBox =
        document.getElementById(
            "employee-page-message"
        );


    messageBox.textContent =
        message;


    messageBox
        .classList
        .add(
            "show-message"
        );


    clearTimeout(
        showEmployeePageMessage.timer
    );


    showEmployeePageMessage.timer =
        setTimeout(
            function () {

                messageBox
                    .classList
                    .remove(
                        "show-message"
                    );

            },
            2800
        );

}



// =========================================================
// Start
// =========================================================

startEmployeeHelpdeskPage();