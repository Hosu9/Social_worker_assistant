document.addEventListener("DOMContentLoaded", () => {
    const timeline = document.getElementById("timeline");
    const startYear = 2005;

    // Tapahtumat: Vuosi ja kuvaus
    const events = [
        { year: 2006, description: "Lastensuojelu ilmoitus" },
        { year: 2008, description: "Ensimmäinen alkoholikokeilu" },
        { year: 2011, description: "Uusi harrastus" },
        { year: 2015, description: "Paljon uusia kavereita" },
        { year: 2018, description: "Mummon kuolema" },
        { year: 2021, description: "Sijoitus toiseen yksikköön" },
        { year: 2023, description: "Äiti vakavasti sairastunut" }
    ];

    const totalYears = events[events.length - 1].year - startYear;
    const yearGap = 100 / totalYears;

    let previousYear = startYear;

    // Luo aikajana tapahtumat
    events.forEach((event, index) => {
        const yearPosition = (event.year - startYear) * yearGap;

        // Tapahtuma
        const eventElement = document.createElement("div");
        eventElement.className = "event";
        eventElement.style.left = `${yearPosition}%`;

        // Flag (tapahtuman laatikko)
        const flag = document.createElement("div");
        flag.className = "event-flag";
        flag.innerText = `${event.description} (${event.year})`;

        // Piste (elämän viivalla)
        const dot = document.createElement("div");
        dot.className = "event-dot";

        // Etäisyysvuodet tapahtumien väliin
        if (index > 0) {
            const gapElement = document.createElement("div");
            gapElement.className = "year-gap";
            const gap = event.year - previousYear;
            gapElement.innerText = `${gap} v`;
            gapElement.style.left = `${(previousYear - startYear + gap / 2) * yearGap}%`;
            timeline.appendChild(gapElement);
        }

        eventElement.appendChild(flag);
        eventElement.appendChild(dot);
        timeline.appendChild(eventElement);

        previousYear = event.year;
    });

    // Vuosimerkinnät
    for (let year = startYear; year <= events[events.length - 1].year; year++) {
        const yearElement = document.createElement("div");
        yearElement.className = "year";
        yearElement.style.left = `${(year - startYear) * yearGap}%`;
        yearElement.innerText = year;
        timeline.appendChild(yearElement);
    }
});
