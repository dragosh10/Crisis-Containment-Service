const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

function getEarthquakeData(callback, parameters = {}) {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const defaultParams = {
        format: 'geojson',
        starttime: twoWeeksAgo.toISOString().slice(0, 10),
        endtime: new Date().toISOString().slice(0, 10),
    };
    const allParams = { ...defaultParams, ...parameters };

    const queryString = Object.entries(allParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    const url = `${USGS_URL}?${queryString}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            callback(data, null);
        })
        .catch(error => {
            callback(null, error);
        });
}


window.getEarthquakeData = getEarthquakeData;
