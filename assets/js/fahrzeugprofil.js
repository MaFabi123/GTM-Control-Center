/* ==========================================================
   GTM FAHRZEUGPROFIL
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const root = document.getElementById("fahrzeugprofil-inhalt");

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

    function createSlug(value) {
        return normalize(value)
            .replace(/ß/g, "ss")
            .replace(/&/g, "und")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function getManufacturer(vehicle) {
        return String(vehicle?.hersteller || "Unbekannter Hersteller").trim();
    }

    function getVehicleName(vehicle) {
        return String(vehicle?.fahrzeug || vehicle?.name || "Unbekanntes Fahrzeug").trim();
    }

    function getDisplayName(vehicle) {
        return String(
            vehicle?.anzeigename ||
            `${getManufacturer(vehicle)} ${getVehicleName(vehicle)}`
        ).trim();
    }

    function getVehicleId(vehicle) {
        const number = toNumber(vehicle?.nummer, 0);
        return number > 0 ? String(number) : createSlug(getDisplayName(vehicle));
    }

    function driverUsesVehicle(driver, vehicle) {
        const target = normalize(driver?.fahrzeug);
        const names = [
            getDisplayName(vehicle),
            getVehicleName(vehicle),
            `${getManufacturer(vehicle)} ${getVehicleName(vehicle)}`
        ].map(normalize);

        return names.includes(target);
    }

    function calculateVehicleStatistics(vehicle, drivers) {
        const vehicleDrivers = drivers.filter((driver) => driverUsesVehicle(driver, vehicle));
        const placements = vehicleDrivers
            .map((driver) => toNumber(driver?.platzierung, 0))
            .filter((placement) => placement > 0);
        const points = vehicleDrivers.reduce(
            (sum, driver) => sum + toNumber(driver?.punkte, 0),
            0
        );

        return {
            vehicle,
            drivers: vehicleDrivers,
            points,
            rating: vehicleDrivers.reduce(
                (sum, driver) => sum + toNumber(driver?.wertung, 0),
                0
            ),
            fastestLaps: vehicleDrivers.reduce(
                (sum, driver) => sum + toNumber(driver?.fastLap, 0),
                0
            ),
            bestPlacement: placements.length > 0 ? Math.min(...placements) : 0,
            averagePoints: vehicleDrivers.length > 0
                ? Math.round(points / vehicleDrivers.length)
                : 0,
            rank: 0
        };
    }

    function rankVehicles(vehicles, drivers) {
        return vehicles
            .map((vehicle) => calculateVehicleStatistics(vehicle, drivers))
            .filter((entry) => entry.drivers.length > 0)
            .sort((a, b) => (
                b.points - a.points ||
                b.fastestLaps - a.fastestLaps ||
                a.bestPlacement - b.bestPlacement ||
                getDisplayName(a.vehicle).localeCompare(
                    getDisplayName(b.vehicle),
                    "de",
                    { sensitivity: "base" }
                )
            ))
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    function createDriverCards(drivers) {
        if (drivers.length === 0) {
            return '<div class="fahrzeugprofil-fehler">Noch keinem Fahrer zugeordnet.</div>';
        }

        return `
            <div class="fahrzeugprofil-fahrer-grid">
                ${drivers
                    .sort((a, b) => toNumber(a.platzierung, 999) - toNumber(b.platzierung, 999))
                    .map((driver) => `
                        <a
                            class="fahrzeugprofil-fahrer"
                            href="pages/fahrerprofil.html?nummer=${encodeURIComponent(toNumber(driver.nummer, 0))}"
                            aria-label="Fahrerprofil ${escapeHtml(driver.name)} öffnen"
                        >
                            <div class="fahrzeugprofil-fahrer-nummer">
                                #${escapeHtml(toNumber(driver.nummer, 0) || "–")}
                            </div>

                            <div>
                                <strong>${escapeHtml(driver.name || "Unbekannter Fahrer")}</strong>
                                <span>
                                    ${escapeHtml(driver.teamZuordnung || driver.team || "Kein Team")}
                                    · ${toNumber(driver.punkte, 0)} Punkte
                                </span>
                            </div>
                        </a>
                    `).join("")}
            </div>
        `;
    }

    function activateCutoutPlaceholder() {
        const image = document.getElementById("fahrzeugprofil-freisteller-bild");
        const placeholder = document.getElementById("fahrzeugprofil-freisteller-platzhalter");
        if (!image || !placeholder) return;

        const showImage = () => {
            image.hidden = false;
            placeholder.hidden = true;
        };
        const showPlaceholder = () => {
            image.hidden = true;
            placeholder.hidden = false;
        };

        image.addEventListener("load", showImage);
        image.addEventListener("error", showPlaceholder);

        if (image.complete) {
            if (image.naturalWidth > 0) showImage();
            else showPlaceholder();
        }
    }

    function renderVehicle(vehicle, statistics) {
        if (!root) return;

        const displayName = getDisplayName(vehicle);
        const imageFile = String(vehicle?.bild || "").trim();
        const photo = imageFile
            ? `assets/images/fahrzeuge/${imageFile}`
            : "assets/images/fahrzeuge/default.png";
        const cutout = imageFile
            ? `assets/images/fahrzeuge/freigestellt/${imageFile}`
            : "";

        document.title = `GTM Control Center | ${displayName}`;

        root.innerHTML = `
            <section class="fahrzeugprofil-hero">
                <div class="container">
                    <a class="fahrzeugprofil-zurueck" href="pages/fahrzeuge.html">
                        ← Zurück zu allen Fahrzeugen
                    </a>

                    <article class="fahrzeugprofil-hero-karte">
                        <div class="fahrzeugprofil-foto">
                            <img
                                src="${escapeHtml(photo)}"
                                alt="${escapeHtml(displayName)}"
                                onerror="this.onerror=null;this.src='assets/images/fahrzeuge/default.png';"
                            >
                        </div>

                        <div class="fahrzeugprofil-hero-inhalt">
                            <p class="fahrzeugprofil-eyebrow">GTM Fahrzeugprofil</p>
                            <h1>${escapeHtml(getVehicleName(vehicle))}</h1>
                            <span class="fahrzeugprofil-hersteller">
                                ${escapeHtml(getManufacturer(vehicle))}
                            </span>
                        </div>
                    </article>
                </div>
            </section>

            <section class="fahrzeugprofil-bereich">
                <div class="container">
                    <div class="fahrzeugprofil-statistik">
                        <article><strong>${statistics.rank ? `#${statistics.rank}` : "–"}</strong><span>GTM Erfolgsrang</span></article>
                        <article><strong>${statistics.points}</strong><span>Gesamtpunkte</span></article>
                        <article><strong>${statistics.drivers.length}</strong><span>Fahrer</span></article>
                        <article><strong>${statistics.fastestLaps}</strong><span>Schnellste Runden</span></article>
                        <article><strong>${statistics.bestPlacement ? `P${statistics.bestPlacement}` : "–"}</strong><span>Beste Platzierung</span></article>
                        <article><strong>${statistics.averagePoints}</strong><span>Ø Punkte je Fahrer</span></article>
                    </div>
                </div>
            </section>

            <section class="fahrzeugprofil-bereich">
                <div class="container">
                    <header class="fahrzeugprofil-bereich-kopf">
                        <p>Fahrzeugdaten</p>
                        <h2>Technische Einordnung</h2>
                    </header>

                    <div class="fahrzeugprofil-daten">
                        <article><span>Hersteller</span><strong>${escapeHtml(getManufacturer(vehicle))}</strong></article>
                        <article><span>Klasse</span><strong>${escapeHtml(vehicle.klasse || "–")}</strong></article>
                        <article><span>Baujahr</span><strong>${escapeHtml(vehicle.baujahr || "–")}</strong></article>
                        <article><span>Inhalt / DLC</span><strong>${escapeHtml(vehicle.inhalt || vehicle.dlc || "Grundspiel")}</strong></article>
                    </div>
                </div>
            </section>

            <section class="fahrzeugprofil-bereich">
                <div class="container">
                    <header class="fahrzeugprofil-bereich-kopf">
                        <p>Zukünftiges Medienasset</p>
                        <h2>Freigestelltes Fahrzeug</h2>
                    </header>

                    <article class="fahrzeugprofil-freisteller">
                        <div class="fahrzeugprofil-freisteller-bild">
                            ${cutout ? `
                                <img
                                    id="fahrzeugprofil-freisteller-bild"
                                    src="${escapeHtml(cutout)}"
                                    alt="Freigestelltes ${escapeHtml(displayName)}"
                                    hidden
                                >
                            ` : ""}

                            <div
                                id="fahrzeugprofil-freisteller-platzhalter"
                                class="fahrzeugprofil-freisteller-platzhalter"
                            >
                                Freigestelltes PNG wird später ergänzt.
                                Der Platzhalter aktualisiert sich danach automatisch.
                            </div>
                        </div>

                        <div class="fahrzeugprofil-freisteller-text">
                            <span>Separates Bildasset</span>
                            <h3>Bereit für Fahrer- und TA-Karten</h3>
                            <p>
                                Das vorhandene Fahrzeugfoto bleibt unverändert erhalten.
                                Der spätere Freisteller wird als eigenes Asset verwendet und nicht darübergelegt.
                            </p>
                        </div>
                    </article>
                </div>
            </section>

            <section class="fahrzeugprofil-bereich">
                <div class="container">
                    <header class="fahrzeugprofil-bereich-kopf">
                        <p>GTM Besetzung</p>
                        <h2>Fahrer dieses Fahrzeugs</h2>
                    </header>

                    ${createDriverCards(statistics.drivers)}
                </div>
            </section>
        `;

        activateCutoutPlaceholder();
        root.setAttribute("aria-busy", "false");
    }

    function showError(message) {
        if (!root) return;

        root.innerHTML = `
            <div class="container fahrzeugprofil-fehler">
                <p>${escapeHtml(message)}</p>
                <a class="fahrzeugprofil-zurueck" href="pages/fahrzeuge.html">
                    ← Zurück zu allen Fahrzeugen
                </a>
            </div>
        `;
        root.setAttribute("aria-busy", "false");
    }

    try {
        if (!window.GTM || typeof window.GTM.load !== "function") {
            throw new Error("Die GTM Data Engine wurde nicht geladen.");
        }

        const requestedId = String(
            new URLSearchParams(window.location.search).get("fahrzeug") || ""
        ).trim();

        if (!requestedId) {
            throw new Error("Es wurde kein Fahrzeug ausgewählt.");
        }

        const [vehicleData, driverData] = await Promise.all([
            window.GTM.load("fahrzeuge", { forceReload: true }),
            typeof window.GTM.loadFahrer === "function"
                ? window.GTM.loadFahrer({ forceReload: true }).catch(() => [])
                : Promise.resolve([])
        ]);

        if (!Array.isArray(vehicleData)) {
            throw new Error("fahrzeuge.json enthält keine gültige Fahrzeugliste.");
        }

        const vehicle = vehicleData.find((entry) => getVehicleId(entry) === requestedId);
        if (!vehicle) {
            throw new Error("Das ausgewählte Fahrzeug wurde nicht gefunden.");
        }

        const drivers = Array.isArray(driverData) ? driverData : [];
        const ranking = rankVehicles(vehicleData, drivers);
        const statistics = ranking.find((entry) => getVehicleId(entry.vehicle) === requestedId) ||
            calculateVehicleStatistics(vehicle, drivers);

        renderVehicle(vehicle, statistics);
    } catch (error) {
        showError(error?.message || "Das Fahrzeugprofil konnte nicht geladen werden.");
    }
});
