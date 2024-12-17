document.getElementById('askButton').addEventListener('click', async function () {
    const question = document.getElementById('questionInput').value.trim();
    if (!question) {
        alert('Please enter a question!');
        return;
    }

    const requestData = { question: question };

    try {
        const response = await fetch('/get_events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) throw new Error('Error fetching events');

        const data = await response.json();
        console.log('Response Data:', data);

        // Clear previous content
        const timeline = document.getElementById('timeline');
        const eventList = document.getElementById('eventList');
        timeline.innerHTML = '';
        eventList.innerHTML = '';

        if (!data.events || data.events.length === 0) {
            timeline.innerHTML = '<p>No events found.</p>';
            eventList.innerHTML = '<p>No events found.</p>';
            return;
        }

        // Group events by age
        const groupedEvents = {};
        data.events.forEach(event => {
            if (!groupedEvents[event.age]) groupedEvents[event.age] = [];
            groupedEvents[event.age].push(event);
        });

        // Generate full range of ages starting from 0
        const minAge = 0; // Explicit minimum age
        const ages = Object.keys(groupedEvents).map(Number);
        const maxAge = Math.max(...ages);
        const allAges = Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i);

        // Merge empty years
        const mergedAges = [];
        let startEmpty = null;

        allAges.forEach((age, index) => {
            const isEmpty = !groupedEvents[age];
            if (isEmpty) {
                if (startEmpty === null) startEmpty = age; // Start of empty range
            } else {
                if (startEmpty !== null) {
                    mergedAges.push({ start: startEmpty, end: age - 1, isEmpty: true });
                    startEmpty = null;
                }
                mergedAges.push({ start: age, end: age, isEmpty: false, events: groupedEvents[age] });
            }

            // Handle end of the range
            if (index === allAges.length - 1 && startEmpty !== null) {
                mergedAges.push({ start: startEmpty, end: age, isEmpty: true });
            }
        });

        // Render Timeline
        mergedAges.forEach(range => {
            const ageSection = document.createElement('div');
            ageSection.classList.add('age-section');
            if (range.isEmpty) ageSection.classList.add('empty');

            // Set flexible space
            ageSection.style.flex = range.isEmpty ? '0.5' : '2';

            // Add label
            const ageTitle = document.createElement('div');
            ageTitle.classList.add('age-title');
            ageTitle.textContent = range.start === range.end
                ? `Age ${range.start}`
                : `Age ${range.start}-${range.end}`;
            ageSection.appendChild(ageTitle);

            // Add events if not empty
            if (!range.isEmpty) {
                range.events.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((event, index) => {
                    const eventMarker = document.createElement('div');
                    eventMarker.classList.add('event');
                    eventMarker.setAttribute('data-description', `${event.date}: ${event.description}`);
                    const positionPercentage = (index + 1) * 20;
                    eventMarker.style.left = `${positionPercentage}%`;
                    ageSection.appendChild(eventMarker);
                });
            }

            timeline.appendChild(ageSection);
        });

        // Render Event List
        for (const age in groupedEvents) {
            const ageGroup = document.createElement('div');
            ageGroup.classList.add('event-group');

            const ageHeader = document.createElement('h2');
            ageHeader.textContent = `Age ${age}`;
            ageGroup.appendChild(ageHeader);

            groupedEvents[age].forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.classList.add('event-item');
                eventItem.textContent = `${event.date}: ${event.description}`;
                ageGroup.appendChild(eventItem);
            });

            eventList.appendChild(ageGroup);
        }
    } catch (error) {
        console.error(error);
        alert('Failed to fetch events. Please try again.');
    }
});
