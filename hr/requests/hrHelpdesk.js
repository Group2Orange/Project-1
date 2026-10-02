// =========================================================
// API
// =========================================================

const API =
    "http://127.0.0.1:3000";



// =========================================================
// Variables
// =========================================================

let employees = [];

let helpdeskRequests = [];

let currentTab =
    "all";

let selectedRequestId =
    "";



// =========================================================
// Date
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
// Escape HTML
// =========================================================

function escapeHtml(text) {

    let div =
        document.createElement("div");


    div.textContent =
        text || "";


    return div.innerHTML;

}



// =========================================================
// Start HR Page
// =========================================================

async function startHrHelpdeskPage() {

    document
        .getElementById(
            "manage-meeting-date-input"
        )
        .min =
        getDeviceDate();


    document
        .getElementById(
            "create-meeting-date-input"
        )
        .min =
        getDeviceDate();


    await loadHrHelpdeskData();

}



// =========================================================
// Load Data
// =========================================================

async function loadHrHelpdeskData() {

    try {

        let responses =
            await Promise.all([

                fetch(
                    API +
                    "/employees"
                ),

                fetch(
                    API +
                    "/helpdeskRequests"
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


        employees =
            await responses[0].json();


        helpdeskRequests =
            await responses[1].json();


        fillCreateTicketEmployeeSelect();


        showHrStatistics();


        showHrRequests();

    }

    catch (error) {

        console.log(error);


        showHrPageMessage(
            "Could not load Helpdesk data."
        );

    }

}



// =========================================================
// Employee by ID
// =========================================================

function getEmployeeById(
    employeeId
) {

    return employees.find(
        function (employee) {

            return (
                String(employee.id) ==
                String(employeeId)
            );

        }
    );

}



// =========================================================
// Fill Employee Select
// =========================================================

function fillCreateTicketEmployeeSelect() {

    let employeeSelect =
        document.getElementById(
            "create-ticket-employee-select"
        );


    employeeSelect.innerHTML =
        '<option value="">Select Employee</option>';


    for (
        let i = 0;
        i < employees.length;
        i++
    ) {

        let employee =
            employees[i];


        let role =
            String(
                employee.role || ""
            ).toUpperCase();


        let status =
            String(
                employee.status || ""
            ).toUpperCase();


        if (
            role == "EMP" &&
            status == "ACTIVE"
        ) {

            let option =
                document.createElement(
                    "option"
                );


            option.value =
                employee.id;


            option.textContent =
                employee.name +
                " - " +
                (
                    employee.department ||
                    employee.position ||
                    ""
                );


            employeeSelect.appendChild(
                option
            );

        }

    }

}



// =========================================================
// Statistics
// =========================================================

function showHrStatistics() {

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


    let pendingMeetings =
        helpdeskRequests.filter(
            function (request) {

                return (
                    request.type ==
                    "meeting" &&

                    (
                        request.status ==
                        "Pending Meeting" ||

                        request.status ==
                        "Reschedule Requested"
                    )
                );

            }
        ).length;


    let confirmedMeetings =
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
            "hr-active-tickets-number"
        )
        .textContent =
        activeTickets;


    document
        .getElementById(
            "hr-pending-meetings-number"
        )
        .textContent =
        pendingMeetings;


    document
        .getElementById(
            "hr-confirmed-meetings-number"
        )
        .textContent =
        confirmedMeetings;


    document
        .getElementById(
            "hr-total-requests-number"
        )
        .textContent =
        helpdeskRequests.length;

}



// =========================================================
// Tabs
// =========================================================

function allRequestsTabButton() {

    currentTab =
        "all";


    changeActiveTab(
        "all-requests-tab"
    );


    showHrRequests();

}



function ticketsTabButton() {

    currentTab =
        "tickets";


    changeActiveTab(
        "tickets-tab"
    );


    showHrRequests();

}



function meetingsTabButton() {

    currentTab =
        "meetings";


    changeActiveTab(
        "meetings-tab"
    );


    showHrRequests();

}



function changeActiveTab(
    tabId
) {

    let tabs =
        document.querySelectorAll(
            ".tab-button"
        );


    for (
        let i = 0;
        i < tabs.length;
        i++
    ) {

        tabs[i]
            .classList
            .remove(
                "active-tab"
            );

    }


    document
        .getElementById(
            tabId
        )
        .classList
        .add(
            "active-tab"
        );

}



// =========================================================
// Filter Requests
// =========================================================

function getFilteredHrRequests() {

    let searchText =
        document
            .getElementById(
                "hr-search-input"
            )
            .value
            .toLowerCase()
            .trim();


    let status =
        document
            .getElementById(
                "hr-status-filter"
            )
            .value;


    let sort =
        document
            .getElementById(
                "hr-sort-select"
            )
            .value;


    let results =
        helpdeskRequests.filter(
            function (request) {

                if (
                    currentTab ==
                    "tickets" &&
                    request.type !=
                    "ticket"
                ) {

                    return false;

                }


                if (
                    currentTab ==
                    "meetings" &&
                    request.type !=
                    "meeting"
                ) {

                    return false;

                }


                if (
                    status != "all" &&
                    request.status !=
                    status
                ) {

                    return false;

                }


                let text =
                    (
                        (request.employeeName || "") +
                        " " +
                        (request.subject || "") +
                        " " +
                        (request.ticket || "") +
                        " " +
                        (request.category || "")
                    ).toLowerCase();


                if (
                    searchText != "" &&
                    !text.includes(
                        searchText
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    results.sort(
        function (first, second) {

            let firstDate =
                new Date(
                    first.createdAt
                );


            let secondDate =
                new Date(
                    second.createdAt
                );


            if (
                sort == "oldest"
            ) {

                return (
                    firstDate -
                    secondDate
                );

            }


            return (
                secondDate -
                firstDate
            );

        }
    );


    return results;

}



// =========================================================
// Status Class
// =========================================================

function getHrStatusClass(
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
// Show HR Requests
// =========================================================

function showHrRequests() {

    let container =
        document.getElementById(
            "hr-requests-container"
        );


    let requests =
        getFilteredHrRequests();


    container.innerHTML =
        "";


    if (
        requests.length == 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No requests found.
            </div>
        `;

        return;

    }


    for (
        let i = 0;
        i < requests.length;
        i++
    ) {

        let request =
            requests[i];


        let employee =
            getEmployeeById(
                request.employeeId
            );


        let employeeName =
            request.employeeName ||
            (
                employee
                    ? employee.name
                    : "Employee"
            );


        let department =
            request.department ||
            (
                employee
                    ? (
                        employee.department ||
                        employee.position ||
                        ""
                    )
                    : ""
            );


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


        let reply =
            "";


        if (request.hrReply) {

            reply = `
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


        container.innerHTML += `

            <article class="hr-request-card">

                <div class="hr-request-header">

                    <div>

                        <small>
                            ${escapeHtml(request.ticket)}
                        </small>

                        <h3>
                            ${escapeHtml(request.subject)}
                        </h3>

                    </div>


                    <span
                        class="status ${getHrStatusClass(request.status)}">

                        ${escapeHtml(request.status)}

                    </span>

                </div>


                <div class="employee-information">

                    <strong>
                        ${escapeHtml(employeeName)}
                    </strong>

                    <span>
                        ${escapeHtml(department)}
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

                ${reply}


                <div class="request-bottom">

                    <span>
                        ${
                            request.type ==
                            "meeting"
                                ? "1:1 Meeting"
                                : "Support Ticket"
                        }
                    </span>


                    <button
                        class="primary-button"
                        onclick="manageRequestButton('${request.id}')">

                        Manage Request

                    </button>

                </div>

            </article>
        `;

    }

}



// =========================================================
// Reset Filters
// =========================================================

function resetHrFiltersButton() {

    document
        .getElementById(
            "hr-search-input"
        )
        .value = "";


    document
        .getElementById(
            "hr-status-filter"
        )
        .value =
        "all";


    document
        .getElementById(
            "hr-sort-select"
        )
        .value =
        "newest";


    allRequestsTabButton();

}



// =========================================================
// Manage Request
// =========================================================

function manageRequestButton(
    requestId
) {

    let request =
        helpdeskRequests.find(
            function (item) {

                return (
                    String(item.id) ==
                    String(requestId)
                );

            }
        );


    if (!request) {

        return;

    }


    selectedRequestId =
        request.id;


    document
        .getElementById(
            "manage-request-title"
        )
        .textContent =
        request.subject;


    document
        .getElementById(
            "manage-request-employee"
        )
        .textContent =
        request.employeeName ||
        "Employee";


    document
        .getElementById(
            "manage-request-status-select"
        )
        .value =
        request.status;


    document
        .getElementById(
            "manage-request-reply-input"
        )
        .value =
        request.hrReply ||
        "";


    let meetingFields =
        document.getElementById(
            "manage-meeting-fields"
        );


    if (
        request.type ==
        "meeting"
    ) {

        meetingFields
            .classList
            .remove(
                "hide-element"
            );


        document
            .getElementById(
                "manage-meeting-date-input"
            )
            .value =
            request.meetingDate ||
            "";


        document
            .getElementById(
                "manage-meeting-start-input"
            )
            .value =
            request.startTime ||
            "";


        document
            .getElementById(
                "manage-meeting-end-input"
            )
            .value =
            request.endTime ||
            "";


        document
            .getElementById(
                "manage-meeting-channel-select"
            )
            .value =
            request.channel ||
            "Zoom";

    }

    else {

        meetingFields
            .classList
            .add(
                "hide-element"
            );

    }


    document
        .getElementById(
            "manage-request-dialog"
        )
        .showModal();

}



// =========================================================
// Close Manage Dialog
// =========================================================

function closeManageRequestDialog() {

    document
        .getElementById(
            "manage-request-dialog"
        )
        .close();

}



// =========================================================
// Save Managed Request
// =========================================================

async function saveManagedRequestButton() {

    let request =
        helpdeskRequests.find(
            function (item) {

                return (
                    String(item.id) ==
                    String(
                        selectedRequestId
                    )
                );

            }
        );


    if (!request) {

        return;

    }


    let changes = {

        status:
            document
                .getElementById(
                    "manage-request-status-select"
                )
                .value,

        hrReply:
            document
                .getElementById(
                    "manage-request-reply-input"
                )
                .value
                .trim(),

        updatedBy:
            "HR",

        updatedAt:
            new Date()
                .toISOString()

    };


    if (
        request.type ==
        "meeting"
    ) {

        let meetingDate =
            document
                .getElementById(
                    "manage-meeting-date-input"
                )
                .value;


        let startTime =
            document
                .getElementById(
                    "manage-meeting-start-input"
                )
                .value;


        let endTime =
            document
                .getElementById(
                    "manage-meeting-end-input"
                )
                .value;


        if (
            meetingDate == "" ||
            startTime == "" ||
            endTime == ""
        ) {

            showHrPageMessage(
                "Complete meeting information."
            );

            return;

        }


        if (
            meetingDate <
            getDeviceDate()
        ) {

            showHrPageMessage(
                "Past dates are not allowed."
            );

            return;

        }


        if (
            endTime <= startTime
        ) {

            showHrPageMessage(
                "End time must be after start time."
            );

            return;

        }


        changes.meetingDate =
            meetingDate;


        changes.startTime =
            startTime;


        changes.endTime =
            endTime;


        changes.channel =
            document
                .getElementById(
                    "manage-meeting-channel-select"
                )
                .value;

    }


    try {

        let response =
            await fetch(
                API +
                "/helpdeskRequests/" +
                selectedRequestId,
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
                "Could not update request."
            );

        }


        closeManageRequestDialog();


        await loadHrHelpdeskData();


        showHrPageMessage(
            "Request updated successfully."
        );

    }

    catch (error) {

        console.log(error);


        showHrPageMessage(
            "Could not update request."
        );

    }

}



// =========================================================
// Create Ticket
// =========================================================

function createTicketButton() {

    fillCreateTicketEmployeeSelect();


    document
        .getElementById(
            "create-ticket-employee-select"
        )
        .value = "";


    document
        .getElementById(
            "create-ticket-type-select"
        )
        .value =
        "ticket";


    document
        .getElementById(
            "create-ticket-subject-input"
        )
        .value = "";


    document
        .getElementById(
            "create-ticket-details-input"
        )
        .value = "";


    createTicketTypeChange();


    document
        .getElementById(
            "create-ticket-dialog"
        )
        .showModal();

}



// =========================================================
// Create Ticket Type
// =========================================================

function createTicketTypeChange() {

    let type =
        document
            .getElementById(
                "create-ticket-type-select"
            )
            .value;


    let meetingFields =
        document.getElementById(
            "create-ticket-meeting-fields"
        );


    if (
        type ==
        "meeting"
    ) {

        meetingFields
            .classList
            .remove(
                "hide-element"
            );

    }

    else {

        meetingFields
            .classList
            .add(
                "hide-element"
            );

    }

}



// =========================================================
// Close Create Dialog
// =========================================================

function closeCreateTicketDialog() {

    document
        .getElementById(
            "create-ticket-dialog"
        )
        .close();

}



// =========================================================
// Save Create Ticket
// =========================================================

async function saveCreateTicketButton() {

    let employeeId =
        document
            .getElementById(
                "create-ticket-employee-select"
            )
            .value;


    let employee =
        getEmployeeById(
            employeeId
        );


    let type =
        document
            .getElementById(
                "create-ticket-type-select"
            )
            .value;


    let subject =
        document
            .getElementById(
                "create-ticket-subject-input"
            )
            .value
            .trim();


    let details =
        document
            .getElementById(
                "create-ticket-details-input"
            )
            .value
            .trim();


    if (
        !employee ||
        subject == "" ||
        details == ""
    ) {

        showHrPageMessage(
            "Complete employee, subject and details."
        );

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
            employee.id,

        employeeName:
            employee.name,

        department:
            employee.department ||
            employee.position ||
            "",

        type:
            type,

        category:
            document
                .getElementById(
                    "create-ticket-category-select"
                )
                .value,

        subject:
            subject,

        details:
            details,

        createdBy:
            "HR",

        date:
            getDeviceDate(),

        createdAt:
            new Date()
                .toISOString(),

        hrReply:
            ""

    };


    if (
        type ==
        "meeting"
    ) {

        let meetingDate =
            document
                .getElementById(
                    "create-meeting-date-input"
                )
                .value;


        let startTime =
            document
                .getElementById(
                    "create-meeting-start-input"
                )
                .value;


        let endTime =
            document
                .getElementById(
                    "create-meeting-end-input"
                )
                .value;


        if (
            meetingDate == "" ||
            startTime == "" ||
            endTime == ""
        ) {

            showHrPageMessage(
                "Complete meeting information."
            );

            return;

        }


        if (
            meetingDate <
            getDeviceDate()
        ) {

            showHrPageMessage(
                "Past dates are not allowed."
            );

            return;

        }


        if (
            endTime <= startTime
        ) {

            showHrPageMessage(
                "End time must be after start time."
            );

            return;

        }


        request.meetingDate =
            meetingDate;


        request.startTime =
            startTime;


        request.endTime =
            endTime;


        request.channel =
            document
                .getElementById(
                    "create-meeting-channel-select"
                )
                .value;


        // HR أنشأ الاجتماع.
        request.status =
            "Confirmed";

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
                "Could not create request."
            );

        }


        closeCreateTicketDialog();


        await loadHrHelpdeskData();


        showHrPageMessage(
            "Request created successfully."
        );

    }

    catch (error) {

        console.log(error);


        showHrPageMessage(
            "Could not create request."
        );

    }

}



// =========================================================
// HR Message
// =========================================================

function showHrPageMessage(
    message
) {

    let messageBox =
        document.getElementById(
            "hr-page-message"
        );


    messageBox.textContent =
        message;


    messageBox
        .classList
        .add(
            "show-message"
        );


    clearTimeout(
        showHrPageMessage.timer
    );


    showHrPageMessage.timer =
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

startHrHelpdeskPage();