// The session stores the employee ID; the API provides the current profile.
const API = 'http://127.0.0.1:3000';

const elements = {
    profileName: document.getElementById("profileName"),
    employeeId: document.getElementById("employeeId"),
    profilePosition: document.getElementById("profilePosition"),
    profileDepartment: document.getElementById("profileDepartment"),

    fullName: document.getElementById("fullName"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    position: document.getElementById("position"),
    department: document.getElementById("department"),
    joiningDate: document.getElementById("joiningDate"),
    employmentStatus: document.getElementById("employmentStatus"),
    officeLocation: document.getElementById("officeLocation"),

    profileImage: document.getElementById("profileImage")
};


/* =====================================================
   HELPERS
===================================================== */

// Show the value, or the fallback text ("-" if none is given) when it is empty.
function setText(element, value, fallback) {
    if (!element) return;

    const hasValue = value !== undefined && value !== null && value !== "";
    element.textContent = hasValue ? value : (fallback || "-");
}


/* =====================================================
   LOAD SIGNED-IN USER
===================================================== */

async function getEmployeeFromJson() {
    const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('loggedUser') || 'null');
    if (!user) {
        location.replace('../login/login.html');
        throw new Error('No signed-in user');
    }
    // OLD WAY: use the user copied into localStorage at login, then merge
    // extra fields from ../../employee/details/data.json. That could get stale.
    // const employee = JSON.parse(localStorage.getItem('loggedUser'));
    // NEW WAY: use the saved ID to fetch the latest employee from the API.
    const response = await fetch(`${API}/employees/${encodeURIComponent(user.id)}`);
    if (!response.ok) throw new Error('Could not load employee profile.');
    const employee = await response.json();
    if (!employee) throw new Error('Employee not found.');

    // Add the extra fields the profile page shows.
    employee.employeeId = employee.employeeId || employee.id;
    employee.fullName = employee.name;
    employee.employmentStatus = employee.status;
    employee.officeLocation = employee.officeLocation || '—';
    return employee;
}


/* =====================================================
   DISPLAY PROFILE
===================================================== */

function displayEmployee(employee) {
    /* Profile header */
    setText(elements.profileName, employee.fullName, "Employee");
    setText(elements.employeeId, employee.employeeId);
    setText(elements.profilePosition, employee.position);
    setText(elements.profileDepartment, employee.department);

    /* Personal & Employment Information */
    setText(elements.fullName, employee.fullName);
    setText(elements.email, employee.email);
    setText(elements.phone, employee.phone);
    setText(elements.position, employee.position);
    setText(elements.department, employee.department);
    setText(elements.joiningDate, employee.joiningDate);
    setText(elements.employmentStatus, employee.employmentStatus, "Active");
    setText(elements.officeLocation, employee.officeLocation);

    /* Profile image */
    if (elements.profileImage) {
        if (employee.image && employee.image.startsWith('data:')) {
            elements.profileImage.src = employee.image;
        } else {
            elements.profileImage.src = "assets/profile.svg";
        }

        elements.profileImage.alt = employee.fullName || "Employee profile";

        // "this" is the <img> that failed to load.
        elements.profileImage.onerror = function () {
            this.onerror = null;
            this.src = "assets/profile.svg";
        };
    }
}


/* =====================================================
   START
===================================================== */

async function loadProfile() {
    try {
        const employee = await getEmployeeFromJson();
        displayEmployee(employee);
    } catch (error) {
        console.error("Profile could not be loaded:", error);
    }
}


document.addEventListener("DOMContentLoaded", loadProfile);
