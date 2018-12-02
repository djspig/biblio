const argv = require('minimist')(process.argv.slice(2));
const select = require('xpath.js');
const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const request = require('superagent');
const os = require('os');

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

  return request
    .get(`https://www.lds.org/${url}`)
    .query('json')
    .then(response => JSON.parse(response.res.text))
  // return Promise.fromCallback(cb => fs.readFile(path.join(basePath, 'turn-on-your-light.pretty.json'), cb))
    // .then(response => JSON.parse(response))
    // .then(talk => {
    //   return talk;      
    // })
    .then(talk => Promise.props({
        title: _.get(talk, 'subComponents.ldsOrgHead.meta.title') + 
          ' (' +
          (_.get(talk, 'subComponents.printString') || '').split(' ').slice(0,2).join(' ') + 
          ')',
        subtitle: _.get(talk, 'subComponents.printString'),
        number: chptIndex,
        paragraphs: extractParagraphs(chptIndex, _.get(talk, 'subComponents.articleContent.articleContent')),
        footnotes: extractFootnotes(chptIndex, _.get(talk, 'subComponents.textDrawer.reference')),
      }).tap(result => {
        return;
      })
    );
}

// function extractSession(session, chptIndex) {
//   return Promise.mapSeries(
//     _.get(session, 'subComponents.tile') || [],
//     // _.take(_.get(session, 'subComponents.tile') || [], 1),
//     (talk, index) => extractTalk(talk.link, chptIndex + index)
//   );
// }

const getBookContents = function () {
    const basePath = path.join(__dirname, '..', '..', 'tmp');

    function* getPages(initialRequest) {
      let nextPage = basePage;
      while (nextPage) {
        yield request.get(nextPage)
      } while (!done);
    }

    // return Promise.reduce(
    //   getPages(
    //     request.get('https://www.lds.org/general-conference/speakers/archive')
    //       .query({
    //         speaker: 'Russel M. Nelson',
    //         lang: 'eng',
    //         json: true,
    //       })
    //     ), 
    //   (memo, response) => {
    //     debugger;
    //   },
    //   []
    // );

      // .then(response => Promise.fromCallback(cb => fs.writeFile(path.join(basePath, 'page1.json'), response.res.text, { encoding: 'utf8' }, cb)))
    // return Promise.fromCallback(cb => fs.readFile(path.resolve(os.homedir(), 'tmp', 'page1.json'), { encoding: 'utf8' }, cb))
    // .tap(() => {
      // debugger;
    // })
    // .then(response => JSON.parse(response.res.text))
      // .then(response => JSON.parse(response))
    return Promise.resolve([
      "/general-conference/1984/04/call-to-the-holy-apostleship?lang=eng",
      "/general-conference/1984/10/protect-the-spiritual-power-line?lang=eng",
      "/general-conference/1985/04/reverence-for-life?lang=eng",
      "/general-conference/1985/10/self-mastery?lang=eng",
      "/general-conference/1986/04/in-the-lords-own-way?lang=eng",
      "/general-conference/1986/10/joy-cometh-in-the-morning?lang=eng",
      "/general-conference/1987/04/life-after-life?lang=eng",
      "/general-conference/1987/10/keys-of-the-priesthood?lang=eng",
      "/general-conference/1987/10/lessons-from-eve?lang=eng",
      "/general-conference/1988/04/with-god-nothing-shall-be-impossible?lang=eng",
      "/general-conference/1988/10/addiction-or-freedom?lang=eng",
      "/general-conference/1989/04/the-canker-of-contention?lang=eng",
      "/general-conference/1989/10/woman-of-infinite-worth?lang=eng",
      "/general-conference/1990/04/thus-shall-my-church-be-called?lang=eng",
      "/general-conference/1990/10/choices?lang=eng",
      "/general-conference/1991/04/listen-to-learn?lang=eng",
      "/general-conference/1991/10/these-were-our-examples?lang=eng",
      "/general-conference/1992/04/doors-of-death?lang=eng",
      "/general-conference/1992/10/where-is-wisdom?lang=eng",
      "/general-conference/1993/04/honoring-the-priesthood?lang=eng",
      "/general-conference/1993/10/combatting-spiritual-drift-our-global-pandemic?lang=eng",
      "/general-conference/1993/10/constancy-amid-change?lang=eng",
      "/general-conference/1994/04/teach-us-tolerance-and-love?lang=eng",
      "/general-conference/1994/10/the-spirit-of-elijah?lang=eng",
      "/general-conference/1995/04/children-of-the-covenant?lang=eng",
      "/general-conference/1995/10/perfection-pending?lang=eng",
      "/general-conference/1996/04/thou-shalt-have-no-other-gods?lang=eng",
      "/general-conference/1996/10/the-atonement?lang=eng",
      "/general-conference/1997/04/endure-and-be-lifted-up?lang=eng",
      "/general-conference/1997/10/spiritual-capacity?lang=eng",
      "/general-conference/1998/04/a-new-harvest-time?lang=eng",
      "/general-conference/1998/10/we-are-children-of-god?lang=eng",
      "/general-conference/1999/04/our-sacred-duty-to-honor-women?lang=eng",
      "/general-conference/1999/10/a-testimony-of-the-book-of-mormon?lang=eng",
      "/general-conference/2000/04/the-creation?lang=eng",
      "/general-conference/2000/10/living-by-scriptural-guidance?lang=eng",
      "/general-conference/2001/04/personal-preparation-for-temple-blessings?lang=eng",
      "/general-conference/2001/10/set-in-order-thy-house?lang=eng",
      "/general-conference/2002/04/how-firm-our-foundation?lang=eng",
      "/general-conference/2002/10/blessed-are-the-peacemakers?lang=eng",
      "/general-conference/2003/04/sweet-power-of-prayer?lang=eng",
      "/general-conference/2003/10/personal-priesthood-responsibility?lang=eng",
      "/general-conference/2004/04/roots-and-branches?lang=eng",
      "/general-conference/2004/10/senior-missionaries-and-the-gospel?lang=eng",
      "/general-conference/2005/04/now-is-the-time-to-prepare?lang=eng",
      "/general-conference/2005/10/jesus-christ-the-master-healer?lang=eng",
      "/general-conference/2006/04/nurturing-marriage?lang=eng",
      "/general-conference/2006/10/the-gathering-of-scattered-israel?lang=eng",
      "/general-conference/2007/04/repentance-and-conversion?lang=eng",
      "/general-conference/2007/10/scriptural-witnesses?lang=eng",
      "/general-conference/2008/04/salvation-and-exaltation?lang=eng",
      "/general-conference/2008/10/celestial-marriage?lang=eng",
      "/general-conference/2009/04/lessons-from-the-lords-prayers?lang=eng",
      "/general-conference/2009/10/ask-seek-knock?lang=eng",
      "/general-conference/2010/04/generations-linked-in-love?lang=eng",
      "/general-conference/2010/10/be-thou-an-example-of-the-believers?lang=eng",
      "/general-conference/2011/04/face-the-future-with-faith?lang=eng",
      "/general-conference/2011/10/covenants?lang=eng",
      "/general-conference/2012/04/thanks-be-to-god?lang=eng",
      "/general-conference/2012/10/ask-the-missionaries-they-can-help-you?lang=eng",
      "/general-conference/2013/04/catch-the-wave?lang=eng",
      "/general-conference/2013/10/decisions-for-eternity?lang=eng",
      "/general-conference/2014/04/let-your-faith-show?lang=eng",
      "/general-conference/2014/10/sustaining-the-prophets?lang=eng",
      "/general-conference/2015/04/the-sabbath-is-a-delight?lang=eng",
      "/general-conference/2015/10/a-plea-to-my-sisters?lang=eng",
      "/general-conference/2016/04/the-price-of-priesthood-power?lang=eng",
      "/general-conference/2016/10/joy-and-spiritual-survival?lang=eng",
      "/general-conference/2017/04/drawing-the-power-of-jesus-christ-into-our-lives?lang=eng",
      "/general-conference/2017/10/the-book-of-mormon-what-would-your-life-be-like-without-it?lang=eng",
      "/general-conference/2018/04/revelation-for-the-church-revelation-for-our-lives?lang=eng",
      "/general-conference/2018/04/ministering-with-the-power-and-authority-of-god?lang=eng",
      "/general-conference/2018/04/let-us-all-press-on?lang=eng",
      "/general-conference/2018/04/introductory-remarks?lang=eng",
      "/general-conference/2018/04/ministering?lang=eng"      
    ])
      .then(links => Promise.props({
        // title: `General Conference - ${conf.title}`,
        title: `President Russell M. Nelson - Collected Conference Talks`,
        author: 'Russell M. Nelson',
        // author: "The Church of Jesus Christ of Latter-Day Saints",

        chapters: Promise.mapSeries(
          links,
          (link, index) => {
            return extractTalk(link, index + 1);
          }),
      }))
      .tap(result => {
        return;
      });
};

// return Promise.mapSeries(
//   _.get(session, 'subComponents.tile') || [],
//   // _.take(_.get(session, 'subComponents.tile') || [], 1),
//   (talk, index) => extractTalk(talk.link, chptIndex + index)
// );


_.assign(module.exports, {
    getBookContents
});
