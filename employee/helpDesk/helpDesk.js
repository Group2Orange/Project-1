// =========================================================
// Logged Employee
// =========================================================

let loggedEmployee = JSON.parse(localStorage.getItem("loggedUser")) || {}; // نقرأ بيانات الموظف الذي سجل دخوله من localStorage وإذا لم نجد بيانات نستخدم Object فارغ.

let helpdeskRequests = JSON.parse(localStorage.getItem("helpdeskRequests")) || []; // نقرأ جميع Helpdesk Requests المشتركة بين HR وEmployee وإذا لم توجد نستخدم Array فارغة.

let selectedRequestType = "ticket"; // نحدد أن نوع الطلب الافتراضي عند فتح الصفحة هو Standard Ticket.

let selectedMeetingChannel = "Zoom"; // نحدد أن Zoom هو Meeting Channel الافتراضي.

let selectedAttachmentName = ""; // نخزن هنا اسم الملف الذي يختاره الموظف.

let selectedMeetingId = null; // نخزن هنا ID الخاص بالMeeting الذي يريد الموظف تغيير موعده.


// =========================================================
// Save Helpdesk Requests
// =========================================================

function saveHelpdeskRequests() { // هذه الدالة تحفظ Helpdesk Requests داخل localStorage حتى يستطيع HR وEmployee قراءتها.

    localStorage.setItem("helpdeskRequests", JSON.stringify(helpdeskRequests)); // نحول Array إلى JSON Text ثم نحفظها باستخدام المفتاح helpdeskRequests.

} // نهاية saveHelpdeskRequests.


// =========================================================
// Get Employee Requests
// =========================================================

function getEmployeeRequests() { // هذه الدالة ترجع طلبات الموظف الحالي فقط بدل عرض طلبات جميع الموظفين.

    return helpdeskRequests.filter(function (request) { // نستخدم filter لإنشاء Array جديدة تحتوي على طلبات الموظف الحالي فقط.

        return String(request.employeeId) == String(loggedEmployee.id); // نقارن employeeId داخل الطلب مع ID الموظف المسجل دخوله.

    }); // نهاية filter.

} // نهاية getEmployeeRequests.


// =========================================================
// Standard Ticket Button
// =========================================================

function standardTicketButton() { // تعمل هذه الدالة عندما يضغط المستخدم على Standard Ticket.

    selectedRequestType = "ticket"; // نغير نوع الطلب الحالي إلى ticket.

    document.getElementById("standard-ticket-button").classList.add("selected-request-type"); // نضيف التصميم Active لزر Standard Ticket.

    document.getElementById("live-meeting-button").classList.remove("selected-request-type"); // نزيل Active من Meeting Button.

    document.getElementById("meeting-information-section").classList.add("hide-element"); // نخفي Meeting Information لأنها غير مطلوبة في Standard Ticket.

    document.querySelector(".submit-request-button").innerHTML = "Submit Request"; // نغير نص زر Submit إلى Submit Request.

} // نهاية standardTicketButton.


// =========================================================
// Live Meeting Button
// =========================================================

function liveMeetingButton() { // تعمل عند الضغط على 1:1 Live Meeting.

    selectedRequestType = "meeting"; // نغير نوع الطلب الحالي إلى meeting.

    document.getElementById("live-meeting-button").classList.add("selected-request-type"); // نضيف Active لزر Meeting.

    document.getElementById("standard-ticket-button").classList.remove("selected-request-type"); // نزيل Active من Standard Ticket.

    document.getElementById("meeting-information-section").classList.remove("hide-element"); // نظهر Meeting Date وTime وChannel.

    document.querySelector(".submit-request-button").innerHTML = "Request Meeting"; // نغير نص Submit حتى يكون واضحًا أنه سيرسل Meeting Request.

} // نهاية liveMeetingButton.


// =========================================================
// Zoom Channel Button
// =========================================================

function zoomChannelButton() { // تعمل عند الضغط على Zoom.

    selectMeetingChannel("Zoom", "zoom-channel-button"); // نرسل اسم Channel وID الزر إلى Function مساعدة.

} // نهاية zoomChannelButton.


// =========================================================
// Google Meet Channel Button
// =========================================================

function googleMeetChannelButton() { // تعمل عند الضغط على Google Meet.

    selectMeetingChannel("Google Meet", "google-meet-channel-button"); // نحدد Google Meet كـChannel.

} // نهاية googleMeetChannelButton.


// =========================================================
// HR Room Channel Button
// =========================================================

function hrRoomChannelButton() { // تعمل عند الضغط على HR Room.

    selectMeetingChannel("HR Room", "hr-room-channel-button"); // نحدد HR Room كـChannel.

} // نهاية hrRoomChannelButton.


// =========================================================
// Phone Call Channel Button
// =========================================================

function phoneCallChannelButton() { // تعمل عند الضغط على Phone Call.

    selectMeetingChannel("Phone Call", "phone-call-channel-button"); // نحدد Phone Call كـChannel.

} // نهاية phoneCallChannelButton.


// =========================================================
// Select Meeting Channel
// =========================================================

function selectMeetingChannel(channelName, buttonId) { // Function مساعدة تستقبل اسم Channel وID الزر المحدد.

    selectedMeetingChannel = channelName; // نحفظ Channel الذي اختاره الموظف داخل المتغير العام.

    let meetingChannelButtons = document.querySelectorAll(".zoom-channel-button, .google-meet-channel-button, .hr-room-channel-button, .phone-call-channel-button"); // نحصل على جميع Channel Buttons.

    for (let i = 0; i < meetingChannelButtons.length; i++) { // نمر على كل Buttons.

        meetingChannelButtons[i].classList.remove("selected-meeting-channel"); // نزيل التصميم Active من جميع Buttons.

    } // نهاية Loop.

    document.getElementById(buttonId).classList.add("selected-meeting-channel"); // نضيف Active فقط للزر الذي اختاره الموظف.

} // نهاية selectMeetingChannel.


// =========================================================
// Attachment Input Change
// =========================================================

function attachmentFileInputChange() { // تعمل عند اختيار ملف.

    let attachmentInput = document.getElementById("attachment-file-input"); // نحصل على File Input.

    if (attachmentInput.files.length > 0) { // نتحقق أن المستخدم اختار ملفًا فعلًا.

        selectedAttachmentName = attachmentInput.files[0].name; // نأخذ اسم أول ملف ونخزنه.

        document.getElementById("attachment-file-name").innerHTML = selectedAttachmentName; // نعرض اسم الملف داخل Upload Box.

    } // نهاية if.

} // نهاية attachmentFileInputChange.


// =========================================================
// Save Draft Button
// =========================================================

function saveDraftButton() { // تعمل عند الضغط على Save Draft.

    let requestDraft = { // ننشئ Object يحتوي على القيم الحالية الموجودة داخل Form.

        type: selectedRequestType, // نحفظ Ticket أو Meeting.

        category: document.getElementById("request-category-select").value, // نحفظ Category.

        subject: document.getElementById("request-subject-input").value, // نحفظ Subject حتى لو لم يكتمل.

        details: document.getElementById("request-details-input").value, // نحفظ Details.

        meetingDate: document.getElementById("meeting-date-input").value, // نحفظ Meeting Date.

        startTime: document.getElementById("meeting-start-time-input").value, // نحفظ Start Time.

        endTime: document.getElementById("meeting-end-time-input").value, // نحفظ End Time.

        channel: selectedMeetingChannel, // نحفظ Channel المختار.

        attachment: selectedAttachmentName // نحفظ اسم Attachment.

    }; // نهاية Object.

    localStorage.setItem("helpdeskDraft_" + loggedEmployee.id, JSON.stringify(requestDraft)); // نحفظ Draft بمفتاح يحتوي ID الموظف حتى يكون لكل موظف Draft خاص به.

    showEmployeePageMessage("Draft saved successfully."); // نظهر Toast بدل Alert.

} // نهاية saveDraftButton.


// =========================================================
// Load Employee Draft
// =========================================================

function loadEmployeeDraft() { // تستعيد Draft عندما يفتح الموظف الصفحة مرة أخرى.

    let savedDraft = localStorage.getItem("helpdeskDraft_" + loggedEmployee.id); // نبحث عن Draft خاص بالموظف الحالي.

    if (!savedDraft) { // إذا لا يوجد Draft.

        return; // نخرج من Function بدون تنفيذ باقي الكود.
    }

    let requestDraft = JSON.parse(savedDraft); // نحول Draft المحفوظ من JSON Text إلى Object.

    document.getElementById("request-category-select").value = requestDraft.category || "Payroll, Bonus & Compensation"; // نعيد Category المحفوظة.

    document.getElementById("request-subject-input").value = requestDraft.subject || ""; // نعيد Subject.

    document.getElementById("request-details-input").value = requestDraft.details || ""; // نعيد Details.

    document.getElementById("meeting-date-input").value = requestDraft.meetingDate || ""; // نعيد Meeting Date.

    document.getElementById("meeting-start-time-input").value = requestDraft.startTime || ""; // نعيد Start Time.

    document.getElementById("meeting-end-time-input").value = requestDraft.endTime || ""; // نعيد End Time.

    selectedAttachmentName = requestDraft.attachment || ""; // نعيد اسم Attachment.

    if (selectedAttachmentName != "") { // إذا كان Draft يحتوي Attachment.

        document.getElementById("attachment-file-name").innerHTML = selectedAttachmentName; // نعرض اسم الملف.
    }

    selectedMeetingChannel = requestDraft.channel || "Zoom"; // نعيد Channel أو Zoom كقيمة افتراضية.

    if (requestDraft.type == "meeting") { // إذا كان Draft Meeting.

        liveMeetingButton(); // نفعل Meeting Mode.

    } else { // إذا كان Ticket.

        standardTicketButton(); // نفعل Standard Ticket Mode.
    }

} // نهاية loadEmployeeDraft.


// =========================================================
// Submit Request Button
// =========================================================

function submitRequestButton() { // هذه أهم Function وتعمل عند إرسال Ticket أو Meeting.

    let requestSubject = document.getElementById("request-subject-input").value.trim(); // نقرأ Subject ونزيل المسافات من بدايته ونهايته.

    let requestDetails = document.getElementById("request-details-input").value.trim(); // نقرأ Details ونزيل المسافات الزائدة.


    if (requestSubject == "" || requestDetails == "") { // نتحقق أن Subject وDetails ليسا فارغين.

        showEmployeePageMessage("Enter the subject and request details."); // نعرض Validation Message.

        return; // نوقف Function ولا نرسل الطلب.
    }


    let newRequest = { // ننشئ Object جديد يمثل الطلب.

        id: Date.now(), // نعطي الطلب ID فريد باستخدام الوقت الحالي.

        createdAt: Date.now(), // نحفظ وقت الإنشاء أيضًا للSorting.

        ticket: "TKT-" + Math.floor(1000 + Math.random() * 9000), // ننشئ رقم Ticket عشوائي من 4 أرقام.

        employeeId: loggedEmployee.id, // نحفظ ID الموظف الحالي حتى يعرف HR صاحب الطلب.

        employeeName: loggedEmployee.name || "Employee", // نحفظ اسم الموظف.

        department: loggedEmployee.department || loggedEmployee.position || "Employee", // نحفظ القسم أو الوظيفة.

        category: document.getElementById("request-category-select").value, // نحفظ Category.

        subject: requestSubject, // نحفظ Subject.

        details: requestDetails, // نحفظ Details.

        attachment: selectedAttachmentName, // نحفظ اسم الملف المرفق.

        type: selectedRequestType, // نحفظ ticket أو meeting.

        createdBy: "EMP", // نحدد أن الطلب أرسله Employee.

        date: new Date().toISOString().slice(0, 10) // نحفظ تاريخ اليوم بصيغة YYYY-MM-DD.

    }; // نهاية Object.


    if (selectedRequestType == "meeting") { // هذا الجزء يعمل فقط إذا الموظف اختار Meeting.

        let meetingDate = document.getElementById("meeting-date-input").value; // نقرأ Meeting Date.

        let meetingStartTime = document.getElementById("meeting-start-time-input").value; // نقرأ Start Time.

        let meetingEndTime = document.getElementById("meeting-end-time-input").value; // نقرأ End Time.


        if (meetingDate == "" || meetingStartTime == "" || meetingEndTime == "") { // نتحقق أن الموظف أكمل معلومات Meeting.

            showEmployeePageMessage("Choose meeting date and time."); // نعرض رسالة Validation.

            return; // لا نرسل Meeting.
        }


        newRequest.meetingDate = meetingDate; // نضيف Meeting Date للـObject.

        newRequest.date = meetingDate; // نستخدم Meeting Date كتاريخ الطلب المعروض أيضًا.

        newRequest.startTime = meetingStartTime; // نحفظ Start Time.

        newRequest.endTime = meetingEndTime; // نحفظ End Time.

        newRequest.channel = selectedMeetingChannel; // نحفظ Zoom أو Google Meet أو غيره.

        newRequest.status = "Pending Meeting"; // نحدد أن Meeting تنتظر موافقة HR.

    } else { // إذا كان Standard Ticket.

        newRequest.status = "In Review"; // يبدأ Ticket بحالة In Review.
    }


    helpdeskRequests.unshift(newRequest); // نضيف الطلب في بداية Array حتى يكون أحدث طلب.

    saveHelpdeskRequests(); // نحفظ جميع الطلبات في localStorage ليستطيع HR رؤيتها.

    localStorage.removeItem("helpdeskDraft_" + loggedEmployee.id); // نحذف Draft بعد إرسال الطلب بنجاح.

    clearRequestForm(); // نفرغ Form بعد الإرسال.

    showEmployeeHelpdeskPage(); // نحدث Statistics وRecent Requests وMeeting.

    if (selectedRequestType == "meeting") { // إذا كان الذي أرسله المستخدم Meeting.

        showEmployeePageMessage("Meeting request sent to HR."); // نوضح أنه ينتظر HR.

    } else { // إذا كان Standard Ticket.

        showEmployeePageMessage("Request submitted successfully."); // نعرض رسالة نجاح.
    }

} // نهاية submitRequestButton.


// =========================================================
// Clear Request Form
// =========================================================

function clearRequestForm() { // تنظف Form بعد الإرسال.

    document.getElementById("request-subject-input").value = ""; // نمسح Subject.

    document.getElementById("request-details-input").value = ""; // نمسح Details.

    document.getElementById("meeting-date-input").value = ""; // نمسح Date.

    document.getElementById("meeting-start-time-input").value = ""; // نمسح Start Time.

    document.getElementById("meeting-end-time-input").value = ""; // نمسح End Time.

    document.getElementById("attachment-file-input").value = ""; // نمسح File Input.

    selectedAttachmentName = ""; // نمسح اسم الملف المحفوظ في JavaScript.

    document.getElementById("attachment-file-name").innerHTML = "Click to upload a file"; // نعيد Upload Text للوضع الأصلي.

} // نهاية clearRequestForm.


// =========================================================
// Show Employee Statistics
// =========================================================

function showEmployeeStatistics() { // تحسب الأرقام الموجودة أعلى الصفحة.

    let employeeRequests = getEmployeeRequests(); // نحصل فقط على طلبات الموظف الحالي.

    let activeTicketsNumber = 0; // عداد Active Tickets يبدأ من صفر.

    let confirmedMeetingsNumber = 0; // عداد Meetings المؤكدة يبدأ من صفر.

    let resolvedTicketsNumber = 0; // عداد Resolved يبدأ من صفر.


    for (let i = 0; i < employeeRequests.length; i++) { // نمر على جميع طلبات الموظف.

        let request = employeeRequests[i]; // الطلب الحالي.


        if (request.status != "Resolved" && request.status != "Rejected") { // إذا الطلب ليس Resolved ولا Rejected.

            activeTicketsNumber++; // نعتبره Active ونزيد العداد.
        }


        if (request.type == "meeting" && request.status == "Confirmed") { // إذا الطلب Meeting ومؤكد من HR.

            confirmedMeetingsNumber++; // نزيد عداد Meetings.
        }


        if (request.status == "Resolved") { // إذا Status هي Resolved.

            resolvedTicketsNumber++; // نزيد العداد.
        }

    } // نهاية Loop.


    document.getElementById("employee-active-tickets-number").innerHTML = activeTicketsNumber; // نعرض Active Tickets.

    document.getElementById("employee-meetings-number").innerHTML = confirmedMeetingsNumber; // نعرض Meetings.

    document.getElementById("employee-resolved-number").innerHTML = resolvedTicketsNumber; // نعرض Resolved.

    document.getElementById("my-requests-number").innerHTML = employeeRequests.length; // نعرض العدد الكلي بجانب My Requests.

} // نهاية showEmployeeStatistics.


// =========================================================
// Show Recent Requests
// =========================================================

function showRecentRequests() { // تعرض آخر طلبات الموظف في Right Side.

    let employeeRequests = getEmployeeRequests(); // نحصل على طلبات الموظف الحالي.

    let recentRequestsContainer = document.getElementById("recent-requests-container"); // نمسك Container.

    recentRequestsContainer.innerHTML = ""; // نمسح العرض القديم قبل إعادة بناء القائمة.


    if (employeeRequests.length == 0) { // إذا لم يقدم الموظف أي طلب.

        recentRequestsContainer.innerHTML = "<p>No requests yet.</p>"; // نعرض رسالة.

        return; // نخرج من Function.
    }


    let recentRequests = employeeRequests.slice(0, 4); // نأخذ أحدث 4 Requests فقط.


    for (let i = 0; i < recentRequests.length; i++) { // نمر على أحدث 4 Requests.

        let request = recentRequests[i]; // الطلب الحالي.

        let hrReplyHtml = ""; // نبدأ بدون HR Reply.


        if (request.hrReply) { // إذا HR أرسل Reply للطلب.

            hrReplyHtml = `
                <p class="employee-recent-request-reply">
                    <b>HR Reply:</b>
                    ${request.hrReply}
                </p>
            `; // ننشئ HTML يحتوي الرد.
        }


        recentRequestsContainer.innerHTML += `
            <div class="employee-recent-request">
                <b>${request.subject}</b>
                <span>${request.ticket} · ${request.status}</span>
                ${hrReplyHtml}
            </div>
        `; // نضيف الطلب داخل Container.

    } // نهاية Loop.

} // نهاية showRecentRequests.


// =========================================================
// Show Upcoming Meeting
// =========================================================

function showUpcomingMeeting() { // تعرض أحدث Meeting للموظف.

    let employeeRequests = getEmployeeRequests(); // نحصل على Requests الخاصة بالموظف.

    let employeeMeetings = employeeRequests.filter(function (request) { // نأخذ Meetings فقط.

        return request.type == "meeting" && request.status != "Rejected"; // نستبعد Meetings المرفوضة.

    }); // نهاية Filter.


    let upcomingMeetingContainer = document.getElementById("upcoming-meeting-content"); // نمسك Container الخاص بالMeeting.


    if (employeeMeetings.length == 0) { // إذا لا توجد Meetings.

        upcomingMeetingContainer.innerHTML = "<p>No meeting scheduled.</p>"; // نعرض رسالة.

        return; // نخرج من Function.
    }


    let upcomingMeeting = employeeMeetings[0]; // نأخذ أحدث Meeting لأن الطلبات محفوظة من الأحدث للأقدم.

    let joinMeetingButtonHtml = ""; // افتراضيًا لا نعرض Join Button.


    if (upcomingMeeting.status == "Confirmed") { // Join يظهر فقط إذا HR أكد Meeting.

        joinMeetingButtonHtml = `
            <button class="employee-join-meeting-button"
                    onclick="employeeJoinMeetingButton(${upcomingMeeting.id})">
                Join Meeting
            </button>
        `; // ننشئ Join Button.
    }


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

            <button class="employee-reschedule-meeting-button"
                    onclick="employeeRescheduleMeetingButton(${upcomingMeeting.id})">
                Reschedule
            </button>

            ${joinMeetingButtonHtml}

        </div>
    `; // نعرض معلومات Meeting وأزرارها.

} // نهاية showUpcomingMeeting.


// =========================================================
// Employee Reschedule Meeting Button
// =========================================================

function employeeRescheduleMeetingButton(meetingId) { // تعمل عندما يضغط Employee على Reschedule.

    selectedMeetingId = meetingId; // نحفظ ID الاجتماع الذي سيتم تعديله.

    let meeting = helpdeskRequests.find(function (request) { // نبحث عن Meeting داخل جميع Requests.

        return request.id == meetingId; // نرجع Request الذي ID الخاص به مطابق.

    }); // نهاية Find.


    if (!meeting) { // إذا لم نجد Meeting.

        return; // نوقف Function.
    }


    document.getElementById("employee-reschedule-date-input").value = meeting.meetingDate || meeting.date || ""; // نضع التاريخ الحالي داخل Popup.

    document.getElementById("employee-reschedule-start-time-input").value = meeting.startTime || ""; // نضع Start Time الحالي.

    document.getElementById("employee-reschedule-end-time-input").value = meeting.endTime || ""; // نضع End Time الحالي.

    document.getElementById("employee-reschedule-channel-select").value = meeting.channel || "Zoom"; // نضع Channel الحالي.

    document.getElementById("employee-reschedule-popup-background").classList.remove("hide-element"); // نظهر Popup.

} // نهاية employeeRescheduleMeetingButton.


// =========================================================
// Save Employee Reschedule Button
// =========================================================

function saveEmployeeRescheduleButton() { // تعمل عند الضغط على Request Reschedule داخل Popup.

    let meeting = helpdeskRequests.find(function (request) { // نبحث عن Meeting الذي خزنا ID الخاص به.

        return request.id == selectedMeetingId; // نرجع Meeting المطلوب.

    }); // نهاية Find.


    if (!meeting) { // إذا لم نجده.

        return; // نوقف Function.
    }


    let newMeetingDate = document.getElementById("employee-reschedule-date-input").value; // نقرأ التاريخ الجديد.

    let newStartTime = document.getElementById("employee-reschedule-start-time-input").value; // نقرأ Start Time الجديد.

    let newEndTime = document.getElementById("employee-reschedule-end-time-input").value; // نقرأ End Time الجديد.

    let newMeetingChannel = document.getElementById("employee-reschedule-channel-select").value; // نقرأ Channel الجديد.


    if (newMeetingDate == "" || newStartTime == "" || newEndTime == "") { // نتحقق أن الموظف أكمل Date وTimes.

        showEmployeePageMessage("Complete the new meeting date and time."); // نظهر رسالة.

        return; // نوقف الحفظ.
    }


    meeting.meetingDate = newMeetingDate; // نحفظ التاريخ الجديد.

    meeting.date = newMeetingDate; // نحدث Date أيضًا.

    meeting.startTime = newStartTime; // نحفظ Start Time.

    meeting.endTime = newEndTime; // نحفظ End Time.

    meeting.channel = newMeetingChannel; // نحفظ Channel.

    meeting.status = "Reschedule Requested"; // نغير Status حتى يعرف HR أن الموظف يريد تغيير الموعد.

    meeting.lastUpdateBy = "EMP"; // نسجل أن آخر تعديل جاء من الموظف.

    saveHelpdeskRequests(); // نحفظ التعديلات في localStorage.

    closeEmployeeRescheduleButton(); // نغلق Popup.

    showEmployeeHelpdeskPage(); // نحدث الصفحة.

    showEmployeePageMessage("Reschedule request sent to HR."); // نظهر رسالة نجاح.

} // نهاية saveEmployeeRescheduleButton.


// =========================================================
// Close Employee Reschedule Button
// =========================================================

function closeEmployeeRescheduleButton() { // تعمل عند الضغط على X.

    document.getElementById("employee-reschedule-popup-background").classList.add("hide-element"); // نخفي Popup.

} // نهاية Function.


// =========================================================
// Cancel Employee Reschedule Button
// =========================================================

function cancelEmployeeRescheduleButton() { // تعمل عند الضغط على Cancel.

    closeEmployeeRescheduleButton(); // نستخدم نفس Function الخاصة بالإغلاق حتى لا نكرر الكود.

} // نهاية Function.


// =========================================================
// Employee Join Meeting Button
// =========================================================

function employeeJoinMeetingButton(meetingId) { // تعمل عند الضغط على Join Meeting.

    let meeting = helpdeskRequests.find(function (request) { // نبحث عن Meeting حسب ID.

        return request.id == meetingId; // نرجع Meeting المطلوب.

    }); // نهاية Find.


    if (!meeting) { // إذا لم نجد Meeting.

        return; // نوقف Function.
    }


    if (meeting.status != "Confirmed") { // إذا HR لم يؤكد Meeting بعد.

        showEmployeePageMessage("HR has not confirmed this meeting yet."); // نظهر رسالة.

        return; // لا نفتح Meeting.
    }


    if (meeting.channel == "Zoom") { // إذا Channel هي Zoom.

        window.open("https://zoom.us/", "_blank"); // نفتح Zoom في Tab جديد.

        return; // نوقف Function بعد فتح Zoom.
    }


    if (meeting.channel == "Google Meet") { // إذا Channel هي Google Meet.

        window.open("https://meet.google.com/", "_blank"); // نفتح Google Meet.

        return; // نوقف Function.
    }


    showEmployeePageMessage("Meeting channel: " + meeting.channel); // إذا HR Room أو Phone Call نعرض اسم Channel داخل Toast.

} // نهاية employeeJoinMeetingButton.


// =========================================================
// My Requests Button
// =========================================================

function myRequestsButton() { // تعمل عند الضغط على My Requests.

    document.getElementById("my-recent-requests-card").scrollIntoView({ behavior: "smooth" }); // تنزل الصفحة بسلاسة إلى Recent Requests Card.

} // نهاية myRequestsButton.


// =========================================================
// PTO Rules Button
// =========================================================

function ptoRulesButton() { // تعمل عند الضغط على PTO Rollover Rules.

    document.getElementById("common-answer-text").innerHTML = "PTO rollover rules are available in the company Leave & Time Off policy."; // نعرض الإجابة داخل Card بدل alert.

} // نهاية ptoRulesButton.


// =========================================================
// Life Events Button
// =========================================================

function lifeEventsButton() { // تعمل عند الضغط على Qualifying Life Events.

    document.getElementById("common-answer-text").innerHTML = "Qualifying life events should be submitted with the required supporting documents."; // نعرض الإجابة.

} // نهاية lifeEventsButton.


// =========================================================
// Remote Work Button
// =========================================================

function remoteWorkButton() { // تعمل عند الضغط على Remote Work Policy.

    document.getElementById("common-answer-text").innerHTML = "Remote work requests require approval from your manager and HR."; // نعرض الإجابة داخل الصفحة.

} // نهاية remoteWorkButton.


// =========================================================
// Employee Page Message
// =========================================================

function showEmployeePageMessage(message) { // Function عامة لعرض رسالة صغيرة بدل alert.

    let messageBox = document.getElementById("employee-page-message"); // نحصل على عنصر الرسالة.

    messageBox.innerHTML = message; // نضع الرسالة المطلوبة داخله.

    messageBox.classList.remove("hide-element"); // نظهر الرسالة.

    setTimeout(function () { // نستخدم Timer حتى تختفي الرسالة تلقائيًا.

        messageBox.classList.add("hide-element"); // نعيد إخفاء الرسالة.

    }, 2500); // يتم الإخفاء بعد 2.5 ثانية.

} // نهاية showEmployeePageMessage.


// =========================================================
// Show Employee Helpdesk Page
// =========================================================

function showEmployeeHelpdeskPage() { // Function واحدة مسؤولة عن تحديث معلومات الصفحة.

    helpdeskRequests = JSON.parse(localStorage.getItem("helpdeskRequests")) || []; // نقرأ أحدث نسخة من Requests لأن HR ربما عدلها.

    showEmployeeStatistics(); // نحدث Statistics.

    showRecentRequests(); // نحدث Recent Requests.

    showUpcomingMeeting(); // نحدث Upcoming Meeting.

} // نهاية showEmployeeHelpdeskPage.


// =========================================================
// Sync HR And Employee
// =========================================================

window.addEventListener("storage", function (event) { // هذا Event يعمل عندما يتغير localStorage من Tab آخر.

    if (event.key == "helpdeskRequests") { // نتحقق أن الذي تغير هو Helpdesk Requests.

        showEmployeeHelpdeskPage(); // نقرأ التعديل الجديد ونحدث الصفحة فورًا.

    } // نهاية if.

}); // نهاية Storage Event.


// =========================================================
// Start Page
// =========================================================

loadEmployeeDraft(); // أولًا نحاول استرجاع Draft قديم للموظف.

showEmployeeHelpdeskPage(); // ثم نعرض Statistics وRequests وMeeting الحالية.