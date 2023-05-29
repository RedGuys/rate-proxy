const {program} = require('commander');
const express = require('express');
const http = require("http");
const https = require("https");

function collect(value, previous) {
    return previous.concat([value]);
}

program
    .option('-v, --verbose', 'verbose output')
    .option('-c, --config <file>', 'TODO: config file to use')
    .option('-t, --timeout <ms>', 'timeout in ms [500]', '0')
    .option('-H, --host <host>', 'host to connect to [localhost]', 'localhost')
    .option('-p, --port <port>', 'port to listen [80]', '80')
    .option('-m, --map <map>', 'a key:value enpoints mapping', collect, [])

program.parse();

const options = program.opts();
if (options.verbose)
    console.log(options);

if (options.map.length === 0) {
    options.map.push('/:/');
}

options.map = options.map.sort((a, b) => {
    let aStr = a.split(":")[0];
    let bStr = b.split(":")[0];
    if(!aStr.endsWith('/')) aStr += '/';
    if(!bStr.endsWith('/')) bStr += '/';
    let aCount = aStr.split('/').length;
    let bCount = bStr.split('/').length;
    return bCount - aCount;
});

let app = express();
const requestQueue = [];
let isProcessing = false;

if(options.timeout > 0) {
    app.use((req, res, next) => {
        requestQueue.push({req, res, next});

        if (!isProcessing) {
            processQueue();
        }
    });
}

function processQueue() {
    if (requestQueue.length > 0) {
        const { req, res, next } = requestQueue.shift();

        next();

        setTimeout(() => {
            processQueue();
        }, options.timeout);

        isProcessing = true;
    } else {
        isProcessing = false;
    }
}

options.map.forEach((mapping) => {
    let [from, to] = mapping.split(':');
    let host = options.host;

    const router = express.Router();
    router.all('*', (req, res) => {
        let url = new URL(req.url, host);
        url.pathname = url.pathname.replace(from, to);
        if (options.verbose)
            console.log(`Proxying ${(from + req.url).replaceAll("//", "/")} to ${url.href}`);
        if(url.protocol === 'http:') {
            http.get(url.href, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            }).on('error', (err) => {
                console.error(`Error while proxying request: ${err.message}`);
                res.statusCode = 500;
                res.end('Internal Server Error');
            });
        } else if(url.protocol === 'https:') {
            https.get(url.href, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            }).on('error', (err) => {
                console.error(`Error while proxying request: ${err.message}`);
                res.statusCode = 500;
                res.end('Internal Server Error');
            });
        } else {
            console.error(`Unsupported protocol: ${url.protocol}`);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    });
    app.use(from, router);
});

app.listen(options.port, () => {
    console.log(`Listening on port ${options.port}`);
});