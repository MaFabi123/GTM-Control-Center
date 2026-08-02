/* ==========================================================
   GTM MEISTERSCHAFT – FAHRERWERTUNG
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const championshipContainer =
        document.getElementById("meisterschaft-grid");

    const searchInput =
        document.getElementById("meisterschaft-suche");

    const noResults =
        document.getElementById("keine-eintraege");

    let alleFahrer = [];
    let alleRennen = [];

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

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toNumber(value, fallback = 0) {
        const cleanedValue =
            String(value ?? "")
                .replace(",", ".")
                .replace(/[^0-9.-]/g, "");

        const number =
            Number(cleanedValue);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function getDriverName(fahrer) {
        return String(
            fahrer?.name ||
            fahrer?.anzeigename ||
            fahrer?.fahrer ||
            "Unbekannter Fahrer"
        ).trim();
    }

    function getDriverNumber(fahrer) {
        return toNumber(
            fahrer?.nummer ??
            fahrer?.startnummer ??
            fahrer?.fahrernummer,
            0
        );
    }

    function getDriverPoints(fahrer) {
        return toNumber(
            fahrer?.punkte ??
            fahrer?.gesamtpunkte ??
            0,
            0
        );
    }

    function getDriverPlacement(fahrer) {
        return toNumber(
            fahrer?.platzierung ??
            fahrer?.platz ??
            fahrer?.rang,
            0
        );
    }

    function getTeam(fahrer) {
        return String(
            fahrer?.team ||
            fahrer?.teamZuordnung ||
            "Kein Team"
        ).trim();
    }

    function getVehicle(fahrer) {
        return String(
            fahrer?.fahrzeug ||
            "Kein Fahrzeug eingetragen"
        ).trim();
    }

    function getFastLaps(fahrer) {
        return toNumber(
            fahrer?.fastLap ??
            fahrer?.fastlaps ??
            fahrer?.fastLaps ??
            0,
            0
        );
    }

    function getVehicleChanges(fahrer) {
        return toNumber(
            fahrer?.fahrzeugwechsel ??
            fahrer?.wechsel ??
            0,
            0
        );
    }

    function getDriverImage(fahrer) {
        const explicitImage =
            String(
                fahrer?.bild || ""
            ).trim();

        if (explicitImage) {
            return `assets/images/fahrer/${explicitImage}`;
        }

        const number =
            getDriverNumber(fahrer);

        if (number > 0) {
            return `assets/images/fahrer/${number}.png`;
        }

        return "assets/images/fahrer/default.png";
    }

    function getSearchText(fahrer) {
        return normalizeText(
            [
                getDriverPlacement(fahrer),
                getDriverNumber(fahrer),
                getDriverName(fahrer),
                getTeam(fahrer),
                getVehicle(fahrer),
                getDriverPoints(fahrer)
            ].join(" ")
        );
    }

    /* ======================================================
       DATENLISTE AUS JSON ERMITTELN
    ====================================================== */

    function extractDriverList(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (!data || typeof data !== "object") {
            return [];
        }

        const possibleLists = [
            data.fahrer,
            data.fahrerwertung,
            data.meisterschaft,
            data.teilnehmer,
            data.entries,
            data.data,
            data.ranking,
            data.wertung
        ];

        const directList =
            possibleLists.find(
                Array.isArray
            );

        if (directList) {
            return directList;
        }

        /*
         * Falls der Listenname unbekannt ist:
         * Suche in allen Eigenschaften nach einer passenden Liste.
         */
        const allArrays =
            Object.values(data).filter(
                Array.isArray
            );

        const likelyDriverList =
            allArrays.find(
                (list) =>
                    list.some(
                        (entry) =>
                            entry &&
                            typeof entry === "object" &&
                            (
                                entry.name ||
                                entry.fahrer ||
                                entry.anzeigename
                            ) &&
                            (
                                entry.platzierung !== undefined ||
                                entry.punkte !== undefined ||
                                entry.nummer !== undefined
                            )
                    )
            );

        return likelyDriverList || [];
    }

    /* ======================================================
       RENNSTATUS
    ====================================================== */

    function getRaceStatus(race) {
        const status =
            normalizeText(
                race?.status
            );

        if (
            status === "abgeschlossen" ||
            race?.abgeschlossen === true
        ) {
            return "abgeschlossen";
        }

        if (
            status === "aktuell" ||
            race?.aktuell === true
        ) {
            return "aktuell";
        }

        if (
            status === "nachster" ||
            status === "nächster" ||
            race?.naechster === true
        ) {
            return "nächster";
        }

        return "bevorstehend";
    }

    /* ======================================================
       FAHRER SORTIEREN
    ====================================================== */

    function sortiereFahrer(fahrerListe) {
        return [...fahrerListe].sort(
            (a, b) => {
                const platzA =
                    getDriverPlacement(a);

                const platzB =
                    getDriverPlacement(b);

                const hatPlatzA =
                    platzA > 0;

                const hatPlatzB =
                    platzB > 0;

                /*
                 * Fahrer mit gültiger Platzierung
                 * stehen vor Fahrern ohne Platzierung.
                 */
                if (
                    hatPlatzA &&
                    !hatPlatzB
                ) {
                    return -1;
                }

                if (
                    !hatPlatzA &&
                    hatPlatzB
                ) {
                    return 1;
                }

                /*
                 * Zuerst nach Meisterschaftsplatz.
                 */
                if (
                    hatPlatzA &&
                    hatPlatzB &&
                    platzA !== platzB
                ) {
                    return platzA - platzB;
                }

                /*
                 * Danach nach Punkten.
                 */
                const punkteDifferenz =
                    getDriverPoints(b) -
                    getDriverPoints(a);

                if (punkteDifferenz !== 0) {
                    return punkteDifferenz;
                }

                /*
                 * Danach nach Fast Laps.
                 */
                const fastLapDifferenz =
                    getFastLaps(b) -
                    getFastLaps(a);

                if (fastLapDifferenz !== 0) {
                    return fastLapDifferenz;
                }

                /*
                 * Zuletzt nach Startnummer.
                 */
                return (
                    getDriverNumber(a) -
                    getDriverNumber(b)
                );
            }
        );
    }

    /* ======================================================
       TABELLENFÜHRER
    ====================================================== */

    function renderLeader(fahrer) {
        if (!fahrer) {
            return "";
        }

        const name =
            escapeHtml(
                getDriverName(fahrer)
            );

        const number =
            getDriverNumber(fahrer);

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const vehicle =
            escapeHtml(
                getVehicle(fahrer)
            );

        const points =
            getDriverPoints(fahrer);

        const image =
            escapeHtml(
                getDriverImage(fahrer)
            );

        return `
            <section class="leader-card">

                <div class="leader-title">
                    🏆 Tabellenführer
                </div>

                <div class="leader-content">

                    <div class="leader-avatar">

                        <img
                            src="${image}"
                            alt="${name}"
                            loading="eager"
                            onerror="
                                this.onerror = null;
                                this.src = 'assets/images/fahrer/default.png';
                            "
                        >

                    </div>

                    <div class="leader-info">

                        <div class="leader-number">
                            #${number || "–"}
                        </div>

                        <h2>
                            ${name}
                        </h2>

                        <div class="leader-team">
                            👥 ${team}
                        </div>

                        <div class="leader-car">
                            🏎️ ${vehicle}
                        </div>

                    </div>

                    <div class="leader-points">

                        ${points}

                        <span>
                            Punkte
                        </span>

                    </div>

                </div>

            </section>
        `;
    }

    /* ======================================================
       PLATZ 2 UND 3
    ====================================================== */

    function renderPodium(
        fahrer,
        platz
    ) {
        if (!fahrer) {
            return "";
        }

        const medal =
            platz === 2
                ? "🥈"
                : "🥉";

        const name =
            escapeHtml(
                getDriverName(fahrer)
            );

        const number =
            getDriverNumber(fahrer);

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const vehicle =
            escapeHtml(
                getVehicle(fahrer)
            );

        const points =
            getDriverPoints(fahrer);

        const image =
            escapeHtml(
                getDriverImage(fahrer)
            );

        return `
            <article class="podium-card podium-${platz}">

                <div class="podium-medal">
                    ${medal}
                </div>

                <div class="podium-driver-image">

                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy"
                        onerror="
                            this.onerror = null;
                            this.src = 'assets/images/fahrer/default.png';
                        "
                    >

                </div>

                <div class="podium-number">
                    #${number || "–"}
                </div>

                <h3>
                    ${name}
                </h3>

                <div class="podium-team">
                    ${team}
                </div>

                <div class="podium-car">
                    ${vehicle}
                </div>

                <strong>
                    ${points} Punkte
                </strong>

            </article>
        `;
    }

    /* ======================================================
       WEITERE FAHRER
    ====================================================== */

    function createCard(fahrer) {
        const placement =
            getDriverPlacement(fahrer);

        const name =
            escapeHtml(
                getDriverName(fahrer)
            );

        const number =
            getDriverNumber(fahrer);

        const team =
            escapeHtml(
                getTeam(fahrer)
            );

        const vehicle =
            escapeHtml(
                getVehicle(fahrer)
            );

        const points =
            getDriverPoints(fahrer);

        const fastLaps =
            getFastLaps(fahrer);

        const changes =
            getVehicleChanges(fahrer);

        const image =
            escapeHtml(
                getDriverImage(fahrer)
            );

        return `
            <article class="meister-row">

                <div class="meister-driver-image">

                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy"
                        onerror="
                            this.onerror = null;
                            this.src = 'assets/images/fahrer/default.png';
                        "
                    >

                    <div class="meister-platz">
                        ${placement || "–"}
                    </div>

                </div>

                <div class="meister-mitte">

                    <div class="meister-nummer">
                        #${number || "–"}
                    </div>

                    <h2>
                        ${name}
                    </h2>

                    <div class="meister-team">
                        👥 ${team}
                    </div>

                    <div class="meister-fahrzeug">
                        🏎️ ${vehicle}
                    </div>

                    <div class="meister-info">

                        <span>
                            ⚡ ${fastLaps} Fast Laps
                        </span>

                        <span>
                            🔄 ${changes} Fahrzeugwechsel
                        </span>

                    </div>

                </div>

                <div class="meister-rechts">

                    <div class="meister-punkte">
                        ${points}
                    </div>

                    <span>
                        Punkte
                    </span>

                </div>

            </article>
        `;
    }

    /* ======================================================
       MEISTERSCHAFT RENDERN
    ====================================================== */

    function renderChampionship(fahrerListe) {
        if (!championshipContainer) {
            return;
        }

        const sortierteFahrer =
            sortiereFahrer(
                fahrerListe
            );

        if (sortierteFahrer.length === 0) {
            championshipContainer.innerHTML = "";

            championshipContainer.setAttribute(
                "aria-busy",
                "false"
            );

            if (noResults) {
                noResults.hidden = false;
            }

            return;
        }

        const tabellenfuehrer =
            sortierteFahrer[0];

        const zweiter =
            sortierteFahrer[1];

        const dritter =
            sortierteFahrer[2];

        const weitereFahrer =
            sortierteFahrer.slice(3);

        championshipContainer.innerHTML = `
            ${renderLeader(tabellenfuehrer)}

            <section class="podium-grid">

                ${renderPodium(zweiter, 2)}

                ${renderPodium(dritter, 3)}

            </section>

            <section class="meisterschaft-weitere">

                ${weitereFahrer
                    .map(createCard)
                    .join("")}

            </section>
        `;

        championshipContainer.setAttribute(
            "aria-busy",
            "false"
        );

        if (noResults) {
            noResults.hidden = true;
        }
    }

    /* ======================================================
       STATISTIKEN
    ====================================================== */

    function updateStatistics(
        fahrerListe,
        rennenListe
    ) {
        const teams =
            new Set(
                fahrerListe
                    .map(getTeam)
                    .filter(
                        (team) =>
                            team &&
                            normalizeText(team) !==
                                "kein team"
                    )
            );

        const totalRaces =
            rennenListe.length;

        const completedRaces =
            rennenListe.filter(
                (race) =>
                    getRaceStatus(race) ===
                    "abgeschlossen"
            ).length;

        window.GTM.Utils?.setText(
            "stat-fahrer",
            fahrerListe.length
        );

        window.GTM.Utils?.setText(
            "stat-teams",
            teams.size
        );

        window.GTM.Utils?.setText(
            "stat-rennen",
            totalRaces || 8
        );

        window.GTM.Utils?.setText(
            "stat-fortschritt",
            totalRaces > 0
                ? `${completedRaces}/${totalRaces}`
                : "4/8"
        );
    }

    /* ======================================================
       SUCHE
    ====================================================== */

    function filterDrivers() {
        const query =
            normalizeText(
                searchInput?.value
            );

        const filtered =
            alleFahrer.filter(
                (fahrer) =>
                    query === "" ||
                    getSearchText(
                        fahrer
                    ).includes(query)
            );

        renderChampionship(
            filtered
        );
    }

    /* ======================================================
       FEHLER
    ====================================================== */

    function showError(message) {
        console.error(message);

        if (!championshipContainer) {
            return;
        }

        championshipContainer.innerHTML = `
            <div class="gtm-data-error">

                <strong>
                    Die Meisterschaft konnte nicht geladen werden.
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
        `;

        championshipContainer.setAttribute(
            "aria-busy",
            "false"
        );
    }

    /* ======================================================
       DATEN LADEN
    ====================================================== */

    async function loadChampionship() {
        try {
            const [
                championshipRaw,
                calendarRaw
            ] = await Promise.all([
                window.GTM
                    .loadMeisterschaft({
                        forceReload: true
                    })
                    .catch(() => null),

                window.GTM
                    .loadKalender({
                        forceReload: true
                    })
                    .catch(() => [])
            ]);

            let championshipData =
                extractDriverList(
                    championshipRaw
                );

            /*
             * Rückfall auf fahrer.json, falls
             * meisterschaft.json keine Fahrerliste enthält.
             */
            if (championshipData.length === 0) {
                const driverRaw =
                    await window.GTM.loadFahrer({
                        forceReload: true
                    });

                const driverList =
                    extractDriverList(
                        driverRaw
                    );

                const hasSeasonFlags =
                    driverList.some(
                        (fahrer) =>
                            typeof fahrer?.aktiveSaison ===
                            "boolean"
                    );

                championshipData =
                    hasSeasonFlags
                        ? driverList.filter(
                            (fahrer) =>
                                fahrer?.aktiveSaison === true
                        )
                        : driverList.filter(
                            (fahrer) =>
                                getDriverPlacement(fahrer) > 0 ||
                                getDriverPoints(fahrer) > 0
                        );
            }

            if (championshipData.length === 0) {
                throw new Error(
                    "Es wurden keine Fahrer der aktuellen Meisterschaft gefunden."
                );
            }

            alleRennen =
                Array.isArray(calendarRaw)
                    ? calendarRaw
                    : extractDriverList(
                        calendarRaw
                    );

            alleFahrer =
                championshipData.filter(
                    (fahrer) => {
                        if (!fahrer) {
                            return false;
                        }

                        const name =
                            getDriverName(fahrer);

                        if (
                            !name ||
                            name ===
                                "Unbekannter Fahrer"
                        ) {
                            return false;
                        }

                        /*
                         * Ein Fahrer gehört zur Wertung, wenn:
                         * – eine Platzierung vorhanden ist,
                         * – Punkte vorhanden sind,
                         * – oder er ausdrücklich als aktiv markiert ist.
                         */
                        return (
                            getDriverPlacement(fahrer) > 0 ||
                            getDriverPoints(fahrer) > 0 ||
                            fahrer?.aktiveSaison === true
                        );
                    }
                );

            alleFahrer =
                sortiereFahrer(
                    alleFahrer
                );

            updateStatistics(
                alleFahrer,
                alleRennen
            );

            renderChampionship(
                alleFahrer
            );
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

    searchInput?.addEventListener(
        "input",
        filterDrivers
    );

    await loadChampionship();
});