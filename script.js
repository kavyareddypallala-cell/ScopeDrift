/*
    ScopeDrift
    Project Scope Drift Detection Engine

    Basic approach:

    1. Split requirements into individual items.
    2. Normalize the text.
    3. Compare original requirements with current requirements.
    4. Detect similar requirements using word overlap.
    5. Identify missing requirements.
    6. Identify newly introduced features.
    7. Calculate drift percentage.
*/


function normalizeText(text) {

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

}


/*
    Common words that don't help much
    when comparing requirements.
*/

const stopWords = new Set([

    "the",
    "a",
    "an",
    "and",
    "or",
    "with",
    "for",
    "to",
    "of",
    "in",
    "on",
    "is",
    "are",
    "be",
    "this",
    "that",
    "system",
    "project",
    "feature",
    "module",
    "user"

]);


/*
    Convert a sentence into useful words.
*/

function getKeywords(text) {

    const words = normalizeText(text)
        .split(" ");

    return words.filter(word =>

        word.length > 2 &&
        !stopWords.has(word)

    );

}


/*
    Convert textarea content into requirements.

    Each line becomes one requirement.

    If the user writes a paragraph,
    sentences are also separated.
*/

function extractRequirements(text) {

    let lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);


    let requirements = [];


    lines.forEach(line => {

        /*
            If the line contains multiple
            sentences, split them.
        */

        const sentences = line
            .split(/[.!?]+/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 2);


        sentences.forEach(sentence => {

            requirements.push(sentence);

        });

    });


    return requirements;

}


/*
    Calculate similarity between
    two requirements.

    Example:

    "Student attendance report"

    and

    "Generate attendance reports"

    share:

    attendance
    report / reports

*/

function calculateSimilarity(textA, textB) {

    const wordsA = new Set(getKeywords(textA));

    const wordsB = new Set(getKeywords(textB));


    if (wordsA.size === 0 || wordsB.size === 0) {

        return 0;

    }


    let commonWords = 0;


    wordsA.forEach(word => {

        if (wordsB.has(word)) {

            commonWords++;

        }

    });


    /*
        Jaccard-style similarity.

        intersection / union
    */

    const union = new Set([
        ...wordsA,
        ...wordsB
    ]);


    return commonWords / union.size;

}


/*
    Check whether a current requirement
    corresponds to an original requirement.
*/

function findBestMatch(currentRequirement, originalRequirements) {

    let bestMatch = null;

    let bestScore = 0;


    originalRequirements.forEach(originalRequirement => {

        const score =
            calculateSimilarity(
                currentRequirement,
                originalRequirement
            );


        if (score > bestScore) {

            bestScore = score;

            bestMatch = originalRequirement;

        }

    });


    return {

        match: bestMatch,

        score: bestScore

    };

}


/*
    Main analysis function.
*/

function analyzeScope() {

    const originalText =
        document.getElementById("originalScope").value.trim();


    const currentText =
        document.getElementById("currentScope").value.trim();


    if (!originalText || !currentText) {

        alert(
            "Please enter both the original and current project scope."
        );

        return;

    }


    const originalRequirements =
        extractRequirements(originalText);


    const currentRequirements =
        extractRequirements(currentText);


    if (
        originalRequirements.length === 0 ||
        currentRequirements.length === 0
    ) {

        alert(
            "Please provide meaningful project requirements."
        );

        return;

    }


    /*
        Requirements from original scope
        that still exist in current scope.
    */

    const matched = [];


    /*
        Original requirements that disappeared.
    */

    const missing = [];


    /*
        New requirements that were not
        present in original scope.
    */

    const newFeatures = [];


    const usedOriginalIndexes =
        new Set();


    /*
        Match current requirements
        against original requirements.
    */

    currentRequirements.forEach(currentRequirement => {

        let bestIndex = -1;

        let bestScore = 0;


        originalRequirements.forEach(
            (originalRequirement, index) => {

                if (
                    usedOriginalIndexes.has(index)
                ) {

                    return;

                }


                const score =
                    calculateSimilarity(
                        currentRequirement,
                        originalRequirement
                    );


                if (score > bestScore) {

                    bestScore = score;

                    bestIndex = index;

                }

            }
        );


        /*
            0.25 is our similarity threshold.

            Above this:

            considered related.

            Below this:

            considered a new feature.
        */

        if (
            bestIndex !== -1 &&
            bestScore >= 0.25
        ) {

            matched.push({

                current:
                    currentRequirement,

                original:
                    originalRequirements[
                        bestIndex
                    ],

                score:
                    bestScore

            });


            usedOriginalIndexes.add(
                bestIndex
            );

        } else {

            newFeatures.push(
                currentRequirement
            );

        }

    });


    /*
        Find original requirements
        that were never matched.
    */

    originalRequirements.forEach(
        (requirement, index) => {

            if (
                !usedOriginalIndexes.has(index)
            ) {

                missing.push(requirement);

            }

        }
    );


    /*
        Calculate drift.

        Two types of drift:

        1. New features
        2. Missing original requirements
    */

    const newFeatureWeight =
        newFeatures.length;


    const missingWeight =
        missing.length;


    const totalOriginal =
        originalRequirements.length;


    /*
        New features are considered
        stronger evidence of scope drift.

        Missing requirements also
        contribute to project instability.
    */

    let driftScore =
        (
            (newFeatureWeight * 1.5) +
            (missingWeight * 0.75)
        )
        /
        Math.max(
            currentRequirements.length,
            totalOriginal,
            1
        );


    driftScore *= 100;


    driftScore =
        Math.min(
            Math.round(driftScore),
            100
        );


    /*
        Calculate completion percentage.
    */

    const completion =
        Math.round(
            (
                matched.length /
                totalOriginal
            ) * 100
        );


    /*
        Display main score.
    */

    document
        .getElementById("score")
        .textContent =
        driftScore + "%";


    /*
        Determine project status.
    */

    let status = "";

    let description = "";


    if (driftScore <= 20) {

        status = "Stable Scope";

        description =
            "The project is closely following its original requirements.";

    } else if (driftScore <= 45) {

        status = "Moderate Drift";

        description =
            "Some new requirements have appeared. Review the project scope before continuing.";

    } else if (driftScore <= 70) {

        status = "High Drift";

        description =
            "The project has moved significantly away from its original plan.";

    } else {

        status = "Critical Drift";

        description =
            "The current project is substantially different from the original scope.";

    }


    document
        .getElementById("status")
        .textContent =
        status;


    document
        .getElementById("statusDescription")
        .textContent =
        description;


    /*
        Statistics
    */

    document
        .getElementById("originalCount")
        .textContent =
        originalRequirements.length;


    document
        .getElementById("completedCount")
        .textContent =
        matched.length;


    document
        .getElementById("newCount")
        .textContent =
        newFeatures.length;


    document
        .getElementById("missingCount")
        .textContent =
        missing.length;


    /*
        Display lists.
    */

    displayList(
        "matchedList",
        matched.map(item => {

            return item.current;

        }),
        "No original requirements are currently matched."
    );


    displayList(
        "newList",
        newFeatures,
        "No significant new features detected."
    );


    displayList(
        "missingList",
        missing,
        "No original requirements appear to be missing."
    );


    /*
        Recommendation engine.
    */

    let recommendation = "";


    if (driftScore <= 20) {

        recommendation =
            "Continue development. The current implementation is well aligned with the original project scope.";

    } else if (driftScore <= 45) {

        recommendation =
            "Review the newly added features and decide whether each one is necessary before continuing development.";

    } else if (driftScore <= 70) {

        recommendation =
            "Freeze new feature development temporarily. Revisit the original requirements and formally approve any scope changes.";

    } else {

        recommendation =
            "The project requires a scope review. Consider creating a new requirements document because the current product may effectively be a different project.";

    }


    document
        .getElementById("recommendation")
        .textContent =
        recommendation;


    /*
        Explain calculation.
    */

    const explanation =

        `The analyzer identified ${matched.length} ` +
        `requirement(s) that still resemble the original scope, ` +

        `${newFeatures.length} newly introduced feature(s), and ` +

        `${missing.length} original requirement(s) that were not detected ` +
        `in the current scope. ` +

        `The drift score increases when new features appear or when ` +
        `important original requirements disappear. ` +

        `Requirement similarity is calculated using overlapping meaningful words. ` +

        `Current original-scope completion is approximately ${completion}%.`;


    document
        .getElementById("explanationText")
        .textContent =
        explanation;


    /*
        Show results.
    */

    document
        .getElementById("results")
        .classList.remove("hidden");


    /*
        Scroll smoothly to results.
    */

    document
        .getElementById("results")
        .scrollIntoView({
            behavior: "smooth"
        });

}


/*
    Display an array inside a <ul>.
*/

function displayList(
    elementId,
    items,
    emptyMessage
) {

    const list =
        document.getElementById(elementId);


    list.innerHTML = "";


    if (items.length === 0) {

        const li =
            document.createElement("li");


        li.textContent =
            emptyMessage;


        list.appendChild(li);

        return;

    }


    items.forEach(item => {

        const li =
            document.createElement("li");


        li.textContent =
            item;


        list.appendChild(li);

    });

}


/*
    Example project.
*/

function loadExample() {

    document
        .getElementById("originalScope")
        .value =

`Student registration
Student login
Attendance marking
Monthly attendance reports
Admin login
Teacher dashboard
Student attendance dashboard`;


    document
        .getElementById("currentScope")
        .value =

`Student registration
Student login
Attendance marking
Monthly attendance reports
Admin login
Teacher dashboard
Student attendance dashboard
AI chatbot
Student messaging
Online event management
Dark mode customization
Student social feed`;


}


/*
    Clear everything.
*/

function clearAll() {

    document
        .getElementById("originalScope")
        .value = "";


    document
        .getElementById("currentScope")
        .value = "";


    document
        .getElementById("results")
        .classList.add("hidden");

}


/*
    Allow Ctrl + Enter to analyze.
*/

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            analyzeScope();

        }

    }
);