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

    const categoryButtons = document.querySelectorAll(".tags button");
    let selectedCategory = "General Feedback";

    categoryButtons.forEach(btn => {
        // "this" is the category button that was clicked.
        btn.addEventListener("click", function () {
            categoryButtons.forEach(b => {
                b.classList.remove("selected");
            });
            this.classList.add("selected");
            selectedCategory = this.innerText.trim();
        });
    });


    // ===============================
    // File Upload
    // ===============================

    let uploadedFile = null;

    const uploadBox = document.querySelector(".upload");

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".png,.jpg,.jpeg,.pdf,.docx";
    fileInput.hidden = true;
    uploadBox.appendChild(fileInput);

    uploadBox.addEventListener("click", () => {
        fileInput.click();
    });

    // "this" is the file input that changed.
    fileInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be less than 10MB");
            this.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            uploadedFile = {
                name: file.name,
                type: file.type,
                data: reader.result
            };
        };
        reader.readAsDataURL(file);

        uploadBox.querySelector("p").innerText = file.name;
    });


    // ===============================
    // Submit Feedback
    // ===============================

    const sendBtn = document.querySelector(".submit");

    sendBtn.addEventListener("click", async () => {

        const subject = document.querySelector("input[placeholder*='hybrid']").value.trim();
        const message = document.querySelector("textarea").value.trim();
        const anonymous = document.getElementById("anonymous").checked;


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

        const feedback = {
            employeeId: user && user.id ? String(user.id) : null,
            name: anonymous ? "Anonymous" : (user ? user.name : "Guest User"),
            email: anonymous ? "Hidden" : (user ? user.email : ""),
            anonymous: anonymous,
            category: selectedCategory,
            subject: subject,
            message: message,
            attachment: uploadedFile,
            createdAt: new Date().toISOString(),
            priority: null,
            read: false
        };

        try {
            const response = await fetch("http://127.0.0.1:3000/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(feedback)
            });
            if (!response.ok) throw new Error("Feedback could not be saved.");
        } catch (error) {
            console.error("Feedback submission failed:", error);
            alert("Could not send feedback. Make sure the API is running, then try again.");
            return;
        }


        // ===============================
        // Success Message
        // ===============================

        if (window.FeedbackMotion) {
            await window.FeedbackMotion.show(feedback);
        } else {
            alert("Feedback sent successfully!");
        }


        // ===============================
        // Clear Form
        // ===============================

        document.querySelector("input[placeholder*='hybrid']").value = "";
        document.querySelector("textarea").value = "";
        document.getElementById("anonymous").checked = false;

        uploadedFile = null;
        fileInput.value = "";
        uploadBox.querySelector("p").innerText = "Click to upload files";
    });

});
