// Function to generate the timeline
function generateTimeline() {
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.innerHTML = ""; // Clear previous events

    const currentYear = new Date().getFullYear();
    const eventsByYear = {};

    // Generate random events for the past 18 years
    for (let i = 0; i < 10; i++) {
        const randomYear = currentYear - Math.floor(Math.random() * 18);
        if (!eventsByYear[randomYear]) {
            eventsByYear[randomYear] = [];
        }
        eventsByYear[randomYear].push({
            name: `Tapahtuma ${i + 1}`,
            month: Math.floor(Math.random() * 12)
        });
    }

    const sortedYears = Object.keys(eventsByYear).map(Number).sort((a, b) => a - b);

    let previousYear = sortedYears[0];
    let isRed = true;

    // Iterate over years to create event markers and flags
    sortedYears.forEach((year, index) => {
        if (year - previousYear > 1) {
            addGapIndicator(timelineContainer, year - previousYear - 1);
        }

        const yearContainer = createYearContainer(year);
        const timelineDiv = createTimelineDiv(eventsByYear[year], index % 2 === 0, year);

        yearContainer.appendChild(timelineDiv);
        timelineContainer.appendChild(yearContainer);

        previousYear = year;
    });

    // Add horizontal line through all timelines
    const horizontalLine = createHorizontalLine();
    timelineContainer.appendChild(horizontalLine);

    // After generating all the flags, we check for overlaps
    setTimeout(checkFlagOverlaps, 100); // Add a small delay before checking overlaps
}

// Function to generate a timeline with specific dates
function generateSpecificTimeline() {
    const timelineContainer = document.getElementById("timeline-container");
    timelineContainer.innerHTML = ""; // Clear previous events

    const today = new Date();
    const events = [];

    // Add today and the next 8 days
    for (let i = 0; i < 9; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        events.push({
            name: `Tapahtuma ${i + 1}`,
            date: date
        });
    }

    // Add a date 18 years later
    const finalDate = new Date(today);
    finalDate.setFullYear(today.getFullYear() + 18);
    events.push({
        name: `Tapahtuma 10`,
        date: finalDate
    });

    const eventsByYear = {};

    // Group events by year
    events.forEach(event => {
        const year = event.date.getFullYear();
        const month = event.date.getMonth();
        if (!eventsByYear[year]) {
            eventsByYear[year] = [];
        }
        eventsByYear[year].push({
            name: event.name,
            month: month
        });
    });

    const sortedYears = Object.keys(eventsByYear).map(Number).sort((a, b) => a - b);

    let previousYear = sortedYears[0];
    let isRed = true;

    // Iterate over years to create event markers and flags
    sortedYears.forEach((year, index) => {
        if (year - previousYear > 1) {
            addGapIndicator(timelineContainer, year - previousYear - 1);
        }

        const yearContainer = createYearContainer(year);
        const timelineDiv = createTimelineDiv(eventsByYear[year], index % 2 === 0, year);

        yearContainer.appendChild(timelineDiv);
        timelineContainer.appendChild(yearContainer);

        previousYear = year;
    });

    // Add horizontal line through all timelines
    const horizontalLine = createHorizontalLine();
    timelineContainer.appendChild(horizontalLine);

    // After generating all the flags, we check for overlaps
    setTimeout(checkFlagOverlaps, 100); // Add a small delay before checking overlaps
}

// Add a gap indicator for years with a gap in between
function addGapIndicator(container, gapYears) {
    const gapIndicator = document.createElement("div");
    gapIndicator.className = "gap-indicator";
    gapIndicator.innerText = `${gapYears} vuotta väliin`;
    container.appendChild(gapIndicator);
}

// Create and return a container for each year with its events
function createYearContainer(year) {
    const yearContainer = document.createElement("div");
    yearContainer.className = "year-container";

    const yearDiv = document.createElement("div");
    

    yearContainer.appendChild(yearDiv);
    return yearContainer;
}

// Create the timeline for a specific year, including event markers and flags
function createTimelineDiv(events, isRed, year) {
    const timelineDiv = document.createElement("div");
    timelineDiv.className = "timeline";

    // Sort events by month and create their markers
    events.sort((a, b) => a.month - b.month).forEach((event) => {
        const eventDot = createEventDot(event, isRed, year);
        const flag = createEventFlag(event, isRed);

        timelineDiv.appendChild(eventDot);
        timelineDiv.appendChild(flag);

        isRed = !isRed; // Toggle color for next event
    });

    return timelineDiv;
}

// Create a dot representing an event on the timeline
function createEventDot(event, isRed, year) {
    const eventDot = document.createElement("div");
    eventDot.className = "event-dot";
    eventDot.title = `${event.name} (Kuukausi: ${event.month + 1})`;

    const dotColor = isRed ? "#FF5733" : "#3357FF";
    eventDot.style.backgroundColor = dotColor;
    eventDot.style.left = `${(event.month / 12) * 100}%`;

    // Add the year as text inside the dot
    eventDot.innerText = year;

    // Create the line above the dot
    const eventLine = document.createElement("div");
    eventLine.className = "event-line";
    eventLine.style.backgroundColor = dotColor;

    eventDot.appendChild(eventLine); // Attach line to dot

    return eventDot;
}

// Create the flag for an event, which includes a title and description
function createEventFlag(event, isRed) {
    const flag = document.createElement("div");
    flag.className = "flag";
    flag.style.setProperty('--border-color', isRed ? "#FF5733" : "#3357FF");
    flag.style.position = "absolute";  // Ensure absolute positioning for moving

    const title = document.createElement("div");
    title.className = "flag-title";
    title.innerText = event.name;

    const description = document.createElement("div");
    description.className = "flag-description";
    description.innerText = `Kuukausi: ${event.month + 1}`;

    flag.appendChild(title);
    flag.appendChild(description);

    flag.style.left = `${(event.month / 12) * 100}%`;
    flag.style.top = "-50px"; // Set a fixed top position

    return flag;
}

// Create the horizontal line that spans through all years in the timeline
function createHorizontalLine() {
    const line = document.createElement("div");
    line.className = "horizontal-line";
    return line;
}

// Function to check for flag overlaps and adjust their positions to avoid overlap
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

// Function to handle chat input and send messages
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
                botMessage.textContent = data.answer;
                chatBox.appendChild(botMessage);
                chatBox.scrollTop = chatBox.scrollHeight;
            });

            chatInput.value = "";
        }
    });
});

// Call the function to check for overlaps
document.addEventListener("DOMContentLoaded", () => {
    checkFlagOverlaps();
});