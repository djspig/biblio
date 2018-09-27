/**
 * Useful for caching books available from http://signaturebookslibrary.org/category/books/
 * 
 * Usage: node ./src/cache-signature-book.js <URL ROOT>
 */
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require("jsdom");
const url = require('url');
const _ = require('lodash');
const mkdirp = Promise.promisify(require('mkdirp'));
const argv = require('minimist')(process.argv.slice(2));

function DownloadAndSaveFile(location, root) {
    const u = url.parse(location);
    const filename = encodeURIComponent(`${u.host}${u.path}${u.hash || ''}`);

    return Promise.resolve()
        .then(() => JSDOM.fromFile(path.join(root, filename)))
        .tapCatch(() => console.log('Fetch url', location))
        .catch(error => JSDOM.fromURL(location))
        .then(dom => dom.serialize())
        .tap(html => Promise.fromCallback(cb => fs.writeFile(path.join(root, filename), html, cb)));
}

Promise.resolve()
    .then(() => _.first(argv._))
    .then(arg => ([
        arg,
        path.resolve(__dirname, '..', 'cache', encodeURIComponent(url.parse(arg).path.slice(1).replace(/\/$/, '')))
    ]))
    .tap(([, root]) => mkdirp(root))
    .then(([startPage, root]) => DownloadAndSaveFile(startPage, root)
        .then(html => new JSDOM(html))
        .then(dom =>
            dom.window.document.querySelectorAll('.sidebar ul > li a')
        )
        .then(elements => _(elements).tail().map('href').compact().value())
        .tap(links => Promise.mapSeries(links, (link) => DownloadAndSaveFile(link, root))));
