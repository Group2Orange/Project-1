// =========================================================
// بيانات المستخدم
// =========================================================

// نقرأ بيانات الموظف الذي سجل دخوله.
let loggedEmployee =
    JSON.parse(
        localStorage.getItem("loggedUser")
    ) || {};


// نقرأ جميع طلبات المساعدة والاجتماعات المحفوظة.
let helpdeskRequests =
    JSON.parse(
        localStorage.getItem("helpdeskRequests")
    ) || [];


// نحدد نوع الطلب الافتراضي.
let selectedRequestType =
    "ticket";


// نحدد طريقة الاجتماع الافتراضية.
let selectedMeetingChannel =
    "Zoom";


// نخزن اسم الملف الذي يختاره الموظف.
let selectedAttachmentName =
    "";


// نخزن رقم الاجتماع عند طلب تغيير موعده.
let selectedMeetingId =
    null;



// =========================================================
// حفظ الطلبات
// =========================================================

// نحفظ جميع الطلبات داخل التخزين المحلي.
function saveHelpdeskRequests() {

    // نحول المصفوفة إلى نص ونحفظها.
    localStorage.setItem(
        "helpdeskRequests",
        JSON.stringify(helpdeskRequests)
    );
}



// =========================================================
// الحصول على طلبات الموظف
// =========================================================

// تعيد هذه الدالة طلبات الموظف الحالي فقط.
function getEmployeeRequests() {

    // نفلتر جميع الطلبات حسب رقم الموظف.
    return helpdeskRequests.filter(
        function (request) {

            // نقارن رقم صاحب الطلب برقم الموظف الحالي.
            return String(request.employeeId) ==
                   String(loggedEmployee.id);
        }
    );
}



// =========================================================
// زر الطلب العادي
// =========================================================

// تعمل عند الضغط على زر الطلب العادي.
function standardTicketButton() {

    // نحدد أن نوع الطلب عادي.
    selectedRequestType =
        "ticket";


    // نضيف شكل التحديد للزر.
    document
        .getElementById("standard-ticket-button")
        .classList
        .add("selected-request-type");


    // نزيل شكل التحديد عن زر الاجتماع.
    document
        .getElementById("live-meeting-button")
        .classList
        .remove("selected-request-type");


    // نخفي معلومات الاجتماع.
    document
        .getElementById("meeting-information-section")
        .classList
        .add("hide-element");


    // نغير نص زر الإرسال.
    document
        .querySelector(".submit-request-button")
        .innerHTML =
        "Submit Request";
}



// =========================================================
// زر الاجتماع
// =========================================================

// تعمل عند الضغط على زر الاجتماع.
function liveMeetingButton() {

    // نحدد أن نوع الطلب اجتماع.
    selectedRequestType =
        "meeting";


    // نضيف شكل التحديد لزر الاجتماع.
    document
        .getElementById("live-meeting-button")
        .classList
        .add("selected-request-type");


    // نزيل شكل التحديد عن زر الطلب العادي.
    document
        .getElementById("standard-ticket-button")
        .classList
        .remove("selected-request-type");


    // نظهر معلومات الاجتماع.
    document
        .getElementById("meeting-information-section")
        .classList
        .remove("hide-element");


    // نغير نص زر الإرسال.
    document
        .querySelector(".submit-request-button")
        .innerHTML =
        "Request Meeting";
}



// =========================================================
// زر زوم
// =========================================================

// تعمل عند اختيار زوم.
function zoomChannelButton() {

    // نحدد طريقة الاجتماع.
    selectMeetingChannel(
        "Zoom",
        "zoom-channel-button"
    );
}



// =========================================================
// زر جوجل
// =========================================================

// تعمل عند اختيار جوجل للاجتماعات.
function googleMeetChannelButton() {

    // نحدد طريقة الاجتماع.
    selectMeetingChannel(
        "Google Meet",
        "google-meet-channel-button"
    );
}



// =========================================================
// زر غرفة الموارد البشرية
// =========================================================

// تعمل عند اختيار غرفة الموارد البشرية.
function hrRoomChannelButton() {

    // نحدد طريقة الاجتماع.
    selectMeetingChannel(
        "HR Room",
        "hr-room-channel-button"
    );
}



// =========================================================
// زر الاتصال الهاتفي
// =========================================================

// تعمل عند اختيار الاتصال الهاتفي.
function phoneCallChannelButton() {

    // نحدد طريقة الاجتماع.
    selectMeetingChannel(
        "Phone Call",
        "phone-call-channel-button"
    );
}



// =========================================================
// اختيار طريقة الاجتماع
// =========================================================

// دالة مساعدة لتحديد طريقة الاجتماع.
function selectMeetingChannel(
    channelName,
    buttonId
) {

    // نحفظ الطريقة التي اختارها المستخدم.
    selectedMeetingChannel =
        channelName;


    // نحصل على جميع أزرار طرق الاجتماع.
    let meetingChannelButtons =
        document.querySelectorAll(
            ".zoom-channel-button, .google-meet-channel-button, .hr-room-channel-button, .phone-call-channel-button"
        );


    // نمر على جميع الأزرار.
    for (
        let i = 0;
        i < meetingChannelButtons.length;
        i++
    ) {

        // نزيل شكل التحديد من الزر الحالي.
        meetingChannelButtons[i]
            .classList
            .remove(
                "selected-meeting-channel"
            );
    }


    // نضيف شكل التحديد للزر الذي اختاره المستخدم.
    document
        .getElementById(buttonId)
        .classList
        .add(
            "selected-meeting-channel"
        );
}



// =========================================================
// اختيار الملف
// =========================================================

// تعمل بعد اختيار ملف.
function attachmentFileInputChange() {

    // نحصل على حقل الملف.
    let attachmentInput =
        document.getElementById(
            "attachment-file-input"
        );


    // نتحقق أن المستخدم اختار ملفًا.
    if (
        attachmentInput.files.length > 0
    ) {

        // نحفظ اسم الملف.
        selectedAttachmentName =
            attachmentInput.files[0].name;


        // نعرض اسم الملف داخل الصفحة.
        document
            .getElementById(
                "attachment-file-name"
            )
            .innerHTML =
            selectedAttachmentName;
    }
}



// =========================================================
// زر حفظ المسودة
// =========================================================

// تعمل عند الضغط على زر حفظ المسودة.
function saveDraftButton() {

    // ننشئ كائنًا يحتوي على بيانات النموذج.
    let requestDraft = {

        // نحفظ نوع الطلب.
        type:
            selectedRequestType,

        // نحفظ التصنيف.
        category:
            document
                .getElementById(
                    "request-category-select"
                )
                .value,

        // نحفظ عنوان الطلب.
        subject:
            document
                .getElementById(
                    "request-subject-input"
                )
                .value,

        // نحفظ تفاصيل الطلب.
        details:
            document
                .getElementById(
                    "request-details-input"
                )
                .value,

        // نحفظ تاريخ الاجتماع.
        meetingDate:
            document
                .getElementById(
                    "meeting-date-input"
                )
                .value,

        // نحفظ وقت البداية.
        startTime:
            document
                .getElementById(
                    "meeting-start-time-input"
                )
                .value,

        // نحفظ وقت النهاية.
        endTime:
            document
                .getElementById(
                    "meeting-end-time-input"
                )
                .value,

        // نحفظ طريقة الاجتماع.
        channel:
            selectedMeetingChannel,

        // نحفظ اسم الملف.
        attachment:
            selectedAttachmentName
    };


    // نحفظ المسودة باسم خاص بالموظف.
    localStorage.setItem(
        "helpdeskDraft_" +
        loggedEmployee.id,

        JSON.stringify(
            requestDraft
        )
    );


    // نعرض رسالة نجاح.
    showEmployeePageMessage(
        "Draft saved successfully."
    );
}



// =========================================================
// تحميل المسودة
// =========================================================

// تسترجع المسودة عند فتح الصفحة.
function loadEmployeeDraft() {

    // نبحث عن مسودة الموظف.
    let savedDraft =
        localStorage.getItem(
            "helpdeskDraft_" +
            loggedEmployee.id
        );


    // إذا لم توجد مسودة نوقف الدالة.
    if (
        !savedDraft
    ) {

        return;
    }


    // نحول المسودة إلى كائن.
    let requestDraft =
        JSON.parse(
            savedDraft
        );


    // نعيد التصنيف.
    document
        .getElementById(
            "request-category-select"
        )
        .value =
        requestDraft.category ||
        "Payroll, Bonus & Compensation";


    // نعيد عنوان الطلب.
    document
        .getElementById(
            "request-subject-input"
        )
        .value =
        requestDraft.subject || "";


    // نعيد التفاصيل.
    document
        .getElementById(
            "request-details-input"
        )
        .value =
        requestDraft.details || "";


    // نعيد تاريخ الاجتماع.
    document
        .getElementById(
            "meeting-date-input"
        )
        .value =
        requestDraft.meetingDate || "";


    // نعيد وقت البداية.
    document
        .getElementById(
            "meeting-start-time-input"
        )
        .value =
        requestDraft.startTime || "";


    // نعيد وقت النهاية.
    document
        .getElementById(
            "meeting-end-time-input"
        )
        .value =
        requestDraft.endTime || "";


    // نعيد اسم الملف.
    selectedAttachmentName =
        requestDraft.attachment || "";


    // نتحقق إذا كان هناك ملف محفوظ.
    if (
        selectedAttachmentName != ""
    ) {

        // نعرض اسم الملف.
        document
            .getElementById(
                "attachment-file-name"
            )
            .innerHTML =
            selectedAttachmentName;
    }


    // نعيد طريقة الاجتماع.
    selectedMeetingChannel =
        requestDraft.channel || "Zoom";


    // نتحقق من نوع الطلب.
    if (
        requestDraft.type == "meeting"
    ) {

        // نفعل وضع الاجتماع.
        liveMeetingButton();

    } else {

        // نفعل وضع الطلب العادي.
        standardTicketButton();
    }
}



// =========================================================
// زر إرسال الطلب
// =========================================================

// تعمل عند الضغط على زر إرسال الطلب.
function submitRequestButton() {

    // نقرأ عنوان الطلب.
    let requestSubject =
        document
            .getElementById(
                "request-subject-input"
            )
            .value
            .trim();


    // نقرأ تفاصيل الطلب.
    let requestDetails =
        document
            .getElementById(
                "request-details-input"
            )
            .value
            .trim();


    // نتحقق أن الحقول الأساسية ممتلئة.
    if (
        requestSubject == "" ||
        requestDetails == ""
    ) {

        // نعرض رسالة للمستخدم.
        showEmployeePageMessage(
            "Enter the subject and request details."
        );


        // نوقف الدالة.
        return;
    }


    // ننشئ الطلب الجديد.
    let newRequest = {

        // ننشئ رقمًا فريدًا.
        id:
            Date.now(),

        // نحفظ وقت إنشاء الطلب.
        createdAt:
            Date.now(),

        // ننشئ رقم التذكرة.
        ticket:
            "TKT-" +
            Math.floor(
                1000 +
                Math.random() *
                9000
            ),

        // نحفظ رقم الموظف.
        employeeId:
            loggedEmployee.id,

        // نحفظ اسم الموظف.
        employeeName:
            loggedEmployee.name ||
            "Employee",

        // نحفظ قسم الموظف.
        department:
            loggedEmployee.department ||
            loggedEmployee.position ||
            "Employee",

        // نحفظ التصنيف.
        category:
            document
                .getElementById(
                    "request-category-select"
                )
                .value,

        // نحفظ عنوان الطلب.
        subject:
            requestSubject,

        // نحفظ التفاصيل.
        details:
            requestDetails,

        // نحفظ اسم الملف.
        attachment:
            selectedAttachmentName,

        // نحفظ نوع الطلب.
        type:
            selectedRequestType,

        // نحدد أن الموظف أنشأ الطلب.
        createdBy:
            "EMP",

        // نحفظ تاريخ اليوم.
        date:
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                )
    };


    // نتحقق إذا كان الطلب اجتماعًا.
    if (
        selectedRequestType ==
        "meeting"
    ) {

        // نقرأ تاريخ الاجتماع.
        let meetingDate =
            document
                .getElementById(
                    "meeting-date-input"
                )
                .value;


        // نقرأ وقت البداية.
        let meetingStartTime =
            document
                .getElementById(
                    "meeting-start-time-input"
                )
                .value;


        // نقرأ وقت النهاية.
        let meetingEndTime =
            document
                .getElementById(
                    "meeting-end-time-input"
                )
                .value;


        // نتحقق من تعبئة معلومات الاجتماع.
        if (
            meetingDate == "" ||
            meetingStartTime == "" ||
            meetingEndTime == ""
        ) {

            // نعرض رسالة.
            showEmployeePageMessage(
                "Choose meeting date and time."
            );


            // نوقف الدالة.
            return;
        }


        // نحفظ تاريخ الاجتماع.
        newRequest.meetingDate =
            meetingDate;


        // نحفظ التاريخ أيضًا في الحقل العام.
        newRequest.date =
            meetingDate;


        // نحفظ وقت البداية.
        newRequest.startTime =
            meetingStartTime;


        // نحفظ وقت النهاية.
        newRequest.endTime =
            meetingEndTime;


        // نحفظ طريقة الاجتماع.
        newRequest.channel =
            selectedMeetingChannel;


        // نحدد أن الاجتماع ينتظر موافقة الموارد البشرية.
        newRequest.status =
            "Pending Meeting";

    } else {

        // نحدد حالة الطلب العادي.
        newRequest.status =
            "In Review";
    }


    // نضيف الطلب في بداية المصفوفة.
    helpdeskRequests.unshift(
        newRequest
    );


    // نحفظ الطلبات.
    saveHelpdeskRequests();


    // نحذف المسودة بعد الإرسال.
    localStorage.removeItem(
        "helpdeskDraft_" +
        loggedEmployee.id
    );


    // نفرغ النموذج.
    clearRequestForm();


    // نحدث الصفحة.
    showEmployeeHelpdeskPage();


    // نتحقق إذا كان الطلب اجتماعًا.
    if (
        selectedRequestType ==
        "meeting"
    ) {

        // نعرض رسالة الاجتماع.
        showEmployeePageMessage(
            "Meeting request sent to HR."
        );

    } else {

        // نعرض رسالة نجاح الطلب العادي.
        showEmployeePageMessage(
            "Request submitted successfully."
        );
    }
}



// =========================================================
// تنظيف النموذج
// =========================================================

// تنظف الحقول بعد إرسال الطلب.
function clearRequestForm() {

    // نمسح عنوان الطلب.
    document
        .getElementById(
            "request-subject-input"
        )
        .value =
        "";


    // نمسح التفاصيل.
    document
        .getElementById(
            "request-details-input"
        )
        .value =
        "";


    // نمسح تاريخ الاجتماع.
    document
        .getElementById(
            "meeting-date-input"
        )
        .value =
        "";


    // نمسح وقت البداية.
    document
        .getElementById(
            "meeting-start-time-input"
        )
        .value =
        "";


    // نمسح وقت النهاية.
    document
        .getElementById(
            "meeting-end-time-input"
        )
        .value =
        "";


    // نمسح الملف.
    document
        .getElementById(
            "attachment-file-input"
        )
        .value =
        "";


    // نمسح اسم الملف من المتغير.
    selectedAttachmentName =
        "";


    // نعيد نص رفع الملف.
    document
        .getElementById(
            "attachment-file-name"
        )
        .innerHTML =
        "Click to upload a file";
}



// =========================================================
// عرض الإحصائيات
// =========================================================

// تحسب الإحصائيات الخاصة بالموظف.
function showEmployeeStatistics() {

    // نحصل على طلبات الموظف.
    let employeeRequests =
        getEmployeeRequests();


    // عداد الطلبات النشطة.
    let activeTicketsNumber =
        0;


    // عداد الاجتماعات المؤكدة.
    let confirmedMeetingsNumber =
        0;


    // عداد الطلبات المنتهية.
    let resolvedTicketsNumber =
        0;


    // نمر على الطلبات.
    for (
        let i = 0;
        i < employeeRequests.length;
        i++
    ) {

        // نحفظ الطلب الحالي.
        let request =
            employeeRequests[i];


        // نتحقق إذا كان الطلب نشطًا.
        if (
            request.status != "Resolved" &&
            request.status != "Rejected"
        ) {

            // نزيد العدد.
            activeTicketsNumber++;
        }


        // نتحقق إذا كان الاجتماع مؤكدًا.
        if (
            request.type == "meeting" &&
            request.status == "Confirmed"
        ) {

            // نزيد عدد الاجتماعات.
            confirmedMeetingsNumber++;
        }


        // نتحقق إذا كان الطلب منتهيًا.
        if (
            request.status == "Resolved"
        ) {

            // نزيد العدد.
            resolvedTicketsNumber++;
        }
    }


    // نعرض عدد الطلبات النشطة.
    document
        .getElementById(
            "employee-active-tickets-number"
        )
        .innerHTML =
        activeTicketsNumber;


    // نعرض عدد الاجتماعات.
    document
        .getElementById(
            "employee-meetings-number"
        )
        .innerHTML =
        confirmedMeetingsNumber;


    // نعرض عدد الطلبات المنتهية.
    document
        .getElementById(
            "employee-resolved-number"
        )
        .innerHTML =
        resolvedTicketsNumber;


    // نعرض العدد الكلي للطلبات.
    document
        .getElementById(
            "my-requests-number"
        )
        .innerHTML =
        employeeRequests.length;
}



// =========================================================
// عرض الطلبات الأخيرة
// =========================================================

// تعرض آخر أربعة طلبات.
function showRecentRequests() {

    // نحصل على طلبات الموظف.
    let employeeRequests =
        getEmployeeRequests();


    // نحصل على مكان عرض الطلبات.
    let recentRequestsContainer =
        document.getElementById(
            "recent-requests-container"
        );


    // نمسح المحتوى القديم.
    recentRequestsContainer.innerHTML =
        "";


    // نتحقق إذا لم توجد طلبات.
    if (
        employeeRequests.length == 0
    ) {

        // نعرض رسالة.
        recentRequestsContainer.innerHTML =
            "<p>No requests yet.</p>";


        // نوقف الدالة.
        return;
    }


    // نأخذ أحدث أربعة طلبات.
    let recentRequests =
        employeeRequests.slice(
            0,
            4
        );


    // نمر على الطلبات.
    for (
        let i = 0;
        i < recentRequests.length;
        i++
    ) {

        // نحفظ الطلب الحالي.
        let request =
            recentRequests[i];


        // ننشئ مكانًا لرد الموارد البشرية.
        let hrReplyHtml =
            "";


        // نتحقق إذا كان هناك رد.
        if (
            request.hrReply
        ) {

            // ننشئ شكل الرد.
            hrReplyHtml = `
                <p class="employee-recent-request-reply">
                    <b>HR Reply:</b>
                    ${request.hrReply}
                </p>
            `;
        }


        // نضيف الطلب إلى الصفحة.
        recentRequestsContainer.innerHTML += `
            <div class="employee-recent-request">

                <b>
                    ${request.subject}
                </b>

                <span>
                    ${request.ticket} · ${request.status}
                </span>

                ${hrReplyHtml}

            </div>
        `;
    }
}



// =========================================================
// عرض الاجتماع القادم
// =========================================================

// تعرض أحدث اجتماع للموظف.
function showUpcomingMeeting() {

    // نحصل على طلبات الموظف.
    let employeeRequests =
        getEmployeeRequests();


    // نأخذ الاجتماعات فقط.
    let employeeMeetings =
        employeeRequests.filter(
            function (request) {

                // نستبعد الاجتماعات المرفوضة.
                return request.type == "meeting" &&
                       request.status != "Rejected";
            }
        );


    // نحصل على مكان عرض الاجتماع.
    let upcomingMeetingContainer =
        document.getElementById(
            "upcoming-meeting-content"
        );


    // نتحقق إذا لم توجد اجتماعات.
    if (
        employeeMeetings.length == 0
    ) {

        // نعرض رسالة.
        upcomingMeetingContainer.innerHTML =
            "<p>No meeting scheduled.</p>";


        // نوقف الدالة.
        return;
    }


    // نأخذ أحدث اجتماع.
    let upcomingMeeting =
        employeeMeetings[0];


    // ننشئ متغيرًا لزر الدخول.
    let joinMeetingButtonHtml =
        "";


    // نتحقق إذا تم تأكيد الاجتماع.
    if (
        upcomingMeeting.status ==
        "Confirmed"
    ) {

        // ننشئ زر الدخول.
        joinMeetingButtonHtml = `
            <button
                class="employee-join-meeting-button"
                onclick="employeeJoinMeetingButton(${upcomingMeeting.id})">

                Join Meeting

            </button>
        `;
    }


    // نعرض معلومات الاجتماع.
    upcomingMeetingContainer.innerHTML = `

        <p class="employee-meeting-subject">

            ${upcomingMeeting.subject}

        </p>


        <p class="employee-meeting-information">

            📅 ${upcomingMeeting.meetingDate || upcomingMeeting.date}

        </p>


        <p class="employee-meeting-information">

            🕒 ${upcomingMeeting.startTime} - ${upcomingMeeting.endTime}

        </p>


        <p class="employee-meeting-information">

            ${upcomingMeeting.channel}

        </p>


        <span class="employee-meeting-status">

            ${upcomingMeeting.status}

        </span>


        <div class="employee-meeting-buttons">


            <button
                class="employee-reschedule-meeting-button"
                onclick="employeeRescheduleMeetingButton(${upcomingMeeting.id})">

                Reschedule

            </button>


            ${joinMeetingButtonHtml}


        </div>
    `;
}



// =========================================================
// زر تغيير موعد الاجتماع
// =========================================================

// تعمل عند الضغط على زر تغيير الموعد.
function employeeRescheduleMeetingButton(
    meetingId
) {

    // نحفظ رقم الاجتماع.
    selectedMeetingId =
        meetingId;


    // نبحث عن الاجتماع.
    let meeting =
        helpdeskRequests.find(
            function (request) {

                // نعيد الاجتماع المطلوب.
                return request.id ==
                       meetingId;
            }
        );


    // نتحقق أن الاجتماع موجود.
    if (
        !meeting
    ) {

        // نوقف الدالة.
        return;
    }


    // نضع التاريخ الحالي داخل النافذة.
    document
        .getElementById(
            "employee-reschedule-date-input"
        )
        .value =
        meeting.meetingDate ||
        meeting.date ||
        "";


    // نضع وقت البداية الحالي.
    document
        .getElementById(
            "employee-reschedule-start-time-input"
        )
        .value =
        meeting.startTime || "";


    // نضع وقت النهاية الحالي.
    document
        .getElementById(
            "employee-reschedule-end-time-input"
        )
        .value =
        meeting.endTime || "";


    // نضع طريقة الاجتماع الحالية.
    document
        .getElementById(
            "employee-reschedule-channel-select"
        )
        .value =
        meeting.channel ||
        "Zoom";


    // نظهر النافذة.
    document
        .getElementById(
            "employee-reschedule-popup-background"
        )
        .classList
        .remove(
            "hide-element"
        );
}



// =========================================================
// زر حفظ تغيير الموعد
// =========================================================

// تعمل عند إرسال طلب الموعد الجديد.
function saveEmployeeRescheduleButton() {

    // نبحث عن الاجتماع.
    let meeting =
        helpdeskRequests.find(
            function (request) {

                // نعيد الاجتماع المطلوب.
                return request.id ==
                       selectedMeetingId;
            }
        );


    // نتحقق أن الاجتماع موجود.
    if (
        !meeting
    ) {

        // نوقف الدالة.
        return;
    }


    // نقرأ التاريخ الجديد.
    let newMeetingDate =
        document
            .getElementById(
                "employee-reschedule-date-input"
            )
            .value;


    // نقرأ وقت البداية الجديد.
    let newStartTime =
        document
            .getElementById(
                "employee-reschedule-start-time-input"
            )
            .value;


    // نقرأ وقت النهاية الجديد.
    let newEndTime =
        document
            .getElementById(
                "employee-reschedule-end-time-input"
            )
            .value;


    // نقرأ طريقة الاجتماع.
    let newMeetingChannel =
        document
            .getElementById(
                "employee-reschedule-channel-select"
            )
            .value;


    // نتحقق من الحقول.
    if (
        newMeetingDate == "" ||
        newStartTime == "" ||
        newEndTime == ""
    ) {

        // نعرض رسالة.
        showEmployeePageMessage(
            "Complete the new meeting date and time."
        );


        // نوقف الدالة.
        return;
    }


    // نحفظ التاريخ الجديد.
    meeting.meetingDate =
        newMeetingDate;


    // نحدث التاريخ العام أيضًا.
    meeting.date =
        newMeetingDate;


    // نحفظ وقت البداية.
    meeting.startTime =
        newStartTime;


    // نحفظ وقت النهاية.
    meeting.endTime =
        newEndTime;


    // نحفظ طريقة الاجتماع.
    meeting.channel =
        newMeetingChannel;


    // نغير الحالة حتى يعرف مسؤول الموارد البشرية أن هناك طلب تغيير.
    meeting.status =
        "Reschedule Requested";


    // نسجل أن آخر تعديل جاء من الموظف.
    meeting.lastUpdateBy =
        "EMP";


    // نحفظ البيانات.
    saveHelpdeskRequests();


    // نغلق النافذة.
    closeEmployeeRescheduleButton();


    // نحدث الصفحة.
    showEmployeeHelpdeskPage();


    // نعرض رسالة نجاح.
    showEmployeePageMessage(
        "Reschedule request sent to HR."
    );
}



// =========================================================
// زر إغلاق نافذة تغيير الموعد
// =========================================================

// تعمل عند الضغط على زر الإغلاق.
function closeEmployeeRescheduleButton() {

    // نخفي النافذة.
    document
        .getElementById(
            "employee-reschedule-popup-background"
        )
        .classList
        .add(
            "hide-element"
        );
}



// =========================================================
// زر إلغاء تغيير الموعد
// =========================================================

// تعمل عند الضغط على زر الإلغاء.
function cancelEmployeeRescheduleButton() {

    // نغلق النافذة.
    closeEmployeeRescheduleButton();
}



// =========================================================
// زر الدخول إلى الاجتماع
// =========================================================

// تعمل عند الضغط على زر الدخول.
function employeeJoinMeetingButton(
    meetingId
) {

    // نبحث عن الاجتماع.
    let meeting =
        helpdeskRequests.find(
            function (request) {

                // نعيد الاجتماع المطلوب.
                return request.id ==
                       meetingId;
            }
        );


    // نتحقق أن الاجتماع موجود.
    if (
        !meeting
    ) {

        // نوقف الدالة.
        return;
    }


    // نتحقق أن الموارد البشرية أكدت الاجتماع.
    if (
        meeting.status !=
        "Confirmed"
    ) {

        // نعرض رسالة.
        showEmployeePageMessage(
            "HR has not confirmed this meeting yet."
        );


        // نوقف الدالة.
        return;
    }


    // نتحقق إذا كانت الطريقة زوم.
    if (
        meeting.channel ==
        "Zoom"
    ) {

        // نفتح موقع زوم.
        window.open(
            "https://zoom.us/",
            "_blank"
        );


        // نوقف الدالة.
        return;
    }


    // نتحقق إذا كانت الطريقة جوجل.
    if (
        meeting.channel ==
        "Google Meet"
    ) {

        // نفتح موقع جوجل للاجتماعات.
        window.open(
            "https://meet.google.com/",
            "_blank"
        );


        // نوقف الدالة.
        return;
    }


    // نعرض طريقة الاجتماع إذا كانت مختلفة.
    showEmployeePageMessage(
        "Meeting channel: " +
        meeting.channel
    );
}



// =========================================================
// زر طلباتي
// =========================================================

// تعمل عند الضغط على زر طلباتي.
function myRequestsButton() {

    // ننزل إلى قسم الطلبات بسلاسة.
    document
        .getElementById(
            "my-recent-requests-card"
        )
        .scrollIntoView({

            behavior:
                "smooth"
        });
}



// =========================================================
// زر قواعد الإجازات
// =========================================================

// تعرض إجابة قواعد الإجازات.
function ptoRulesButton() {

    // نعرض الإجابة داخل الصفحة.
    document
        .getElementById(
            "common-answer-text"
        )
        .innerHTML =
        "PTO rollover rules are available in the company Leave & Time Off policy.";
}



// =========================================================
// زر أحداث الحياة
// =========================================================

// تعرض الإجابة الخاصة بالأحداث المهمة.
function lifeEventsButton() {

    // نعرض الإجابة داخل الصفحة.
    document
        .getElementById(
            "common-answer-text"
        )
        .innerHTML =
        "Qualifying life events should be submitted with the required supporting documents.";
}



// =========================================================
// زر العمل عن بعد
// =========================================================

// تعرض سياسة العمل عن بعد.
function remoteWorkButton() {

    // نعرض الإجابة داخل الصفحة.
    document
        .getElementById(
            "common-answer-text"
        )
        .innerHTML =
        "Remote work requests require approval from your manager and HR.";
}



// =========================================================
// رسالة الصفحة
// =========================================================

// تعرض رسالة صغيرة بدل التنبيهات.
function showEmployeePageMessage(
    message
) {

    // نحصل على صندوق الرسالة.
    let messageBox =
        document.getElementById(
            "employee-page-message"
        );


    // نضع النص داخل الصندوق.
    messageBox.innerHTML =
        message;


    // نظهر الرسالة.
    messageBox
        .classList
        .remove(
            "hide-element"
        );


    // ننتظر مدة محددة.
    setTimeout(
        function () {

            // نخفي الرسالة.
            messageBox
                .classList
                .add(
                    "hide-element"
                );
        },

        // نحدد المدة بالمللي ثانية.
        2500
    );
}



// =========================================================
// تحديث صفحة الموظف
// =========================================================

// تحدث جميع المعلومات الموجودة في الصفحة.
function showEmployeeHelpdeskPage() {

    // نقرأ أحدث نسخة من الطلبات.
    helpdeskRequests =
        JSON.parse(
            localStorage.getItem(
                "helpdeskRequests"
            )
        ) || [];


    // نحدث الإحصائيات.
    showEmployeeStatistics();


    // نحدث الطلبات الأخيرة.
    showRecentRequests();


    // نحدث الاجتماع القادم.
    showUpcomingMeeting();
}



// =========================================================
// مزامنة الموظف مع الموارد البشرية
// =========================================================

// نراقب التعديلات القادمة من صفحة أخرى.
window.addEventListener(
    "storage",

    function (event) {

        // نتحقق أن التعديل يخص طلبات المساعدة.
        if (
            event.key ==
            "helpdeskRequests"
        ) {

            // نحدث الصفحة.
            showEmployeeHelpdeskPage();
        }
    }
);



// =========================================================
// تشغيل الصفحة
// =========================================================

// نسترجع المسودة عند فتح الصفحة.
loadEmployeeDraft();


// نعرض بيانات الصفحة.
showEmployeeHelpdeskPage();