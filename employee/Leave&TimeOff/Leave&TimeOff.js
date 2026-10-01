/* =====================================================
   LEAVE & TIME OFF - Temporary Combined Script
   -----------------------------------------------------
   - فتح/إغلاق الـ Modal (Request Time Off)
   - Tabs: All / Upcoming / History
   - Search: يفلتر جدول History
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    /* ============================================
       1. MODAL - Request Time Off
       ============================================ */
    var btnRequestTimeOff = document.getElementById("btnRequestTimeOff");
    var requestModal = document.getElementById("requestModal");
    var btnCloseModal = document.getElementById("btnCloseModal");
    var btnCancelRequest = document.getElementById("btnCancelRequest");

    if (btnRequestTimeOff) {
        btnRequestTimeOff.addEventListener("click", function () {
            requestModal.classList.add("open");
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", function () {
            requestModal.classList.remove("open");
        });
    }

    if (btnCancelRequest) {
        btnCancelRequest.addEventListener("click", function () {
            requestModal.classList.remove("open");
        });
    }


    /* ============================================
       2. TABS - Switching
       ============================================ */
    var tabAll = document.getElementById("tabAll");
    var tabUpcoming = document.getElementById("tabUpcoming");
    var tabHistory = document.getElementById("tabHistory");

    var upcomingSection = document.getElementById("upcomingSection");
    var historySection = document.getElementById("historySection");

    function clearActiveTabs() {
        tabAll.classList.remove("active");
        tabUpcoming.classList.remove("active");
        tabHistory.classList.remove("active");
    }

    // All → يظهر الاثنين
    tabAll.addEventListener("click", function () {
        clearActiveTabs();
        tabAll.classList.add("active");

        upcomingSection.classList.remove("hidden");
        historySection.classList.remove("hidden");
    });

    // Upcoming → يخفي History
    tabUpcoming.addEventListener("click", function () {
        clearActiveTabs();
        tabUpcoming.classList.add("active");

        upcomingSection.classList.remove("hidden");
        historySection.classList.add("hidden");
    });

    // History → يخفي Upcoming
    tabHistory.addEventListener("click", function () {
        clearActiveTabs();
        tabHistory.classList.add("active");

        upcomingSection.classList.add("hidden");
        historySection.classList.remove("hidden");
    });


    /* ============================================
       3. SEARCH - Filter History Table
       ============================================ */
    var searchInput = document.getElementById("searchInput");
    var historyTableBody = document.getElementById("historyTableBody");

    searchInput.addEventListener("input", function () {
        var query = searchInput.value.trim().toLowerCase();

        var rows = historyTableBody.getElementsByTagName("tr");
        var visibleCount = 0;

        for (var i = 0; i < rows.length; i++) {
            // تجاهل صف "No results" إذا كان موجود من قبل
            if (rows[i].classList.contains("empty-message-row")) {
                continue;
            }

            var rowText = rows[i].textContent.toLowerCase();

            if (query === "" || rowText.indexOf(query) !== -1) {
                rows[i].classList.remove("hidden");
                visibleCount = visibleCount + 1;
            } else {
                rows[i].classList.add("hidden");
            }
        }

        // نحذف رسالة "No results" القديمة إذا موجودة
        var oldEmpty = historyTableBody.querySelector(".empty-message-row");
        if (oldEmpty) {
            oldEmpty.remove();
        }

        // نضيف رسالة إذا ما في نتائج
        if (visibleCount === 0 && query !== "") {
            var emptyRow = document.createElement("tr");
            emptyRow.className = "empty-message-row";
            emptyRow.innerHTML = '<td colspan="5" class="empty-message">No results found for "' + query + '"</td>';
            historyTableBody.appendChild(emptyRow);
        }

        // إذا كتب المستخدم → ننقله لتاب History
        if (query !== "") {
            clearActiveTabs();
            tabHistory.classList.add("active");
            upcomingSection.classList.add("hidden");
            historySection.classList.remove("hidden");
        }
    });

});