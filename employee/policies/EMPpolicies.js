/* =========================
   Elements
========================= */

let container =
    document.getElementById("policiesContainer");


let policyLinks =
    document.getElementById("policyLinks");


let policies = [];



/* =========================
   Load Policies
========================= */

async function loadPolicies() {

    try {


        /*
            Check if HR already
            edited the policies
        */

        let savedPolicies =
            localStorage.getItem("teamspacePolicies");



        if (savedPolicies) {


            policies =
                JSON.parse(savedPolicies);

        }


        else {


            /*
                If HR did not edit them,
                read from file.json
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


        console.log(
            "Error loading policies:",
            error
        );


        container.innerHTML = `

            <div class="policy">

                <h3>
                    Unable to load policies
                </h3>

                <p>
                    Please check file.json path.
                </p>

            </div>

        `;

    }

}



/* =========================
   Display Policies
========================= */

function displayPolicies() {


    container.innerHTML = "";


    policyLinks.innerHTML = "";



    for (
        let i = 0;
        i < policies.length;
        i++
    ) {


        let policy =
            policies[i];



        /* =========================
           Policy Card
        ========================= */

        container.innerHTML += `

            <div
                class="policy"
                id="policy-${policy.id}"
            >


                <p class="policy-category">

                    ${policy.category}

                </p>


                <h3 class="policy-title">

                    ${policy.id}.
                    ${policy.title}

                </h3>


                <p class="policy-description">

                    ${policy.description}

                </p>


            </div>

        `;



        /* =========================
           Right Side Link
        ========================= */

        policyLinks.innerHTML += `

            <a
                href="#policy-${policy.id}"
                class="policy-link"
            >


                <span>

                    ${policy.id}

                </span>


                ${policy.title}


            </a>

        `;

    }

}



/* =========================
   Start
========================= */

loadPolicies();