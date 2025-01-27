document.addEventListener("DOMContentLoaded", () => {
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.innerHTML = ""; // Clear previous events
    
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
                    const gapDays = gapTime / (1000 * 60 * 60 * 24);
                    let gapIndicatorText = "";
                    if (gapYears >= 1) {
                        gapIndicatorText = `${Math.floor(gapYears)} vuotta`;
                    } else if (gapMonths >= 1) {
                        gapIndicatorText = `${Math.floor(gapMonths)} kuukautta`;
                    } else if (gapDays >= 1) {
                        gapIndicatorText = `${Math.floor(gapDays)} päivää`;
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
            // After generating all the flags, we check for overlaps
            setTimeout(checkFlagOverlaps, 100); // Add a small delay before checking overlaps
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
    flag.style.top = "0px"; // Align the flag with the horizontal line
    return flag;
}

/**
 * Creates the horizontal line that spans through all years in the timeline.
 */
function createHorizontalLine() {
    const line = document.createElement("div");
    line.className = "horizontal-line";
    line.style.width = "100%"; // Extend the horizontal line to fit the container
    return line;
}

/**
 * Function to check for flag overlaps and adjust their positions to avoid overlap
 */
function checkFlagOverlaps() {
    const flags = document.querySelectorAll(".flag");
    let maxHeight = 0;

    // Loop through each flag to check overlaps
    for (let i = 0; i < flags.length; i++) {
        for (let j = i + 1; j < flags.length; j++) {
            const flag1 = flags[i];
            const flag2 = flags[j];

            // Use getBoundingClientRect to get the positions of the flags
            const rect1 = flag1.getBoundingClientRect();
            const rect2 = flag2.getBoundingClientRect();

            // Check if the flags overlap
            if (rect1.left < rect2.right && rect1.right > rect2.left &&
                rect1.top < rect2.bottom && rect1.bottom > rect2.top) {

                // If there's an overlap, move the first flag upwards by its height plus 1px to avoid overlap
                adjustFlagPosition(flag1, rect1.height + 1);

                // Recheck overlap after moving
                checkFlagOverlaps();
                return; // Stop recursion
            }
        }

        // Update the maximum height
        const flagRect = flags[i].getBoundingClientRect();
        if (flagRect.bottom > maxHeight) {
            maxHeight = flagRect.bottom;
        }
    }

    // Adjust the height of the timeline container
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.style.height = `${maxHeight + 20}px`; // Add some padding
}

// Helper function to adjust flag position upwards
function adjustFlagPosition(flag, offset) {
    let newTop = parseInt(flag.style.top || 0) - offset; // Move the flag upwards by the offset
    flag.style.top = newTop + "px";

    // Update the event line height and position
    const eventLine = flag.previousElementSibling.querySelector(".event-line");
    if (eventLine) {
        const newHeight = parseInt(eventLine.style.height || 0) + offset;
        eventLine.style.height = newHeight + "px";
        eventLine.style.top = `${-newHeight}px`; // Move the event line up
    }
    // Print to console when a flag is moved
    console.log(`Moved flag to top: ${flag.style.top}`);
}

// Helper function to check if two flags overlap
function checkOverlap(flag1, flag2) {
    const rect1 = flag1.getBoundingClientRect();
    const rect2 = flag2.getBoundingClientRect();

    return rect1.left < rect2.right && rect1.right > rect2.left &&
           rect1.top < rect2.bottom && rect1.bottom > rect2.top;
}

// Function to toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

document.addEventListener("DOMContentLoaded", () => {
    checkFlagOverlaps();
});