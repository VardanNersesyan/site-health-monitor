const HttpStatus = require('http-foundation-response');

class Analytics {
    data;

    constructor(data) {
        this.data = data;
    }

    getAnalytics = () => {
        const analytics = {};
        for (const url in this.data) {
            const status = this.data[url];
            analytics[status] = analytics[status] ? analytics[status] + 1 : 1;
        }

        return analytics;
    }

    print = () => {
        const analytics = this.getAnalytics();
        console.log('----------------------------------------')
        for (const status in analytics) {
            const count = analytics[status];
            console.log(`We have ${count} pages with status code: ${status} - ${HttpStatus.getStatusText(status)}`);
        }
        console.log('----------------------------------------')
    }
}

module.exports = {
    Analytics
};