
const https = require('https');

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

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                callback(jsonData, null);
            } catch (error) {
                callback(null, error);
            }
        });
    }).on('error', (error) => {
        callback(null, error);
    });
}

module.exports = {
    getEarthquakeData
};
