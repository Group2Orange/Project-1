document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // Load Logged User
    // ===============================

    const userData = localStorage.getItem("loggedUser");

    const nameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");

    let user = null;

    if (userData) {

        user = JSON.parse(userData);

        nameInput.value = user.name;
        emailInput.value = user.email;

        nameInput.readOnly = true;
        emailInput.readOnly = true;

    } else {

        nameInput.value = "Guest User";
        emailInput.value = "";

    }


    // ===============================
    // Feedback Categories
    // ===============================

    const categoryButtons =
        document.querySelectorAll(".tags button");

    let selectedCategory = "General Feedback";

    categoryButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            categoryButtons.forEach(b => {
                b.classList.remove("selected");
            });

            btn.classList.add("selected");

            selectedCategory = btn.innerText;

        });

    });


    // ===============================
    // File Upload
    // ===============================

    let uploadedFile = "";

    const uploadBox = document.querySelector(".upload");

    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".png,.jpg,.jpeg,.pdf,.docx";
    fileInput.hidden = true;

    uploadBox.appendChild(fileInput);


    uploadBox.addEventListener("click", () => {

        fileInput.click();

    });


    fileInput.addEventListener("change", () => {

        const file = fileInput.files[0];

        if (file) {

            if (file.size > 10 * 1024 * 1024) {

                alert("File size must be less than 10MB");

                fileInput.value = "";

                return;
            }

            uploadedFile = file.name;

            uploadBox.querySelector("p").innerText =
                file.name;

        }

    });


    // ===============================
    // Submit Feedback
    // ===============================

    const sendBtn = document.querySelector(".submit");

    sendBtn.addEventListener("click", () => {

        const subject =
            document.querySelector(
                "input[placeholder*='hybrid']"
            ).value.trim();

        const message =
            document.querySelector("textarea")
            .value.trim();

        const anonymous =
            document.getElementById("anonymous").checked;


        // ===============================
        // Validation
        // ===============================

        if (subject === "" || message === "") {

            alert("Please fill subject and message.");

            return;
        }


        // ===============================
        // Create Feedback
        // ===============================

        let feedback = {

            id: Date.now(),

            name: anonymous
                ? "Anonymous"
                : (user ? user.name : "Guest User"),

            email: anonymous
                ? "Hidden"
                : (user ? user.email : ""),

            category: selectedCategory,

            subject: subject,

            message: message,

            attachment: uploadedFile || null,

            date: new Date().toLocaleString(),

            status: "New"

        };


        // ===============================
        // Save Feedback
        // ===============================

        let feedbacks =
            JSON.parse(
                localStorage.getItem("feedbacks")
            ) || [];


        feedbacks.push(feedback);


        localStorage.setItem(
            "feedbacks",
            JSON.stringify(feedbacks)
        );


        // ===============================
        // Success Message
        // ===============================

        alert("Feedback sent successfully!");


        // ===============================
        // Clear Form
        // ===============================

        document.querySelector(
            "input[placeholder*='hybrid']"
        ).value = "";

        document.querySelector("textarea").value = "";

        document.getElementById("anonymous").checked = false;

        uploadedFile = "";

        fileInput.value = "";

        uploadBox.querySelector("p").innerText =
            "Click to upload files";

    });

});