import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

export async function scrapeMediaFire(url) {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
		});
		
		const html = await res.text();
		const dom = new JSDOM(html);
		const document = dom.window.document;
		const downloadBtn = document.querySelector('#downloadButton');

		if (!downloadBtn) return { success: false, downloadUrl: null };
		
		let downloadLink = downloadBtn.getAttribute('href') || downloadBtn.getAttribute('data-href');
		const scrambled = downloadBtn.getAttribute('data-scrambled-url');
		
		if (scrambled) downloadLink = Buffer.from(scrambled, 'base64').toString('utf-8');
		return { success: true, downloadUrl: downloadLink };
	} catch (err) {
		return { success: false, downloadUrl: null };
	}
}