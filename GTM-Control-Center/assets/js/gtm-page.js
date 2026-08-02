/* ==========================================
   GTM PAGE ENGINE

   Steuert datenbasierte Seiten mit:
   - Daten laden
   - Suche
   - Filter
   - Sortierung
   - Darstellung
   - Ladeanzeige
   - Fehlermeldung

   Live-Funktionen sind bewusst nicht enthalten.
========================================== */

(function () {
    "use strict";

    window.GTM = window.GTM || {};

    const GTM = window.GTM;
    const Utils = GTM.Utils;
    const UI = GTM.UI;

    if (!Utils) {
        console.error(
            "GTM Page Engine konnte nicht gestartet werden: " +
            "gtm-utils.js wurde nicht geladen."
        );

        return;
    }

    if (!UI) {
        console.error(
            "GTM Page Engine konnte nicht gestartet werden: " +
            "gtm-ui.js wurde nicht geladen."
        );

        return;
    }

    function resolveElement(elementOrSelector) {
        if (!elementOrSelector) {
            return null;
        }

        if (typeof elementOrSelector === "string") {
            return document.querySelector(
                elementOrSelector
            );
        }

        return elementOrSelector;
    }

    function getNestedValue(object, path) {
        if (
            !object ||
            !path
        ) {
            return undefined;
        }

        if (typeof path === "function") {
            return path(object);
        }

        return String(path)
            .split(".")
            .reduce(
                (currentValue, property) => {
                    if (
                        currentValue === null ||
                        currentValue === undefined
                    ) {
                        return undefined;
                    }

                    return currentValue[property];
                },
                object
            );
    }

    function flattenValue(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.flatMap(flattenValue);
        }

        if (typeof value === "object") {
            return Object.values(value)
                .flatMap(flattenValue);
        }

        return [value];
    }

    function createEntrySearchText(
        entry,
        fields
    ) {
        if (
            !Array.isArray(fields) ||
            fields.length === 0
        ) {
            return Utils.createSearchText(
                flattenValue(entry)
            );
        }

        const values = fields.flatMap(
            (field) => {
                const value =
                    getNestedValue(
                        entry,
                        field
                    );

                return flattenValue(value);
            }
        );

        return Utils.createSearchText(values);
    }

    function entryMatchesFilter(
        entry,
        filterConfig,
        selectedValue
    ) {
        if (
            !selectedValue ||
            !filterConfig
        ) {
            return true;
        }

        if (
            typeof filterConfig.test === "function"
        ) {
            return Boolean(
                filterConfig.test(
                    entry,
                    selectedValue
                )
            );
        }

        const entryValue =
            getNestedValue(
                entry,
                filterConfig.field
            );

        if (Array.isArray(entryValue)) {
            return entryValue.some(
                (value) =>
                    String(value).trim() ===
                    selectedValue
            );
        }

        return (
            String(entryValue ?? "").trim() ===
            selectedValue
        );
    }

    function getFilterValues(
        entries,
        filterConfig
    ) {
        if (!filterConfig) {
            return [];
        }

        if (
            typeof filterConfig.values ===
            "function"
        ) {
            return filterConfig.values(entries);
        }

        const values = entries.flatMap(
            (entry) => {
                const value =
                    getNestedValue(
                        entry,
                        filterConfig.field
                    );

                return flattenValue(value);
            }
        );

        return Utils.uniqueStrings(values);
    }

    function sortEntries(
        entries,
        sortConfig
    ) {
        if (!sortConfig) {
            return [...entries];
        }

        if (
            typeof sortConfig.compare ===
            "function"
        ) {
            return [...entries].sort(
                sortConfig.compare
            );
        }

        const field =
            sortConfig.field;

        const direction =
            sortConfig.direction === "desc"
                ? -1
                : 1;

        const type =
            sortConfig.type || "text";

        return [...entries].sort(
            (first, second) => {
                const firstValue =
                    getNestedValue(
                        first,
                        field
                    );

                const secondValue =
                    getNestedValue(
                        second,
                        field
                    );

                if (type === "number") {
                    return (
                        Utils.toNumber(
                            firstValue,
                            0
                        ) -
                        Utils.toNumber(
                            secondValue,
                            0
                        )
                    ) * direction;
                }

                return String(
                    firstValue ?? ""
                ).localeCompare(
                    String(
                        secondValue ?? ""
                    ),
                    "de",
                    {
                        sensitivity: "base"
                    }
                ) * direction;
            }
        );
    }

    function getRenderer(renderer) {
        if (
            typeof renderer === "function"
        ) {
            return renderer;
        }

        const renderers = {
            drivers:
                UI.renderDriverCards,

            teams:
                UI.renderTeamCards,

            startNumbers:
                UI.renderStartNumberCards,

            races:
                UI.renderRaceCards,

            ranking:
                UI.renderRanking
        };

        return renderers[renderer] || null;
    }

    function createPageController(config) {
        const container =
            resolveElement(config.container);

        const searchInput =
            resolveElement(
                config.search?.input
            );

        const filterSelect =
            resolveElement(
                config.filter?.select
            );

        const noResultsElement =
            resolveElement(
                config.noResults
            );

        const renderer =
            getRenderer(config.renderer);

        let allEntries = [];
        let visibleEntries = [];
        let initialized = false;

        if (!container) {
            throw new Error(
                `Der Seitencontainer wurde nicht gefunden: ${config.container}`
            );
        }

        if (!renderer) {
            throw new Error(
                "Für die Seite wurde kein gültiger Renderer angegeben."
            );
        }

        function showNoResults(show) {
            if (!noResultsElement) {
                return;
            }

            noResultsElement.hidden = !show;
        }

        function getSearchValue() {
            return searchInput
                ? searchInput.value
                : "";
        }

        function getFilterValue() {
            return filterSelect
                ? filterSelect.value
                : "";
        }

        function applySearch(entries) {
            const query =
                Utils.normalizeSearch(
                    getSearchValue()
                );

            if (query === "") {
                return entries;
            }

            return entries.filter(
                (entry) => {
                    const searchText =
                        createEntrySearchText(
                            entry,
                            config.search?.fields
                        );

                    return Utils.matchesSearch(
                        searchText,
                        query
                    );
                }
            );
        }

        function applyFilter(entries) {
            const selectedValue =
                getFilterValue();

            if (
                !config.filter ||
                selectedValue === ""
            ) {
                return entries;
            }

            return entries.filter(
                (entry) =>
                    entryMatchesFilter(
                        entry,
                        config.filter,
                        selectedValue
                    )
            );
        }

        function render() {
            let entries =
                [...allEntries];

            entries =
                applySearch(entries);

            entries =
                applyFilter(entries);

            entries =
                sortEntries(
                    entries,
                    config.sort
                );

            visibleEntries = entries;

            renderer(
                container,
                visibleEntries
            );

            showNoResults(
                visibleEntries.length === 0
            );

            if (
                typeof config.onRender ===
                "function"
            ) {
                config.onRender(
                    visibleEntries,
                    allEntries
                );
            }
        }

        function fillFilter() {
            if (
                !filterSelect ||
                !config.filter
            ) {
                return;
            }

            const values =
                getFilterValues(
                    allEntries,
                    config.filter
                );

            UI.fillSelect(
                filterSelect,
                values,
                config.filter.defaultLabel ||
                "Alle"
            );
        }

        async function loadData() {
            UI.renderLoading(
                container,
                config.loadingMessage ||
                "Daten werden geladen …"
            );

            try {
                let data;

                if (
                    typeof config.load ===
                    "function"
                ) {
                    data =
                        await config.load();
                } else {
                    if (!config.data) {
                        throw new Error(
                            "Es wurde keine Datenquelle angegeben."
                        );
                    }

                    data =
                        await GTM.load(
                            config.data,
                            {
                                forceReload:
                                    config.forceReload ??
                                    true
                            }
                        );
                }

                if (
                    typeof config.transform ===
                    "function"
                ) {
                    data =
                        config.transform(data);
                }

                if (!Array.isArray(data)) {
                    throw new Error(
                        `Die Datenquelle „${config.data}“ enthält keine gültige Liste.`
                    );
                }

                allEntries =
                    data.filter(Boolean);

                fillFilter();
                render();

                initialized = true;

                if (
                    typeof config.onLoad ===
                    "function"
                ) {
                    config.onLoad(
                        allEntries
                    );
                }

                return allEntries;
            } catch (error) {
                console.error(
                    "GTM-Seite konnte nicht geladen werden:",
                    error
                );

                UI.renderError(
                    container,
                    config.errorTitle ||
                    "Die Daten konnten nicht geladen werden.",
                    config.errorMessage ||
                    error.message
                );

                showNoResults(false);

                if (
                    typeof config.onError ===
                    "function"
                ) {
                    config.onError(error);
                }

                return [];
            }
        }

        function bindEvents() {
            searchInput?.addEventListener(
                "input",
                render
            );

            filterSelect?.addEventListener(
                "change",
                render
            );
        }

        function reset() {
            if (searchInput) {
                searchInput.value = "";
            }

            if (filterSelect) {
                filterSelect.value = "";
            }

            render();
        }

        function destroy() {
            searchInput?.removeEventListener(
                "input",
                render
            );

            filterSelect?.removeEventListener(
                "change",
                render
            );

            allEntries = [];
            visibleEntries = [];
            initialized = false;
        }

        async function initialize() {
            bindEvents();

            return loadData();
        }

        return {
            initialize,
            reload: loadData,
            render,
            reset,
            destroy,

            getAllEntries() {
                return [...allEntries];
            },

            getVisibleEntries() {
                return [...visibleEntries];
            },

            isInitialized() {
                return initialized;
            }
        };
    }

    async function Page(config) {
        if (
            !config ||
            typeof config !== "object"
        ) {
            throw new Error(
                "GTM.Page benötigt eine gültige Konfiguration."
            );
        }

        const controller =
            createPageController(config);

        await controller.initialize();

        return controller;
    }

    GTM.Page = Page;
    GTM.createPageController =
        createPageController;

    console.info(
        "GTM Page Engine wurde erfolgreich geladen."
    );
})();