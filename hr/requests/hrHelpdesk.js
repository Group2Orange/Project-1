// =========================================================
// ملفات البيانات
// =========================================================

// ملف موظفين الشركة
const EMPLOYEES_FILE = "../../Data/employee.json";

// رابط JSON Server
const API = "http://127.0.0.1:3000";


// =========================================================
// Variables
// =========================================================

// نخزن جميع موظفين الشركة هنا
let employees = [];

// نخزن طلبات Helpdesk هنا
let helpdeskRequests = [];

// التبويب الحالي
let currentTab = "all";

// الطلب الذي اختاره HR
let selectedRequestId = "";


// =========================================================
// Date
// =========================================================

// تجيب تاريخ الجهاز الحالي
function getDeviceDate() {

    let today = new Date();

    let year =
        today.getFullYear();

    let month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    let day =
        String(
            today.getDate()
        ).padStart(2, "0");

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

// تمنع النصوص من التأثير على HTML
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

// تشغيل الصفحة
async function startHrHelpdeskPage() {

    // تحديد أقل تاريخ للاجتماع
    let manageDate =
        document.getElementById(
            "manage-meeting-date-input"
        );

    if (manageDate) {

        manageDate.min =
            getDeviceDate();
    }


    let createDate =
        document.getElementById(
            "create-meeting-date-input"
        );

    if (createDate) {

        createDate.min =
            getDeviceDate();
    }


    // تحميل البيانات
    await loadHrHelpdeskData();
}


// =========================================================
// Load Data
// =========================================================

// تحميل الموظفين والطلبات
async function loadHrHelpdeskData() {

    try {

        // نقرأ الموظفين من employee.json
        let employeesResponse =
            await fetch(
                EMPLOYEES_FILE
            );


        // نقرأ طلبات Helpdesk من API
        let requestsResponse =
            await fetch(
                API +
                "/helpdeskRequests"
            );


        // التأكد أن ملف الموظفين اشتغل
        if (!employeesResponse.ok) {

            throw new Error(
                "Could not load employee.json"
            );
        }


        // التأكد أن API اشتغل
        if (!requestsResponse.ok) {

            throw new Error(
                "Could not load Helpdesk requests"
            );
        }


        // تحويل employee.json إلى JavaScript
        let employeesData =
            await employeesResponse.json();


        // إذا employee.json بهذا الشكل:
        // { "employees": [...] }
        if (
            Array.isArray(
                employeesData.employees
            )
        ) {

            employees =
                employeesData.employees;
        }

        // إذا employee.json عبارة عن Array مباشرة
        else if (
            Array.isArray(
                employeesData
            )
        ) {

            employees =
                employeesData;
        }

        else {

            employees = [];
        }


        // قراءة طلبات Helpdesk
        helpdeskRequests =
            await requestsResponse.json();


        // عرض الموظفين في Console للتأكد
        console.log(
            "All Company Employees:",
            employees
        );


        // عرض الطلبات في Console
        console.log(
            "Helpdesk Requests:",
            helpdeskRequests
        );


        // تعبئة قائمة الموظفين
        fillCreateTicketEmployeeSelect();


        // عرض الإحصائيات
        showHrStatistics();


        // عرض الطلبات
        showHrRequests();

    }

    catch (error) {

        console.log(
            "Error:",
            error
        );


        showHrPageMessage(
            "Could not load Helpdesk data."
        );
    }
}


// =========================================================
// Employee By ID
// =========================================================

// البحث عن موظف باستخدام ID
function getEmployeeById(employeeId) {

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

// تعبئة Select بجميع موظفين employee.json
function fillCreateTicketEmployeeSelect() {

    // نجيب Select
    let employeeSelect =
        document.getElementById(
            "create-ticket-employee-select"
        );


    // إذا العنصر غير موجود نوقف
    if (!employeeSelect) {

        return;
    }


    // نمسح البيانات القديمة
    employeeSelect.innerHTML =
        '<option value="">Select Employee</option>';


    // نمر على كل الموظفين
    for (
        let i = 0;
        i < employees.length;
        i++
    ) {

        // الموظف الحالي
        let employee =
            employees[i];


        // إنشاء option
        let option =
            document.createElement(
                "option"
            );


        // نخزن ID الموظف
        option.value =
            employee.id;


        // نعرض الاسم كامل من JSON
        option.textContent =
            employee.name;


        // إضافة الموظف للقائمة
        employeeSelect.appendChild(
            option
        );
    }


    // عدد الموظفين للتأكد
    console.log(
        "Employees in Select:",
        employees.length
    );
}


// =========================================================
// Statistics
// =========================================================

// عرض الإحصائيات
function showHrStatistics() {

    // Active Tickets
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


    // Pending Meetings
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


    // Confirmed Meetings
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


    // عرض Active Tickets
    let activeTicketsElement =
        document.getElementById(
            "hr-active-tickets-number"
        );

    if (activeTicketsElement) {

        activeTicketsElement.textContent =
            activeTickets;
    }


    // عرض Pending Meetings
    let pendingMeetingsElement =
        document.getElementById(
            "hr-pending-meetings-number"
        );

    if (pendingMeetingsElement) {

        pendingMeetingsElement.textContent =
            pendingMeetings;
    }


    // عرض Confirmed Meetings
    let confirmedMeetingsElement =
        document.getElementById(
            "hr-confirmed-meetings-number"
        );

    if (confirmedMeetingsElement) {

        confirmedMeetingsElement.textContent =
            confirmedMeetings;
    }


    // عرض العدد الكلي
    let totalRequestsElement =
        document.getElementById(
            "hr-total-requests-number"
        );

    if (totalRequestsElement) {

        totalRequestsElement.textContent =
            helpdeskRequests.length;
    }
}


// =========================================================
// Tabs
// =========================================================

// All
function allRequestsTabButton() {

    currentTab =
        "all";

    changeActiveTab(
        "all-requests-tab"
    );

    showHrRequests();
}


// Tickets
function ticketsTabButton() {

    currentTab =
        "tickets";

    changeActiveTab(
        "tickets-tab"
    );

    showHrRequests();
}


// Meetings
function meetingsTabButton() {

    currentTab =
        "meetings";

    changeActiveTab(
        "meetings-tab"
    );

    showHrRequests();
}


// تغيير التبويب النشط
function changeActiveTab(tabId) {

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


    let activeTab =
        document.getElementById(
            tabId
        );


    if (activeTab) {

        activeTab
            .classList
            .add(
                "active-tab"
            );
    }
}


// =========================================================
// Filter Requests
// =========================================================

// فلترة الطلبات
function getFilteredHrRequests() {

    let searchInput =
        document.getElementById(
            "hr-search-input"
        );


    let statusInput =
        document.getElementById(
            "hr-status-filter"
        );


    let sortInput =
        document.getElementById(
            "hr-sort-select"
        );


    let searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    let status =
        statusInput
            ? statusInput.value
            : "all";


    let sort =
        sortInput
            ? sortInput.value
            : "newest";


    let results =
        helpdeskRequests.filter(

            function (request) {

                // فلترة Tickets
                if (
                    currentTab ==
                    "tickets" &&

                    request.type !=
                    "ticket"
                ) {

                    return false;
                }


                // فلترة Meetings
                if (
                    currentTab ==
                    "meetings" &&

                    request.type !=
                    "meeting"
                ) {

                    return false;
                }


                // فلترة Status
                if (
                    status != "all" &&

                    request.status !=
                    status
                ) {

                    return false;
                }


                // نجيب الموظف
                let employee =
                    getEmployeeById(
                        request.employeeId
                    );


                // الاسم
                let employeeName =
                    request.employeeName ||

                    (
                        employee
                            ? employee.name
                            : ""
                    );


                // النص الذي سنبحث داخله
                let text =
                    (
                        employeeName +
                        " " +

                        (
                            request.subject ||
                            ""
                        ) +

                        " " +

                        (
                            request.ticket ||
                            ""
                        ) +

                        " " +

                        (
                            request.category ||
                            ""
                        )
                    )
                        .toLowerCase();


                // Search
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


    // ترتيب الطلبات
    results.sort(

        function (
            first,
            second
        ) {

            let firstDate =
                new Date(
                    first.createdAt || 0
                );


            let secondDate =
                new Date(
                    second.createdAt || 0
                );


            // الأقدم أولًا
            if (
                sort ==
                "oldest"
            ) {

                return (
                    firstDate -
                    secondDate
                );
            }


            // الأحدث أولًا
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

// لون Status
function getHrStatusClass(status) {

    if (
        status ==
        "Confirmed" ||

        status ==
        "Resolved"
    ) {

        return "status-green";
    }


    if (
        status ==
        "Pending Meeting" ||

        status ==
        "Reschedule Requested"
    ) {

        return "status-yellow";
    }


    if (
        status ==
        "Rejected"
    ) {

        return "status-red";
    }


    return "status-blue";
}


// =========================================================
// Show HR Requests
// =========================================================

// عرض الطلبات
function showHrRequests() {

    let container =
        document.getElementById(
            "hr-requests-container"
        );


    if (!container) {

        return;
    }


    // نجيب الطلبات بعد الفلترة
    let requests =
        getFilteredHrRequests();


    // نمسح القديم
    container.innerHTML =
        "";


    // إذا لا يوجد طلبات
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


    // عرض كل الطلبات
    for (
        let i = 0;
        i < requests.length;
        i++
    ) {

        let request =
            requests[i];


        // نجيب الموظف من employee.json
        let employee =
            getEmployeeById(
                request.employeeId
            );


        // اسم الموظف
        let employeeName =
            request.employeeName ||

            (
                employee
                    ? employee.name
                    : "Employee"
            );


        // قسم الموظف
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


        // معلومات الاجتماع
        let meetingInformation =
            "";


        if (
            request.type ==
            "meeting"
        ) {

            meetingInformation = `

                <div class="request-meta">

                    <span>

                        ${escapeHtml(
                            request.meetingDate
                        )}

                    </span>


                    <span>

                        ${escapeHtml(
                            request.startTime
                        )}

                        -

                        ${escapeHtml(
                            request.endTime
                        )}

                    </span>


                    <span>

                        ${escapeHtml(
                            request.channel
                        )}

                    </span>

                </div>

            `;
        }


        // رد HR
        let reply =
            "";


        if (
            request.hrReply
        ) {

            reply = `

                <div class="hr-reply">

                    <strong>
                        HR Reply
                    </strong>

                    <p>

                        ${escapeHtml(
                            request.hrReply
                        )}

                    </p>

                </div>

            `;
        }


        // إضافة الكرت
        container.innerHTML += `

            <article class="hr-request-card">

                <div class="hr-request-header">

                    <div>

                        <small>

                            ${escapeHtml(
                                request.ticket
                            )}

                        </small>

                        <h3>

                            ${escapeHtml(
                                request.subject
                            )}

                        </h3>

                    </div>


                    <span
                        class="
                            status
                            ${getHrStatusClass(
                                request.status
                            )}
                        "
                    >

                        ${escapeHtml(
                            request.status
                        )}

                    </span>

                </div>


                <div class="employee-information">

                    <strong>

                        ${escapeHtml(
                            employeeName
                        )}

                    </strong>

                    <span>

                        ${escapeHtml(
                            department
                        )}

                    </span>

                </div>


                <p>

                    ${escapeHtml(
                        request.details
                    )}

                </p>


                <div class="request-meta">

                    <span>

                        ${escapeHtml(
                            request.category
                        )}

                    </span>

                    <span>

                        ${escapeHtml(
                            request.date
                        )}

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
                        type="button"
                        onclick="manageRequestButton('${request.id}')"
                    >

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

// إعادة الفلاتر
function resetHrFiltersButton() {

    let searchInput =
        document.getElementById(
            "hr-search-input"
        );


    let statusInput =
        document.getElementById(
            "hr-status-filter"
        );


    let sortInput =
        document.getElementById(
            "hr-sort-select"
        );


    if (searchInput) {

        searchInput.value =
            "";
    }


    if (statusInput) {

        statusInput.value =
            "all";
    }


    if (sortInput) {

        sortInput.value =
            "newest";
    }


    allRequestsTabButton();
}


// =========================================================
// Manage Request
// =========================================================

// فتح Manage Request
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


    // نجيب الموظف من JSON
    let employee =
        getEmployeeById(
            request.employeeId
        );


    // العنوان
    document
        .getElementById(
            "manage-request-title"
        )
        .textContent =
        request.subject ||
        "Manage Request";


    // اسم الموظف
    document
        .getElementById(
            "manage-request-employee"
        )
        .textContent =

        request.employeeName ||

        (
            employee
                ? employee.name
                : "Employee"
        );


    // Status
    document
        .getElementById(
            "manage-request-status-select"
        )
        .value =
        request.status;


    // HR Reply
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


    // إذا Meeting
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


    // فتح Dialog
    document
        .getElementById(
            "manage-request-dialog"
        )
        .showModal();
}


// =========================================================
// Close Manage Dialog
// =========================================================

// إغلاق Manage Request
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

// حفظ تعديل الطلب
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


    // التغييرات
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


    // إذا Meeting
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


        // التأكد من البيانات
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


        // منع التاريخ القديم
        if (
            meetingDate <
            getDeviceDate()
        ) {

            showHrPageMessage(
                "Past dates are not allowed."
            );

            return;
        }


        // التأكد من الوقت
        if (
            endTime <=
            startTime
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

        // تحديث الطلب في API
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


        // إغلاق Dialog
        closeManageRequestDialog();


        // إعادة تحميل البيانات
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

// فتح Create on Behalf
function createTicketButton() {

    // تعبئة الموظفين من employee.json
    fillCreateTicketEmployeeSelect();


    // إعادة Employee
    document
        .getElementById(
            "create-ticket-employee-select"
        )
        .value =
        "";


    // إعادة Type
    document
        .getElementById(
            "create-ticket-type-select"
        )
        .value =
        "ticket";


    // إعادة Subject
    document
        .getElementById(
            "create-ticket-subject-input"
        )
        .value =
        "";


    // إعادة Details
    document
        .getElementById(
            "create-ticket-details-input"
        )
        .value =
        "";


    // إعادة تاريخ الاجتماع
    let meetingDate =
        document.getElementById(
            "create-meeting-date-input"
        );

    if (meetingDate) {

        meetingDate.value =
            "";

        meetingDate.min =
            getDeviceDate();
    }


    // إعادة Start Time
    let startTime =
        document.getElementById(
            "create-meeting-start-input"
        );

    if (startTime) {

        startTime.value =
            "";
    }


    // إعادة End Time
    let endTime =
        document.getElementById(
            "create-meeting-end-input"
        );

    if (endTime) {

        endTime.value =
            "";
    }


    // تحديث نوع الطلب
    createTicketTypeChange();


    // فتح Dialog
    document
        .getElementById(
            "create-ticket-dialog"
        )
        .showModal();
}


// =========================================================
// Create Ticket Type
// =========================================================

// تغيير Ticket أو Meeting
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


    // Meeting
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

    // Ticket
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

// إغلاق Create on Behalf
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

// حفظ الطلب الذي أنشأه HR
async function saveCreateTicketButton() {

    // ID الموظف
    let employeeId =
        document
            .getElementById(
                "create-ticket-employee-select"
            )
            .value;


    // نجيب الموظف كامل من employee.json
    let employee =
        getEmployeeById(
            employeeId
        );


    // نوع الطلب
    let type =
        document
            .getElementById(
                "create-ticket-type-select"
            )
            .value;


    // Subject
    let subject =
        document
            .getElementById(
                "create-ticket-subject-input"
            )
            .value
            .trim();


    // Details
    let details =
        document
            .getElementById(
                "create-ticket-details-input"
            )
            .value
            .trim();


    // Validation
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


    // إنشاء الطلب
    let request = {

        // Ticket Number
        ticket:
            "TKT-" +
            Math.floor(
                1000 +
                Math.random() * 9000
            ),

        // ID الموظف من employee.json
        employeeId:
            employee.id,

        // الاسم الكامل من employee.json
        employeeName:
            employee.name,

        // القسم من employee.json
        department:
            employee.department ||
            employee.position ||
            "",

        // النوع
        type:
            type,

        // Category
        category:
            document
                .getElementById(
                    "create-ticket-category-select"
                )
                .value,

        // Subject
        subject:
            subject,

        // Details
        details:
            details,

        // أنشأه HR
        createdBy:
            "HR",

        // تاريخ الإنشاء
        date:
            getDeviceDate(),

        // تاريخ ووقت الإنشاء
        createdAt:
            new Date()
                .toISOString(),

        // رد HR
        hrReply:
            ""
    };


    // إذا الطلب Meeting
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


        // Validation
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


        // منع تاريخ قديم
        if (
            meetingDate <
            getDeviceDate()
        ) {

            showHrPageMessage(
                "Past dates are not allowed."
            );

            return;
        }


        // التأكد من الوقت
        if (
            endTime <=
            startTime
        ) {

            showHrPageMessage(
                "End time must be after start time."
            );

            return;
        }


        // Meeting Date
        request.meetingDate =
            meetingDate;


        // Start Time
        request.startTime =
            startTime;


        // End Time
        request.endTime =
            endTime;


        // Zoom أو Google Meet
        request.channel =
            document
                .getElementById(
                    "create-meeting-channel-select"
                )
                .value;


        // HR أنشأ الاجتماع
        request.status =
            "Confirmed";
    }

    else {

        // Ticket عادي
        request.status =
            "In Review";
    }


    try {

        // حفظ الطلب في JSON Server
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


        // إذا حدث خطأ
        if (!response.ok) {

            throw new Error(
                "Could not create request."
            );
        }


        // إغلاق Dialog
        closeCreateTicketDialog();


        // إعادة تحميل البيانات
        await loadHrHelpdeskData();


        // رسالة نجاح
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

// رسالة صغيرة للمستخدم
function showHrPageMessage(
    message
) {

    let messageBox =
        document.getElementById(
            "hr-page-message"
        );


    if (!messageBox) {

        console.log(message);

        return;
    }


    // وضع الرسالة
    messageBox.textContent =
        message;


    // إظهار الرسالة
    messageBox
        .classList
        .add(
            "show-message"
        );


    // إلغاء Timer القديم
    clearTimeout(
        showHrPageMessage.timer
    );


    // إخفاء الرسالة بعد فترة
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
// Search Events
// =========================================================

// Search
let searchInput =
    document.getElementById(
        "hr-search-input"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        showHrRequests
    );
}


// Status Filter
let statusFilter =
    document.getElementById(
        "hr-status-filter"
    );


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        showHrRequests
    );
}


// Sort
let sortSelect =
    document.getElementById(
        "hr-sort-select"
    );


if (sortSelect) {

    sortSelect.addEventListener(
        "change",
        showHrRequests
    );
}


// =========================================================
// Start
// =========================================================

// تشغيل صفحة HR Helpdesk
startHrHelpdeskPage();