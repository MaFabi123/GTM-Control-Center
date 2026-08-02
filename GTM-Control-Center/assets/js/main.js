/* ==========================================
   GTM CONTROL CENTER
   Komponenten und echte Startseitendaten
========================================== */

async function loadComponent(id, file) {
    const element = document.getElementById(id);

    if (!element) {
        return false;
    }

    try {
        const response = await fetch(file, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `${file} konnte nicht geladen werden. HTTP ${response.status}`
            );
        }

        element.innerHTML = await response.text();

        return true;
    } catch (error) {
        console.error(error);

        element.innerHTML = `
            <div class="container py-4 text-danger">
                Die Komponente
                <strong>${file}</strong>
                konnte nicht geladen werden.
            </div>
        `;

        return false;
    }
}

function setText(id, value, fallback = "–") {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const valid =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "";

    element.textContent =
        valid ? String(value) : fallback;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatGermanDate(value) {
    if (!value) {
        return "Datum noch offen";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function getDriverName(driver) {
    return String(
        driver?.name ??
        driver?.fahrer ??
        driver?.anzeigename ??
        "Unbekannter Fahrer"
    );
}

function getDriverNumber(driver) {
    return String(
        driver?.nummer ??
        driver?.startnummer ??
        ""
    );
}

function getDriverPoints(driver) {
    return Number(
        driver?.punkte ??
        driver?.wertung ??
        0
    ) || 0;
}

function getNextRace(data) {
    return (
        data?.naechsterLauf ??
        data?.aktuellerLauf ??
        null
    );
}

function renderTopThree(entries) {
    const list =
        document.getElementById("dashboard-top-drei");

    if (!list) {
        return;
    }

    if (!Array.isArray(entries) || entries.length === 0) {
        list.innerHTML = `
            <li>
                Noch keine Fahrerwertung verfügbar.
            </li>
        `;

        return;
    }

    list.innerHTML = entries
        .slice(0, 3)
        .map((driver, index) => {
            const name =
                escapeHtml(getDriverName(driver));

            const number =
                escapeHtml(getDriverNumber(driver));

            const points =
                getDriverPoints(driver);

            const position =
                Number(driver?.platzierung) || index + 1;

            return `
                <li>
                    <span class="dashboard-ranking-position">
                        ${position}
                    </span>

                    <span class="dashboard-ranking-driver">
                        <strong>
                            ${number ? `#${number} ` : ""}
                            ${name}
                        </strong>

                        <small>
                            ${escapeHtml(
                                driver?.teamZuordnung ||
                                driver?.team ||
                                "Kein Team"
                            )}
                        </small>
                    </span>

                    <span class="dashboard-ranking-points">
                        ${points} Pkt.
                    </span>
                </li>
            `;
        })
        .join("");
}

function renderSeasonProgress(data) {
    const total =
        Number(data?.rennenGesamt) || 0;

    const completed =
        Number(data?.rennenAbgeschlossen) || 0;

    const percentage =
        total > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        completed / total * 100
                    )
                )
            )
            : 0;

    setText(
        "dashboard-fortschritt-text",
        `${completed} von ${total} Rennen`
    );

    const bar =
        document.getElementById(
            "dashboard-fortschritt-balken"
        );

    if (bar) {
        bar.style.width = `${percentage}%`;
    }
}

function renderDashboard(data) {
    const activeDrivers =
        Number(data?.aktiveFahrer) || 0;

    const totalRaces =
        Number(data?.rennenGesamt) || 0;

    const remainingRaces =
        Number(data?.rennenVerbleibend) || 0;

    const assignedNumbers =
        Number(data?.registrierteStartnummern) || 0;

    const teams =
        Number(data?.teams) || 0;

    const season =
        data?.saison || "GTM Masters Saison 1";

    const status =
        data?.status || "läuft";

    const nextRace =
        getNextRace(data);

    setText("hero-aktive-fahrer", activeDrivers);
    setText("hero-rennen-gesamt", totalRaces);
    setText("hero-rennen-verbleibend", remainingRaces);
    setText("hero-saison-name", season);
    setText("hero-saison-status", status);

    setText("dashboard-saison", season);
    setText("dashboard-fahrer-anzahl", activeDrivers);
    setText("dashboard-team-anzahl", teams);
    setText(
        "dashboard-startnummern-anzahl",
        assignedNumbers
    );

    setText(
        "dashboard-meisterschaft-text",
        `${activeDrivers} Fahrer, ${teams} Teams und ${totalRaces} Saisonläufe.`
    );

    renderTopThree(
        Array.isArray(data?.topDrei)
            ? data.topDrei
            : []
    );

    renderSeasonProgress(data);

    if (nextRace) {
        setText(
            "dashboard-naechste-strecke",
            nextRace.strecke,
            "Noch nicht festgelegt"
        );

        const roundText =
            nextRace.laufnummer
                ? `Lauf ${nextRace.laufnummer}`
                : "Nächster Lauf";

        setText(
            "dashboard-naechstes-rennen",
            `${roundText} am ${formatGermanDate(
                nextRace.datum
            )}.`
        );
    } else {
        setText(
            "dashboard-naechste-strecke",
            "Noch nicht festgelegt"
        );

        setText(
            "dashboard-naechstes-rennen",
            "Der nächste Saisonlauf steht noch nicht fest."
        );
    }
}

function showDashboardError(error) {
    console.error(
        "Dashboarddaten konnten nicht geladen werden:",
        error
    );

    setText(
        "dashboard-meisterschaft-text",
        "Die aktuellen GTM-Daten konnten nicht geladen werden."
    );

    setText(
        "dashboard-naechste-strecke",
        "Datenfehler"
    );

    setText(
        "dashboard-naechstes-rennen",
        "Prüfe bitte data/json/dashboard.json."
    );
}

async function loadDashboardData() {
    if (!window.GTM) {
        showDashboardError(
            new Error(
                "Die GTM Data Engine wurde nicht geladen."
            )
        );

        return;
    }

    try {
        const data = await window.GTM.load(
            "dashboard",
            {
                forceReload: true
            }
        );

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            throw new Error(
                "dashboard.json enthält kein gültiges Datenobjekt."
            );
        }

        renderDashboard(data);
    } catch (error) {
        showDashboardError(error);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await loadComponent(
            "site-navbar",
            "components/navbar.html"
        );

        const heroLoaded =
            await loadComponent(
                "site-hero",
                "components/hero.html"
            );

        const dashboardLoaded =
            await loadComponent(
                "site-dashboard",
                "components/dashboard.html"
            );

        await loadComponent(
            "site-footer",
            "components/footer.html"
        );

        if (heroLoaded || dashboardLoaded) {
            await loadDashboardData();
        }
    }
);