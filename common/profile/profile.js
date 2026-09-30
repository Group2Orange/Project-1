/* =====================================================
   PROFILE PAGE
===================================================== */

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
    officeLocation: document.getElementById("officeLocation"),
    employmentStatus: document.getElementById("employmentStatus"),
    profileImage: document.getElementById("profileImage"),
    navbarAvatar: document.getElementById("navbarAvatar"),
    navbarUserName: document.getElementById("navbarUserName"),
    navbarUserPosition: document.getElementById("navbarUserPosition"),
    logoutBtn: document.getElementById("logoutBtn"),
    menuBtn: document.getElementById("menuBtn"),
    mainNav: document.getElementById("mainNav")
};

const defaultEmployee = {
    fullName: "Sarah Jenkins",
    email: "sarah.j@teamspace.hr",
    phone: "+1 (555) 349-2041",
    position: "HR Lead",
    department: "Human Resources",
    joiningDate: "March 15, 2021",
    employeeId: "EMP-1892",
    employmentStatus: "Full-Time Active",
    officeLocation: "Headquarters • Austin, TX (Hybrid)",
    image: "assets/profile.jpg"
};

function getCurrentEmployee() {
    const raw = localStorage.getItem("currentEmployee");

    if (!raw) {
        localStorage.setItem("currentEmployee", JSON.stringify(defaultEmployee));
        return { ...defaultEmployee };
    }

    try {
        const storedEmployee = JSON.parse(raw);
        return { ...defaultEmployee, ...storedEmployee };
    } catch (error) {
        console.error("Could not read currentEmployee from localStorage:", error);
        return { ...defaultEmployee };
    }
}

function setText(element, value, fallback = "-") {
    if (element) {
        element.textContent = value || fallback;
    }
}

function displayEmployee() {
    const employee = getCurrentEmployee();

    setText(elements.profileName, employee.fullName, "Employee");
    setText(elements.employeeId, employee.employeeId);
    setText(elements.profilePosition, employee.position);
    setText(elements.profileDepartment, employee.department);

    setText(elements.fullName, employee.fullName);
    setText(elements.email, employee.email);
    setText(elements.phone, employee.phone);
    setText(elements.position, employee.position);
    setText(elements.department, employee.department);
    setText(elements.joiningDate, employee.joiningDate);
    setText(elements.officeLocation, employee.officeLocation);
    setText(elements.employmentStatus, employee.employmentStatus, "Active");

    setText(elements.navbarUserName, employee.fullName, "Employee");
    setText(elements.navbarUserPosition, employee.position, "");

    const imagePath = employee.image || defaultEmployee.image;

    if (elements.profileImage) {
        elements.profileImage.src = imagePath;
        elements.profileImage.alt = employee.fullName || "Employee profile";
    }

    if (elements.navbarAvatar) {
        elements.navbarAvatar.src = imagePath;
        elements.navbarAvatar.alt = employee.fullName || "Employee";
    }
}

if (elements.menuBtn && elements.mainNav) {
    elements.menuBtn.addEventListener("click", () => {
        elements.mainNav.classList.toggle("show");
    });
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
        // Remove the session only. Keep currentEmployee as profile data.
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
    });
}

document.addEventListener("DOMContentLoaded", displayEmployee);
