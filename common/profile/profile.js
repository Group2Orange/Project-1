/* =====================================================
   PROFILE PAGE
   Base data: ../../Data/User.json
   Editable data: localStorage
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
   LOAD JSON
===================================================== */

async function getEmployeeFromJson() {
    const response = await fetch("../../Data/User.json");

    if (!response.ok) {
        throw new Error(
            `Could not load User.json. Status: ${response.status}`
        );
    }

    return await response.json();
}


/* =====================================================
   MERGE JSON + LOCAL STORAGE
===================================================== */

function mergeEmployeeData(jsonEmployee) {
    const savedEdits =
        getSavedEdits(jsonEmployee.employeeId);

    /*
       User.json is always the original source.

       Only editable profile values are allowed
       to override JSON values from localStorage.
    */
    return {
        ...jsonEmployee,

        fullName:
            savedEdits.fullName ??
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
            employee.image ||
            "assets/profile.jpg";

        elements.profileImage.alt =
            employee.fullName ||
            "Employee profile";

        elements.profileImage.onerror = function () {
            this.onerror = null;
            this.src = "assets/profile.jpg";
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
