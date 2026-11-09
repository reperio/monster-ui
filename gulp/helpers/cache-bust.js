import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'upath';
import { parse } from 'acorn';

/**
 * Cache keys for the production build (see docs/deployment.md).
 *
 * `src/js/main.js` busts every RequireJS fetch with a timestamp, which dev
 * keeps. `build-prod` rewrites the built copy instead: `urlArgs` becomes
 * `v=<release id>`, and `templates` gets a `paths` entry keyed to its own
 * content hash. A `paths` value containing `?` makes RequireJS skip the `.js`
 * suffix and append `urlArgs` with `&`, so the entry spells out `.js` itself
 * and templates.js ends up at `js/templates.js?v=<templates hash>&v=<release id>`.
 */

const keyName = property => property.key.type === 'Identifier'
	? property.key.name
	: property.key.value;

const findProperty = (objectNode, name) => objectNode.properties
	.find(property => property.type === 'Property' && keyName(property) === name);

const isRequireConfigCall = node => node.type === 'CallExpression'
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.computed
	&& node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'require'
	&& node.callee.property.name === 'config'
	&& node.arguments.length === 1
	&& node.arguments[0].type === 'ObjectExpression';

/**
 * Depth-first walk that yields every AST node.
 * @param  {Object} node
 * @param  {Function} visit
 */
const walk = (node, visit) => {
	visit(node);
	Object.keys(node).forEach(key => {
		const child = node[key];
		if (Array.isArray(child)) {
			child.forEach(item => item && typeof item.type === 'string' && walk(item, visit));
		} else if (child && typeof child.type === 'string') {
			walk(child, visit);
		}
	});
};

/**
 * The `require.config({...})` object that carries the `urlArgs` bust.
 * @param  {String} source  Built main.js
 * @return {Object}  ObjectExpression node
 */
const findBootConfig = source => {
	const configs = [];
	walk(parse(source, { ecmaVersion: 'latest' }), node => {
		if (isRequireConfigCall(node) && findProperty(node.arguments[0], 'urlArgs')) {
			configs.push(node.arguments[0]);
		}
	});
	if (configs.length !== 1) {
		throw new Error(`Expected exactly one require.config({ urlArgs }) call in main.js, found ${configs.length}`);
	}
	return configs[0];
};

/**
 * Replaces source ranges, last first so earlier offsets stay valid.
 * @param  {String} source
 * @param  {Array<{start: Number, end: Number, text: String}>} edits
 * @return {String}
 */
const applyEdits = (source, edits) => edits
	.slice()
	.sort((a, b) => b.start - a.start)
	.reduce((acc, { start, end, text }) => acc.slice(0, start) + text + acc.slice(end), source);

/**
 * Keys the built main.js's RequireJS fetches to the release, and `templates`
 * to its own content hash.
 * @param  {String} source  Built (minified) main.js
 * @param  {Object} keys
 * @param  {String} keys.releaseId
 * @param  {String} keys.templatesHash
 * @return {String}  Rewritten main.js
 */
export const injectRequireConfig = (source, { releaseId, templatesHash }) => {
	const config = findBootConfig(source);
	const urlArgs = findProperty(config, 'urlArgs');
	const paths = findProperty(config, 'paths');
	const templates = paths && paths.value.type === 'ObjectExpression' && findProperty(paths.value, 'templates');

	if (!templates || templates.value.type !== 'Literal' || typeof templates.value.value !== 'string') {
		throw new Error('Expected a string `templates` entry in the main.js require.config paths');
	}

	return applyEdits(source, [
		{ start: urlArgs.value.start, end: urlArgs.value.end, text: JSON.stringify(`v=${releaseId}`) },
		{ start: templates.value.start, end: templates.value.end, text: JSON.stringify(`${templates.value.value}.js?v=${templatesHash}`) }
	]);
};

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Appends `?v=<hash>` to the one `src`/`href` attribute pointing at `file`.
 * @param  {String} html
 * @param  {String} file  Path as written in index.html, e.g. `js/main.js`
 * @param  {String} hash
 * @return {String}
 */
const keyReference = (html, file, hash) => {
	const reference = new RegExp(`((?:src|href)=["'])${escapeRegExp(file)}(["'])`, 'g');
	const count = (html.match(reference) || []).length;
	if (count !== 1) {
		throw new Error(`Expected exactly one reference to ${file} in index.html, found ${count}`);
	}
	return html.replace(reference, `$1${file}?v=${hash}$2`);
};

/**
 * Keys index.html's references to the boot files to their content hashes.
 * @param  {String} html  index.html
 * @param  {Object} hashes
 * @param  {String} hashes.mainHash  Hash of the final js/main.js
 * @param  {String} hashes.styleHash  Hash of css/style.css
 * @return {String}  Rewritten index.html
 */
export const rewriteIndexHtml = (html, { mainHash, styleHash }) => keyReference(
	keyReference(html, 'js/main.js', mainHash),
	'css/style.css',
	styleHash
);

const HASH_LENGTH = 10;

/**
 * Short content hash used as a `?v=` cache key.
 * @param  {Buffer|String} content
 * @return {String}  10 hex characters
 */
export const hashContent = content => createHash('sha256')
	.update(content)
	.digest('hex')
	.slice(0, HASH_LENGTH);

const listFiles = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true })
	.reduce((acc, entry) => {
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		return entry.isDirectory()
			? acc.concat(listFiles(join(dir, entry.name), relativePath))
			: acc.concat(relativePath);
	}, []);

/**
 * The release id: a content hash of every file under `dir`, path and bytes, in
 * a stable order. Any change to the build output (a renamed file included)
 * gives a new id; an identical build gives the same one.
 * @param  {String} dir
 * @return {String}  10 hex characters
 */
export const hashTree = dir => {
	const hash = createHash('sha256');
	listFiles(dir)
		.sort()
		.forEach(file => {
			const content = readFileSync(join(dir, file));
			hash.update(`${file}\0${content.length}\0`);
			hash.update(content);
		});
	return hash.digest('hex').slice(0, HASH_LENGTH);
};
