// Funktio päivämäärän muotoiluun aikajana.py:n formaattiin
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Funktio aikajanan generointiin
function generateTimeline() {
    const timelineContainer = document.getElementById("timeline-container");
    const eventCardsContainer = document.getElementById("event-cards");
    timelineContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumat
    eventCardsContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumakortit
    timelineContainer.style.height = "auto"; // Nollaa korkeus

    const currentYear = new Date().getFullYear();
    const eventsByDayMonthYear = {};

    // Generoi satunnaisia tapahtumia viimeisen 18 vuoden ajalta
    for (let i = 0; i < 10; i++) {
        const randomDate = new Date(currentYear - Math.floor(Math.random() * 18), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const dayMonthYear = formatDate(randomDate);
        if (!eventsByDayMonthYear[dayMonthYear]) {
            eventsByDayMonthYear[dayMonthYear] = [];
        }
        eventsByDayMonthYear[dayMonthYear].push({
            name: `Tapahtuma ${i + 1}`,
            date: randomDate,
            month: randomDate.getMonth(),
            day: randomDate.getDate()
        });
    }

    const sortedDayMonthYears = Object.keys(eventsByDayMonthYear).sort();

    let previousDayMonthYear = sortedDayMonthYears[0];
    let isRed = true;

    // Laske päivämääräväli zoomausta varten
    const firstDate = new Date(sortedDayMonthYears[0]);
    const lastDate = new Date(sortedDayMonthYears[sortedDayMonthYears.length - 1]);
    const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    // Iteroi päivä-kuukausi-vuosien yli luodaksesi tapahtumamerkit ja liput
    sortedDayMonthYears.forEach((dayMonthYear, index) => {
        const [year, month, day] = dayMonthYear.split('-').map(Number);
        const previousYear = parseInt(previousDayMonthYear.split('-')[0]);

        if (year - previousYear > 1) {
            addGapIndicator(timelineContainer, year - previousYear - 1);
        }

        const yearContainer = createYearContainer(year);
        const timelineDiv = createTimelineDiv(eventsByDayMonthYear[dayMonthYear], index % 2 === 0, year);

        // Säädä timelineDiv:n leveys perustuen totalDays-arvoon
        timelineDiv.style.width = `${(100 / totalDays) * (day - firstDate.getDate() + 1)}%`;

        yearContainer.appendChild(timelineDiv);
        timelineContainer.appendChild(yearContainer);

        previousDayMonthYear = dayMonthYear;
    });

    // Lisää vaakasuora viiva kaikkien aikajanojen läpi
    const firstDot = document.querySelector(".event-dot");
    const firstDotLeft = firstDot ? firstDot.getBoundingClientRect().left - timelineContainer.getBoundingClientRect().left : 0;
    const horizontalLine = createHorizontalLine(firstDotLeft);
    timelineContainer.appendChild(horizontalLine);

    // Kun kaikki liput on luotu, tarkista päällekkäisyydet
    setTimeout(checkFlagOverlaps, 100); // Lisää pieni viive ennen päällekkäisyyksien tarkistamista
}

// Funktio aikajanan generointiin tietyillä päivämäärillä
function generateSpecificTimeline() {
    const timelineContainer = document.getElementById("timeline-container");
    const eventCardsContainer = document.getElementById("event-cards");
    timelineContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumat
    eventCardsContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumakortit
    timelineContainer.style.height = "auto"; // Nollaa korkeus

    const today = new Date();
    const events = [];

    // Lisää tänään ja seuraavat 8 päivää
    for (let i = 0; i < 9; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        events.push({
            name: `Tapahtuma ${i + 1}`,
            date: formatDate(date)
        });
    }

    // Lisää päivämäärä 18 vuoden päästä
    const finalDate = new Date(today);
    finalDate.setFullYear(today.getFullYear() + 18);
    events.push({
        name: `Tapahtuma 10`,
        date: formatDate(finalDate)
    });

    const eventsByDayMonthYear = {};

    // Ryhmittele tapahtumat päivän, kuukauden ja vuoden mukaan
    events.forEach(event => {
        const year = event.date.split('-')[0];
        const month = event.date.split('-')[1] - 1;
        const day = event.date.split('-')[2];
        const dayMonthYear = event.date;
        if (!eventsByDayMonthYear[dayMonthYear]) {
            eventsByDayMonthYear[dayMonthYear] = [];
        }
        eventsByDayMonthYear[dayMonthYear].push({
            name: event.name,
            date: new Date(year, month, day),
            month: month,
            day: day
        });
    });

    const sortedDayMonthYears = Object.keys(eventsByDayMonthYear).sort();

    let previousDayMonthYear = sortedDayMonthYears[0];
    let isRed = true;

    // Laske päivämääräväli zoomausta varten
    const firstDate = new Date(sortedDayMonthYears[0]);
    const lastDate = new Date(sortedDayMonthYears[sortedDayMonthYears.length - 1]);
    const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    // Iteroi päivä-kuukausi-vuosien yli luodaksesi tapahtumamerkit ja liput
    sortedDayMonthYears.forEach((dayMonthYear, index) => {
        const [year, month, day] = dayMonthYear.split('-').map(Number);
        const previousYear = parseInt(previousDayMonthYear.split('-')[0]);

        if (year - previousYear > 1) {
            addGapIndicator(timelineContainer, year - previousYear - 1);
        }

        const yearContainer = createYearContainer(year);
        const timelineDiv = createTimelineDiv(eventsByDayMonthYear[dayMonthYear], index % 2 === 0, year);

        // Säädä timelineDiv:n leveys perustuen totalDays-arvoon
        timelineDiv.style.width = `${(100 / totalDays) * (day - firstDate.getDate() + 1)}%`;

        yearContainer.appendChild(timelineDiv);
        timelineContainer.appendChild(yearContainer);

        previousDayMonthYear = dayMonthYear;
    });

    // Lisää vaakasuora viiva kaikkien aikajanojen läpi
    const firstDot = document.querySelector(".event-dot");
    const firstDotLeft = firstDot ? firstDot.getBoundingClientRect().left - timelineContainer.getBoundingClientRect().left : 0;
    const horizontalLine = createHorizontalLine(firstDotLeft);
    timelineContainer.appendChild(horizontalLine);

    // Kun kaikki liput on luotu, tarkista päällekkäisyydet
    setTimeout(checkFlagOverlaps, 100); // Lisää pieni viive ennen päällekkäisyyksien tarkistamista
}

// Lisää väli-indikaattori vuosille, joissa on väliä
function addGapIndicator(container, gapYears) {
    const gapIndicator = document.createElement("div");
    gapIndicator.className = "gap-indicator";
    gapIndicator.innerText = `${gapYears} vuotta väliin`;
    container.appendChild(gapIndicator);
}

// Luo ja palauta kontti jokaiselle vuodelle sen tapahtumien kanssa
function createYearContainer(year) {
    const yearContainer = document.createElement("div");
    yearContainer.className = "year-container";

    const yearDiv = document.createElement("div");
    yearContainer.appendChild(yearDiv);
    return yearContainer;
}

// Luo aikajana tietylle vuodelle, mukaan lukien tapahtumamerkit ja liput
function createTimelineDiv(events, isRed, year) {
    const timelineDiv = document.createElement("div");
    timelineDiv.className = "timeline";

    // Lajittele tapahtumat kuukauden mukaan ja luo niiden merkit
    events.sort((a, b) => a.month - b.month).forEach((event) => {
        const eventDot = createEventDot(event, isRed, year);
        const flag = createEventFlag(event, isRed);

        timelineDiv.appendChild(eventDot);
        timelineDiv.appendChild(flag);

        isRed = !isRed; // Vaihda väri seuraavalle tapahtumalle
    });

    return timelineDiv;
}

// Luo piste, joka edustaa tapahtumaa aikajanalla
function createEventDot(event, isRed, year) {
    const eventDot = document.createElement("div");
    eventDot.className = "event-dot";
    eventDot.title = `${event.name} (Kuukausi: ${event.month + 1})`;

    const dotColor = isRed ? "#FF5733" : "#3357FF";
    eventDot.style.backgroundColor = dotColor;
    eventDot.style.left = `${(event.month / 12) * 100}%`;

    // Lisää vuosi tekstinä pisteen sisälle
    eventDot.innerText = year;

    // Luo viiva pisteen yläpuolelle
    const eventLine = document.createElement("div");
    eventLine.className = "event-line";
    eventLine.style.backgroundColor = dotColor;

    eventDot.appendChild(eventLine); // Kiinnitä viiva pisteeseen

    return eventDot;
}

// Luo tapahtuman lippu, joka sisältää otsikon ja kuvauksen
function createEventFlag(event, isRed) {
    const flag = document.createElement("div");
    flag.className = "flag";
    flag.style.setProperty('--border-color', isRed ? "#FF5733" : "#3357FF");
    flag.style.position = "absolute";  // Varmista absoluuttinen sijainti siirtämistä varten

    const title = document.createElement("div");
    title.className = "flag-title";
    title.innerText = `${formatDate(new Date(event.date))} ${event.name}`; // Yhdistä päivämäärä ja kuvaus

    flag.appendChild(title);

    flag.style.left = `${(event.month / 12) * 100}%`;
    flag.style.top = "-50px"; // Aseta kiinteä yläasento

    // Lisää tapahtumakortti
    const card = addEventCard(event);

    // Lisää klikkaustapahtuma korostamaan vastaavaa korttia
    flag.addEventListener("click", () => {
        highlightCard(card);
    });

    return flag;
}

// Lisää tapahtumakortti tapahtumakorttien konttiin
function addEventCard(event) {
    const eventCardsContainer = document.getElementById("event-cards");

    const card = document.createElement("div");
    card.className = "event-card";

    const title = document.createElement("div");
    title.className = "event-card-title";
    title.innerText = `${formatDate(new Date(event.date))} ${event.name}`;

    const description = document.createElement("div");
    description.className = "event-card-description";
    description.innerText = event.description || "";

    card.appendChild(title);
    card.appendChild(description);

    eventCardsContainer.appendChild(card);

    return card;
}

// Korosta vastaava kortti
function highlightCard(card) {
    // Poista korostus kaikista korteista
    const cards = document.querySelectorAll(".event-card");
    cards.forEach(c => c.classList.remove("highlight"));

    // Lisää korostus valittuun korttiin
    card.classList.add("highlight");

    // Vieritä kortti näkyviin
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Luo vaakasuora viiva, joka ulottuu kaikkien vuosien läpi aikajanalla
function createHorizontalLine(firstDotLeft) {
    const line = document.createElement("div");
    line.className = "horizontal-line";
    line.style.left = `${firstDotLeft}px`; // Aloita ensimmäisestä tapahtumapisteestä
    return line;
}

// Funktio tarkistaa lippujen päällekkäisyydet ja säätää niiden sijainteja välttääkseen päällekkäisyyksiä
function checkFlagOverlaps() {
    const flags = document.querySelectorAll(".flag");
    let maxHeight = 0;

    // Käy läpi jokainen lippu tarkistaaksesi päällekkäisyydet
    for (let i = 0; i < flags.length; i++) {
        for (let j = i + 1; j < flags.length; j++) {
            const flag1 = flags[i];
            const flag2 = flags[j];

            // Käytä getBoundingClientRect saadaksesi lippujen sijainnit
            const rect1 = flag1.getBoundingClientRect();
            const rect2 = flag2.getBoundingClientRect();

            // Tarkista, menevätkö liput päällekkäin
            if (rect1.left < rect2.right && rect1.right > rect2.left &&
                rect1.top < rect2.bottom && rect1.bottom > rect2.top) {

                // Jos on päällekkäisyyttä, siirrä ensimmäistä lippua ylöspäin sen korkeuden verran plus 1px välttääksesi päällekkäisyyden
                const offset = rect1.bottom - rect2.top + 1;
                adjustFlagPosition(flag1, offset);

                // Tarkista päällekkäisyys uudelleen siirron jälkeen
                checkFlagOverlaps();
                return; // Lopeta rekursio
            }
        }

        // Päivitä maksimikorkeus
        const flagRect = flags[i].getBoundingClientRect();
        if (flagRect.bottom > maxHeight) {
            maxHeight = flagRect.bottom;
        }
    }

    // Säädä aikajanakontin korkeus
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.style.height = `${maxHeight + 20}px`; // Lisää hieman pehmustetta

    // Varmista, että koko aikajana on näkyvissä
    timelineContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Apufunktio lippujen sijainnin säätämiseen ylöspäin
function adjustFlagPosition(flag, offset) {
    let newTop = parseInt(flag.style.top || 0) - offset; // Siirrä lippua ylöspäin offsetin verran
    flag.style.top = newTop + "px";

    // Päivitä tapahtumaviivan korkeus ja sijainti
    const eventDot = flag.previousElementSibling;
    const eventLine = eventDot.querySelector(".event-line");
    if (eventLine) {
        const dotRect = eventDot.getBoundingClientRect();
        const flagRect = flag.getBoundingClientRect();
        const newHeight = dotRect.top - flagRect.top - 5; // Säädä uuteen pehmusteeseen
        eventLine.style.height = `${newHeight}px`;
        eventLine.style.top = `${-newHeight}px`; // Siirrä tapahtumaviivaa ylöspäin
    }
    // Tulosta konsoliin, kun lippua on siirretty
    console.log(`Moved flag to top: ${flag.style.top}`);
}

// Apufunktio tarkistaa, menevätkö kaksi lippua päällekkäin
function checkOverlap(flag1, flag2) {
    const rect1 = flag1.getBoundingClientRect();
    const rect2 = flag2.getBoundingClientRect();

    return rect1.left < rect2.right && rect1.right > rect2.left &&
           rect1.top < rect2.bottom && rect1.bottom > rect2.top;
}

// Funktio vaihtaa tumma tila päälle ja pois
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

// Funktio generoi aikajanan chat-viestien tapahtumista
function generateTimelineFromChat(events) {
    const timelineContainer = document.getElementById("timeline-container");
    const eventCardsContainer = document.getElementById("event-cards");
    timelineContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumat
    eventCardsContainer.innerHTML = ""; // Tyhjennä aiemmat tapahtumakortit
    timelineContainer.style.height = "auto"; // Nollaa korkeus

    const eventsByDayMonthYear = {};

    // Ryhmittele tapahtumat päivän, kuukauden ja vuoden mukaan
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth();
        const day = eventDate.getDate();
        const dayMonthYear = formatDate(eventDate);
        if (!eventsByDayMonthYear[dayMonthYear]) {
            eventsByDayMonthYear[dayMonthYear] = [];
        }
        eventsByDayMonthYear[dayMonthYear].push({
            name: event.description,
            date: event.date, // Varmista, että päivämäärä on asetettu
            month: month,
            day: day
        });
    });

    const sortedDayMonthYears = Object.keys(eventsByDayMonthYear).sort();

    let previousDayMonthYear = sortedDayMonthYears[0];
    let isRed = true;

    // Laske päivämääräväli zoomausta varten
    const firstDate = new Date(sortedDayMonthYears[0]);
    const lastDate = new Date(sortedDayMonthYears[sortedDayMonthYears.length - 1]);
    const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    // Iteroi päivä-kuukausi-vuosien yli luodaksesi tapahtumamerkit ja liput
    sortedDayMonthYears.forEach((dayMonthYear, index) => {
        const [year, month, day] = dayMonthYear.split('-').map(Number);
        const previousYear = parseInt(previousDayMonthYear.split('-')[0]);

        if (year - previousYear > 1) {
            addGapIndicator(timelineContainer, year - previousYear - 1);
        }

        const yearContainer = createYearContainer(year);
        const timelineDiv = createTimelineDiv(eventsByDayMonthYear[dayMonthYear], index % 2 === 0, year);

        // Säädä timelineDiv:n leveys perustuen totalDays-arvoon
        timelineDiv.style.width = `${(100 / totalDays) * (day - firstDate.getDate() + 1)}%`;

        yearContainer.appendChild(timelineDiv);
        timelineContainer.appendChild(yearContainer);

        previousDayMonthYear = dayMonthYear;
    });

    // Lisää vaakasuora viiva kaikkien aikajanojen läpi
    const firstDot = document.querySelector(".event-dot");
    const firstDotLeft = firstDot ? firstDot.getBoundingClientRect().left - timelineContainer.getBoundingClientRect().left : 0;
    const horizontalLine = createHorizontalLine(firstDotLeft);
    timelineContainer.appendChild(horizontalLine);

    // Kun kaikki liput on luotu, tarkista päällekkäisyydet
    setTimeout(checkFlagOverlaps, 100); // Lisää pieni viive ennen päällekkäisyyksien tarkistamista
}

// Funktio käsittelee chat-syötteen ja lähettää viestit
document.addEventListener("DOMContentLoaded", () => {
    const chatButton = document.getElementById("chat-send");
    const chatInput = document.getElementById("chat-input");
    const chatBox = document.getElementById("chat-box");

    chatButton.addEventListener("click", () => {
        const message = chatInput.value.trim();
        if (message) {
            const userMessage = document.createElement("div");
            userMessage.className = "chat-message user";
            userMessage.textContent = message;
            chatBox.appendChild(userMessage);

            fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: message })
            })
            .then(response => response.json())
            .then(data => {
                const botMessage = document.createElement("div");
                botMessage.className = "chat-message bot";

                // Check if the response contains events
                try {
                    const responseData = JSON.parse(data.answer);
                    const events = responseData.timeline;
                    if (events) {
                        const readableMessage = events.map(event => `${formatDate(new Date(event.date))}: ${event.description}`).join('\n');
                        botMessage.textContent = readableMessage;

                        const buttonContainer = document.createElement("div");
                        buttonContainer.className = "chat-message bot";

                        const generateButton = document.createElement("button");
                        generateButton.className = "generate-timeline-button";
                        generateButton.textContent = "📅 Lähetä aikajanaan";
                        generateButton.addEventListener("click", () => generateTimelineFromChat(events));
                        buttonContainer.appendChild(generateButton);

                        chatBox.appendChild(botMessage);
                        chatBox.appendChild(buttonContainer);
                    } else {
                        botMessage.textContent = data.answer;
                        chatBox.appendChild(botMessage);
                    }
                } catch (e) {
                    console.error('Response does not contain events:', e);
                    botMessage.textContent = data.answer;
                    chatBox.appendChild(botMessage);
                }

                chatBox.scrollTop = chatBox.scrollHeight;
            })
            .catch(error => console.error('Error processing chat response:', error));

            chatInput.value = "";
        }
    });

    // Kutsu funktiota tarkistaaksesi päällekkäisyydet
    document.addEventListener("DOMContentLoaded", () => {
        checkFlagOverlaps();
    });
});

// Kutsu funktiota tarkistaaksesi päällekkäisyydet
document.addEventListener("DOMContentLoaded", () => {
    checkFlagOverlaps();
});