/* =====================================================
   PROFILE PAGE
   Signed-in data: loggedUser in localStorage
   Optional office details: employee/details/data.json
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
    employmentStatus: document.getElementById("employmentStatus"),
    officeLocation: document.getElementById("officeLocation"),

    profileImage: document.getElementById("profileImage")
};


/* =====================================================
   HELPERS
===================================================== */

function setText(element, value, fallback = "-") {
    if (!element) return;

    element.textContent =
        value !== undefined &&
        value !== null &&
        value !== ""
            ? value
            : fallback;
}


function getProfileStorageKey(employeeId) {
    return `profileEdits_${employeeId}`;
}


function getSavedEdits(employeeId) {
    const key = getProfileStorageKey(employeeId);
    const saved = localStorage.getItem(key);

    if (!saved) {
        return {};
    }

    try {
        const parsed = JSON.parse(saved);

        return parsed &&
               typeof parsed === "object" &&
               !Array.isArray(parsed)
            ? parsed
            : {};
    } catch (error) {
        console.error(
            "Could not read profile edits from localStorage:",
            error
        );

        return {};
    }
}


/* =====================================================
   LOAD SIGNED-IN USER
===================================================== */

async function getEmployeeFromJson() {
    const user = JSON.parse(localStorage.getItem('loggedUser') || 'null');
    if (!user) {
        location.replace('../login/login.html');
        throw new Error('No signed-in user');
    }
    let extra = {};
    try {
        const response = await fetch('../../employee/details/data.json');
        if (response.ok) {
            const data = await response.json();
            extra = data.employees?.find(person => Number(person.id) === Number(user.id)) || {};
        }
    } catch (error) {
        console.warn('Optional profile details are unavailable:', error);
    }
    return {
        ...user,
        employeeId: extra.employeeId || user.id,
        fullName: user.name,
        employmentStatus: user.status,
        officeLocation: extra.officeLocation || '—'
    };
}


/* =====================================================
   APPLY SAVED PROFILE EDITS
===================================================== */

function mergeEmployeeData(jsonEmployee) {
    const savedEdits =
        getSavedEdits(jsonEmployee.employeeId);

    // Only editable profile values override the signed-in record.
    return {
        ...jsonEmployee,

        fullName:
            savedEdits.name ??
            jsonEmployee.fullName,

        email:
            savedEdits.email ??
            jsonEmployee.email,

        phone:
            savedEdits.phone ??
            jsonEmployee.phone,

        image:
            savedEdits.image ??
            jsonEmployee.image
    };
}


/* =====================================================
   DISPLAY PROFILE
===================================================== */

function displayEmployee(employee) {
    /* Profile header */

    setText(
        elements.profileName,
        employee.fullName,
        "Employee"
    );

    setText(
        elements.employeeId,
        employee.employeeId
    );

    setText(
        elements.profilePosition,
        employee.position
    );

    setText(
        elements.profileDepartment,
        employee.department
    );


    /* Personal & Employment Information */

    setText(
        elements.fullName,
        employee.fullName
    );

    setText(
        elements.email,
        employee.email
    );

    setText(
        elements.phone,
        employee.phone
    );

    setText(
        elements.position,
        employee.position
    );

    setText(
        elements.department,
        employee.department
    );

    setText(
        elements.joiningDate,
        employee.joiningDate
    );

    setText(
        elements.employmentStatus,
        employee.employmentStatus,
        "Active"
    );

    setText(
        elements.officeLocation,
        employee.officeLocation
    );


    /* Profile image */

    if (elements.profileImage) {
        elements.profileImage.src =
            employee.image?.startsWith('data:') ? employee.image : "assets/profile.svg";

        elements.profileImage.alt =
            employee.fullName ||
            "Employee profile";

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
        const jsonEmployee =
            await getEmployeeFromJson();

        const employee =
            mergeEmployeeData(jsonEmployee);

        displayEmployee(employee);

    } catch (error) {
        console.error(
            "Profile could not be loaded:",
            error
        );
    }
}


document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);
