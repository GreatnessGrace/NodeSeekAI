import puppeteer from 'puppeteer';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { BASE_URL, CSS_SELECTOR, REQUIRED_KEYS } from '../config.js';
import { isCompleteVenue, isDuplicateVenue, saveVenuesToCSV } from './dataUtils.js';

// puppeteer.use(StealthPlugin());


async function processPageContent(page, pageNumber) {
    try {
        // Generate unique mock data for testing
        return [{
            name: `Example Venue Page ${pageNumber}`,
            price: '$$$',
            location: 'Atlanta, GA',
            capacity: (pageNumber * 100).toString(),
            rating: '4.' + pageNumber,
            reviews: (150 + pageNumber).toString(),
            description: `Venue from page ${pageNumber}`
        }];
    } catch (error) {
        console.error('Content processing error:', error);
        return [];
    }
}


export async function crawlVenues() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-http2',
            '--enable-features=NetworkService',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Configure request interception
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'script'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    let pageNumber = 1;
    let allVenues = [];
    const seenNames = new Set();
    const MAX_RETRIES = 8;

    try {
        while (true) {
            let retries = 0;
            let success = false;
            let noMoreResults = false;
            const url = `${BASE_URL}?page=${pageNumber}`;

            while (retries < MAX_RETRIES && !success) {
                try {
                    console.log(`Processing page ${pageNumber} (attempt ${retries + 1})...`);
                    
                    const response = await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000
                    });

                    if (!response.ok()) {
                        throw new Error(`HTTP ${response.status()} for ${url}`);
                    }

                    // Check for "No Results" directly
                    const content = await page.content();
                    if (content.includes("No Results Found")) {
                        console.log("No more results found. Ending crawl.");
                        noMoreResults = true;
                        break;
                    }

                    // Process page content with page number context
                    const venues = await processPageContent(page, pageNumber);
                    const validVenues = venues.filter(venue => {
                        if (!isCompleteVenue(venue, REQUIRED_KEYS)) return false;
                        if (isDuplicateVenue(venue.name, seenNames)) return false;
                        seenNames.add(venue.name);
                        return true;
                    });

                    if (validVenues.length === 0) {
                        console.log(`No valid venues found on page ${pageNumber}.`);
                        // Don't break here - just continue processing
                    } else {
                        allVenues = [...allVenues, ...validVenues];
                        console.log(`Added ${validVenues.length} venues from page ${pageNumber}`);
                    }

                    success = true;
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error) {
                    console.error(`Attempt ${retries + 1} failed: ${error.message}`);
                    retries++;
                    if (retries < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            if (noMoreResults) break;
            
            // Continue to next page even if current page failed
            pageNumber++;
            
            // Stop if we've exceeded a reasonable page limit
            if (pageNumber > 50) {
                console.log("Safety limit of 50 pages reached");
                break;
            }
        }
    } 
 finally {
        await browser.close();
        if (allVenues.length > 0) {
            await saveVenuesToCSV(allVenues);
        }
    }

    return allVenues;
}

// async function processPageContent(page) {
//     try {
//         const elements = await page.$$(CSS_SELECTOR);
//         const content = await Promise.all(
//             elements.map(el => el.evaluate(node => node.textContent))
//         );
        
//         // Implement your LLM processing or direct parsing here
//         // For now, return mock data
//         return [{
//             name: 'Example Venue',
//             price: '$$$',
//             location: 'Atlanta, GA',
//             capacity: '200',
//             rating: '4.5',
//             reviews: '150',
//             description: 'Luxury wedding venue in downtown Atlanta'
//         }];
//     } catch (error) {
//         console.error('Content processing error:', error);
//         return [];
//     }
// }