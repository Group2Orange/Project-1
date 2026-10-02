// =========================================================
// Main Arrays
// =========================================================

let employees = []; // ننشئ Array فارغة سنضع داخلها بيانات الموظفين القادمة من employee.json.

let leaveRequests = []; // ننشئ Array خاصة بطلبات الإجازات حتى نستخدمها في العرض والتعديل.

let helpdeskRequests = []; // ننشئ Array خاصة بطلبات Helpdesk والاجتماعات القادمة من localStorage.

let currentTab = "all"; // نحفظ هنا الـTab الحالي، والقيمة all تعني عرض جميع الطلبات.

let currentPage = 1; // نبدأ دائمًا من الصفحة الأولى في Pagination.

let requestsPerPage = 4; // نحدد أن كل صفحة تعرض 4 طلبات فقط.

let currentReplyRequestKey = ""; // سنخزن هنا Key الخاص بالطلب الذي ضغط HR على Reply له.

let currentRescheduleRequestKey = ""; // سنخزن هنا Key الخاص بالMeeting الذي نريد تغيير موعده.


// =========================================================
// Load HR Page
// =========================================================

async function loadHrHelpdeskPage() { // هذه الدالة مسؤولة عن جلب بيانات المشروع أول ما الصفحة تفتح.

    try { // نستخدم try حتى لا تتوقف الصفحة لو حدث خطأ أثناء fetch.

        let response = await fetch("../../Data/employee.json"); // نقرأ ملف employee.json الموجود داخل مجلد Data وننتظر انتهاء القراءة.

        let data = await response.json(); // نحول محتوى JSON إلى Object JavaScript نستطيع التعامل معه.

        employees = data.employees || []; // نخزن employees الموجودة داخل JSON وإذا لم توجد نستخدم Array فارغة.

        let savedLeaveRequests = localStorage.getItem("hrLeaveRequests"); // نبحث داخل localStorage إذا كان HR عدل طلبات Leave سابقًا.

        if (savedLeaveRequests) { // نتحقق إذا كانت هناك بيانات محفوظة فعلًا.

            leaveRequests = JSON.parse(savedLeaveRequests); // نحول النص المحفوظ في localStorage إلى Array ونستخدم النسخة المعدلة.

        } else { // إذا لم نجد نسخة معدلة في localStorage.

            leaveRequests = data.leaveRequests || []; // نستخدم Leave Requests الأصلية القادمة من employee.json.
        }

        helpdeskRequests = JSON.parse(localStorage.getItem("helpdeskRequests")) || []; // نقرأ Helpdesk Requests من localStorage ونحولها إلى Array.

        fillCreateTicketEmployeeSelect(); // نضع أسماء الموظفين داخل Select الموجود في Create Ticket Popup.

        showHrHelpdeskPage(); // بعد اكتمال البيانات نعرض الإحصائيات والطلبات على الصفحة.

    } catch (error) { // هذا الجزء يعمل فقط إذا فشلت قراءة JSON أو حدث خطأ آخر.

        console.log(error); // نعرض تفاصيل الخطأ في Console للمطور.

        showPageMessage("Could not load page data."); // نعرض رسالة بسيطة داخل الصفحة بدل alert.
    }
} // نهاية دالة loadHrHelpdeskPage.


// =========================================================
// Find Employee
// =========================================================

function getEmployeeById(employeeId) { // هذه الدالة تستقبل ID موظف وترجع بيانات الموظف كاملة.

    return employees.find(function (employee) { // نستخدم find للبحث داخل Array employees.

        return employee.id == employeeId; // نرجع الموظف الذي يساوي ID الخاص به القيمة المطلوبة.

    }); // نهاية find.

} // نهاية getEmployeeById.


// =========================================================
// Employee Initials
// =========================================================

function getEmployeeInitials(employeeName) { // هذه الدالة تحول Marcus Chen مثلًا إلى MC.

    let employeeNameParts = employeeName.split(" "); // نقسم الاسم إلى كلمات حسب المسافة.

    let firstLetter = employeeNameParts[0][0]; // نأخذ أول حرف من أول اسم.

    let lastLetter = employeeNameParts.length > 1 ? employeeNameParts[employeeNameParts.length - 1][0] : ""; // إذا كان الاسم أكثر من كلمة نأخذ أول حرف من آخر كلمة.

    return (firstLetter + lastLetter).toUpperCase(); // ندمج الحرفين ونحولهم Capital ثم نرجع النتيجة.

} // نهاية getEmployeeInitials.


// =========================================================
// Get All Requests
// =========================================================

function getAllRequests() { // هذه الدالة تجمع Leave Requests وHelpdesk Requests داخل Array واحدة.

    let allRequests = []; // ننشئ Array جديدة ستكون النتيجة النهائية.


    for (let i = 0; i < leaveRequests.length; i++) { // Loop يمر على كل Leave Request.

        let leaveRequest = leaveRequests[i]; // نحفظ Leave Request الحالي في متغير لتسهيل قراءة الكود.

        let employee = getEmployeeById(leaveRequest.employeeId); // نبحث عن الموظف صاحب هذا الطلب.

        allRequests.push({ // نضيف Object جديد موحد الشكل إلى Array allRequests.

            key: "leave-" + leaveRequest.id, // Key داخلي مثل leave-3 حتى نعرف مصدر الطلب وID معًا.

            id: leaveRequest.id, // نحفظ ID الأصلي للطلب.

            source: "leave", // نحدد أن مصدر هذا الطلب هو Leave.

            ticketNumber: "LR-" + leaveRequest.id, // ننشئ Ticket Number خاص بطلب الإجازة.

            employeeName: employee ? employee.name : "Employee", // إذا وجدنا الموظف نضع اسمه وإلا نضع Employee.

            employeeId: employee ? employee.id : "", // إذا الموظف موجود نحفظ ID الخاص به.

            employeePosition: employee ? employee.position : "", // نحفظ وظيفة الموظف إذا كانت موجودة.

            requestType: leaveRequest.type || "Leave & Time Off", // نحدد نوع الطلب وإذا لم يكن موجودًا نضع اسم افتراضي.

            subject: leaveRequest.reason || "Leave Request", // نستخدم سبب الإجازة كعنوان Ticket.

            description: leaveRequest.startDate + " → " + leaveRequest.endDate + " (" + leaveRequest.days + " days)", // ندمج تاريخ البداية والنهاية وعدد الأيام داخل Description.

            status: leaveRequest.status || "Pending", // نأخذ Status وإذا لم يوجد نعتبره Pending.

            date: leaveRequest.submittedAt || "", // نأخذ تاريخ تقديم الطلب.

            createdAt: new Date(leaveRequest.submittedAt).getTime() // نحول تاريخ التقديم إلى رقم حتى نستطيع ترتيب الطلبات.

        }); // نهاية Object الذي أضفناه.

    } // نهاية Loop الخاصة بطلبات Leave.


    for (let i = 0; i < helpdeskRequests.length; i++) { // Loop يمر على كل Helpdesk Request.

        let helpdeskRequest = helpdeskRequests[i]; // نحفظ الطلب الحالي في متغير واضح.

        allRequests.push({ // نضيف Helpdesk Request إلى نفس Array الموحدة.

            key: "help-" + helpdeskRequest.id, // Key داخلي مثل help-173839393.

            id: helpdeskRequest.id, // ID الأصلي.

            source: "helpdesk", // نحدد المصدر.

            ticketNumber: helpdeskRequest.ticket || "TKT-" + helpdeskRequest.id, // نستخدم Ticket Number الموجود أو ننشئ واحدًا احتياطيًا.

            employeeName: helpdeskRequest.employeeName || "Employee", // اسم الموظف.

            employeeId: helpdeskRequest.employeeId || "", // ID الموظف.

            employeePosition: helpdeskRequest.department || "", // نستخدم Department كمعلومة إضافية بجانب الاسم.

            requestType: helpdeskRequest.type == "meeting" ? "1:1 Meeting" : "Helpdesk", // إذا النوع meeting نظهر 1:1 Meeting وإلا Helpdesk.

            subject: helpdeskRequest.subject || "Support Request", // عنوان الطلب.

            description: helpdeskRequest.details || "", // تفاصيل الطلب.

            status: helpdeskRequest.status || "In Review", // Status الحالية.

            date: helpdeskRequest.date || "", // تاريخ الطلب.

            meetingDate: helpdeskRequest.meetingDate || helpdeskRequest.date || "", // تاريخ Meeting إذا كان الطلب Meeting.

            startTime: helpdeskRequest.startTime || "", // وقت البداية.

            endTime: helpdeskRequest.endTime || "", // وقت النهاية.

            channel: helpdeskRequest.channel || "", // Zoom أو Google Meet أو غيره.

            hrReply: helpdeskRequest.hrReply || "", // الرد الذي أرسله HR إن وجد.

            createdAt: helpdeskRequest.createdAt || helpdeskRequest.id || 0 // قيمة نستخدمها في Sorting.

        }); // نهاية Object.

    } // نهاية Loop الخاصة بـHelpdesk.

    return allRequests; // نرجع Array التي تحتوي على جميع الطلبات.

} // نهاية getAllRequests.


// =========================================================
// Filter Requests
// =========================================================

function getFilteredRequests() { // هذه الدالة تطبق Tabs والSearch والFilters والSort.

    let allRequests = getAllRequests(); // نحصل أولًا على جميع الطلبات.

    let searchText = document.getElementById("search-tickets-input").value.toLowerCase().trim(); // نقرأ Search ونحوله لحروف صغيرة ونزيل المسافات الزائدة.

    let ticketTypeFilter = document.getElementById("ticket-type-filter").value; // نقرأ Ticket Type المحدد.

    let ticketStatusFilter = document.getElementById("ticket-status-filter").value; // نقرأ Status المحددة.

    let filteredRequests = []; // Array سنضع داخلها العناصر التي نجحت في جميع Filters.


    for (let i = 0; i < allRequests.length; i++) { // نمر على جميع الطلبات.

        let request = allRequests[i]; // نحفظ الطلب الحالي.


        if (currentTab == "leave" && request.source != "leave") { // إذا Tab الحالي Leave والطلب ليس Leave.

            continue; // نتجاهل الطلب وننتقل للطلب التالي.
        }


        if (currentTab == "helpdesk" && request.source != "helpdesk") { // إذا Tab Helpdesk والطلب ليس Helpdesk.

            continue; // نتجاهله.
        }


        if (ticketTypeFilter == "leave" && request.source != "leave") { // إذا المستخدم اختار Leave من Type Filter.

            continue; // لا نعرض أي نوع آخر.
        }


        if (ticketTypeFilter == "ticket" && request.requestType != "Helpdesk") { // إذا اختار Helpdesk Ticket.

            continue; // نتجاهل غير Helpdesk.
        }


        if (ticketTypeFilter == "meeting" && request.requestType != "1:1 Meeting") { // إذا اختار Meeting.

            continue; // نتجاهل غير Meeting.
        }


        if (ticketStatusFilter != "all" && request.status != ticketStatusFilter) { // إذا اختار Status محددة والطلب Status مختلفة.

            continue; // نتجاهله.
        }


        let searchableText = (request.employeeName + " " + request.subject + " " + request.ticketNumber).toLowerCase(); // ندمج الاسم والعنوان ورقم Ticket في نص واحد للبحث.

        if (searchText != "" && !searchableText.includes(searchText)) { // إذا Search غير فارغ والنص لا يحتوي كلمة البحث.

            continue; // نتجاهل الطلب.
        }


        filteredRequests.push(request); // إذا وصلنا هنا فهذا يعني أن الطلب نجح في جميع Filters لذلك نضيفه.

    } // نهاية Loop.


    let sortValue = document.getElementById("sort-tickets-select").value; // نقرأ طريقة الترتيب.


    filteredRequests.sort(function (firstRequest, secondRequest) { // نرتب Array.

        if (sortValue == "oldest") { // إذا المستخدم اختار Oldest First.

            return firstRequest.createdAt - secondRequest.createdAt; // الأصغر زمنيًا يظهر أولًا.
        }

        return secondRequest.createdAt - firstRequest.createdAt; // غير ذلك الجديد يظهر أولًا.

    }); // نهاية Sort.


    return filteredRequests; // نرجع النتائج النهائية.

} // نهاية getFilteredRequests.


// =========================================================
// Reset Filter Button
// =========================================================

function resetFilterButton() { // هذه الدالة مرتبطة بزر Reset Filter مباشرة.

    document.getElementById("search-tickets-input").value = ""; // نمسح النص الموجود داخل Search.

    document.getElementById("ticket-type-filter").value = "all"; // نعيد Type Filter إلى All Ticket Types.

    document.getElementById("ticket-status-filter").value = "all"; // نعيد Status Filter إلى All Statuses.

    document.getElementById("sort-tickets-select").value = "newest"; // نعيد Sorting إلى Newest First.

    currentTab = "all"; // نعيد Tab الحالي إلى All.

    currentPage = 1; // نعيد Pagination إلى الصفحة الأولى.

    changeActiveTab(".all-tickets-tab"); // نغير الشكل حتى يصبح All Tickets هو Active.

    showEmployeeRequests(); // نعيد عرض Tickets بعد إلغاء Filters.

} // نهاية resetFilterButton.


// =========================================================
// Create Ticket Button
// =========================================================

function createTicketButton() { // هذه الدالة تعمل عندما يضغط HR على Create Ticket on Behalf.

    document.getElementById("create-ticket-subject-input").value = ""; // نمسح Subject القديم.

    document.getElementById("create-ticket-details-input").value = ""; // نمسح Details القديمة.

    document.getElementById("create-ticket-type-select").value = "ticket"; // نعيد Type الافتراضي إلى Ticket.

    createTicketTypeChange(); // نحدث ظهور Meeting Fields بناءً على Type.

    document.getElementById("create-ticket-popup-background").classList.remove("hide-element"); // نزيل Class الإخفاء فيظهر Popup.

} // نهاية createTicketButton.


// =========================================================
// Create Ticket Type Change
// =========================================================

function createTicketTypeChange() { // تعمل عندما يغير HR نوع الطلب من Ticket إلى Meeting أو العكس.

    let ticketType = document.getElementById("create-ticket-type-select").value; // نقرأ النوع المختار.

    let meetingFields = document.getElementById("create-meeting-fields"); // نمسك Div الخاص بحقول Meeting.


    if (ticketType == "meeting") { // إذا النوع Meeting.

        meetingFields.classList.remove("hide-element"); // نظهر Meeting Date وTime وChannel.

    } else { // إذا النوع Ticket.

        meetingFields.classList.add("hide-element"); // نخفي Meeting Fields.
    }

} // نهاية createTicketTypeChange.


// =========================================================
// Save Create Ticket Button
// =========================================================

function saveCreateTicketButton() { // هذه الدالة مرتبطة بزر Create Ticket داخل Popup.

    let employeeId = Number(document.getElementById("create-ticket-employee-select").value); // نقرأ ID الموظف ونحوله Number.

    let employee = getEmployeeById(employeeId); // نحصل على بيانات الموظف كاملة.

    let ticketType = document.getElementById("create-ticket-type-select").value; // نقرأ Ticket Type.

    let subject = document.getElementById("create-ticket-subject-input").value.trim(); // نقرأ Subject ونزيل المسافات الزائدة.

    let details = document.getElementById("create-ticket-details-input").value.trim(); // نقرأ Details.


    if (!employee || subject == "" || details == "") { // نتحقق أن الموظف موجود وأن Subject وDetails غير فارغين.

        showPageMessage("Complete employee, subject and details."); // نعرض رسالة داخل الصفحة.

        return; // نوقف Function ولا ننشئ Ticket.
    }


    let newRequest = { // ننشئ Object جديد يمثل Ticket.

        id: Date.now(), // نستخدم الوقت الحالي كـID فريد.

        createdAt: Date.now(), // نحفظ وقت الإنشاء للSorting.

        ticket: "TKT-" + Math.floor(1000 + Math.random() * 9000), // ننشئ Ticket Number عشوائي من 4 أرقام.

        employeeId: employee.id, // نحفظ ID الموظف.

        employeeName: employee.name, // نحفظ اسمه.

        department: employee.department || employee.position || "", // نحفظ Department أو Position إذا Department غير موجود.

        subject: subject, // نحفظ Subject.

        details: details, // نحفظ Details.

        type: ticketType, // نحفظ Ticket أو Meeting.

        createdBy: "HR", // نحدد أن HR هو من أنشأ الطلب.

        date: new Date().toISOString().slice(0, 10) // نحفظ تاريخ اليوم بشكل YYYY-MM-DD.

    }; // نهاية Object.


    if (ticketType == "meeting") { // إذا HR ينشئ Meeting.

        let meetingDate = document.getElementById("create-meeting-date-input").value; // نقرأ Meeting Date.

        let startTime = document.getElementById("create-meeting-start-time-input").value; // نقرأ Start Time.

        let endTime = document.getElementById("create-meeting-end-time-input").value; // نقرأ End Time.


        if (meetingDate == "" || startTime == "" || endTime == "") { // نتحقق أن جميع معلومات Meeting موجودة.

            showPageMessage("Complete meeting date and time."); // نعرض رسالة.

            return; // نوقف الحفظ.
        }


        newRequest.meetingDate = meetingDate; // نضيف Meeting Date للطلب.

        newRequest.date = meetingDate; // نجعل Date الرئيسي أيضًا تاريخ Meeting.

        newRequest.startTime = startTime; // نحفظ Start Time.

        newRequest.endTime = endTime; // نحفظ End Time.

        newRequest.channel = document.getElementById("create-meeting-channel-select").value; // نحفظ Channel.

        newRequest.status = "Confirmed"; // بما أن HR هو من أنشأ Meeting نعتبرها Confirmed مباشرة.

    } else { // إذا Ticket عادي.

        newRequest.status = "In Review"; // نبدأ Ticket بحالة In Review.
    }


    helpdeskRequests.unshift(newRequest); // نضيف الطلب في بداية Array حتى يظهر أولًا.

    saveRequestsData(); // نحفظ Array داخل localStorage.

    closeCreateTicketButton(); // نغلق Popup.

    showHrHelpdeskPage(); // نحدث الصفحة حتى يظهر Ticket الجديد.

    showPageMessage("Ticket created successfully."); // نعرض رسالة نجاح.

} // نهاية saveCreateTicketButton.


// =========================================================
// Close Create Ticket Button
// =========================================================

function closeCreateTicketButton() { // تعمل عند الضغط على X.

    document.getElementById("create-ticket-popup-background").classList.add("hide-element"); // نخفي Popup.

} // نهاية Function.


// =========================================================
// Cancel Create Ticket Button
// =========================================================

function cancelCreateTicketButton() { // تعمل عند الضغط على Cancel.

    closeCreateTicketButton(); // نستخدم Function الإغلاق بدل تكرار نفس الكود.

} // نهاية Function.


// =========================================================
// Show Message
// =========================================================

function showPageMessage(message) { // تستقبل النص الذي نريد عرضه.

    let messageBox = document.getElementById("hr-page-message"); // نمسك عنصر الرسالة.

    messageBox.innerHTML = message; // نضع النص داخل العنصر.

    messageBox.classList.remove("hide-element"); // نظهر العنصر.

    setTimeout(function () { // نشغل Function بعد وقت محدد.

        messageBox.classList.add("hide-element"); // نخفي الرسالة مرة أخرى.

    }, 2500); // ننتظر 2500ms أي 2.5 ثانية.

} // نهاية showPageMessage.