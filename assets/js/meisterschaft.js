/* ==========================================================
   GTM MEISTERSCHAFT
   Podium, Team-Pulse und Fahrerwertung
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const podiumContainer = document.getElementById("meisterschaft-podium");
    const teamContainer = document.getElementById("meisterschaft-teams");
    const rankingContainer = document.getElementById("meisterschaft-grid");
    const searchInput = document.getElementById("meisterschaft-suche");
    const sortSelect = document.getElementById("meisterschaft-sortierung");
    const noResults = document.getElementById("keine-eintraege");

    const FALLBACK_DRIVER = "assets/images/fahrer/default.png";
    const FALLBACK_VEHICLE = "assets/images/hero/mercedes-amg-gt3.png";
    const FALLBACK_TEAM = "assets/images/teams/default.png";

    let championship = {};
    let allDrivers = [];
    let allVehicles = [];
    let allRaces = [];
    let heroSlides = [];
    let heroSlideIndex = 0;
    let heroSliderTimer = null;

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

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/ß/g, "ss")
            .replace(/&/g, "und")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function createSlug(value) {
        return normalizeText(value).replace(/\s+/g, "-");
    }

    function toNumber(value, fallback = 0) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : fallback;
        }

        const raw = String(value ?? "").trim();
        if (!raw) {
            return fallback;
        }

        const cleaned = raw
            .replace(/\s/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", ".")
            .replace(/[^0-9.-]/g, "");

        const number = Number(cleaned);
        return Number.isFinite(number) ? number : fallback;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("de-DE", {
            maximumFractionDigits: 2
        }).format(toNumber(value));
    }

    function formatDate(value) {
        if (!value) {
            return "Termin folgt";
        }

        const date = new Date(`${value}T12:00:00`);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function getDriverName(driver) {
        return String(
            driver?.name ||
            driver?.anzeigename ||
            driver?.fahrer ||
            "Unbekannter Fahrer"
        ).trim();
    }

    function getDriverNumber(driver) {
        return toNumber(driver?.nummer ?? driver?.startnummer);
    }

    function getPlacement(driver) {
        return toNumber(driver?.platzierung ?? driver?.platz, 9999);
    }

    function getPoints(driver) {
        return toNumber(driver?.punkte ?? driver?.wertung);
    }

    function getTeam(driver) {
        return String(
            driver?.team ||
            driver?.teamZuordnung ||
            "Kein Team"
        ).trim();
    }

    function getEntryTeam(driver) {
        return String(
            driver?.teamZuordnung ||
            driver?.team ||
            "Kein Team"
        ).trim();
    }

    function getOrganizationName(teamName) {
        const value = String(teamName || "").trim();

        return value
            .replace(/\s+(?:I|II|III|IV|V)$/i, "")
            .trim();
    }

    function getVehicle(driver) {
        return String(driver?.fahrzeug || "Kein Fahrzeug eingetragen").trim();
    }

    function getFastLaps(driver) {
        return toNumber(driver?.fastLap ?? driver?.fastlaps ?? driver?.schnellsteRunden);
    }

    function getVehicleChanges(driver) {
        return toNumber(driver?.fahrzeugwechsel ?? driver?.wechsel);
    }

    function getDriverImage(driver) {
        const number = getDriverNumber(driver);
        const image = String(driver?.bild || "").trim();

        if (image && normalizeText(image) !== "default png") {
            return `assets/images/fahrer/${encodeURIComponent(image)}`;
        }

        if (number > 0) {
            return `assets/images/fahrer/${encodeURIComponent(String(number))}.png`;
        }

        return FALLBACK_DRIVER;
    }

    function findVehicleData(vehicleName) {
        const target = normalizeText(vehicleName);
        if (!target || target === "kein fahrzeug eingetragen") {
            return null;
        }

        const exact = allVehicles.find((vehicle) => {
            return [vehicle?.anzeigename, vehicle?.fahrzeug]
                .some((value) => normalizeText(value) === target);
        });

        if (exact) {
            return exact;
        }

        return allVehicles.find((vehicle) => {
            const names = [vehicle?.anzeigename, vehicle?.fahrzeug]
                .map(normalizeText)
                .filter(Boolean);

            return names.some((name) => {
                return name.includes(target) || target.includes(name);
            });
        }) || null;
    }

    function getVehicleImage(driver) {
        const match = findVehicleData(getVehicle(driver));
        const image = String(match?.bild || "").trim();

        return image
            ? `assets/images/fahrzeuge/${encodeURIComponent(image)}`
            : FALLBACK_VEHICLE;
    }

    function getDriverUrl(driver) {
        return `pages/fahrerprofil.html?nummer=${encodeURIComponent(getDriverNumber(driver))}`;
    }

    function getTeamUrl(team) {
        return `pages/team.html?team=${encodeURIComponent(createSlug(team))}`;
    }

    function imageTag(source, fallback, alt, className) {
        return `
            <img
                class="${escapeHtml(className)}"
                src="${escapeHtml(source)}"
                alt="${escapeHtml(alt)}"
                loading="lazy"
                onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';"
            >
        `;
    }

    function getMastersRaces(races) {
        const list = Array.isArray(races) ? races : [];
        const tagged = list.filter((race) => {
            const module = normalizeText(race?.modul || race?.serieId || race?.serie);
            return module.includes("masters");
        });

        return tagged.length > 0 ? tagged : list;
    }

    function getParticipatingVehicleSlides() {
        const slides = new Map();

        allDrivers.forEach((driver) => {
            const name = getVehicle(driver);
            const key = normalizeText(name);

            if (!key || key === "kein fahrzeug eingetragen") {
                return;
            }

            if (!slides.has(key)) {
                slides.set(key, {
                    name,
                    image: getVehicleImage(driver),
                    drivers: 0
                });
            }

            slides.get(key).drivers += 1;
        });

        return [...slides.values()].sort((a, b) => {
            return b.drivers - a.drivers || a.name.localeCompare(b.name, "de");
        });
    }

    function showHeroSlide(index) {
        if (heroSlides.length === 0) {
            return;
        }

        const stage = document.querySelector(".meisterschaft-hero-stage");
        const image = document.getElementById("meisterschaft-hero-car");
        const counter = document.getElementById("meisterschaft-hero-number");
        const name = document.getElementById("meisterschaft-slider-name");
        const info = document.getElementById("meisterschaft-slider-info");

        heroSlideIndex = (index + heroSlides.length) % heroSlides.length;
        const slide = heroSlides[heroSlideIndex];

        stage?.classList.remove("is-changing");
        void stage?.offsetWidth;
        stage?.classList.add("is-changing");

        image.src = slide.image;
        image.alt = slide.name;
        image.onerror = () => {
            image.onerror = null;
            image.src = FALLBACK_VEHICLE;
        };

        counter.textContent = `${String(heroSlideIndex + 1).padStart(2, "0")} / ${String(heroSlides.length).padStart(2, "0")}`;
        name.textContent = slide.name;
        info.textContent = `${slide.drivers} ${slide.drivers === 1 ? "Fahrer" : "Fahrer"} in der aktuellen Masters-Wertung`;
    }

    function restartHeroSlider() {
        window.clearInterval(heroSliderTimer);

        if (heroSlides.length > 1) {
            heroSliderTimer = window.setInterval(() => {
                showHeroSlide(heroSlideIndex + 1);
            }, 5200);
        }
    }

    function setupHeroSlider() {
        const stage = document.querySelector(".meisterschaft-hero-stage");
        if (!stage) {
            return;
        }

        heroSlides = getParticipatingVehicleSlides();

        stage.querySelector(".meisterschaft-slider-caption")?.remove();
        stage.querySelector(".meisterschaft-slider-controls")?.remove();

        stage.insertAdjacentHTML("beforeend", `
            <div class="meisterschaft-slider-caption" aria-live="polite">
                <span>Teilnehmendes Masters-Fahrzeug</span>
                <strong id="meisterschaft-slider-name">Fahrzeug wird geladen</strong>
                <small id="meisterschaft-slider-info"></small>
            </div>
            <div class="meisterschaft-slider-controls" aria-label="Fahrzeug-Slider steuern">
                <button type="button" data-slider-direction="-1" aria-label="Vorheriges Fahrzeug">←</button>
                <button type="button" data-slider-direction="1" aria-label="Nächstes Fahrzeug">→</button>
            </div>
        `);

        stage.querySelectorAll("[data-slider-direction]").forEach((button) => {
            button.addEventListener("click", () => {
                showHeroSlide(heroSlideIndex + toNumber(button.dataset.sliderDirection));
                restartHeroSlider();
            });
        });

        stage.addEventListener("mouseenter", () => window.clearInterval(heroSliderTimer));
        stage.addEventListener("mouseleave", restartHeroSlider);
        stage.addEventListener("focusin", () => window.clearInterval(heroSliderTimer));
        stage.addEventListener("focusout", restartHeroSlider);

        showHeroSlide(0);
        restartHeroSlider();

        const controls = stage.querySelector(".meisterschaft-slider-controls");
        if (controls) {
            controls.hidden = heroSlides.length < 2;
        }
    }

    function updateHero() {
        const seasonElement = document.getElementById("meisterschaft-saison");
        const statusElement = document.getElementById("meisterschaft-status");
        const trackElement = document.getElementById("meisterschaft-naechste-strecke");
        const dateElement = document.getElementById("meisterschaft-naechstes-datum");

        const season = String(championship?.saison || "GTM Masters").trim();
        const status = String(championship?.status || "Aktuelle Wertung").trim();

        seasonElement.textContent = season;
        statusElement.textContent = status;
        setupHeroSlider();

        const mastersRaces = getMastersRaces(allRaces)
            .sort((a, b) => toNumber(a?.laufnummer) - toNumber(b?.laufnummer));

        const nextRace = mastersRaces.find((race) => {
            const statusText = normalizeText(race?.status);
            return race?.naechster === true || statusText === "nachster";
        }) || mastersRaces.find((race) => {
            const statusText = normalizeText(race?.status);
            return race?.abgeschlossen !== true && statusText !== "abgeschlossen";
        });

        if (nextRace) {
            trackElement.textContent = String(nextRace?.strecke || "Strecke folgt");
            dateElement.textContent = `Lauf ${toNumber(nextRace?.laufnummer)} · ${formatDate(nextRace?.datum)}`;
        } else {
            trackElement.textContent = "Saison abgeschlossen";
            dateElement.textContent = "Alle Masters-Läufe wurden absolviert.";
        }
    }

    function updateStats() {
        const mastersRaces = getMastersRaces(allRaces);
        const completed = mastersRaces.filter((race) => {
            return race?.abgeschlossen === true || normalizeText(race?.status) === "abgeschlossen";
        }).length;

        const teams = new Set(
            allDrivers
                .map(getEntryTeam)
                .filter((team) => normalizeText(team) !== "kein team")
        );

        document.getElementById("stat-fahrer").textContent = allDrivers.length;
        document.getElementById("stat-teams").textContent = teams.size;
        document.getElementById("stat-rennen").textContent = mastersRaces.length;
        document.getElementById("stat-fortschritt").textContent = mastersRaces.length
            ? `${completed}/${mastersRaces.length}`
            : "–";
    }

    function renderPodium() {
        const podium = [...allDrivers]
            .sort((a, b) => getPlacement(a) - getPlacement(b))
            .slice(0, 3);

        if (podium.length === 0) {
            podiumContainer.innerHTML = '<div class="meisterschaft-loading">Noch keine Meisterschaftsdaten vorhanden.</div>';
            return;
        }

        const leader = podium[0];
        const leaderName = getDriverName(leader);

        const leaderCard = `
            <a class="meisterschaft-champion" href="${getDriverUrl(leader)}" aria-label="Fahrerprofil von ${escapeHtml(leaderName)} öffnen">
                <div class="meisterschaft-card-content">
                    <span class="meisterschaft-place">1</span>
                    <p class="meisterschaft-card-kicker">Championship Leader · #${getDriverNumber(leader)}</p>
                    <h3>${escapeHtml(leaderName)}</h3>
                    <p class="meisterschaft-card-team">${escapeHtml(getEntryTeam(leader))}</p>
                    <div class="meisterschaft-card-points">
                        ${formatNumber(getPoints(leader))}<small>Punkte</small>
                    </div>
                </div>
                ${imageTag(getVehicleImage(leader), FALLBACK_VEHICLE, getVehicle(leader), "meisterschaft-champion-car")}
                ${imageTag(getDriverImage(leader), FALLBACK_DRIVER, leaderName, "meisterschaft-champion-driver")}
            </a>
        `;

        const sideCards = podium.slice(1).map((driver) => {
            const placement = getPlacement(driver);
            const name = getDriverName(driver);

            return `
                <a class="meisterschaft-podium-card" href="${getDriverUrl(driver)}" aria-label="Fahrerprofil von ${escapeHtml(name)} öffnen">
                    <div class="meisterschaft-card-content">
                        <span class="meisterschaft-place">${placement}</span>
                        <p class="meisterschaft-card-kicker">#${getDriverNumber(driver)} · ${escapeHtml(getEntryTeam(driver))}</p>
                        <h3>${escapeHtml(name)}</h3>
                        <div class="meisterschaft-card-points">
                            ${formatNumber(getPoints(driver))}<small>Punkte</small>
                        </div>
                    </div>
                    ${imageTag(getVehicleImage(driver), FALLBACK_VEHICLE, getVehicle(driver), "meisterschaft-podium-car")}
                    ${imageTag(getDriverImage(driver), FALLBACK_DRIVER, name, "meisterschaft-podium-driver")}
                </a>
            `;
        }).join("");

        podiumContainer.innerHTML = `
            ${leaderCard}
            <div class="meisterschaft-podium-side">${sideCards}</div>
        `;
    }

    function buildTeamRanking() {
        const teams = new Map();
        const organizationTotals = new Map();

        allDrivers.forEach((driver) => {
            const organization = getOrganizationName(getTeam(driver));
            const name = getEntryTeam(driver);
            const driverPoints = getPoints(driver);

            if (!name || normalizeText(name) === "kein team") {
                return;
            }

            organizationTotals.set(
                organization,
                (organizationTotals.get(organization) || 0) + driverPoints
            );

            if (!teams.has(name)) {
                teams.set(name, {
                    name,
                    organization,
                    points: 0,
                    drivers: 0,
                    vehicles: new Set()
                });
            }

            const team = teams.get(name);
            team.points += driverPoints;
            team.drivers += 1;

            const vehicle = getVehicle(driver);
            if (normalizeText(vehicle) !== "kein fahrzeug eingetragen") {
                team.vehicles.add(vehicle);
            }
        });

        return [...teams.values()]
            .map((team) => ({
                ...team,
                organizationPoints: organizationTotals.get(team.organization) || team.points
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 8);
    }

    function renderTeams() {
        const teams = buildTeamRanking();

        if (teams.length === 0) {
            teamContainer.innerHTML = '<div class="meisterschaft-loading">Noch keine Teamdaten vorhanden.</div>';
            return;
        }

        teamContainer.innerHTML = teams.map((team, index) => {
            const slug = createSlug(team.name);
            const logo = `assets/images/teams/${encodeURIComponent(slug)}.png`;
            const hasOrganizationTotal = normalizeText(team.organization) !== normalizeText(team.name);
            const organizationInfo = hasOrganizationTotal
                ? `
                    <div class="meisterschaft-team-breakdown" aria-label="Gesamtwert der Organisation">
                        <span>
                            <b>${escapeHtml(team.organization)} gesamt</b>
                            <strong>${formatNumber(team.organizationPoints)} Pkt.</strong>
                        </span>
                    </div>
                `
                : "";

            return `
                <a class="meisterschaft-team-card" href="${getTeamUrl(team.organization)}" aria-label="Teamprofil von ${escapeHtml(team.name)} öffnen">
                    <span class="meisterschaft-team-rank">0${index + 1}</span>
                    ${imageTag(logo, FALLBACK_TEAM, `${team.name} Logo`, "meisterschaft-team-logo")}
                    <h3>${escapeHtml(team.name)}</h3>
                    <div class="meisterschaft-team-stats">
                        <strong>${formatNumber(team.points)}</strong>
                        <span>Teamwertung · ${team.drivers} Fahrer</span>
                    </div>
                    ${organizationInfo}
                </a>
            `;
        }).join("");
    }

    function getFilteredDrivers() {
        const query = normalizeText(searchInput?.value);
        const sort = sortSelect?.value || "platzierung";

        const filtered = allDrivers.filter((driver) => {
            if (!query) {
                return true;
            }

            return normalizeText([
                getDriverName(driver),
                getDriverNumber(driver),
                getTeam(driver),
                getEntryTeam(driver),
                getVehicle(driver)
            ].join(" ")).includes(query);
        });

        return filtered.sort((a, b) => {
            if (sort === "punkte") {
                return getPoints(b) - getPoints(a) || getPlacement(a) - getPlacement(b);
            }

            if (sort === "fastlaps") {
                return getFastLaps(b) - getFastLaps(a) || getPlacement(a) - getPlacement(b);
            }

            if (sort === "startnummer") {
                return getDriverNumber(a) - getDriverNumber(b);
            }

            return getPlacement(a) - getPlacement(b);
        });
    }

    function renderRanking() {
        const drivers = getFilteredDrivers();
        rankingContainer.setAttribute("aria-busy", "false");

        if (noResults) {
            noResults.hidden = drivers.length > 0;
        }

        if (drivers.length === 0) {
            rankingContainer.innerHTML = "";
            return;
        }

        rankingContainer.innerHTML = drivers.map((driver) => {
            const name = getDriverName(driver);
            const number = getDriverNumber(driver);
            const vehicle = getVehicle(driver);

            return `
                <a class="meisterschaft-row" href="${getDriverUrl(driver)}" aria-label="Fahrerprofil von ${escapeHtml(name)} öffnen">
                    <div class="meisterschaft-row-position">${getPlacement(driver)}</div>

                    <div class="meisterschaft-driver-cell">
                        ${imageTag(getDriverImage(driver), FALLBACK_DRIVER, name, "")}
                        <span>
                            <small>Fahrer · #${number}</small>
                            <strong>${escapeHtml(name)}</strong>
                            <small>${escapeHtml(getEntryTeam(driver))}</small>
                        </span>
                    </div>

                    <div class="meisterschaft-vehicle-cell">
                        ${imageTag(getVehicleImage(driver), FALLBACK_VEHICLE, vehicle, "")}
                        <span>
                            <small>Fahrzeug</small>
                            <strong>${escapeHtml(vehicle)}</strong>
                        </span>
                    </div>

                    <div class="meisterschaft-row-metric meisterschaft-row-fastlaps">
                        <small>Fast Laps</small>
                        <strong>${getFastLaps(driver)}</strong>
                    </div>

                    <div class="meisterschaft-row-metric meisterschaft-row-change">
                        <small>Fahrzeugwechsel</small>
                        <strong>${getVehicleChanges(driver)}</strong>
                    </div>

                    <div class="meisterschaft-row-metric meisterschaft-row-points">
                        <small>Punkte</small>
                        <strong>${formatNumber(getPoints(driver))}</strong>
                    </div>

                    <span class="meisterschaft-row-arrow" aria-hidden="true">→</span>
                </a>
            `;
        }).join("");
    }

    function showError(message) {
        const html = `<div class="meisterschaft-fehler">${escapeHtml(message)}</div>`;

        if (podiumContainer) {
            podiumContainer.innerHTML = html;
        }

        if (teamContainer) {
            teamContainer.innerHTML = "";
        }

        if (rankingContainer) {
            rankingContainer.innerHTML = html;
            rankingContainer.setAttribute("aria-busy", "false");
        }
    }

    try {
        const [championshipData, calendarData, vehicleData] = await Promise.all([
            window.GTM.load("meisterschaft", { forceReload: true }),
            window.GTM.load("kalender", { forceReload: true }),
            window.GTM.load("fahrzeuge", { forceReload: true })
        ]);

        championship = championshipData && typeof championshipData === "object"
            ? championshipData
            : {};

        allDrivers = Array.isArray(championship?.fahrerwertung)
            ? championship.fahrerwertung
            : Array.isArray(championshipData)
                ? championshipData
                : [];

        allVehicles = Array.isArray(vehicleData) ? vehicleData : [];
        allRaces = Array.isArray(calendarData) ? calendarData : [];

        updateHero();
        updateStats();
        renderPodium();
        renderTeams();
        renderRanking();

        searchInput?.addEventListener("input", renderRanking);
        sortSelect?.addEventListener("change", renderRanking);
    } catch (error) {
        console.error("Meisterschaft konnte nicht geladen werden:", error);
        showError("Die Meisterschaftsdaten konnten nicht geladen werden. Bitte die Seite neu laden.");
    }
});
