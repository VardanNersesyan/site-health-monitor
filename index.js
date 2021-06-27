const prompt = require('prompt');
const os = require('os')
const { Parser, EVENTS_ENUM } = require('./modules/parser');
const { Analytics } = require('./modules/analytics');

const properties = {
    properties: {
        web: {
            warning: 'Web site url is required!',
            type: 'string',
            description: 'Enter please the site which you want to monitor or leave empty for use default value and press enter.',
            default: 'https://learn.javascript.ru',
        },
        threadsCount: {
            warning: 'Thread count is required!',
            type: 'number',
            description: 'Enter please thread count or leave empty for use number of processors available. If threads count will be too big it can freeze execution!',
            default: os.cpus().length,
        },
        timeoutSeconds: {
            warning: 'timeoutSeconds is required!',
            type: 'number',
            description: 'Enter please timeout in SECONDS for each request or leave empty for default value.',
            default: 5,
        }
    }
};

prompt.start();

prompt.get(properties, async (err, result) => {
    try {
        if (err) { return onErr(err); }
        const { web, threadsCount, timeoutSeconds } = result;
        const parser = new Parser(web, threadsCount, timeoutSeconds);
        const benchmark = Date.now();
        await parser.start();
        parser.on(EVENTS_ENUM.FINISHED, (checkedList) => {
            const analytics = new Analytics(checkedList);
            analytics.print();
            const finishInSec = (Date.now() - benchmark) / 1000;
            console.log(`Task finish in ${finishInSec} seconds`);
        });
    } catch (error) {
        console.error(error);
    }
});

function onErr(err) {
    console.error(err);
    return 1;
}