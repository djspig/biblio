const argv = require('minimist')(process.argv.slice(2));
const select = require('xpath.js');
const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const request = require('superagent');

const { JSDOM } = require("jsdom");

function extractFootnotes(chpCnt, talk) {

  return Promise.resolve()
    .then(() => JSDOM.fragment(talk))
    .then(dom => dom.querySelector('footer.notes > ol > li'))
    .then(element => {
      const footnotes = [];
      while (element) {
        footnotes.push(element.innerHTML);
        element = element.nextElementSibling;
      }
      return footnotes;
    })
    .then(footnotes => Promise.mapSeries(footnotes, (footnote) =>
      Promise.resolve(JSDOM.fragment(footnote))
        .then(dom => dom.querySelector('p'))
        .then(element => element && element.innerHTML)))
    .then(footnotes => footnotes.map((p, index) => `
        <a href="#${chpCnt}_${index + 1}" name="${chpCnt}_${index + 1}_b"><sup>${index + 1}<\/sup><\/a>
        ${p.replace(/(\s+href\s*=\s*(?:"|'))\//ig, "$1https://lds.org/")}`));
}

function extractParagraphs(chpCnt, talk) {
  return Promise.resolve()
    .then(html => JSDOM.fragment(talk))
    .then(dom => dom.querySelector('div.body-block > p'))
    .then(element => {
        const paragraphs = [];
        while (element) {
            paragraphs.push(element.innerHTML);
            element = element.nextElementSibling;
        }
        return paragraphs;
    })
    .then(paragraphs => {
      return paragraphs.map(p => p.replace(
        /<a\s+class\s*=\s*"note-ref"\s+href=\s*"#note(\d+)"\s*>\s*<sup\s+class="marker"\s*>\s*\1\s*<\/sup>\s*<\/a>/igm,
        `<a href="#${chpCnt}_$1_b" name="${chpCnt}_$1"><sup>$1<\/sup><\/a>`));
    });
}

function extractTalk(url, chptIndex) {
  const basePath = path.join(__dirname, '..', '..', 'tmp');

  return Promise.resolve(`https://www.lds.org/${url}`)
    .tap(url => console.log('GET', url))
    .then((url) => request
      .get(url)
      .query('lang=spa&json')
      .then(response => JSON.parse(response.res.text))
    // return Promise.fromCallback(cb => fs.readFile(path.join(basePath, 'turn-on-your-light.pretty.json'), cb))
      // .then(response => JSON.parse(response))
      .then(talk => Promise.props({
        title: _.get(talk, 'subComponents.ldsOrgHead.meta.title'),
        number: chptIndex,
        paragraphs: extractParagraphs(chptIndex, _.get(talk, 'subComponents.articleContent.articleContent')),
        footnotes: extractFootnotes(chptIndex, _.get(talk, 'subComponents.textDrawer.reference')),
      })));
}

function extractSession(session, chptIndex) {
  return Promise.mapSeries(
    _.get(session, 'subComponents.tile') || [],
    // _.take(_.get(session, 'subComponents.tile') || [], 1),
    (talk, index) => extractTalk(talk.link, chptIndex + index)
  );
}

const getBookContents = function () {
    const basePath = path.join(__dirname, '..', '..', 'tmp');

    return request
      .get('https://www.lds.org/general-conference')
      .query('lang=spa&json')
      // .then(response => Promise.fromCallback(cb => fs.writeFile(path.join(basePath, 'test.json'), response.res.text, { encoding: 'utf8' }, cb)))
    // return Promise.fromCallback(cb => fs.readFile(path.join(basePath, 'test.json'), cb))
    .then(response => JSON.parse(response.res.text))
      // .then(response => JSON.parse(response))
      .then(conf => Promise.props({
        title: `General Conference - ${conf.title}`,
        author: "The Church of Jesus Christ of Latter-Day Saints",
        chapters: Promise.reduce(
          _.get(conf, 'subComponents.sessions'),
          (memo, session) => extractSession(session, memo.length)
            .then((chapters) => memo.concat(chapters)),
          []
        )
      }));
};

_.assign(module.exports, {
    getBookContents
});
