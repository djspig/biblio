const argv = require('minimist')(process.argv.slice(2));
const select = require('xpath.js');
const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');

const { JSDOM } = require("jsdom");

const books = [
    {
        pages: [
            'http://signaturebookslibrary.org/joseph-smith-introduction/',
            'http://signaturebookslibrary.org/joseph-smith-01/',
            'http://signaturebookslibrary.org/joseph-smith-02/',
            'http://signaturebookslibrary.org/joseph-smith-03/',
            'http://signaturebookslibrary.org/joseph-smith-04/',
            'http://signaturebookslibrary.org/joseph-smith-05/',
            'http://signaturebookslibrary.org/joseph-smith-06/',
            'http://signaturebookslibrary.org/joseph-smith-07/',
            'http://signaturebookslibrary.org/joseph-smith-08/',
            'http://signaturebookslibrary.org/joseph-smith-09/',
            'http://signaturebookslibrary.org/joseph-smith-10/',
            'http://signaturebookslibrary.org/joseph-smith-11/',
            'http://signaturebookslibrary.org/joseph-smith-12/',
            'http://signaturebookslibrary.org/joseph-smith-13/',
            'http://signaturebookslibrary.org/joseph-smith-14/',
            'http://signaturebookslibrary.org/joseph-smith-15/',
            'http://signaturebookslibrary.org/joseph-smith-16/',
            'http://signaturebookslibrary.org/joseph-smith-17/',
            'http://signaturebookslibrary.org/joseph-smith-18/',
            'http://signaturebookslibrary.org/joseph-smith-19/',
            'http://signaturebookslibrary.org/joseph-smith-20/',
            'http://signaturebookslibrary.org/joseph-smith-21/',
            'http://signaturebookslibrary.org/joseph-smith-22/',
            'http://signaturebookslibrary.org/joseph-smith-23/',
            'http://signaturebookslibrary.org/joseph-smith-24/',
            'http://signaturebookslibrary.org/26233/',
            'http://signaturebookslibrary.org/joseph-smith-26/',
            'http://signaturebookslibrary.org/joseph-smith-27/',
            'http://signaturebookslibrary.org/joseph-smith-28/',
            'http://signaturebookslibrary.org/joseph-smith-29/',
            'http://signaturebookslibrary.org/joseph-smith-30/',
            'http://signaturebookslibrary.org/joseph-smith-31/',
            'http://signaturebookslibrary.org/joseph-smith-maps/',
        ],
        title: 'Joseph Smith: The Making of a Prophet',
        author: 'Dan Vogel',
    }, {
        pages: [
            'http://signaturebookslibrary.org/the-new-mormon-history/',
            'http://signaturebookslibrary.org/new-mormon-history-02/',
            'http://signaturebookslibrary.org/new-mormon-history-03/',
            'http://signaturebookslibrary.org/765/',
            'http://signaturebookslibrary.org/new-mormon-history-05/',
            'http://signaturebookslibrary.org/new-mormon-history-06/',
            'http://signaturebookslibrary.org/777/',
            'http://signaturebookslibrary.org/new-mormon-history-08/',
            'http://signaturebookslibrary.org/new-mormon-history-09/',
            'http://signaturebookslibrary.org/new-mormon-history-10/',
            'http://signaturebookslibrary.org/new-mormon-history-11/',
            'http://signaturebookslibrary.org/new-mormon-history-12/',
            'http://signaturebookslibrary.org/new-mormon-history-13/',
            'http://signaturebookslibrary.org/new-mormon-history-14/',
            'http://signaturebookslibrary.org/new-mormon-history-15/',
            'http://signaturebookslibrary.org/new-mormon-historty-epilogue/',
            'http://signaturebookslibrary.org/new-mormon-history-17/',
        ],
        title: 'The New Mormon History',
        author: 'D. Michael Quinn, editor',
    }, {
        pages: [
            'http://signaturebookslibrary.org/power-from-on-high-01-2/',
            'http://signaturebookslibrary.org/power-from-on-high-02/',
            'http://signaturebookslibrary.org/power-from-on-high-03/',
            'http://signaturebookslibrary.org/power-from-on-high-04/',
            'http://signaturebookslibrary.org/power-from-on-high-05/',
            'http://signaturebookslibrary.org/power-from-on-high-06/',
            'http://signaturebookslibrary.org/power-from-on-high-07/',
            'http://signaturebookslibrary.org/power-from-on-high-08/',
        ],
        title: 'Power from on High',
        author: 'Gregory A. Prince',
    }
];

function extractChapter(file, chpCnt) {
    console.log(`Extracting ${file}`);

    return Promise.resolve()
        .then(() => JSDOM.fromURL(file))
        .then(dom => dom.serialize())
        .then(html => html.replace(/-?\[p\s*\.\s*\d+\]-?/igm, ''))
        .then(html => new JSDOM(html))
        .then(dom => 
            dom.window.document.querySelector('div.entry > p') ||
            dom.window.document.querySelector('div.entry div#cspc-header > p')
        )
        .tap(element => !element && Promise.reject('Couldn\'t find paragraphs'))
        .then(element => {
            const paragraphs = [];
            while (element) {
                paragraphs.push(element.innerHTML);
                element = element.nextElementSibling;
            }
            return paragraphs;
        })
        .then(paragraphs => {
            // are there footnotes?
            const last = _.last(paragraphs);
            const footnoteRE = /^\s*(\d+)\.?\s*<a\s*name\s*=\s*"\S*\1"\s*>\s*<\/a>\s*(.*)\s*$/im
            const match = last.match(footnoteRE);
            if (!match) {
                return paragraphs;
            }

            // if so, how many?
            let footnoteCount = 0;
            let foundFirstFootnote = false;

            while (footnoteCount < paragraphs.length &&
                !paragraphs[paragraphs.length - footnoteCount - 1].match(/^\s*1\.?\s*<a name/)) {
                footnoteCount++;
            }
            footnoteCount++;

            if (footnoteCount >= paragraphs.length) {
                return Promise.reject('Too many footnotes found.');
            }

            // break out the footnotes from the paragraphs
            const footnotes = paragraphs.splice(paragraphs.length - footnoteCount, paragraphs.length);

            // drop the "Notes:"
            paragraphs.pop();
            // drop the "title/author"
            paragraphs.shift();

            const title = paragraphs.shift();

            // rebuild the footnote references
            return Promise.resolve({
                title,
                number: chpCnt,
                paragraphs: paragraphs.map(p => p.replace(
                    /<a href="#[^"\d]*(\d+)"><sup>\1<\/sup><\/a>/g,
                    `<a href="#${chpCnt}_$1" name="${chpCnt}_$1_b"><sup>$1<\/sup><\/a>`)),
                footnotes: footnotes.map(f => f.replace(
                    /^\s*(\d+)\.?\s*<a name="[^"]+\1"><\/a>/,
                    `<a name="${chpCnt}_$1" href="#${chpCnt}_$1_b">$1.<\/a>`))
            });
        });
}

const getBookContents = function () {
    const basePath = path.join(__dirname, '..', '..', 'tmp');

    const book = books[0];

    return Promise.mapSeries(book.pages, extractChapter)
        .then((chapters) => Promise.resolve(_.assign(
            _.pick(book, 'title', 'author'), {
                chapters
            })));
};

_.assign(module.exports, {
    getBookContents
});
