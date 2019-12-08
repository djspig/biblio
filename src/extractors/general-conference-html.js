const fs = require('fs');
const path = require('path');
const url = require('url');
const _ = require('lodash');
const Promise = require('bluebird');
const mkdirp = Promise.promisify(require('mkdirp'));

const { JSDOM } = require("jsdom");

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

function extractTalk(html, index) {
    return Promise.resolve(html)
        .then(html => html
            .replace(/(relatedContentPanel)-\w*/g, '$1')
            .replace(/<a class="scripture-ref" [^>]*>([^<]*)<\/a>/g, '$1')
            .replace(/<a class="cross-ref" [^>]*>([^<]*)<\/a>/g, '$1')
        )
        .then(html => new JSDOM(html))
        .then(dom => Promise.props({
            title: `${dom.window.document.querySelector('h1#title1').textContent.trim()} - ${dom.window.document.querySelector('div.byline .author-name').textContent.trim()}`,
            number: index,
            paragraphs: Promise.resolve(dom.window.document.querySelectorAll('article .body-block p, article .body-block header'))
                .tap(elements => !elements && Promise.reject(`Couldn't find content`))
                .then(elements => Array.from(elements))
                .then(elements => elements.map(element => {
                    if (element.localName === 'header') {
                        element.innerHTML = `<em>${element.textContent.trim()}</em>`;
                        return element;
                    } else {
                        return element;
                    }
                }))
                .then(elements => _.map(elements, p => p.innerHTML
                    .replace(/name="[^"]*"/g, '')
                    .replace(/href="\/#note([^"]*)"/g, `href="#${index}_$1" name="${index}_$1_b"`))),
            footnotes: Promise.resolve(dom.window.document.querySelectorAll('aside.relatedContentPanel section div'))
                .then(elements => Array.from(elements))
                .then(elements => elements.map(p => p.textContent))
                .then(footnotes => footnotes.map((p, idx) => p
                    .replace(/<a [^>]*>/g, '')
                    .replace(/<\/a>/g, '')
                ))
                .then(footnotes => footnotes.map((p, idx) => `<a href="#${index}_${idx+1}_b" name="${index}_${idx+1}">[${idx+1}]</a> ${p}`))
        })
        .catch(error => console.error('Error extracting article', error)));
}

const getBookContents = function () {
    const basePath = path.join(__dirname, '..', '..', 'tmp');

    return Promise.resolve('https://www.churchofjesuschrist.org/study/general-conference/2019/10/11holland?lang=spa')
        .then(location => ([
            location,
            path.resolve(__dirname, '..', '..', 'cache', encodeURIComponent(url.parse(location).path.slice(1).replace(/\/$/, '')))
        ]))
        .tap(([, root]) => mkdirp(root))
        .then(([location, root]) => DownloadAndSaveFile(location, root)
            .then(html => html
                .replace(/(itemTitle)-\w*/g, '$1')
                .replace(/(item)-\w*/g, '$1')
            )
            .then(html => new JSDOM(html))
            .then(dom => Promise.props({
                title: `General Conference - ${dom.window.document.querySelector('.itemTitle').textContent.trim()}`,
                author: "The Church of Jesus Christ of Latter-Day Saints",
                chapters: Promise.map(dom.window.document.querySelectorAll('.item'), (link) => {
                    return new url.URL(_.get(link, 'href'), new url.URL(location).origin).toString();
                })
                    .then(links => Promise.mapSeries(links, (link, index) => DownloadAndSaveFile(link, root)
                        .then(html => extractTalk(html, index))))
            }))
        );
};

_.assign(module.exports, {
    getBookContents
});
