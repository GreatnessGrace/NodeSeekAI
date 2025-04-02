import { createObjectCsvWriter } from 'csv-writer';

export function isDuplicateVenue(venueName, seenNames) {
    return seenNames.has(venueName);
}

export function isCompleteVenue(venue, requiredKeys) {
    return requiredKeys.every(key => venue.hasOwnProperty(key));
}

export async function saveVenuesToCSV(venues, filename = 'complete_venues.csv') {
    if (!venues?.length) {
        console.log("No venues to save.");
        return;
    }

    const header = Object.keys(venues[0]).map(key => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1)
    }));

    const csvWriter = createObjectCsvWriter({
        path: filename,
        header,
        encoding: 'utf8',
    });

    await csvWriter.writeRecords(venues);
    console.log(`Saved ${venues.length} venues to ${filename}`);
}