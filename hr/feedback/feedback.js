
document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ELEMENTS
    // =====================================================

    const feedbackList =
        document.querySelector(".feedback-list");

    const filterButtons =
        document.querySelectorAll(".filter-tab");

    const sortSelect =
        document.querySelector(".sort-container select");

    const totalCount =
        document.querySelector(".total-stat strong");

    const highPriorityCount =
        document.querySelector(".priority-stat strong");


    // =====================================================
    // DATA
    // =====================================================

    let feedbacks =
        JSON.parse(
            localStorage.getItem("feedbacks")
        ) || [];

    let selectedCategory = "All";

    let selectedDateFilter = "all";


    // =====================================================
    // HELPERS
    // =====================================================

    function getPriorityValue(priority) {

        if (priority === "High") {
            return 3;
        }

        if (priority === "Medium") {
            return 2;
        }

        if (priority === "Low") {
            return 1;
        }

        return 0;
    }


    function getPriorityText(priority) {

        if (priority === "High" ||
            priority === "Medium" ||
            priority === "Low") {

            return priority;
        }

        return "Not Set";
    }


    function getInitials(name) {

        if (!name ||
            name === "Anonymous") {

            return "◌";
        }


        const words =
            name.trim().split(" ");


        if (words.length === 1) {

            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }


        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    }


    function formatDate(dateValue) {

        if (!dateValue) {
            return "Unknown date";
        }


        const date =
            new Date(dateValue);


        if (isNaN(date.getTime())) {
            return dateValue;
        }


        return date.toLocaleString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    function getDateObject(dateValue) {

        const date =
            new Date(dateValue);


        if (!isNaN(date.getTime())) {
            return date;
        }


        return null;
    }


    // =====================================================
    // CATEGORY FILTER
    // =====================================================

    function filterByCategory(data) {

        if (selectedCategory === "All") {
            return data;
        }


        return data.filter(
            feedback =>
                feedback.category ===
                selectedCategory
        );
    }


    // =====================================================
    // DATE FILTER
    // =====================================================

    function filterByDate(data) {

        if (selectedDateFilter === "all") {
            return data;
        }


        const now = new Date();


        let days = 0;


        if (selectedDateFilter === "today") {
            days = 1;
        }

        else if (
            selectedDateFilter === "7days"
        ) {
            days = 7;
        }

        else if (
            selectedDateFilter === "30days"
        ) {
            days = 30;
        }


        const startDate =
            new Date(now);


        startDate.setDate(
            now.getDate() - days
        );


        return data.filter(feedback => {

            const feedbackDate =
                getDateObject(
                    feedback.date
                );


            if (!feedbackDate) {
                return false;
            }


            return feedbackDate >= startDate;
        });
    }


    // =====================================================
    // SORT
    // =====================================================

    function sortFeedbacks(data) {

        const sorted =
            [...data];


        const sortValue =
            sortSelect.value;


        if (
            sortValue.includes(
                "Newest"
            )
        ) {

            sorted.sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );
        }


        else if (
            sortValue.includes(
                "Oldest"
            )
        ) {

            sorted.sort(
                (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
            );
        }


        else if (
            sortValue.includes(
                "Highest"
            )
        ) {

            sorted.sort(
                (a, b) =>
                    getPriorityValue(
                        b.priority
                    ) -
                    getPriorityValue(
                        a.priority
                    )
            );
        }


        else if (
            sortValue.includes(
                "Lowest"
            )
        ) {

            sorted.sort(
                (a, b) =>
                    getPriorityValue(
                        a.priority
                    ) -
                    getPriorityValue(
                        b.priority
                    )
            );
        }


        return sorted;
    }


    // =====================================================
    // CREATE ATTACHMENT
    // =====================================================

    function createAttachment(
        attachment
    ) {

        if (!attachment) {

            return `
                <div class="document empty-document">

                    <div class="document-icon">
                        ▱
                    </div>

                    <span>
                        No supporting documents attached
                    </span>

                </div>
            `;
        }


        let icon = "▣";


        if (
            attachment.type &&
            attachment.type.startsWith(
                "image/"
            )
        ) {

            icon = "▧";
        }


        else if (
            attachment.type ===
            "application/pdf"
        ) {

            icon = "▣";
        }


        return `
            <a
                class="document"
                href="${attachment.data}"
                target="_blank"
                rel="noopener noreferrer"
                download="${attachment.name}"
            >

                <div class="document-icon">
                    ${icon}
                </div>

                <div>

                    <strong>
                        ${attachment.name}
                    </strong>

                    <span>
                        Click to open attachment
                    </span>

                </div>

            </a>
        `;
    }


    // =====================================================
    // CREATE PRIORITY PANEL
    // =====================================================

    function createPriorityPanel(
        feedback
    ) {

        const priority =
            feedback.priority;


        return `
            <aside
                class="priority-panel"
                data-id="${feedback.id}"
            >

                <span class="priority-title">
                    PRIORITY LEVEL
                </span>

                <p>
                    Set inbox urgency:
                </p>


                <div
                    class="priority-option high
                    ${priority === "High"
                        ? "selected"
                        : ""}"
                    data-priority="High"
                >

                    <span
                        class="priority-circle">
                    </span>

                    <span>
                        High
                    </span>

                    ${
                        priority === "High"
                        ? "<b>✓</b>"
                        : ""
                    }

                </div>


                <div
                    class="priority-option medium
                    ${priority === "Medium"
                        ? "selected"
                        : ""}"
                    data-priority="Medium"
                >

                    <span
                        class="priority-circle">
                    </span>

                    <span>
                        Medium
                    </span>

                    ${
                        priority === "Medium"
                        ? "<b>✓</b>"
                        : ""
                    }

                </div>


                <div
                    class="priority-option low
                    ${priority === "Low"
                        ? "selected"
                        : ""}"
                    data-priority="Low"
                >

                    <span
                        class="priority-circle">
                    </span>

                    <span>
                        Low
                    </span>

                    ${
                        priority === "Low"
                        ? "<b>✓</b>"
                        : ""
                    }

                </div>


                <div class="triage">
                    ♙ HR Personnel Triage
                </div>

            </aside>
        `;
    }


    // =====================================================
    // CREATE FEEDBACK CARD
    // =====================================================

    function createFeedbackCard(
        feedback
    ) {

        const anonymous =
            feedback.name === "Anonymous";


        const employeeName =
            anonymous
                ? "Anonymous Employee"
                : feedback.name;


        const employeeEmail =
            anonymous
                ? "Hidden / Confidential"
                : feedback.email;


        const avatarClass =
            anonymous
                ? "avatar anonymous"
                : "avatar";


        return `
            <article
                class="feedback-card"
                data-id="${feedback.id}"
            >

                <div class="card-top-date">

                    <span class="clock-icon">
                        ◷
                    </span>

                    ${formatDate(feedback.date)}

                </div>


                <div class="card-main">

                    <div class="card-content">


                        <!-- EMPLOYEE -->

                        <div class="employee-box">

                            <div class="employee-info">

                                <div
                                    class="${avatarClass}"
                                >
                                    ${anonymous
                                        ? "◌"
                                        : getInitials(
                                            feedback.name
                                        )}
                                </div>


                                <div>

                                    <strong>
                                        ${employeeName}
                                    </strong>

                                    <span>
                                        ${
                                            anonymous
                                            ? "Identity protected per employee preference"
                                            : employeeEmail
                                        }
                                    </span>

                                </div>

                            </div>


                            <div class="confidential">

                                ◎
                                ${
                                    anonymous
                                    ? "Hidden / Confidential"
                                    : employeeEmail
                                }

                            </div>

                        </div>



                        <!-- CATEGORY -->

                        <div class="field">

                            <span class="field-label">
                                CATEGORY
                            </span>

                            <div class="details-box">
                                ${feedback.category}
                            </div>

                        </div>



                        <!-- SUBJECT -->

                        <div class="field">

                            <span class="field-label">
                                SUBJECT
                            </span>

                            <h2>
                                ${feedback.subject}
                            </h2>

                        </div>



                        <!-- DETAILS -->

                        <div class="field">

                            <span class="field-label">
                                FEEDBACK DETAILS
                            </span>

                            <div class="details-box">
                                ${feedback.message}
                            </div>

                        </div>



                        <!-- DOCUMENT -->

                        <div
                            class="field
                            documents-section"
                        >

                            <span class="field-label">
                                SUPPORTING DOCUMENTS / SCREENSHOTS
                            </span>

                            <div class="documents">

                                ${createAttachment(
                                    feedback.attachment
                                )}

                            </div>

                        </div>


                    </div>


                    <!-- PRIORITY -->

                    ${createPriorityPanel(
                        feedback
                    )}

                </div>

            </article>
        `;
    }


    // =====================================================
    // UPDATE HEADER STATS
    // =====================================================

    function updateStats() {

        if (totalCount) {

            totalCount.innerText =
                feedbacks.length;
        }


        const highCount =
            feedbacks.filter(
                feedback =>
                    feedback.priority ===
                    "High"
            ).length;


        if (highPriorityCount) {

            highPriorityCount.innerText =
                highCount;
        }
    }


    // =====================================================
    // UPDATE CATEGORY COUNTS
    // =====================================================

    function updateCategoryCounts() {

        filterButtons.forEach(button => {

            const buttonText =
                button.innerText
                    .trim()
                    .split("(")[0]
                    .trim();


            if (
                buttonText ===
                "ALL SUBMISSIONS"
            ) {

                button.innerHTML =
                    `ALL SUBMISSIONS (${feedbacks.length})`;

                return;
            }


            const count =
                feedbacks.filter(
                    feedback =>
                        feedback.category
                        ?.toUpperCase() ===
                        buttonText
                ).length;


            button.innerHTML =
                `${buttonText} (${count})`;
        });
    }


    // =====================================================
    // RENDER
    // =====================================================

    function renderFeedbacks() {

        let filtered =
            filterByCategory(
                feedbacks
            );


        filtered =
            filterByDate(
                filtered
            );


        filtered =
            sortFeedbacks(
                filtered
            );


        if (filtered.length === 0) {

            feedbackList.innerHTML = `

                <div class="feedback-card">

                    <div
                        class="details-box"
                        style="text-align:center;"
                    >

                        No feedback found
                        for the selected filters.

                    </div>

                </div>

            `;

            return;
        }


        feedbackList.innerHTML =
            filtered
                .map(
                    feedback =>
                        createFeedbackCard(
                            feedback
                        )
                )
                .join("");


        attachPriorityEvents();
    }


    // =====================================================
    // PRIORITY EVENTS
    // =====================================================

    function attachPriorityEvents() {

        const options =
            document.querySelectorAll(
                ".priority-option"
            );


        options.forEach(option => {

            option.addEventListener(
                "click",
                () => {

                    const panel =
                        option.closest(
                            ".priority-panel"
                        );


                    const feedbackId =
                        Number(
                            panel.dataset.id
                        );


                    const newPriority =
                        option.dataset.priority;


                    const feedback =
                        feedbacks.find(
                            item =>
                                Number(
                                    item.id
                                ) ===
                                feedbackId
                        );


                    if (!feedback) {
                        return;
                    }


                    feedback.priority =
                        newPriority;


                    localStorage.setItem(
                        "feedbacks",
                        JSON.stringify(
                            feedbacks
                        )
                    );


                    updateStats();

                    renderFeedbacks();

                }
            );

        });
    }


    // =====================================================
    // CATEGORY BUTTONS
    // =====================================================

    filterButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    btn =>
                        btn.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                const text =
                    button.innerText
                        .split("(")[0]
                        .trim();


                if (
                    text ===
                    "ALL SUBMISSIONS"
                ) {

                    selectedCategory =
                        "All";
                }

                else {

                    selectedCategory =
                        text
                            .toLowerCase()
                            .replace(
                                /\b\w/g,
                                char =>
                                    char.toUpperCase()
                            );
                }


                renderFeedbacks();

            }
        );

    });


    // =====================================================
    // SORT EVENT
    // =====================================================

    if (sortSelect) {

        sortSelect.addEventListener(
            "change",
            renderFeedbacks
        );
    }


    // =====================================================
    // DATE FILTER
    // =====================================================

    function addDateFilter() {

        const sortContainer =
            document.querySelector(
                ".sort-container"
            );


        if (!sortContainer) {
            return;
        }


        const dateSelect =
            document.createElement(
                "select"
            );


        dateSelect.innerHTML = `

            <option value="all">
                All Time
            </option>

            <option value="today">
                Today
            </option>

            <option value="7days">
                Last 7 Days
            </option>

            <option value="30days">
                Last 30 Days
            </option>

        `;


        dateSelect.style.marginLeft =
            "8px";


        dateSelect.style.height =
            "30px";


        dateSelect.style.padding =
            "0 10px";


        dateSelect.style.border =
            "1px solid var(--border)";


        dateSelect.style.borderRadius =
            "7px";


        dateSelect.style.background =
            "#F2F4F7";


        dateSelect.style.color =
            "var(--text)";


        dateSelect.style.fontFamily =
            '"Public Sans", sans-serif';


        dateSelect.style.fontSize =
            "10px";


        dateSelect.addEventListener(
            "change",
            () => {

                selectedDateFilter =
                    dateSelect.value;


                renderFeedbacks();

            }
        );


        sortContainer.appendChild(
            dateSelect
        );
    }


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    updateStats();

    updateCategoryCounts();

    addDateFilter();

    renderFeedbacks();

});

