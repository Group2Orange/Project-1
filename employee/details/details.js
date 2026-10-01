
// ===============================
// GET LOGGED-IN USER
// ===============================

const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));


// ===============================
// CHECK LOGIN
// ===============================

if (!loggedUser) {

    alert("Please login first.");

    window.location.href = "../../common/login/login.html";

}


// ===============================
// CREATE INITIALS
// ===============================

const initials = loggedUser.fullName
    .split(" ")
    .map(name => name.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();


// ===============================
// SIDEBAR
// ===============================

document.getElementById("profileAvatar").textContent = initials;

document.getElementById("sideName").textContent =
    loggedUser.fullName;

document.getElementById("sidePosition").textContent =
    loggedUser.position;


// ===============================
// MAIN PROFILE
// ===============================

document.getElementById("mainAvatar").textContent =
    initials;

document.getElementById("name").textContent =
    loggedUser.fullName;

document.getElementById("position").textContent =
    loggedUser.position;

document.getElementById("emailText").textContent =
    loggedUser.email;

document.getElementById("phone").textContent =
    loggedUser.phone;

document.getElementById("officeLocation").textContent =
    loggedUser.officeLocation;

document.getElementById("joinDate").textContent =
    loggedUser.joiningDate;


// ===============================
// EMPLOYMENT INFORMATION
// ===============================

document.getElementById("inputName").value =
    loggedUser.fullName;

document.getElementById("inputEmail").value =
    loggedUser.email;

document.getElementById("inputDate").value =
    loggedUser.joiningDate;

document.getElementById("inputPosition").value =
    loggedUser.position;

document.getElementById("inputID").value =
    loggedUser.employeeId;

document.getElementById("inputDepartment").value =
    loggedUser.department;

document.getElementById("inputSalary").value =
    loggedUser.salary.amount;

document.getElementById("currency").textContent =
    loggedUser.salary.currency;

document.getElementById("inputStatus").value =
    loggedUser.employmentStatus;


// ===============================
// HEADER STATUS
// ===============================

document.getElementById("headerStatus").textContent =
    loggedUser.employmentStatus;
