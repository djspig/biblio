/**
 * Useful for building books available from https://publications.mi.byu.edu/book/
 * 
 * Usage: node ./src/index.js ./src/extractors/farms-book.js <URL ROOT>
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
        .then(html => html.replace(/(#?_edn(?:ref)?)(\d+)/igm, `$1_${index}_$2`))
        .then(html => new JSDOM(html))
        .then(dom => dom.window.document.querySelector('div#html-content > *'))
        .tap(element => !element && Promise.reject('Couldn\'t find content'))
        .then(element => {
            const paragraphs = [];
            while (element) {
                paragraphs.push(element.innerHTML);
                element = element.nextElementSibling;
            }
            return paragraphs;
        })
        .then(paragraphs => ({
            title: paragraphs.shift(),
            number: index,
            paragraphs,
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
                title: dom.window.document.querySelector('h2.subtitle').textContent.trim(),
                author: dom.window.document.querySelector('div.meta div.author').textContent.trim(),
                chapters: Promise.resolve(_.map(dom.window.document.querySelectorAll('.publication-links a#read'), (link) => {
                    return new url.URL(_.get(link, 'href'), new url.URL(startPage).origin).toString();
                }))
                    .tap(([baseUrl]) => baseUrl || Promise.reject('Book not available for reading'))
                    .then(([baseUrl]) => DownloadAndSaveFile(baseUrl, root))
                    .then(html => new JSDOM(html))
                    .then(dom => _.map(dom.window.document.querySelectorAll('#fullscreen-toc-content > ul > li > a'), (link) => {
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
