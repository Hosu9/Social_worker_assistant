document.addEventListener("DOMContentLoaded", () => {
    const timelineContainer = document.getElementById("timeline-container");

    // Fetch events from the server
    fetch('/api/timeline', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.timeline) {
            const events = data.timeline; // Get timeline events
            
            let previousDate = null;
            let previousYearContainer = null;

            // Järjestetään ja näytetään tapahtumat
            events.forEach((event, index) => {
                const dateParts = event.Vuosi.includes('-') 
                ? event.Vuosi.split('-') 
                : event.Vuosi.split('.');
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const day = parseInt(dateParts[2]);
                const currentDate = new Date(year, month - 1, day);
                const description = event.Kertomus;

                const yearContainer = createYearContainer(year, month, day);
                const eventFlag = createEventFlag({ year, description }, index % 2 === 0);

                yearContainer.appendChild(eventFlag);
                timelineContainer.appendChild(yearContainer);

                // Add year dot
                const yearDot = createYearDot(year, month, day);
                yearContainer.appendChild(yearDot); // Append dot to year container

                // Add gap indicator if there is a previous date
                if (previousDate !== null) {
                    const gapTime = currentDate - previousDate;
                    const gapYears = gapTime / (1000 * 60 * 60 * 24 * 365);
                    const gapMonths = gapTime / (1000 * 60 * 60 * 24 * 30);
                    let gapIndicatorText = "";

                    if (gapYears >= 1) {
                        gapIndicatorText = `${Math.floor(gapYears)} vuotta`;
                    } else if (gapMonths >= 1) {
                        gapIndicatorText = `${Math.floor(gapMonths)} kuukautta`;
                    }

                    if (gapIndicatorText) {
                        const gapIndicator = createGapIndicator(gapIndicatorText);
                        gapIndicator.style.left = `${(previousYearContainer.offsetLeft + yearContainer.offsetLeft) / 2}px`;
                        timelineContainer.appendChild(gapIndicator);
                    }
                }

                previousDate = currentDate;
                previousYearContainer = yearContainer;
            });

            // Lisää vaakasuora viiva
            const horizontalLine = createHorizontalLine();
            timelineContainer.appendChild(horizontalLine);
        } else {
            console.error("No timeline data available:", data);
        }
    })
    .catch(error => console.error("Error fetching timeline data:", error));
    

    // Chat functionality
    const chatContainer = document.createElement("div");
    chatContainer.className = "chat-container";

    chatContainer.innerHTML = `
        <div class="chat-header">Kysy lisää potilaasta</div>
        <div class="chat-messages"></div>
        <div class="chat-input">
            <textarea placeholder="Kirjoita kysymys..."></textarea>
            <button>Lähetä</button>
        </div>
    `;

    document.body.appendChild(chatContainer);

    const chatMessages = chatContainer.querySelector(".chat-messages");
    const chatInput = chatContainer.querySelector("textarea");
    const chatButton = chatContainer.querySelector("button");

    chatButton.addEventListener("click", () => {
        const message = chatInput.value.trim();
        if (message) {
            const userMessage = document.createElement("div");
            userMessage.className = "chat-message user";
            userMessage.textContent = message;
            chatMessages.appendChild(userMessage);

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
                botMessage.textContent = data.answer;
                chatMessages.appendChild(botMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });

            chatInput.value = "";
        }
    });
});

/**
 * Adds a gap indicator for years or months with a gap in between.
 */
function createGapIndicator(gapText) {
    const gapIndicator = document.createElement("div");
    gapIndicator.className = "gap-indicator";
    gapIndicator.innerText = gapText;
    return gapIndicator;
}

/**
 * Creates and returns a container for each year with its events.
 */
function createYearContainer(year, month, day) {
    const yearContainer = document.createElement("div");
    yearContainer.className = "year-container";

    const yearDiv = document.createElement("div");
    yearDiv.className = "year";
    yearDiv.innerHTML = `${year}.${month}.${day}`;

    yearContainer.appendChild(yearDiv);
    return yearContainer;
}

/**
 * Creates a dot representing a year on the horizontal line.
 */
function createYearDot(year, month, day) {
    const yearDot = document.createElement("div");
    yearDot.className = "year-dot";
    yearDot.title = `${year}.${month}.${day}`;
    return yearDot;
}

/**
 * Creates the timeline for a specific year, including event markers and flags.
 */
function createTimelineDiv(events, isRed) {
    const timelineDiv = document.createElement("div");
    timelineDiv.className = "timeline";

    // Create markers for each event
    events.forEach((event) => {
        const eventDot = createEventDot(event, isRed);
        const flag = createEventFlag(event, isRed);

        timelineDiv.appendChild(eventDot);
        timelineDiv.appendChild(flag);

        isRed = !isRed; // Toggle color for next event
    });

    return timelineDiv;
}

/**
 * Creates a dot representing an event on the timeline.
 */
function createEventDot(event, isRed) {
    const eventDot = document.createElement("div");
    eventDot.className = "event-dot";
    eventDot.title = `${event.description} (Vuosi: ${event.year})`;

    const dotColor = isRed ? "#FF5733" : "#3357FF";
    eventDot.style.backgroundColor = dotColor;
    eventDot.style.left = `${(event.year % 12) * 8.33}%`; // Adjust position based on year

    // Create the line above the dot
    const eventLine = document.createElement("div");
    eventLine.className = "event-line";
    eventLine.style.backgroundColor = dotColor;

    eventDot.appendChild(eventLine); // Attach line to dot

    return eventDot;
}

/**
 * Creates the flag for an event, which includes a title and description.
 */
function createEventFlag(event, isRed) {
    const flag = document.createElement("div");
    flag.className = "flag";
    flag.style.setProperty('--border-color', isRed ? "#FF5733" : "#3357FF");

    const title = document.createElement("div");
    title.className = "flag-title";
    title.innerText = `Vuosi: ${event.year}`;

    const description = document.createElement("div");
    description.className = "flag-description";
    description.innerText = event.description;

    flag.appendChild(title);
    flag.appendChild(description);

    flag.style.left = `${(event.year % 12) * 8.33}%`; // Adjust position based on year
    return flag;
}

/**
 * Creates the horizontal line that spans through all years in the timeline.
 */
function createHorizontalLine() {
    const line = document.createElement("div");
    line.className = "horizontal-line";
    return line;
}