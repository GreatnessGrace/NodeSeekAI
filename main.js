import { BASE_URL, CSS_SELECTOR, REQUIRED_KEYS } from './config.js';
import { crawlVenues } from './utils/scraperUtils.js';
import 'dotenv/config';

async function main() {
    try {
        await crawlVenues();
    } catch (error) {
        console.error('Main error:', error);
    }
}

main();