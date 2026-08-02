/* ==========================================================
   GTM FAHRERSEITE
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("fahrer-grid");

    const searchInput =
        document.getElementById("fahrer-suche");

    const teamFilter =
        document.getElementById("team-filter");

    const vehicleFilter =
        document.getElementById("fahrzeug-filter");

    const sortSelect =
        document.getElementById("fahrer-sortierung");

    const noResults =
        document.getElementById("keine-fahrer");

    let alleFahrer = [];

    if (
        !window.GTM ||
        typeof window.GTM.loadFahrer !== "function"
    ) {
        showError(
            "Die GTM Data Engine wurde nicht geladen."
        );

        return;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function getTeam(fahrer) {
        return String(
            fahrer?.teamZuordnung ||
            fahrer?.team ||
            "Kein Team"
        ).trim();
    }

    function getVehicle(fahrer) {
        return String(
            fahrer?.fahrzeug ||
            "Kein Fahrzeug eingetragen"
        ).trim();
    }

    function participatesInCurrentSeason(fahrer) {
        return fahrer?.aktiveSaison === true;
    }

    function getDriverImage(fahrer) {
        const nummer =
            toNumber(fahrer?.nummer, 0);

        if (nummer < 1) {
            return "assets/images/fahrer/default.png";
        }

        return `assets/images/fahrer/${nummer}.png`;
    }

    function getSearchText(fahrer) {
        return normalizeText(
            [
                fahrer?.nummer,
                fahrer?.name,
                getTeam(fahrer),
                getVehicle(fahrer),
                participatesInCurrentSeason(fahrer)
                    ? "aktuelle meisterschaft teilnahme aktiv"
                    : "keine meisterschaftsteilnahme inaktiv"
            ].join(" ")
        );
    }

    function createDriverCard(fahrer) {
        const nummer =
            toNumber(fahrer.nummer, 0);

        const name =
            escapeHtml(
                fahrer.name ||
                "Unbekannter Fahrer"
            );

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const fahrzeug =
            escapeHtml(
                getVehicle(fahrer)
            );

        const imagePath =
            escapeHtml(
                getDriverImage(fahrer)
            );

        const nimmtTeil =
            participatesInCurrentSeason(fahrer);

        return `
            <article
                class="fahrer-card"
                data-team="${team}"
                data-fahrzeug="${fahrzeug}"
                data-status="${nimmtTeil ? "aktiv" : "inaktiv"}"
            >
                <div class="fahrer-card-bild">

                    <img
                        src="${imagePath}"
                        alt="${name}"
                        loading="lazy"
                        onerror="
                            this.onerror = null;
                            this.src = 'assets/images/fahrer/default.png';
                        "
                    >

                </div>

                <div class="fahrer-card-inhalt">

                    <div class="fahrer-card-kopf">

                        <span class="fahrer-card-nummer">
                            #${nummer || "–"}
                        </span>

                        <span
                            class="fahrer-card-status ${
                                nimmtTeil
                                    ? "aktiv"
                                    : "inaktiv"
                            }"
                        >
                            ${
                                nimmtTeil
                                    ? "Aktuelle Meisterschaft"
                                    : "Keine aktuelle Teilnahme"
                            }
                        </span>

                    </div>

                    <h2>
                        ${name}
                    </h2>

                    <p class="fahrer-card-team">
                        ${team}
                    </p>

                    <p class="fahrer-card-fahrzeug">
                        ${fahrzeug}
                    </p>

                    <div class="fahrer-card-info">

                        <div>
                            <span>
                                Startnummer
                            </span>

                            <strong>
                                #${nummer || "–"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Team
                            </span>

                            <strong>
                                ${team}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Fahrzeug
                            </span>

                            <strong>
                                ${fahrzeug}
                            </strong>
                        </div>

                    </div>

                    <button
                        type="button"
                        class="fahrer-profil-button"
                        data-fahrer-nummer="${nummer}"
                    >
                        Fahrerprofil
                    </button>

                </div>

            </article>
        `;
    }

    function fillSelect(
        select,
        values,
        defaultLabel
    ) {
        if (!select) {
            return;
        }

        const currentValue =
            select.value;

        const uniqueValues = [
            ...new Set(
                values
                    .map(
                        (value) =>
                            String(value ?? "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "de",
                    {
                        sensitivity: "base"
                    }
                )
        );

        select.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            defaultLabel;

        select.appendChild(
            defaultOption
        );

        uniqueValues.forEach((value) => {
            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

        if (
            uniqueValues.includes(
                currentValue
            )
        ) {
            select.value =
                currentValue;
        }
    }

    function updateStatistics() {
        const teams = [
            ...new Set(
                alleFahrer
                    .map(getTeam)
                    .filter(
                        (team) =>
                            team &&
                            team !== "Kein Team"
                    )
            )
        ];

        const vehicles = [
            ...new Set(
                alleFahrer
                    .map(getVehicle)
                    .filter(
                        (vehicle) =>
                            vehicle &&
                            vehicle !==
                                "Kein Fahrzeug eingetragen"
                    )
            )
        ];

        window.GTM.Utils?.setText(
            "fahrer-anzahl",
            alleFahrer.length
        );

        window.GTM.Utils?.setText(
            "fahrer-team-anzahl",
            teams.length
        );

        window.GTM.Utils?.setText(
            "fahrer-fahrzeug-anzahl",
            vehicles.length
        );
    }

    function sortDrivers(entries) {
        const sortValue =
            sortSelect?.value ||
            "startnummer";

        return [...entries].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "name"
                ) {
                    return String(
                        a.name || ""
                    ).localeCompare(
                        String(
                            b.name || ""
                        ),
                        "de",
                        {
                            sensitivity: "base"
                        }
                    );
                }

                if (
                    sortValue ===
                    "team"
                ) {
                    return getTeam(a).localeCompare(
                        getTeam(b),
                        "de",
                        {
                            sensitivity: "base"
                        }
                    );
                }

                if (
                    sortValue ===
                    "status"
                ) {
                    const statusDifference =
                        Number(
                            participatesInCurrentSeason(b)
                        ) -
                        Number(
                            participatesInCurrentSeason(a)
                        );

                    if (statusDifference !== 0) {
                        return statusDifference;
                    }
                }

                return (
                    toNumber(
                        a.nummer,
                        0
                    ) -
                    toNumber(
                        b.nummer,
                        0
                    )
                );
            }
        );
    }

    function filterDrivers() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const selectedTeam =
            String(
                teamFilter?.value || ""
            ).trim();

        const selectedVehicle =
            String(
                vehicleFilter?.value || ""
            ).trim();

        const filteredDrivers =
            alleFahrer.filter(
                (fahrer) => {
                    const matchesSearch =
                        query === "" ||
                        getSearchText(
                            fahrer
                        ).includes(query);

                    const matchesTeam =
                        selectedTeam === "" ||
                        getTeam(fahrer) ===
                            selectedTeam;

                    const matchesVehicle =
                        selectedVehicle === "" ||
                        getVehicle(fahrer) ===
                            selectedVehicle;

                    return (
                        matchesSearch &&
                        matchesTeam &&
                        matchesVehicle
                    );
                }
            );

        renderDrivers(
            sortDrivers(
                filteredDrivers
            )
        );
    }

    function renderDrivers(entries) {
        if (!grid) {
            return;
        }

        if (entries.length === 0) {
            grid.innerHTML = "";

            if (noResults) {
                noResults.hidden = false;
            }

            grid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        grid.innerHTML =
            entries
                .map(createDriverCard)
                .join("");

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden = true;
        }
    }

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Fahrerdaten konnten nicht geladen werden.
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
        `;

        grid.setAttribute(
            "aria-busy",
            "false"
        );
    }

    async function loadDrivers() {
        try {
            const data =
                await window.GTM.loadFahrer({
                    forceReload: true
                });

            if (!Array.isArray(data)) {
                throw new Error(
                    "fahrer.json enthält keine gültige Fahrerliste."
                );
            }

            alleFahrer =
                data.filter(
                    (fahrer) =>
                        fahrer &&
                        fahrer.nummer &&
                        fahrer.name
                );

            fillSelect(
                teamFilter,
                alleFahrer.map(getTeam),
                "Alle Teams"
            );

            fillSelect(
                vehicleFilter,
                alleFahrer.map(getVehicle),
                "Alle Fahrzeuge"
            );

            updateStatistics();
            filterDrivers();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    searchInput?.addEventListener(
        "input",
        filterDrivers
    );

    teamFilter?.addEventListener(
        "change",
        filterDrivers
    );

    vehicleFilter?.addEventListener(
        "change",
        filterDrivers
    );

    sortSelect?.addEventListener(
        "change",
        filterDrivers
    );

    grid?.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    ".fahrer-profil-button"
                );

            if (!button) {
                return;
            }

            const nummer =
                button.dataset.fahrerNummer;

            console.info(
                `Fahrerprofil #${nummer} wird später ergänzt.`
            );
        }
    );

    await loadDrivers();
});