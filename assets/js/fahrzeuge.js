/* ==========================================================
   GTM FAHRZEUGE
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid =
        document.getElementById("fahrzeuge-grid");

    const suche =
        document.getElementById("fahrzeuge-suche");

    const herstellerFilter =
        document.getElementById("hersteller-filter");

    const klasseFilter =
        document.getElementById("klasse-filter");

    const sortierung =
        document.getElementById("fahrzeuge-sortierung");

    const keineTreffer =
        document.getElementById("keine-fahrzeuge");

    let fahrzeuge = [];

    /* ======================================================
       GRUNDPRÜFUNG
    ====================================================== */

    if (
        !window.GTM ||
        typeof window.GTM.load !== "function"
    ) {
        showError(
            "Die GTM Data Engine wurde nicht geladen."
        );

        return;
    }

    /* ======================================================
       HILFSFUNKTIONEN
    ====================================================== */

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toNumber(
        value,
        fallback = 0
    ) {
        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function getManufacturerLogo(manufacturer) {
        const fallback =
            "assets/images/hersteller/default.png";

        let normalizedName =
            String(manufacturer ?? "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/ß/g, "ss");

        /*
         * Vereinheitlichung bestimmter Herstellernamen.
         */
        const aliases = {
            "mercedes-amg":
                "mercedes-amg",

            "mercedes":
                "mercedes-amg",

            "aston-martin-racing":
                "aston-martin",

            "chevrolet-camaro":
                "chevrolet",

            "nissan-nismo":
                "nissan",

            "honda-acura":
                "honda"
        };

        const originalSlug =
            normalizedName
                .replace(/&/g, "und")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        const fileSlug =
            aliases[originalSlug] ||
            originalSlug;

        if (!fileSlug) {
            return fallback;
        }

        return `assets/images/hersteller/${fileSlug}.png`;
    }

    function getManufacturer(fahrzeug) {
        return String(
            fahrzeug?.hersteller ||
            "Unbekannter Hersteller"
        ).trim();
    }

    function getVehicleName(fahrzeug) {
        return String(
            fahrzeug?.fahrzeug ||
            fahrzeug?.name ||
            "Unbekanntes Fahrzeug"
        ).trim();
    }

    function getClassName(fahrzeug) {
        return String(
            fahrzeug?.klasse ||
            "Keine Klasse"
        ).trim();
    }

    function getYear(fahrzeug) {
        return toNumber(
            fahrzeug?.baujahr,
            0
        );
    }

    function getDlc(fahrzeug) {
        return String(
            fahrzeug?.dlc ||
            fahrzeug?.inhalt ||
            "Grundspiel"
        ).trim();
    }

    function getSearchText(fahrzeug) {
        return normalize(
            [
                getManufacturer(fahrzeug),
                getVehicleName(fahrzeug),
                getClassName(fahrzeug),
                getYear(fahrzeug),
                getDlc(fahrzeug)
            ].join(" ")
        );
    }

    /* ======================================================
       FAHRZEUGKARTE
    ====================================================== */

    function createCard(fahrzeug) {
        const manufacturer =
            escapeHtml(
                getManufacturer(fahrzeug)
            );

        const vehicleName =
            escapeHtml(
                getVehicleName(fahrzeug)
            );

        const className =
            escapeHtml(
                getClassName(fahrzeug)
            );

        const year =
            getYear(fahrzeug);

        const dlc =
            escapeHtml(
                getDlc(fahrzeug)
            );

        const logo =
            escapeHtml(
                getManufacturerLogo(
                    getManufacturer(fahrzeug)
                )
            );

        return `
            <article class="fahrzeug-karte">

                <div class="fahrzeug-logo">

                    <img
                        src="${logo}"
                        alt="Logo ${manufacturer}"
                        loading="lazy"
                        onerror="
                            this.onerror = null;
                            this.src = 'assets/images/hersteller/default.png';
                        "
                    >

                </div>

                <div class="fahrzeug-content">

                    <span class="fahrzeug-hersteller">
                        ${manufacturer}
                    </span>

                    <h2>
                        ${vehicleName}
                    </h2>

                    <div class="fahrzeug-grid">

                        <div>

                            <span>
                                Klasse
                            </span>

                            <strong>
                                ${className}
                            </strong>

                        </div>

                        <div>

                            <span>
                                Baujahr
                            </span>

                            <strong>
                                ${year || "–"}
                            </strong>

                        </div>

                        <div>

                            <span>
                                DLC
                            </span>

                            <strong>
                                ${dlc}
                            </strong>

                        </div>

                    </div>

                </div>

            </article>
        `;
    }

    /* ======================================================
       RENDERN
    ====================================================== */

    function render(list) {
        if (!grid) {
            return;
        }

        if (list.length === 0) {
            grid.innerHTML = "";

            if (keineTreffer) {
                keineTreffer.hidden =
                    false;
            }

            grid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        grid.innerHTML =
            list
                .map(createCard)
                .join("");

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (keineTreffer) {
            keineTreffer.hidden =
                true;
        }
    }

    /* ======================================================
       STATISTIK
    ====================================================== */

    function updateStatistik() {
        const hersteller =
            new Set(
                fahrzeuge
                    .map(getManufacturer)
                    .filter(Boolean)
            );

        const klassen =
            new Set(
                fahrzeuge
                    .map(getClassName)
                    .filter(Boolean)
            );

        const jahre =
            fahrzeuge
                .map(getYear)
                .filter(
                    (jahr) =>
                        jahr > 0
                );

        const maxJahr =
            jahre.length > 0
                ? Math.max(...jahre)
                : 0;

        window.GTM.Utils?.setText(
            "fahrzeuge-gesamt",
            fahrzeuge.length
        );

        window.GTM.Utils?.setText(
            "fahrzeuge-hersteller",
            hersteller.size
        );

        window.GTM.Utils?.setText(
            "fahrzeuge-klassen",
            klassen.size
        );

        window.GTM.Utils?.setText(
            "fahrzeuge-neuestes-baujahr",
            maxJahr || "–"
        );
    }

    /* ======================================================
       FILTER BEFÜLLEN
    ====================================================== */

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
                            String(value ?? "")
                                .trim()
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
            document.createElement(
                "option"
            );

        defaultOption.value = "";
        defaultOption.textContent =
            defaultLabel;

        select.appendChild(
            defaultOption
        );

        uniqueValues.forEach(
            (value) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value = value;
                option.textContent =
                    value;

                select.appendChild(
                    option
                );
            }
        );

        if (
            uniqueValues.includes(
                currentValue
            )
        ) {
            select.value =
                currentValue;
        }
    }

    function fuelleFilter() {
        fillSelect(
            herstellerFilter,
            fahrzeuge.map(
                getManufacturer
            ),
            "Alle Hersteller"
        );

        fillSelect(
            klasseFilter,
            fahrzeuge.map(
                getClassName
            ),
            "Alle Klassen"
        );
    }

    /* ======================================================
       FILTER UND SORTIERUNG
    ====================================================== */

    function filter() {
        const text =
            normalize(
                suche?.value
            );

        const selectedManufacturer =
            String(
                herstellerFilter?.value ||
                ""
            ).trim();

        const selectedClass =
            String(
                klasseFilter?.value ||
                ""
            ).trim();

        let liste =
            fahrzeuge.filter(
                (fahrzeug) => {
                    const matchesText =
                        text === "" ||
                        getSearchText(
                            fahrzeug
                        ).includes(text);

                    const matchesManufacturer =
                        selectedManufacturer === "" ||
                        getManufacturer(
                            fahrzeug
                        ) ===
                            selectedManufacturer;

                    const matchesClass =
                        selectedClass === "" ||
                        getClassName(
                            fahrzeug
                        ) ===
                            selectedClass;

                    return (
                        matchesText &&
                        matchesManufacturer &&
                        matchesClass
                    );
                }
            );

        const sortValue =
            sortierung?.value ||
            "hersteller";

        liste = [...liste].sort(
            (a, b) => {
                if (
                    sortValue ===
                    "fahrzeug"
                ) {
                    return getVehicleName(a)
                        .localeCompare(
                            getVehicleName(b),
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );
                }

                if (
                    sortValue ===
                    "klasse"
                ) {
                    const classComparison =
                        getClassName(a)
                            .localeCompare(
                                getClassName(b),
                                "de",
                                {
                                    sensitivity:
                                        "base"
                                }
                            );

                    if (
                        classComparison !== 0
                    ) {
                        return classComparison;
                    }

                    return getVehicleName(a)
                        .localeCompare(
                            getVehicleName(b),
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );
                }

                if (
                    sortValue ===
                    "baujahr"
                ) {
                    const yearDifference =
                        getYear(b) -
                        getYear(a);

                    if (
                        yearDifference !== 0
                    ) {
                        return yearDifference;
                    }

                    return getVehicleName(a)
                        .localeCompare(
                            getVehicleName(b),
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );
                }

                const manufacturerComparison =
                    getManufacturer(a)
                        .localeCompare(
                            getManufacturer(b),
                            "de",
                            {
                                sensitivity:
                                    "base"
                            }
                        );

                if (
                    manufacturerComparison !== 0
                ) {
                    return manufacturerComparison;
                }

                return getVehicleName(a)
                    .localeCompare(
                        getVehicleName(b),
                        "de",
                        {
                            sensitivity:
                                "base"
                        }
                    );
            }
        );

        render(liste);
    }

    /* ======================================================
       FEHLER
    ====================================================== */

    function showError(message) {
        console.error(message);

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Fahrzeugdaten konnten nicht geladen werden.
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

    /* ======================================================
       DATEN LADEN
    ====================================================== */

    async function loadVehicles() {
        try {
            const data =
                await window.GTM.load(
                    "fahrzeuge",
                    {
                        forceReload: true
                    }
                );

            if (!Array.isArray(data)) {
                throw new Error(
                    "fahrzeuge.json enthält keine gültige Fahrzeugliste."
                );
            }

            fahrzeuge =
                data.filter(
                    (fahrzeug) =>
                        fahrzeug &&
                        getVehicleName(
                            fahrzeug
                        ) !==
                            "Unbekanntes Fahrzeug"
                );

            updateStatistik();
            fuelleFilter();
            filter();
        } catch (error) {
            showError(
                error.message ||
                "Unbekannter Fehler"
            );
        }
    }

    /* ======================================================
       EVENTS
    ====================================================== */

    suche?.addEventListener(
        "input",
        filter
    );

    herstellerFilter?.addEventListener(
        "change",
        filter
    );

    klasseFilter?.addEventListener(
        "change",
        filter
    );

    sortierung?.addEventListener(
        "change",
        filter
    );

    await loadVehicles();
});