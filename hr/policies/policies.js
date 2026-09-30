let container =
    document.getElementById("policiesContainer");

let policyLinks =
    document.getElementById("policyLinks");

let editBtn =
    document.getElementById("editBtn");

let saveBtn =
    document.getElementById("saveBtn");

let cancelBtn =
    document.getElementById("cancelBtn");


let policies = [];



/* =========================
   Load Policies
========================= */

async function loadPolicies() {

    try {

        /*
            First check if HR already edited
            policies in localStorage.
        */

        let savedPolicies =
            localStorage.getItem("teamspacePolicies");


        if (savedPolicies) {

            policies =
                JSON.parse(savedPolicies);

        }

        else {

            /*
                Read policies directly
                from file.json
            */

            let response =
                await fetch("../../Data/file.json");


            let data =
                await response.json();


            policies =
                data.policies;

        }


        displayPolicies();

    }

    catch (error) {

        console.log("Error loading policies:", error);

        container.innerHTML =
            "<p>Unable to load policies.</p>";

    }

}



/* =========================
   Display Policies
========================= */

function displayPolicies() {

    container.innerHTML = "";

    policyLinks.innerHTML = "";


    for (let i = 0; i < policies.length; i++) {


        /* =====================
           Left Policy Card
        ===================== */

        container.innerHTML += `

            <div class="policy"
                 id="policy-${policies[i].id}"
                 data-id="${policies[i].id}">


                <p class="policy-category editable">

                    ${policies[i].category}

                </p>


                <h3 class="policy-title editable">

                    ${policies[i].id}.
                    ${policies[i].title}

                </h3>


                <p class="policy-description editable">

                    ${policies[i].description}

                </p>


            </div>

        `;



        /* =====================
           Right Link
        ===================== */

        policyLinks.innerHTML += `

            <a href="#policy-${policies[i].id}"
               class="policy-link">

                <span>

                    ${policies[i].id}

                </span>


                ${policies[i].title}

            </a>

        `;

    }

}



/* =========================
   Edit
========================= */

editBtn.onclick = function () {

    let items =
        document.querySelectorAll(".editable");


    for (let i = 0; i < items.length; i++) {

        items[i].contentEditable = "true";

        items[i].classList.add("editing");

    }


    editBtn.classList.add("hidden");

    saveBtn.classList.remove("hidden");

    cancelBtn.classList.remove("hidden");

};



/* =========================
   Save
========================= */

saveBtn.onclick = function () {


    let policyElements =
        document.querySelectorAll(".policy");


    let updatedPolicies = [];



    for (let i = 0; i < policyElements.length; i++) {


        let policy =
            policyElements[i];


        let title =
            policy
            .querySelector(".policy-title")
            .innerText;


        /*
            Remove policy number
            Example:

            1. Working Hours

            becomes:

            Working Hours
        */

        title =
            title.replace(
                /^[0-9]+\.\s*/,
                ""
            );


        updatedPolicies.push({

            id:
                Number(policy.dataset.id),

            title:
                title,

            category:
                policy
                .querySelector(".policy-category")
                .innerText,

            description:
                policy
                .querySelector(".policy-description")
                .innerText

        });

    }



    /*
        Save HR changes
        so Employee page can read them.
    */

    localStorage.setItem(
        "teamspacePolicies",
        JSON.stringify(updatedPolicies)
    );


    policies =
        updatedPolicies;


    displayPolicies();


    editBtn.classList.remove("hidden");

    saveBtn.classList.add("hidden");

    cancelBtn.classList.add("hidden");


    alert(
        "Policies updated successfully"
    );

};



/* =========================
   Cancel
========================= */

cancelBtn.onclick = function () {

    displayPolicies();


    editBtn.classList.remove("hidden");

    saveBtn.classList.add("hidden");

    cancelBtn.classList.add("hidden");

};



/* =========================
   Start
========================= */

loadPolicies();