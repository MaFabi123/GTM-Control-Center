/* ==========================================
   GTM DATA ENGINE
   Zentrale Datenquelle des GTM Control Centers
========================================== */

(function () {
    "use strict";

    const cache = new Map();

    function createDataUrl(name) {
        return new URL(
            `data/json/${name}.json`,
            document.baseURI
        ).href;
    }

    async function load(name, options = {}) {
        const { forceReload = false } = options;

        if (
            typeof name !== "string" ||
            name.trim() === ""
        ) {
            throw new Error(
                "Es wurde kein gültiger Datenname angegeben."
            );
        }

        const normalizedName = name.trim();

        if (
            !forceReload &&
            cache.has(normalizedName)
        ) {
            return cache.get(normalizedName);
        }

        const url = createDataUrl(normalizedName);

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Die Datei ${url} konnte nicht geladen werden. HTTP-Status: ${response.status}`
            );
        }

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error(
                `Die Datei ${url} enthält kein gültiges JSON.`
            );
        }

        cache.set(normalizedName, data);

        return data;
    }

    function clearCache(name = "") {
        if (name) {
            cache.delete(name);
            return;
        }

        cache.clear();
    }

    window.GTM = {
        load,
        clearCache,

        loadStartnummern(options = {}) {
            return load(
                "startnummern",
                options
            );
        },

        loadFahrer(options = {}) {
            return load(
                "fahrer",
                options
            );
        },

        loadTeams(options = {}) {
            return load(
                "teams",
                options
            );
        },

        loadKalender(options = {}) {
            return load(
                "kalender",
                options
            );
        },

        loadStrafen(options = {}) {
            return load(
                "strafencenter",
                options
            );
        },

        loadMeisterschaft(options = {}) {
            return load(
                "meisterschaft",
                options
            );
        }
    };

    console.info(
        "GTM Data Engine wurde erfolgreich geladen."
    );
})();