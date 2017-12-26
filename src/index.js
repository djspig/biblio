const hbs = require('handlebars');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const _ = require('lodash');

const templateDir = path.join(__dirname, 'templates');

Promise.resolve()
	.then(() =>
		// load up the templates
		Promise.reduce(
			fs.readdirAsync(templateDir),
			(memo, item) => {
				const match = item.match(/^(.*)\.hbs$/);
				if (match) {
					const filepath = path.join(templateDir, item);
					const file = fs.readFileSync(filepath, { encoding: 'utf8' })
					debugger;
					memo[match[1]] = hbs.compile(file);
				}
				return memo;
			},
			{}
		)
	)
	.then((templates) => {
		console.log(_.keys(templates))
	});

// const book = hbs.compile(source);

