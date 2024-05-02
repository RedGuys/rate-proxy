const {program} = require('commander');
const express = require('express');
const http = require("http");
const https = require("https");
const fs = require('fs');

function collect(value, previous) {
    return previous.concat([value]);
}

program
    .option('-v, --verbose', 'verbose output')
    .option('-c, --config <file>', 'config file to use')
    .option('-t, --timeout <ms>', 'timeout in ms [500]', '0')
    .option('-H, --host <host>', 'host to connect to [localhost]', 'localhost')
    .option('-p, --port <port>', 'port to listen [80]', '80')
    .option('-m, --map <map>', 'a key:value enpoints mapping', collect, [])
    .option("-q, --maxqueue <num>", "maximum number of requests in queue [-1]", '-1');

program.parse(process.argv);

const configuration = {routes: []};

const options = program.opts();
if (options.verbose)
    console.log(options);

if (options.config) {
    if(!fs.existsSync(options.config)) {
        fs.writeFileSync(options.config, JSON.stringify({routes: [{srcPath:"/",destPath:"/", destHost:"localhost"}]}, null, 4));
    }
    const config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
    if (config.routes) {
        configuration.routes = config.routes;
    }
} else {
    if (options.map.length === 0) {
        options.map.push('/:/');
    }

    for (let mapElement of options.map) {
        configuration.routes.push({
            srcPath: mapElement.split(':')[0],
            destPath: mapElement.split(':')[1],
            destHost: options.host
        });
    }
}

options.maxqueue = parseInt(options.maxqueue);

configuration.routes = configuration.routes.sort((a, b) => {
    let aStr = a.srcPath;
    let bStr = b.srcPath;
    if (!aStr.endsWith('/')) aStr += '/';
    if (!bStr.endsWith('/')) bStr += '/';
    let aCount = aStr.split('/').length;
    let bCount = bStr.split('/').length;
    return bCount - aCount;
});

let app = express();
const requestQueue = [];
let isProcessing = false;

if (options.timeout > 0) {
    app.use((req, res, next) => {
        if(options.maxqueue > 0 && requestQueue.length >= options.maxqueue) {
            res.status(429).send('Too Many Requests');
            return;
        }
        requestQueue.push({req, res, next});

        if (!isProcessing) {
            processQueue();
        }
    });
}

function processQueue() {
    if (requestQueue.length > 0) {
        const {req, res, next} = requestQueue.shift();

        next();

        setTimeout(() => {
            processQueue();
        }, options.timeout);

        isProcessing = true;
    } else {
        isProcessing = false;
    }
}

configuration.routes.forEach((route) => {
    const from = route.srcPath;
    const to = route.destPath;
    const host = route.destHost;

    const router = express.Router();
    router.all('*', (req, res) => {
        let url = new URL(req.url, host);
        url.pathname = url.pathname.replace(from, to);
        if (options.verbose)
            console.log(`Proxying ${(from + req.url).replaceAll("//", "/")} to ${url.href}`);
        if (url.protocol === 'http:') {
            http.get(url.href, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            }).on('error', (err) => {
                console.error(`Error while proxying request: ${err.message}`);
                res.statusCode = 500;
                res.end('Internal Server Error');
            });
        } else if (url.protocol === 'https:') {
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