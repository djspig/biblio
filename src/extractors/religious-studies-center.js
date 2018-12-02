/**
 * Useful for building books available from https://rsc.byu.edu/out-print/
 * 
 * Usage: node ./src/index.js ./src/extractors/religious-studies-center.js <URL ROOT>
 */
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require("jsdom");
const url = require('url');
const _ = require('lodash');
const mkdirp = Promise.promisify(require('mkdirp'));

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

function ExtractChapter(html, index) {
    return Promise.resolve(html)
        .then(html => html.replace(/“?(#?_edn(?:ref)?)(\d+)/igm, `$1_${index}_$2`))
        .then(html => new JSDOM(html))
        .then(dom => Promise.props({
            title: dom.window.document.querySelector('h1.title').textContent.trim(),
            number: index,
            paragraphs: Promise.resolve(dom.window.document.querySelectorAll('article .field-items > .field-item > *'))
                .tap(elements => !elements && Promise.reject('Couldn\'t find content'))
                .then(elements => Array.from(elements))
                .then(elements => _.map(elements, p => p.innerHTML)),
        }));
}

function getBookContents([location]) {
    return Promise.resolve(location)
        .then(location => ([
            location,
            path.resolve(__dirname, '..', '..', 'cache', encodeURIComponent(url.parse(location).path.slice(1).replace(/\/$/, '')))
        ]))
        .tap(([, root]) => mkdirp(root))
        .then(([startPage, root]) => DownloadAndSaveFile(startPage, root)
            .then(html => new JSDOM(html))
            .then(dom => Promise.props({
                title: dom.window.document.querySelector('.title').textContent.trim(),
                author: dom.window.document.querySelector('div.content > p').textContent.trim(),
                chapters: Promise.resolve(_.map(dom.window.document.querySelectorAll('.content > ul.menu > li > a'), (link) => {
                    return new url.URL(_.get(link, 'href'), new url.URL(startPage).origin).toString();
                }))
                    .then(links => Promise.mapSeries(links, (link, index) => DownloadAndSaveFile(link, root)
                        .then(html => ExtractChapter(html, index))))
            }))
        )
}

_.assign(module.exports, {
    getBookContents
});
