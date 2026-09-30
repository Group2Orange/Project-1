
/* =====================================================
   1. CONSTANTS & KEYS
   ===================================================== */

var storageKeyEmployees = "hr_employees";
var jsonFilePath = "emploee.json";


var currentEmployeeId = 2;

/*
  
   var currentEmployeeId = Number(localStorage.getItem("currentUserId"));
*/


/* =====================================================
   2. SEED DATA (JSON → localStorage) - مرة وحدة فقط
   ===================================================== */

function seedEmployees() {
    var existing = localStorage.getItem(storageKeyEmployees);

    // إذا البيانات موجودة من قبل، ما نقرأ من JSON
    if (existing) {
        console.log("✅ Data already in localStorage");
        renderEmployeeFromStorage();
        return;
    }

    // أول مرة: نقرأ من JSON
    fetch(jsonFilePath)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP Error: " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            // نخزن الموظفين فقط بـ localStorage
            localStorage.setItem(
                storageKeyEmployees,
                JSON.stringify(data.employees)
            );
            console.log("✅ Seeded employees from JSON");

            // نعرض البيانات
            renderEmployeeFromStorage();
        })
        .catch(function (error) {
            console.error("❌ Failed to load JSON:", error);
            alert("Could not load employee data. Make sure you run via local server.");
        });
}


/* =====================================================
   3. STORAGE HELPERS
   ===================================================== */

function getEmployees() {
    var raw = localStorage.getItem(storageKeyEmployees);
    if (!raw) return [];
    return JSON.parse(raw);
}

function saveEmployees(list) {
    localStorage.setItem(storageKeyEmployees, JSON.stringify(list));
}

function getCurrentEmployee() {
    var list = getEmployees();

    for (var i = 0; i < list.length; i++) {
        if (list[i].id === currentEmployeeId) {
            return list[i];
        }
    }
    return null;
}

function updateEmployee(updated) {
    var list = getEmployees();

    for (var i = 0; i < list.length; i++) {
        if (list[i].id === updated.id) {
            // نحدث الحقول المطلوبة فقط
            list[i].name = updated.name;
            list[i].phone = updated.phone;
            if (updated.image) {
                list[i].image = updated.image;
            }
            saveEmployees(list);
            return true;
        }
    }
    return false;
}


/* =====================================================
   4. RENDER (تعبئة الفورم ببيانات الموظف)
   ===================================================== */

function renderEmployeeFromStorage() {
    var emp = getCurrentEmployee();

    if (!emp) {
        console.error("Employee not found. ID = " + currentEmployeeId);
        alert("Employee not found.");
        return;
    }

    // --- Header ---
    document.getElementById("employeeName").textContent = emp.name;

    var imgEl = document.getElementById("profileImage");
    if (emp.image) {
        imgEl.style.backgroundImage = "url('" + emp.image + "')";
    }

    // --- Editable Fields ---
    document.getElementById("fullName").value = emp.name || "";
    document.getElementById("phone").value = emp.phone || "";

    // --- Read-Only Fields ---
    document.getElementById("position").value = emp.position || "";
    document.getElementById("department").value = emp.department || "";
    document.getElementById("email").value = emp.email || "";
    document.getElementById("employeeId").value = emp.id || "";
}


/* =====================================================
   5. PHONE VALIDATION (Regular Expression)
   ===================================================== */

function isValidPhone(phone) {
    // يقبل: +9627XXXXXXXX أو 07XXXXXXXX
    var clean = phone.replace(/\s/g, "");
    var pattern = /^(\+9627|07)\d{8}$/;
    return pattern.test(clean);
}

function showPhoneError(show) {
    var input = document.getElementById("phone");
    var icon = document.getElementById("phoneErrorIcon");
    var msg = document.getElementById("phoneErrorMessage");
    var badge = document.getElementById("phoneValidationText");

    if (show) {
        input.classList.add("error-input");
        icon.style.display = "inline-block";
        msg.style.display = "block";
        badge.style.display = "inline";
    } else {
        input.classList.remove("error-input");
        icon.style.display = "none";
        msg.style.display = "none";
        badge.style.display = "none";
    }
}


/* =====================================================
   6. PHOTO UPLOAD (Preview)
   ===================================================== */

function handlePhotoUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
    }

    var reader = new FileReader();

    reader.onload = function (e) {
        var dataUrl = e.target.result;

        // نعرض الصورة على الفور
        document.getElementById("profileImage").style.backgroundImage =
            "url('" + dataUrl + "')";

        // نخزن الصورة مؤقتاً بمتغير عام (رح تنحفظ لما يضغط Save)
        window.tempNewImage = dataUrl;
    };

    reader.readAsDataURL(file);
}


/* =====================================================
   7. SAVE (تخزين التعديلات على localStorage)
   ===================================================== */

function handleSave(event) {
    event.preventDefault();

    var emp = getCurrentEmployee();
    if (!emp) return;

    var fullName = document.getElementById("fullName").value.trim();
    var phone = document.getElementById("phone").value.trim();

    // --- Validation ---
    var hasError = false;

    if (!fullName) {
        document.getElementById("fullName").classList.add("error-input");
        hasError = true;
    } else {
        document.getElementById("fullName").classList.remove("error-input");
    }

    if (!isValidPhone(phone)) {
        showPhoneError(true);
        hasError = true;
    } else {
        showPhoneError(false);
    }

    if (hasError) return;

    // --- Build updated object ---
    var updated = {
        id: emp.id,
        name: fullName,
        phone: phone
    };

    if (window.tempNewImage) {
        updated.image = window.tempNewImage;
    }

    // --- Save ---
    var ok = updateEmployee(updated);

    if (ok) {
        // نحدث العنوان
        document.getElementById("employeeName").textContent = fullName;

        // نمسح الصورة المؤقتة
        window.tempNewImage = null;

        alert("✅ Profile updated successfully!");
    } else {
        alert("❌ Failed to update profile. Please try again.");
    }
}


/* =====================================================
   8. CANCEL (إرجاع البيانات الأصلية)
   ===================================================== */

function handleCancel() {
    // نمسح الصورة المؤقتة
    window.tempNewImage = null;

    // نرجع البيانات الأصلية
    renderEmployeeFromStorage();

    // نمسح رسائل الخطأ
    showPhoneError(false);
    document.getElementById("fullName").classList.remove("error-input");
}


/* =====================================================
   9. INIT - نقطة البداية
   ===================================================== */

window.addEventListener("load", function () {

    // أول شي: نشغّل الـ seed
    // (إذا البيانات موجودة، بتعرض مباشرة من localStorage)
    seedEmployees();

    // --- Events ---
    document
        .getElementById("editProfileForm")
        .addEventListener("submit", handleSave);

    document
        .getElementById("btnCancel")
        .addEventListener("click", handleCancel);

    document
        .getElementById("photoInput")
        .addEventListener("change", handlePhotoUpload);

    // Live validation للهاتف
    document
        .getElementById("phone")
        .addEventListener("blur", function () {
            var val = this.value.trim();
            if (val && !isValidPhone(val)) {
                showPhoneError(true);
            } else {
                showPhoneError(false);
            }
        });
});