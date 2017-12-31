const Handlebars = require('handlebars');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const _ = require('lodash');

const templateDir = path.join(__dirname, 'templates');

var mkdirp = Promise.promisify(require('mkdirp'));

const { getBookContents } = require('./extractors/signature-books');

Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
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

Promise.resolve()
    .then(() => mkdirp(path.join(__dirname, '..', 'build')))
	.then(() =>
		// load up the templates
		Promise.reduce(
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
		)
	)
	.then((templates) => getBookContents()
        .then((book) => {
            debugger;
            return Promise.props(_.transform(templates, (memo, value, key) => memo[key] = templates[key](book), {}));
        })
    )
	.then(results => { 
        debugger; 
        return Promise.each(_.keys(results), (key) => fs.writeFileAsync(path.join(__dirname, '..', 'build', key), results[key]))
    });

// const book = hbs.compile(source);

