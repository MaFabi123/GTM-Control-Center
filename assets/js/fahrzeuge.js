/* ==========================================================
   GTM FAHRZEUGE
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const grid = document.getElementById("fahrzeuge-grid");
    const searchInput = document.getElementById("fahrzeuge-suche");
    const manufacturerFilter = document.getElementById("hersteller-filter");
    const classFilter = document.getElementById("klasse-filter");
    const sortSelect = document.getElementById("fahrzeuge-sortierung");
    const noResults = document.getElementById("keine-fahrzeuge");
    const slider = document.getElementById("fahrzeuge-erfolg-slider");
    const sliderDots = document.getElementById("fahrzeuge-erfolg-punkte");
    const sliderPrevious = document.getElementById("fahrzeuge-erfolg-zurueck");
    const sliderNext = document.getElementById("fahrzeuge-erfolg-weiter");

    let vehicles = [];
    let drivers = [];
    let successfulVehicles = [];
    let sliderIndex = 0;
    let sliderTimer = null;

    if (!window.GTM || typeof window.GTM.load !== "function") {
        showError("Die GTM Data Engine wurde nicht geladen.");
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

    function normalize(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function createSlug(value) {
        return normalize(value)
            .replace(/ß/g, "ss")
            .replace(/&/g, "und")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
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

    function getClassName(vehicle) {
        return String(vehicle?.klasse || "Keine Klasse").trim();
    }

    function getYear(vehicle) {
        return toNumber(vehicle?.baujahr, 0);
    }

    function getDlc(vehicle) {
        return String(vehicle?.dlc || vehicle?.inhalt || "Grundspiel").trim();
    }

    function getVehicleId(vehicle) {
        const number = toNumber(vehicle?.nummer, 0);
        return number > 0 ? String(number) : createSlug(getDisplayName(vehicle));
    }

    function getVehicleUrl(vehicle) {
        return `pages/fahrzeugprofil.html?fahrzeug=${encodeURIComponent(getVehicleId(vehicle))}`;
    }

    function getManufacturerLogo(manufacturer) {
        const aliases = {
            mercedes: "mercedes-amg",
            "aston-martin-racing": "aston-martin",
            "chevrolet-camaro": "chevrolet",
            "nissan-nismo": "nissan",
            "honda-acura": "honda"
        };
        const originalSlug = createSlug(manufacturer);
        const fileSlug = aliases[originalSlug] || originalSlug;

        return fileSlug
            ? `assets/images/hersteller/${fileSlug}.png`
            : "assets/images/hersteller/default.png";
    }

    function getVehiclePhoto(vehicle) {
        const image = String(vehicle?.bild || "").trim();
        return image ? `assets/images/fahrzeuge/${image}` : "";
    }

    function getSearchText(vehicle) {
        return normalize([
            getManufacturer(vehicle),
            getVehicleName(vehicle),
            getDisplayName(vehicle),
            getClassName(vehicle),
            getYear(vehicle),
            getDlc(vehicle)
        ].join(" "));
    }

    function createCard(vehicle) {
        const manufacturer = escapeHtml(getManufacturer(vehicle));
        const vehicleName = escapeHtml(getVehicleName(vehicle));
        const displayName = escapeHtml(getDisplayName(vehicle));
        const className = escapeHtml(getClassName(vehicle));
        const year = getYear(vehicle);
        const dlc = escapeHtml(getDlc(vehicle));
        const logo = escapeHtml(getManufacturerLogo(getManufacturer(vehicle)));
        const photo = getVehiclePhoto(vehicle);

        return `
            <a
                class="fahrzeug-karte"
                href="${escapeHtml(getVehicleUrl(vehicle))}"
                aria-label="Fahrzeugprofil ${displayName} öffnen"
            >
                <div class="fahrzeug-logo">
                    <img
                        src="${logo}"
                        alt="Logo ${manufacturer}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='assets/images/hersteller/default.png';"
                    >
                </div>

                ${photo ? `
                    <div class="fahrzeug-bild">
                        <img
                            src="${escapeHtml(photo)}"
                            alt="${displayName}"
                            loading="lazy"
                            onerror="this.onerror=null;this.closest('.fahrzeug-bild').hidden=true;"
                        >
                    </div>
                ` : ""}

                <div class="fahrzeug-content">
                    <span class="fahrzeug-hersteller">${manufacturer}</span>
                    <h2>${vehicleName}</h2>

                    <div class="fahrzeug-grid">
                        <div>
                            <span>Klasse</span>
                            <strong>${className}</strong>
                        </div>

                        <div>
                            <span>Baujahr</span>
                            <strong>${year || "–"}</strong>
                        </div>

                        <div>
                            <span>DLC</span>
                            <strong>${dlc}</strong>
                        </div>
                    </div>

                    <span class="fahrzeug-profil-link">Fahrzeugprofil öffnen →</span>
                </div>
            </a>
        `;
    }

    function render(entries) {
        if (!grid) return;

        grid.innerHTML = entries.map(createCard).join("");
        grid.setAttribute("aria-busy", "false");

        if (noResults) {
            noResults.hidden = entries.length > 0;
        }
    }

    function updateStatistics() {
        const manufacturers = new Set(vehicles.map(getManufacturer).filter(Boolean));
        const classes = new Set(vehicles.map(getClassName).filter(Boolean));
        const years = vehicles.map(getYear).filter((year) => year > 0);

        window.GTM.Utils?.setText("fahrzeuge-gesamt", vehicles.length);
        window.GTM.Utils?.setText("fahrzeuge-hersteller", manufacturers.size);
        window.GTM.Utils?.setText("fahrzeuge-klassen", classes.size);
        window.GTM.Utils?.setText(
            "fahrzeuge-neuestes-baujahr",
            years.length > 0 ? Math.max(...years) : "–"
        );
    }

    function fillSelect(select, values, label) {
        if (!select) return;

        const current = select.value;
        const unique = [...new Set(values.filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

        select.innerHTML = [
            `<option value="">${escapeHtml(label)}</option>`,
            ...unique.map((value) => (
                `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
            ))
        ].join("");

        if (unique.includes(current)) select.value = current;
    }

    function fillFilters() {
        fillSelect(manufacturerFilter, vehicles.map(getManufacturer), "Alle Hersteller");
        fillSelect(classFilter, vehicles.map(getClassName), "Alle Klassen");
    }

    function sortVehicles(entries) {
        const mode = sortSelect?.value || "hersteller";

        return [...entries].sort((a, b) => {
            if (mode === "fahrzeug") {
                return getVehicleName(a).localeCompare(getVehicleName(b), "de", { sensitivity: "base" });
            }

            if (mode === "klasse") {
                return getClassName(a).localeCompare(getClassName(b), "de", { sensitivity: "base" }) ||
                    getDisplayName(a).localeCompare(getDisplayName(b), "de", { sensitivity: "base" });
            }

            if (mode === "baujahr") {
                return getYear(b) - getYear(a) ||
                    getDisplayName(a).localeCompare(getDisplayName(b), "de", { sensitivity: "base" });
            }

            return getManufacturer(a).localeCompare(getManufacturer(b), "de", { sensitivity: "base" }) ||
                getVehicleName(a).localeCompare(getVehicleName(b), "de", { sensitivity: "base" });
        });
    }

    function filterVehicles() {
        const query = normalize(searchInput?.value);
        const manufacturer = String(manufacturerFilter?.value || "");
        const className = String(classFilter?.value || "");

        const filtered = vehicles.filter((vehicle) => (
            (!query || getSearchText(vehicle).includes(query)) &&
            (!manufacturer || getManufacturer(vehicle) === manufacturer) &&
            (!className || getClassName(vehicle) === className)
        ));

        render(sortVehicles(filtered));
    }

    function findVehicleForDriver(driver) {
        const target = normalize(driver?.fahrzeug);

        return vehicles.find((vehicle) => {
            const names = [
                getDisplayName(vehicle),
                getVehicleName(vehicle),
                `${getManufacturer(vehicle)} ${getVehicleName(vehicle)}`
            ].map(normalize);

            return names.includes(target);
        }) || null;
    }

    function calculateSuccessfulVehicles() {
        const result = new Map();

        drivers.forEach((driver) => {
            const vehicle = findVehicleForDriver(driver);
            if (!vehicle) return;

            const id = getVehicleId(vehicle);

            if (!result.has(id)) {
                result.set(id, {
                    vehicle,
                    points: 0,
                    rating: 0,
                    fastestLaps: 0,
                    driverNumbers: new Set(),
                    bestPlacement: 0
                });
            }

            const entry = result.get(id);
            const placement = toNumber(driver?.platzierung, 0);
            entry.points += toNumber(driver?.punkte, 0);
            entry.rating += toNumber(driver?.wertung, 0);
            entry.fastestLaps += toNumber(driver?.fastLap, 0);

            if (toNumber(driver?.nummer, 0) > 0) {
                entry.driverNumbers.add(toNumber(driver.nummer, 0));
            }

            if (placement > 0 && (entry.bestPlacement === 0 || placement < entry.bestPlacement)) {
                entry.bestPlacement = placement;
            }
        });

        successfulVehicles = [...result.values()]
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
            .slice(0, 6)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    function createSuccessSlide(entry, index) {
        const vehicle = entry.vehicle;
        const photo = getVehiclePhoto(vehicle);
        const active = index === 0 ? " ist-aktiv" : "";

        return `
            <article
                class="fahrzeuge-erfolg-slide${active}"
                aria-hidden="${index === 0 ? "false" : "true"}"
            >
                <div class="fahrzeuge-erfolg-bild">
                    ${photo ? `
                        <img
                            src="${escapeHtml(photo)}"
                            alt="${escapeHtml(getDisplayName(vehicle))}"
                            onerror="this.onerror=null;this.closest('.fahrzeuge-erfolg-bild').classList.add('ohne-bild');this.remove();"
                        >
                    ` : ""}
                    <strong>#${entry.rank}</strong>
                </div>

                <div class="fahrzeuge-erfolg-inhalt">
                    <span>GTM Erfolgsrang ${entry.rank}</span>
                    <h3>${escapeHtml(getDisplayName(vehicle))}</h3>
                    <p>${escapeHtml(getClassName(vehicle))} · Baujahr ${getYear(vehicle) || "–"}</p>

                    <div class="fahrzeuge-erfolg-werte">
                        <div><strong>${entry.points}</strong><span>Gesamtpunkte</span></div>
                        <div><strong>${entry.driverNumbers.size}</strong><span>Fahrer</span></div>
                        <div><strong>${entry.fastestLaps}</strong><span>Schnellste Runden</span></div>
                        <div><strong>${entry.bestPlacement ? `P${entry.bestPlacement}` : "–"}</strong><span>Beste Platzierung</span></div>
                    </div>

                    <a href="${escapeHtml(getVehicleUrl(vehicle))}">
                        Fahrzeugprofil öffnen →
                    </a>
                </div>
            </article>
        `;
    }

    function showSlide(index, restart = true) {
        if (successfulVehicles.length === 0) return;

        sliderIndex = (index + successfulVehicles.length) % successfulVehicles.length;

        slider?.querySelectorAll(".fahrzeuge-erfolg-slide").forEach((slide, currentIndex) => {
            const active = currentIndex === sliderIndex;
            slide.classList.toggle("ist-aktiv", active);
            slide.setAttribute("aria-hidden", String(!active));
        });

        sliderDots?.querySelectorAll("button").forEach((dot, currentIndex) => {
            const active = currentIndex === sliderIndex;
            dot.classList.toggle("ist-aktiv", active);
            dot.setAttribute("aria-current", active ? "true" : "false");
        });

        if (restart) startSliderTimer();
    }

    function stopSliderTimer() {
        if (sliderTimer !== null) {
            window.clearInterval(sliderTimer);
            sliderTimer = null;
        }
    }

    function startSliderTimer() {
        stopSliderTimer();
        if (successfulVehicles.length <= 1 || document.hidden) return;

        sliderTimer = window.setInterval(() => showSlide(sliderIndex + 1, false), 7000);
    }

    function renderSuccessSlider() {
        if (!slider) return;

        calculateSuccessfulVehicles();
        sliderIndex = 0;

        if (successfulVehicles.length === 0) {
            slider.innerHTML = '<div class="fahrzeuge-erfolg-laden">Noch keine Fahrzeugwertungen vorhanden.</div>';
            if (sliderDots) sliderDots.innerHTML = "";
            if (sliderPrevious) sliderPrevious.disabled = true;
            if (sliderNext) sliderNext.disabled = true;
            return;
        }

        slider.innerHTML = successfulVehicles.map(createSuccessSlide).join("");

        if (sliderDots) {
            sliderDots.innerHTML = successfulVehicles.map((entry, index) => `
                <button
                    type="button"
                    class="${index === 0 ? "ist-aktiv" : ""}"
                    data-slide-index="${index}"
                    aria-label="${escapeHtml(getDisplayName(entry.vehicle))} anzeigen"
                    aria-current="${index === 0 ? "true" : "false"}"
                ></button>
            `).join("");
        }

        if (sliderPrevious) sliderPrevious.disabled = successfulVehicles.length <= 1;
        if (sliderNext) sliderNext.disabled = successfulVehicles.length <= 1;
        startSliderTimer();
    }

    function showError(message) {
        console.error(message);
        if (!grid) return;

        grid.innerHTML = `
            <div class="gtm-data-error">
                <strong>Die Fahrzeugdaten konnten nicht geladen werden.</strong>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
        grid.setAttribute("aria-busy", "false");
    }

    async function loadData() {
        try {
            const [vehicleData, driverData] = await Promise.all([
                window.GTM.load("fahrzeuge", { forceReload: true }),
                typeof window.GTM.loadFahrer === "function"
                    ? window.GTM.loadFahrer({ forceReload: true }).catch(() => [])
                    : Promise.resolve([])
            ]);

            if (!Array.isArray(vehicleData)) {
                throw new Error("fahrzeuge.json enthält keine gültige Fahrzeugliste.");
            }

            vehicles = vehicleData.filter((vehicle) => (
                vehicle && getVehicleName(vehicle) !== "Unbekanntes Fahrzeug"
            ));
            drivers = Array.isArray(driverData) ? driverData : [];

            updateStatistics();
            fillFilters();
            renderSuccessSlider();
            filterVehicles();
        } catch (error) {
            showError(error?.message || "Unbekannter Fehler");
        }
    }

    searchInput?.addEventListener("input", filterVehicles);
    manufacturerFilter?.addEventListener("change", filterVehicles);
    classFilter?.addEventListener("change", filterVehicles);
    sortSelect?.addEventListener("change", filterVehicles);
    sliderPrevious?.addEventListener("click", () => showSlide(sliderIndex - 1));
    sliderNext?.addEventListener("click", () => showSlide(sliderIndex + 1));
    sliderDots?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-slide-index]");
        if (button) showSlide(toNumber(button.dataset.slideIndex, 0));
    });
    slider?.addEventListener("pointerenter", stopSliderTimer);
    slider?.addEventListener("pointerleave", startSliderTimer);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopSliderTimer();
        else startSliderTimer();
    });

    await loadData();
});
