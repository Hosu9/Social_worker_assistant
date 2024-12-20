document.addEventListener("DOMContentLoaded", () => {
    const timeline = document.getElementById("timeline");

    // Hae aikajanan tapahtumat
    fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        const events = data.timeline;
        if (events && events.length > 0) {
            events.forEach(event => {
                const eventElement = document.createElement("div");
                eventElement.className = "event";
                eventElement.innerHTML = `<div class="event-flag">${event.title} (${event.year})</div>`;
                timeline.appendChild(eventElement);
            });
        } else {
            timeline.innerHTML = '<p>Ei tapahtumia saatavilla.</p>';
        }
    });
});

// Hakutoiminto
function search() {
    const query = document.getElementById('search-box').value;
    const resultsContainer = document.getElementById('results');

    fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
    })
    .then(response => response.json())
    .then(data => {
        resultsContainer.innerHTML = `<p>${data.answer}</p>`;
    })
    .catch(error => {
        console.error('Error:', error);
        resultsContainer.innerHTML = '<p>Hakutoiminto epäonnistui.</p>';
    });
}
