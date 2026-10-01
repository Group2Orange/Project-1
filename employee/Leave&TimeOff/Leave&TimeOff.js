// مؤقت - لحين ما نكتب الـ JS الكامل
document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("btnRequestTimeOff");
    var modal = document.getElementById("requestModal");
    var closeBtn = document.getElementById("btnCloseModal");
    var cancelBtn = document.getElementById("btnCancelRequest");

    if (btn) {
        btn.addEventListener("click", function () {
            modal.classList.add("open");
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            modal.classList.remove("open");
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
            modal.classList.remove("open");
        });
    }
});