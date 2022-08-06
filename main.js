import fetch from 'node-fetch';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

export async function downloadFiction() {
    const ficFile = fs.readFileSync('fics.txt', 'utf-8');
    const ficUrls = ficFile.split('\n');
    const baseUrl = 'https://fichub.net/api/v0/epub?q=';

    for (let url of ficUrls) {
        if (url && url.indexOf('https://') > -1) {
            const apiResp = await fetch(baseUrl + url);
            const apiJson = await apiResp.json();

            const epubFile = await fetch(`https://www.fichub.net${apiJson.epub_url}`);
            const {author, title} = apiJson.meta;
            const fileStream = fs.createWriteStream(`${process.env.SAVE_PATH}/${author} - ${title}.epub`);
            await new Promise((resolve, reject) => {
                epubFile.body.pipe(fileStream);
                epubFile.body.on('error', reject);
                fileStream.on('finish', resolve);
            })
                .then(() => console.info(`Download completed for ${author} - ${title}`))
                .catch(() => console.error(`Download failed for ${author} - ${title}`));
        }
    }

}

console.info(downloadFiction().then(() => console.info('done')));
