import fetch from 'node-fetch';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

async function downloadEpub(apiResp) {
    const apiJson = await apiResp.json();

    const epubFile = await fetch(`https://www.fichub.net${apiJson.epub_url}`);
    let {author, title} = apiJson.meta;
    title = title.replace(/[^\w\s-]/g, '');

    const fileStream = fs.createWriteStream(`${process.env.SAVE_PATH}/${author} - ${title}.epub`);
    await new Promise((resolve, reject) => {
        epubFile.body.pipe(fileStream);
        epubFile.body.on('error', reject);
        fileStream.on('finish', resolve);
    })
        .then(() => console.info(`Download completed for ${author} - ${title}`))
        .catch(() => console.error(`Download failed for ${author} - ${title}`));
}

export async function downloadFiction() {
    const ficFile = fs.readFileSync('fics.txt', 'utf-8');
    const ficUrls = ficFile.split('\n');
    const baseUrl = 'https://fichub.net/api/v0/epub?q=';

    let errorUrls = [];
    for (let url of ficUrls) {
        if (url && url.indexOf('https://') > -1) {
            console.info(`Sending request for ${url}`);
            try {
                const apiResp = await fetch(baseUrl + url, {signal: AbortSignal.timeout(5000)})
                    .catch(() => {
                        errorUrls.push(url);
                        console.error(`Fetch failed for ${url}`);
                    });

                if (apiResp && apiResp.status === 200) {
                    await downloadEpub(apiResp);
                }
            } catch (e) {
                errorUrls.push(url);
                console.error(`Fetch failed for ${url}`);
            }
        }
    }

    let retries = 0;
    while (errorUrls.length > 0 && retries < 3) {
        await new Promise(resolve => {
            console.info(`Waiting ${retries + 1} minute before retrying`);
            setTimeout(resolve, 60000 * (retries + 1));
        });

        const failures = [];
        for (let url of errorUrls) {
            console.info(`Retrying ${url}`);
            try {
                const apiResp = await fetch(baseUrl + url, {signal: AbortSignal.timeout(5000)})
                    .catch(() => {
                        failures.push(url);
                        console.error(`Fetch failed for ${url}`);
                    });

                if (apiResp && apiResp.status === 200) {
                    await downloadEpub(apiResp);
                }
            } catch (e) {
                failures.push(url);
                console.error(`Fetch failed for ${url}`);
            }
        }
        errorUrls = failures;
        retries++;
    }


}

downloadFiction().then(() => console.info('done'));
