// مؤقت - لحين ما نكتب الـ JS الكامل
document.addEventListener("DOMContentLoaded", function () {
    try {
        var user = JSON.parse(localStorage.getItem("loggedUser"));
        if (user && user.name) {
            var parts = user.name.trim().split(/\s+/);
            document.getElementById("sidebarName").textContent = user.name;
            document.getElementById("sidebarDepartment").textContent = user.department || user.position || "Employee";
            document.getElementById("sidebarAvatar").textContent =
                (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
        }
    } catch (error) {
        console.warn("Could not read the logged-in user for Leave & Time Off:", error);
    }

    var btn = document.getElementById("btnRequestTimeOff");
    var modal = document.getElementById("requestModal");
    var closeBtn = document.getElementById("btnCloseModal");
    var cancelBtn = document.getElementById("btnCancelRequest");

    function openModal() {
        modal.classList.add("open");
    }

    function closeModal() {
        modal.classList.remove("open");
        if (window.location.hash === "#request-time-off") {
            history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    }

    if (btn) btn.addEventListener("click", openModal);
    if (window.location.hash === "#request-time-off") openModal();

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
    }
});
