/* =====================================================
   LEAVE & TIME OFF - EMPLOYEE
   -----------------------------------------------------
   - Read current employee, balances, and requests from the local API
   - عرض بيانات الموظف + الرصيد
   - Upcoming cards + History table
   - Submit Request (Full Day OR Early Departure)
   - Withdraw Request
   - Tabs + Search
   - Validation كامل
   ===================================================== */

/* =====================================================
   1. CONSTANTS
   ===================================================== */
var API = "http://127.0.0.1:3000";
var employeeRecord = null;
var leaveBalances = [];
var leaveRequests = [];

var loggedUser = JSON.parse(localStorage.getItem("loggedUser") || "null");
var currentEmployeeId = loggedUser ? Number(loggedUser.id) : null;

var currentSearchQuery = "";


/* =====================================================
   2. SEED
   ===================================================== */
async function seedData(callback) {
    if (!loggedUser || loggedUser.role !== "EMP") {
        alert("Please sign in with an employee account to view leave information.");
        window.location.href = "../../common/login/login.html";
        return;
    }

    try {
        var urls = [
            API + "/employees/" + encodeURIComponent(currentEmployeeId),
            API + "/leaveBalances?employeeId=" + encodeURIComponent(currentEmployeeId),
            API + "/leaveRequests?employeeId=" + encodeURIComponent(currentEmployeeId)
        ];
        var responses = await Promise.all(urls.map(function (url) { return fetch(url); }));
        if (responses.some(function (response) { return !response.ok; })) throw new Error("Could not load leave data.");
        var data = await Promise.all(responses.map(function (response) { return response.json(); }));
        employeeRecord = data[0];
        leaveBalances = data[1];
        leaveRequests = data[2];
        callback();
    } catch (error) {
        console.error(error);
        alert("Could not load leave data. Start the API with npm run api.");
    }
}


/* =====================================================
   3. STORAGE HELPERS
   ===================================================== */
function getEmployees() {
    return employeeRecord ? [employeeRecord] : [];
}

function getBalances() {
    return leaveBalances;
}

function getRequests() {
    return leaveRequests;
}

async function createRequest(request) {
    var response = await fetch(API + "/leaveRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error("Could not submit leave request.");
    leaveRequests.push(await response.json());
}

function getCurrentEmployee() {
    var list = getEmployees();
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === currentEmployeeId) return list[i];
    }
    return null;
}

function getCurrentBalance() {
    var list = getBalances();
    for (var i = 0; i < list.length; i++) {
        if (list[i].employeeId === currentEmployeeId) return list[i];
    }
    return null;
}

function getCurrentEmployeeRequests() {
    var list = getRequests();
    var result = [];
    for (var i = 0; i < list.length; i++) {
        if (list[i].employeeId === currentEmployeeId) {
            result.push(list[i]);
        }
    }
    return result;
}


/* =====================================================
   4. HELPERS
   ===================================================== */
function padZero(n) {
    return n < 10 ? "0" + n : "" + n;
}

function getTodayString() {
    var today = new Date();
    return today.getFullYear() + "-" + padZero(today.getMonth() + 1) + "-" + padZero(today.getDate());
}

function formatDate(dateStr) {
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var parts = dateStr.split("-");
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
}

function formatShortDate(dateStr) {
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var parts = dateStr.split("-");
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10);
}

function formatRange(startStr, endStr) {
    if (startStr === endStr) return formatDate(startStr);
    return formatShortDate(startStr) + " — " + formatShortDate(endStr) + ", " + endStr.split("-")[0];
}

function daysBetween(startStr, endStr) {
    var s = new Date(startStr);
    var e = new Date(endStr);
    var diff = Math.abs(e - s);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function isPastDate(dateStr) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var d = new Date(dateStr);
    return d < today;
}

function getAvailableDays(type) {
    var bal = getCurrentBalance();
    if (!bal) return 0;
    if (type === "Annual PTO") return bal.annualPto.total - bal.annualPto.used;
    if (type === "Sick Leave") return bal.sickLeave.total - bal.sickLeave.used;
    if (type === "Floating Holiday") return bal.floatingHoliday.total - bal.floatingHoliday.used;
    return bal.unpaid.total - bal.unpaid.used;
}

function getTypeIcon(type) {
    if (type === "Annual PTO") return "event_available";
    if (type === "Sick Leave") return "medical_services";
    if (type === "Floating Holiday") return "celebration";
    if (type === "Unpaid") return "event_busy";
    if (type === "Early Departure") return "schedule";
    return "event";
}

function timeDiffHours(fromTime, toTime) {
    var fromParts = fromTime.split(":");
    var toParts = toTime.split(":");
    var fromMin = parseInt(fromParts[0], 10) * 60 + parseInt(fromParts[1], 10);
    var toMin = parseInt(toParts[0], 10) * 60 + parseInt(toParts[1], 10);
    return (toMin - fromMin) / 60; // ساعات
}


/* =====================================================
   5. VALIDATION HELPERS
   ===================================================== */
function showFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.add("input-error");

    var errEl = document.getElementById(fieldId + "Error");
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = "block";
    }
}

function clearFieldError(fieldId) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.remove("input-error");

    var errEl = document.getElementById(fieldId + "Error");
    if (errEl) {
        errEl.textContent = "";
        errEl.style.display = "none";
    }
}

function clearAllErrors() {
    clearFieldError("leaveType");
    clearFieldError("startDate");
    clearFieldError("endDate");
    clearFieldError("reason");
    clearFieldError("departureDate");
    clearFieldError("fromTime");
    clearFieldError("toTime");
}


/* =====================================================
   6. RENDER SIDEBAR
   ===================================================== */
/* =====================================================
   7. RENDER BALANCE CARDS
   ===================================================== */
function renderBalances() {
    var bal = getCurrentBalance();
    if (!bal) return;

    var annualLeft = bal.annualPto.total - bal.annualPto.used;
    document.getElementById("annualPtoUsed").textContent = annualLeft;
    document.getElementById("annualPtoTotal").textContent = bal.annualPto.total;
    document.getElementById("annualPtoFill").style.width = (annualLeft / bal.annualPto.total * 100) + "%";
    document.getElementById("annualPtoFooter").textContent = bal.annualPto.used + " days used / " + bal.annualPto.total + " total";

    var sickLeft = bal.sickLeave.total - bal.sickLeave.used;
    document.getElementById("sickUsed").textContent = sickLeft;
    document.getElementById("sickTotal").textContent = bal.sickLeave.total;
    document.getElementById("sickFill").style.width = (sickLeft / bal.sickLeave.total * 100) + "%";
    document.getElementById("sickFooter").textContent = bal.sickLeave.used + " days used this fiscal year";

    var fltLeft = bal.floatingHoliday.total - bal.floatingHoliday.used;
    document.getElementById("floatingUsed").textContent = fltLeft;
    document.getElementById("floatingTotal").textContent = bal.floatingHoliday.total;
    document.getElementById("floatingFill").style.width = (fltLeft / bal.floatingHoliday.total * 100) + "%";
    document.getElementById("floatingFooter").textContent = "Expires " + formatDate(bal.floatingHoliday.expiresOn);

    var unpaidLeft = bal.unpaid.total - bal.unpaid.used;
    document.getElementById("unpaidUsed").textContent = unpaidLeft;
    document.getElementById("unpaidTotal").textContent = bal.unpaid.total;
    document.getElementById("unpaidFill").style.width = (unpaidLeft / bal.unpaid.total * 100) + "%";
    document.getElementById("unpaidFooter").textContent = "Discretionary / unpaid days";
}


/* =====================================================
   8. RENDER UPCOMING CARDS
   ===================================================== */
function renderUpcomingCards() {
    var all = getCurrentEmployeeRequests();
    var container = document.getElementById("upcomingCards");
    container.innerHTML = "";

    var upcoming = [];
    for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.status === "Pending") {
            upcoming.push(r);
        } else if (r.status === "Approved" && !isPastDate(r.startDate)) {
            upcoming.push(r);
        }
    }

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-message">No upcoming time off scheduled.</p>';
        document.getElementById("upcomingMeta").textContent = "0 Scheduled Periods";
        return;
    }

    document.getElementById("upcomingMeta").textContent =
        upcoming.length + " Scheduled Period" + (upcoming.length > 1 ? "s" : "");

    for (var j = 0; j < upcoming.length; j++) {
        container.appendChild(buildUpcomingCard(upcoming[j]));
    }
}

function buildUpcomingCard(req) {
    var isEarly = req.type === "Early Departure";
    var card = document.createElement("div");
    card.className = "upcoming-card " + (req.status === "Pending" ? "pending" : "approved");

    // Header
    var header = document.createElement("div");
    header.className = "upcoming-card-header";

    var title = document.createElement("div");
    title.className = "upcoming-card-title";
    var dot = document.createElement("span");
    dot.className = "status-dot " + (req.status === "Pending" ? "pending" : "approved");
    title.appendChild(dot);
    title.appendChild(document.createTextNode(
        req.status === "Pending" ? "Pending Manager Review" : "Approved"
    ));

    var days = document.createElement("div");
    days.className = "upcoming-days";
    var daysStrong = document.createElement("strong");
    if (isEarly) {
        daysStrong.textContent = req.fromTime + " - " + req.toTime;
    } else {
        daysStrong.textContent = req.days;
    }
    days.appendChild(daysStrong);
    days.appendChild(document.createTextNode(isEarly ? "Hours" : "Working days"));

    header.appendChild(title);
    header.appendChild(days);
    card.appendChild(header);

    // Date pill
    var pill = document.createElement("div");
    pill.className = "date-pill";
    if (isEarly) {
        pill.innerHTML = '<span class="material-symbols-outlined">schedule</span>' + formatDate(req.startDate);
    } else {
        pill.innerHTML = '<span class="material-symbols-outlined">calendar_today</span>' + formatRange(req.startDate, req.endDate);
    }
    card.appendChild(pill);

    // Meta
    var meta = document.createElement("div");
    meta.className = "upcoming-meta";
    meta.appendChild(buildMetaItem("Type", req.type));

    if (req.status === "Pending") {
        meta.appendChild(buildMetaItem("Reviewer", req.reviewer || "—"));
        meta.appendChild(buildMetaItem("Submitted", formatDate(req.submittedAt)));
    } else {
        meta.appendChild(buildMetaItem("Approved By", req.approvedBy || req.reviewer || "—"));
        if (req.handoverPartner) {
            meta.appendChild(buildMetaItem("Handover Partner", req.handoverPartner));
        }
    }
    card.appendChild(meta);

    // Withdraw button
    if (req.status === "Pending") {
        var btn = document.createElement("button");
        btn.className = "btn-withdraw";
        btn.textContent = "Withdraw Request";
        btn.setAttribute("data-id", req.id);
        btn.addEventListener("click", function () {
            var id = parseInt(this.getAttribute("data-id"), 10);
            withdrawRequest(id);
        });
        card.appendChild(btn);
    }

    return card;
}

function buildMetaItem(label, value) {
    var item = document.createElement("div");
    item.className = "upcoming-meta-item";
    var span = document.createElement("span");
    span.textContent = label;
    var strong = document.createElement("strong");
    strong.textContent = value;
    item.appendChild(span);
    item.appendChild(strong);
    return item;
}


/* =====================================================
   9. RENDER HISTORY TABLE
   ===================================================== */
function renderHistoryTable() {
    var all = getCurrentEmployeeRequests();
    var tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = "";

    var history = [];
    for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.status === "Approved" && isPastDate(r.startDate)) {
            history.push(r);
        } else if (r.status === "Rejected") {
            history.push(r);
        }
    }

    var filtered = [];
    for (var k = 0; k < history.length; k++) {
        var row = history[k];
        var text = (row.type + " " + (row.reason || "") + " " + row.status + " " + row.startDate).toLowerCase();
        if (currentSearchQuery === "" || text.indexOf(currentSearchQuery) !== -1) {
            filtered.push(row);
        }
    }

    if (filtered.length === 0) {
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.setAttribute("colspan", "5");
        td.className = "empty-message";
        td.textContent = currentSearchQuery !== ""
            ? 'No results found for "' + currentSearchQuery + '"'
            : "No leave history yet.";
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        for (var m = 0; m < filtered.length; m++) {
            tbody.appendChild(buildHistoryRow(filtered[m]));
        }
    }

    document.getElementById("paginationInfo").textContent =
        "Showing " + filtered.length + " of " + history.length + " total leave events";
}

function buildHistoryRow(req) {
    var isEarly = req.type === "Early Departure";
    var tr = document.createElement("tr");

    // Type
    var tdType = document.createElement("td");
    var typeCell = document.createElement("div");
    typeCell.className = "leave-type-cell";
    var icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = getTypeIcon(req.type);
    typeCell.appendChild(icon);
    typeCell.appendChild(document.createTextNode(req.type));
    tdType.appendChild(typeCell);
    tr.appendChild(tdType);

    // Range
    var tdRange = document.createElement("td");
    if (isEarly) {
        tdRange.textContent = formatDate(req.startDate) + " (" + req.fromTime + " - " + req.toTime + ")";
    } else {
        tdRange.textContent = formatRange(req.startDate, req.endDate);
    }
    tr.appendChild(tdRange);

    // Duration
    var tdDur = document.createElement("td");
    if (isEarly) {
        var hours = timeDiffHours(req.fromTime, req.toTime);
        tdDur.textContent = hours + " hour" + (hours !== 1 ? "s" : "");
    } else {
        tdDur.textContent = req.days + " day" + (req.days > 1 ? "s" : "");
    }
    tr.appendChild(tdDur);

    // Reason
    var tdReason = document.createElement("td");
    tdReason.textContent = req.reason || "—";
    tr.appendChild(tdReason);

    // Status
    var tdStatus = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = "status-badge " + req.status.toLowerCase();
    var badgeIcon = document.createElement("span");
    badgeIcon.className = "material-symbols-outlined";
    badgeIcon.textContent = req.status === "Approved" ? "check_circle" : "cancel";
    badge.appendChild(badgeIcon);
    badge.appendChild(document.createTextNode(req.status));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    return tr;
}


/* =====================================================
   10. TAB COUNTS
   ===================================================== */
function renderTabCounts() {
    var all = getCurrentEmployeeRequests();
    var upcomingCount = 0;
    var historyCount = 0;

    for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.status === "Pending" || (r.status === "Approved" && !isPastDate(r.startDate))) {
            upcomingCount++;
        } else {
            historyCount++;
        }
    }

    document.getElementById("tabCountAll").textContent = all.length;
    document.getElementById("tabCountUpcoming").textContent = upcomingCount;
    document.getElementById("tabCountHistory").textContent = historyCount;
}


/* =====================================================
   11. MODAL - Open/Close + Reset
   ===================================================== */
function openModal() {
    document.getElementById("requestModal").classList.add("open");

    // نعبي الـ dropdown من الرصيد
    renderDropdown();

    // تاريخ اليوم للـ Early Departure
    document.getElementById("departureDate").value = getTodayString();

    // نرجع الـ Radio لـ Full Day
    document.querySelector('input[name="requestKind"][value="fullDay"]').checked = true;
    toggleRequestKind();

    clearAllErrors();
}

function closeModal() {
    document.getElementById("requestModal").classList.remove("open");

    // نفضي الفورم
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("reason").value = "";
    document.getElementById("halfDay").checked = false;
    document.getElementById("leaveType").selectedIndex = 0;
    document.getElementById("fromTime").value = "";
    document.getElementById("toTime").value = "";

    clearAllErrors();
}

function renderDropdown() {
    var bal = getCurrentBalance();
    if (!bal) return;

    var annualLeft = bal.annualPto.total - bal.annualPto.used;
    var sickLeft = bal.sickLeave.total - bal.sickLeave.used;
    var fltLeft = bal.floatingHoliday.total - bal.floatingHoliday.used;
    var unpaidLeft = bal.unpaid.total - bal.unpaid.used;

    var sel = document.getElementById("leaveType");
    sel.options[0].text = "Annual PTO — " + annualLeft + " days left";
    sel.options[1].text = "Sick Leave — " + sickLeft + " days left";
    sel.options[2].text = "Floating Holiday — " + fltLeft + " days left";
    sel.options[3].text = "Unpaid — " + unpaidLeft + " days available";
}

function toggleRequestKind() {
    var kind = document.querySelector('input[name="requestKind"]:checked').value;
    var fullBlock = document.getElementById("fullDayBlock");
    var earlyBlock = document.getElementById("earlyDepartureBlock");

    clearAllErrors();

    if (kind === "fullDay") {
        fullBlock.classList.remove("hidden");
        earlyBlock.classList.add("hidden");
    } else {
        fullBlock.classList.add("hidden");
        earlyBlock.classList.remove("hidden");
    }
}


/* =====================================================
   12. SUBMIT REQUEST (with Validation)
   ===================================================== */
async function handleSubmitRequest() {
    clearAllErrors();

    var kind = document.querySelector('input[name="requestKind"]:checked').value;

    if (kind === "fullDay") {
        await submitFullDayRequest();
    } else {
        await submitEarlyDepartureRequest();
    }
}

async function submitFullDayRequest() {
    var type = document.getElementById("leaveType").value;
    var startDate = document.getElementById("startDate").value;
    var endDate = document.getElementById("endDate").value;
    var reason = document.getElementById("reason").value.trim();
    var halfDay = document.getElementById("halfDay").checked;

    var hasError = false;

    if (!type) {
        showFieldError("leaveType", "Please select a leave type.");
        hasError = true;
    }

    if (!startDate) {
        showFieldError("startDate", "Start date is required.");
        hasError = true;
    } else if (startDate < getTodayString()) {
        showFieldError("startDate", "Start date cannot be in the past.");
        hasError = true;
    }

    if (!endDate) {
        showFieldError("endDate", "End date is required.");
        hasError = true;
    } else if (startDate && endDate < startDate) {
        showFieldError("endDate", "End date must be after start date.");
        hasError = true;
    }

    if (reason !== "" && reason.length < 5) {
        showFieldError("reason", "Reason must be at least 5 characters.");
        hasError = true;
    }

    if (hasError) return;

    var days = daysBetween(startDate, endDate);
    

    var newRequest = {
        employeeId: currentEmployeeId,
        type: type,
        startDate: startDate,
        endDate: endDate,
        days: days,
        halfDay: halfDay,
        reason: reason,
        status: "Pending",
        reviewer: "Sarah Jenkins",
        submittedAt: getTodayString()
    };

    try {
        await createRequest(newRequest);
    } catch (error) {
        alert(error.message + " Start the API with npm run api.");
        return;
    }

    console.log("✅ Full Day Request submitted:", newRequest);

    closeModal();
    refreshAll();
    alert("✅ Request submitted successfully!");
}

async function submitEarlyDepartureRequest() {
    var departureDate = document.getElementById("departureDate").value;
    var fromTime = document.getElementById("fromTime").value;
    var toTime = document.getElementById("toTime").value;
    var reason = document.getElementById("reason").value.trim();

    var hasError = false;

    if (!departureDate) {
        showFieldError("departureDate", "Departure date is missing.");
        hasError = true;
    }

    if (!fromTime) {
        showFieldError("fromTime", "From time is required.");
        hasError = true;
    }

    if (!toTime) {
        showFieldError("toTime", "To time is required.");
        hasError = true;
    }

    if (fromTime && toTime && toTime <= fromTime) {
        showFieldError("toTime", "To time must be after from time.");
        hasError = true;
    }

    if (reason !== "" && reason.length < 5) {
        showFieldError("reason", "Reason must be at least 5 characters.");
        hasError = true;
    }

    if (hasError) return;

    var hours = timeDiffHours(fromTime, toTime);

    if (hours > 8) {
        showFieldError("toTime", "Early departure cannot exceed 8 hours.");
        return;
    }

    var newRequest = {
        employeeId: currentEmployeeId,
        type: "Early Departure",
        startDate: departureDate,
        endDate: departureDate,
        days: 0,
        halfDay: true,
        fromTime: fromTime,
        toTime: toTime,
        reason: reason,
        status: "Pending",
        reviewer: "Sarah Jenkins",
        submittedAt: getTodayString()
    };

    try {
        await createRequest(newRequest);
    } catch (error) {
        alert(error.message + " Start the API with npm run api.");
        return;
    }

    console.log("✅ Early Departure Request submitted:", newRequest);

    closeModal();
    refreshAll();
    alert("✅ Early departure request submitted successfully!");
}


/* =====================================================
   13. WITHDRAW REQUEST
   ===================================================== */
async function withdrawRequest(id) {
    if (!confirm("Are you sure you want to withdraw this request?")) return;
    var request = leaveRequests.find(function (item) { return String(item.id) === String(id); });
    if (!request || Number(request.employeeId) !== currentEmployeeId) return;
    try {
        var response = await fetch(API + "/leaveRequests/" + encodeURIComponent(id), { method: "DELETE" });
        if (!response.ok) throw new Error("Could not withdraw request.");
        leaveRequests = leaveRequests.filter(function (item) { return String(item.id) !== String(id); });
    } catch (error) {
        alert(error.message + " Start the API with npm run api.");
        return;
    }
    console.log("✅ Request withdrawn:", id);
    refreshAll();
}


/* =====================================================
   14. TABS
   ===================================================== */
function switchTab(tabName) {
    var tabAll = document.getElementById("tabAll");
    var tabUpcoming = document.getElementById("tabUpcoming");
    var tabHistory = document.getElementById("tabHistory");

    var upcomingSection = document.getElementById("upcomingSection");
    var historySection = document.getElementById("historySection");

    tabAll.classList.remove("active");
    tabUpcoming.classList.remove("active");
    tabHistory.classList.remove("active");

    if (tabName === "all") {
        tabAll.classList.add("active");
        upcomingSection.classList.remove("hidden");
        historySection.classList.remove("hidden");
    } else if (tabName === "upcoming") {
        tabUpcoming.classList.add("active");
        upcomingSection.classList.remove("hidden");
        historySection.classList.add("hidden");
    } else {
        tabHistory.classList.add("active");
        upcomingSection.classList.add("hidden");
        historySection.classList.remove("hidden");
    }
}


/* =====================================================
   15. REFRESH ALL
   ===================================================== */
function refreshAll() {
    renderBalances();
    renderUpcomingCards();
    renderHistoryTable();
    renderTabCounts();
}


/* =====================================================
   16. INIT
   ===================================================== */
document.addEventListener("DOMContentLoaded", function () {

    seedData(function () {
        refreshAll();
        if (location.hash === "#request-time-off") openModal();
    });

    // Modal
    document.getElementById("btnRequestTimeOff").addEventListener("click", openModal);
    document.getElementById("btnCloseModal").addEventListener("click", closeModal);
    document.getElementById("btnCancelRequest").addEventListener("click", closeModal);
    document.getElementById("btnSubmitRequest").addEventListener("click", handleSubmitRequest);

    // Radio: Full Day / Early Departure
    var radios = document.querySelectorAll('input[name="requestKind"]');
    for (var i = 0; i < radios.length; i++) {
        radios[i].addEventListener("change", toggleRequestKind);
    }

    // Tabs
    document.getElementById("tabAll").addEventListener("click", function () { switchTab("all"); });
    document.getElementById("tabUpcoming").addEventListener("click", function () { switchTab("upcoming"); });
    document.getElementById("tabHistory").addEventListener("click", function () { switchTab("history"); });

    // Search
    document.getElementById("searchInput").addEventListener("input", function () {
        currentSearchQuery = this.value.trim().toLowerCase();
        renderHistoryTable();
        if (currentSearchQuery !== "") {
            switchTab("history");
        }
    });

    // Live Validation - إخفاء الأخطاء عند التعديل
    document.getElementById("leaveType").addEventListener("change", function () { clearFieldError("leaveType"); });

    document.getElementById("startDate").addEventListener("input", function () {
        clearFieldError("startDate");
        var endDate = document.getElementById("endDate").value;
        if (endDate && endDate < this.value) {
            showFieldError("endDate", "End date must be after start date.");
        } else {
            clearFieldError("endDate");
        }
    });

    document.getElementById("endDate").addEventListener("input", function () { clearFieldError("endDate"); });
    document.getElementById("reason").addEventListener("input", function () { clearFieldError("reason"); });
    document.getElementById("fromTime").addEventListener("input", function () { clearFieldError("fromTime"); });
    document.getElementById("toTime").addEventListener("input", function () { clearFieldError("toTime"); });
});
