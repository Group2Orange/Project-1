/* =========================
   HTML Elements
========================= */

const API = "http://127.0.0.1:3000";
const helpdeskUser = JSON.parse(localStorage.getItem("loggedUser") || "null");
const helpdeskEmployeeId = Number(helpdeskUser?.id);
let helpdeskRequests = [];
let helpdeskDraft = null;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function loadHelpdeskData() {
    if (!helpdeskEmployeeId || helpdeskUser.role !== "EMP") return;
    try {
        const [requestsResponse, draftsResponse] = await Promise.all([
            fetch(`${API}/helpdeskRequests?employeeId=${helpdeskEmployeeId}`),
            fetch(`${API}/helpdeskDrafts?employeeId=${helpdeskEmployeeId}`)
        ]);
        if (!requestsResponse.ok || !draftsResponse.ok) throw new Error("Could not load helpdesk data.");
        helpdeskRequests = await requestsResponse.json();
        helpdeskRequests.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        helpdeskDraft = (await draftsResponse.json())[0] || null;
        loadDraft();
        showTickets();
        showMeeting();
        updateStats();
    } catch (error) {
        message.textContent = `${error.message} Start the API with npm run api.`;
    }
}

let typeOptions =
    document.querySelectorAll(".type-option");

let meetingBox =
    document.getElementById("meetingBox");

let channelBtns =
    document.querySelectorAll(".channel-btn");

let timeBtns =
    document.querySelectorAll(".time-btn");

let durationBtns =
    document.querySelectorAll(".duration-btn");

let meetingDate =
    document.getElementById("meetingDate");

let category =
    document.getElementById("category");

let subject =
    document.getElementById("subject");

let details =
    document.getElementById("details");

let fileInput =
    document.getElementById("fileInput");

let uploadBox =
    document.getElementById("uploadBox");

let fileText =
    document.getElementById("fileText");

let draftBtn =
    document.getElementById("draftBtn");

let submitBtn =
    document.getElementById("submitBtn");

let message =
    document.getElementById("message");

let answerLinks =
    document.querySelectorAll(".answer-link");

let recentTickets =
    document.getElementById("recentTickets");

let activeTickets =
    document.getElementById("activeTickets");

let requestCount =
    document.getElementById("requestCount");

let meetingCount =
    document.getElementById("meetingCount");

let myRequestsBtn =
    document.getElementById("myRequestsBtn");

let clearTicketsBtn =
    document.getElementById("clearTicketsBtn");

let rescheduleBtn =
    document.getElementById("rescheduleBtn");

let joinBtn =
    document.getElementById("joinBtn");


/* =========================
   Values
========================= */

let requestType = "meeting";

let selectedChannel = "Zoom";

let selectedTime = "02:00 PM";

let selectedDuration = "20m";

let selectedFile = "";



/* =========================
   Inquiry Type
========================= */

for (let i = 0; i < typeOptions.length; i++) {

    typeOptions[i].onclick = function () {


        for (let j = 0; j < typeOptions.length; j++) {

            typeOptions[j].classList.remove("selected");

        }


        this.classList.add("selected");


        requestType =
            this.dataset.type;


        if (requestType == "meeting") {

            meetingBox.style.display = "block";

            submitBtn.innerHTML =
                '<i class="bi bi-calendar-check"></i> Schedule Meeting & Submit';

        }

        else {

            meetingBox.style.display = "none";

            submitBtn.innerHTML =
                '<i class="bi bi-send"></i> Submit Request';

        }

    };

}



/* =========================
   Button Select Function
========================= */

function selectButton(buttons, selectedButton) {

    for (let i = 0; i < buttons.length; i++) {

        buttons[i].classList.remove("selected-btn");

    }


    selectedButton.classList.add("selected-btn");

}



/* =========================
   Channel
========================= */

for (let i = 0; i < channelBtns.length; i++) {

    channelBtns[i].onclick = function () {


        selectButton(
            channelBtns,
            this
        );


        selectedChannel =
            this.innerText.trim();

    };

}



/* =========================
   Time
========================= */

for (let i = 0; i < timeBtns.length; i++) {

    timeBtns[i].onclick = function () {


        selectButton(
            timeBtns,
            this
        );


        selectedTime =
            this.innerText;

    };

}



/* =========================
   Duration
========================= */

for (let i = 0; i < durationBtns.length; i++) {

    durationBtns[i].onclick = function () {


        selectButton(
            durationBtns,
            this
        );


        selectedDuration =
            this.innerText;

    };

}



/* =========================
   File Upload
========================= */

uploadBox.onclick = function () {

    fileInput.click();

};


fileInput.onchange = function () {

    if (fileInput.files.length > 0) {

        selectedFile =
            fileInput.files[0].name;


        fileText.innerHTML =
            selectedFile;

    }

};



/* =========================
   Drag And Drop
========================= */

uploadBox.ondragover = function (event) {

    event.preventDefault();

    uploadBox.classList.add("dragging");

};


uploadBox.ondragleave = function () {

    uploadBox.classList.remove("dragging");

};


uploadBox.ondrop = function (event) {

    event.preventDefault();

    uploadBox.classList.remove("dragging");


    if (event.dataTransfer.files.length > 0) {

        selectedFile =
            event.dataTransfer.files[0].name;


        fileText.innerHTML =
            selectedFile;

    }

};



/* =========================
   Save Draft
========================= */

draftBtn.onclick = async function () {


    let draft = {

        type: requestType,

        category: category.value,

        subject: subject.value,

        details: details.value,

        date: meetingDate.value,

        channel: selectedChannel,

        time: selectedTime,

        duration: selectedDuration,

        file: selectedFile

    };


    draft.employeeId = helpdeskEmployeeId;
    try {
        const response = await fetch(helpdeskDraft ? `${API}/helpdeskDrafts/${encodeURIComponent(helpdeskDraft.id)}` : `${API}/helpdeskDrafts`, {
            method: helpdeskDraft ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft)
        });
        if (!response.ok) throw new Error("Could not save draft.");
        helpdeskDraft = await response.json();
    } catch (error) {
        message.textContent = error.message;
        return;
    }


    message.innerHTML =
        "Draft saved successfully";


    message.style.color =
        "#059669";

};



/* =========================
   Load Draft
========================= */

function loadDraft() {
    if (!helpdeskDraft) {

        return;

    }


    let draft = helpdeskDraft;


    category.value =
        draft.category || category.value;


    subject.value =
        draft.subject || "";


    details.value =
        draft.details || "";


    meetingDate.value =
        draft.date || "";


    selectedFile =
        draft.file || "";


    if (selectedFile != "") {

        fileText.innerHTML =
            selectedFile;

    }

}



/* =========================
   Submit
========================= */

submitBtn.onclick = async function () {


    if (
        subject.value.trim() == "" ||
        details.value.trim() == ""
    ) {

        message.innerHTML =
            "Please enter the subject and inquiry notes";


        message.style.color =
            "#4B5563";


        return;

    }



    if (
        requestType == "meeting" &&
        meetingDate.value == ""
    ) {

        message.innerHTML =
            "Please select a meeting date";


        message.style.color =
            "#4B5563";


        return;

    }



    let request = {
        employeeId: helpdeskEmployeeId,
        createdAt: new Date().toISOString(),

        ticket:
            "TKT-" +
            Math.floor(
                1000 + Math.random() * 9000
            ),

        type: requestType,

        category: category.value,

        subject: subject.value,

        details: details.value,

        file: selectedFile,

        status:
            requestType == "meeting"
            ? "Confirmed"
            : "In Review",

        date: meetingDate.value,

        time: selectedTime,

        duration: selectedDuration,

        channel: selectedChannel

    };



    try {
        const response = await fetch(`${API}/helpdeskRequests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error("Could not submit helpdesk request.");
        helpdeskRequests.unshift(await response.json());
        if (helpdeskDraft) {
            await fetch(`${API}/helpdeskDrafts/${encodeURIComponent(helpdeskDraft.id)}`, { method: "DELETE" });
            helpdeskDraft = null;
        }
    } catch (error) {
        message.textContent = error.message;
        return;
    }



    message.innerHTML =
        requestType == "meeting"
        ? "Meeting scheduled successfully"
        : "Request submitted successfully";


    message.style.color =
        "#059669";



    clearForm();

    showTickets();

    showMeeting();

    updateStats();

};



/* =========================
   Clear Form
========================= */

function clearForm() {

    subject.value = "";

    details.value = "";

    meetingDate.value = "";

    selectedFile = "";

    fileInput.value = "";

    fileText.innerHTML =
        "Click to upload or drag and drop files";

}



/* =========================
   Recent Tickets
========================= */

function showTickets() {
    let requests = helpdeskRequests;


    recentTickets.innerHTML = "";


    if (requests.length == 0) {

        recentTickets.innerHTML = `

            <p class="empty-text">
                No support tickets yet.
            </p>

        `;

        return;

    }



    for (
        let i = 0;
        i < requests.length && i < 4;
        i++
    ) {


        recentTickets.innerHTML += `

            <div class="ticket">

                <span>
                    #${escapeHtml(requests[i].ticket)}
                </span>

                <b>
                    ${escapeHtml(requests[i].subject)}
                </b>

                <small class="ticket-status">

                    ● ${escapeHtml(requests[i].status)}

                </small>

            </div>

        `;

    }

}



/* =========================
   Statistics
========================= */

function updateStats() {
    let requests = helpdeskRequests;


    let meetings = 0;


    for (let i = 0; i < requests.length; i++) {

        if (requests[i].type == "meeting") {

            meetings++;

        }

    }


    activeTickets.innerHTML =
        requests.length;


    requestCount.innerHTML =
        requests.length;


    meetingCount.innerHTML =
        meetings;

}



/* =========================
   Show Meeting
========================= */

function showMeeting() {
    let meeting = helpdeskRequests.find(request => request.type === "meeting");

    if (!meeting) {

        document.getElementById("meetingSubject").textContent = "";

        document.getElementById(
            "meetingDateText"
        ).innerHTML =
            "No meeting scheduled";


        document.getElementById(
            "meetingTimeText"
        ).innerHTML =
            "--";


        return;

    }



    document.getElementById(
        "meetingSubject"
    ).textContent =
        meeting.subject;


    document.getElementById(
        "meetingDateText"
    ).textContent =
        meeting.date;


    document.getElementById(
        "meetingTimeText"
    ).textContent =
        meeting.time +
        " · " +
        meeting.duration;


    document.getElementById(
        "meetingChannelText"
    ).textContent =
        meeting.channel;

}



/* =========================
   My Requests
========================= */

myRequestsBtn.onclick = function () {

    document
        .getElementById("recentTicketsCard")
        .scrollIntoView({
            behavior: "smooth"
        });

};



/* =========================
   Clear Tickets
========================= */

clearTicketsBtn.onclick = async function () {


    let answer =
        confirm(
            "Clear all support tickets?"
        );


    if (answer) {

        try {
            const responses = await Promise.all(helpdeskRequests.map(request =>
                fetch(`${API}/helpdeskRequests/${encodeURIComponent(request.id)}`, { method: "DELETE" })
            ));
            if (responses.some(response => !response.ok)) throw new Error("Could not clear all tickets.");
            helpdeskRequests = [];
        } catch (error) {
            message.textContent = error.message;
            await loadHelpdeskData();
            return;
        }


        showTickets();

        updateStats();

    }

};



/* =========================
   Common Answers
========================= */

for (let i = 0; i < answerLinks.length; i++) {

    answerLinks[i].onclick = function (event) {


        event.preventDefault();


        alert(
            this.dataset.answer
        );

    };

}



/* =========================
   Reschedule
========================= */

rescheduleBtn.onclick = function () {


    requestType = "meeting";


    meetingBox.style.display =
        "block";


    let options =
        document.querySelectorAll(
            ".type-option"
        );


    for (let i = 0; i < options.length; i++) {

        options[i].classList.remove(
            "selected"
        );


        if (
            options[i].dataset.type ==
            "meeting"
        ) {

            options[i].classList.add(
                "selected"
            );

        }

    }


    document
        .getElementById("requestCard")
        .scrollIntoView({
            behavior: "smooth"
        });


    message.innerHTML =
        "Choose a new date and submit again";


    message.style.color =
        "#0E7C86";

};



/* =========================
   Join Call
========================= */

joinBtn.onclick = function () {
    let meeting = helpdeskRequests.find(request => request.type === "meeting");


    if (!meeting) {

        alert(
            "No meeting is currently scheduled"
        );


        return;

    }


    window.open(
        "https://zoom.us/",
        "_blank"
    );

};



/* =========================
   Start Page
========================= */

loadHelpdeskData();
