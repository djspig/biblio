const argv = require('minimist')(process.argv.slice(2));
const Handlebars = require('handlebars');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const _ = require('lodash');
const rimraf = require('rimraf');

const templateDir = path.join(__dirname, 'templates');
const partialDir = path.join(templateDir, 'partials');

var mkdirp = Promise.promisify(require('mkdirp'));

const { getBookContents } = require('./extractors/signature-books');

Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);

  return {
    "+": lvalue + rvalue,
    "-": lvalue - rvalue,
    "*": lvalue * rvalue,
    "/": lvalue / rvalue,
    "%": lvalue % rvalue
  }[operator];
});

function prepareBuildPath() {
  const buildPath = path.join(__dirname, '..', 'build');

  return Promise.fromCallback(cb => rimraf(buildPath, cb))
    .then(() => mkdirp(buildPath))
    .then(() => buildPath);
}

function buildTemplates() {
  // load up the templates
  return Promise.reduce(
    fs.readdirAsync(templateDir),
    (memo, item) => {
      const match = item.match(/^(.*)\.hbs$/);
      if (match) {
        const filepath = path.join(templateDir, item);
        const file = fs.readFileSync(filepath, { encoding: 'utf8' })
        memo[match[1]] = Handlebars.compile(file);
      }
      return memo;
    },
    {}
  );
}

function registerPartials() {
  // register all the partial buildTemplates
  return Promise.reduce(
    fs.readdirAsync(partialDir),
    (memo, item) => {
      const match = item.match(/^(.*)\.hbs$/);
      if (match) {
        const filepath = path.join(partialDir, item);
        const file = fs.readFileSync(filepath, { encoding: 'utf8' })
        memo[match[1]] = file;
      }
      return memo;
    },
    {}
  ).tap(partials => Handlebars.registerPartial(partials))
}

function getBuilder() {
  if (!_.isArray(argv._) || argv._.length <= 0) {
    return Promise.reject('Must specify extractor');
  }

  return Promise.resolve()
    .then(() => require(path.resolve(_.first(argv._))))
    .then(builder => !_.isFunction(builder.getBookContents) ? Promise.reject('Missing "getBookContents()"') : builder);
}

return Promise.props({
  buildDir: prepareBuildPath(),
  templates: registerPartials().then(() => buildTemplates()),
  builder: getBuilder(),
})
  .then(({ templates, builder, buildDir }) => builder.getBookContents(argv._.slice(1))
    .then(book => Promise.props(_.transform(templates, (memo, value, key) => memo[key] = templates[key](book), {})))
    .then(results => Promise.each(_.keys(results), (key) => fs.writeFileAsync(path.join(buildDir, key), results[key])))
  );

// const book = hbs.compile(source);
