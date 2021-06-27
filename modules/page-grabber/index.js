const { parentPort, workerData } = require("worker_threads");
const { UrlRegExp, IsUrl } = require('../regexp-library');
const { get: axiosGet } = require('axios');
const { trimLastSplash, trimFirstSplash } = require('../helpers');

class PageGrabber {
    url;
    timeout;

    constructor(url, timeout) {
        this.url = new URL(url);
        this.timeout = timeout;
    }

    get = async () => {
        const data = await this.getPage(this.url.href);
        console.log(`${this.url.href} - ${data.status}`);
        return {
            urls: this.grabUrls(data.data),
            status: data.status,
            currentUrl: trimLastSplash(this.url.href),
        };
    }

    getPage = async (url) => {
        try {
            return  await axiosGet(url, {
                maxRedirects: 0,
                timeout: this.timeout,
            });
        } catch (error) {
            if (!error.response) {
                return {
                    config: {
                        url: error.config.url
                    },
                    status: 408,
                    data: '',
                }
            }

            return {
                config: {
                    url: error.config.url
                },
                status: error.response.status,
                data: '',
            };
        }
    }

    grabUrls = (htmlPage) => {
        try {
            if (typeof htmlPage !== 'string') {
                return []
            }

            const matches = htmlPage.match(UrlRegExp);
            if (!matches) {
                return []
            }

            const skipAnchors = matches.filter((link) => this.skipAnchors(link));
            const skipFiles = skipAnchors.filter((url) => this.skipFiles(url));
            const fixedUrls = skipFiles.map((url) => this.toUrl(url));
            const clearedLinks = fixedUrls.map((link) => trimLastSplash(link));
            const onlyCurrentSiteUrls = this.filterUrls(clearedLinks);
            const uniqueArray = new Set(onlyCurrentSiteUrls);
            return [...uniqueArray];
        } catch (error) {
            console.error(error);
        }
    }

    skipAnchors = (url) => {
        return !url.includes('#');
    }

    skipFiles = (url) => {
        const uris = url.split('/');
        const lastUri = uris[uris.length - 1];
        return lastUri.includes(this.url.origin) || !lastUri.includes('.')
    }

    toUrl = (url) => {
        return !url.match(IsUrl) ? `${this.url.origin}/${trimFirstSplash(url)}` : url;
    }

    filterUrls = (urls = []) => {
        return urls.filter((url) => url.indexOf(this.url.origin) === 0);
    }
}

const pageGrabber = new PageGrabber(workerData.url, workerData.timeout);

pageGrabber.get().then(res => {
    parentPort.postMessage(res);
})

