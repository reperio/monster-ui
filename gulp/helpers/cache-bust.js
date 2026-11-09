import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'upath';
import { parse } from 'acorn';

/**
 * Cache keys for the production build (see docs/deployment.md).
 *
 * `src/js/main.js` busts every RequireJS fetch with a timestamp `urlArgs`,
 * which dev keeps. `build-prod` drops it from the built copy and keys each
 * file to its own content instead: `templates` through a `paths` entry in
 * main.js, every App and lazy chunk through the `cacheKeys` manifest in
 * build-config.json (`cacheManifest`). A `paths` value containing `?` makes
 * RequireJS skip the `.js` suffix, so each entry spells out `.js` itself:
 * `js/templates.js?v=<templates hash>`.
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
 * The boot `require.config({ paths, … })` object from src/js/main.js.
 * @param  {String} source  Built main.js
 * @return {Object}  ObjectExpression node
 */
const findBootConfig = source => {
	const configs = [];
	walk(parse(source, { ecmaVersion: 'latest' }), node => {
		if (isRequireConfigCall(node) && findProperty(node.arguments[0], 'paths')) {
			configs.push(node.arguments[0]);
		}
	});
	if (configs.length !== 1) {
		throw new Error(`Expected exactly one require.config({ paths }) call in main.js, found ${configs.length}`);
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
 * The source range that removes `property` from `objectNode`, with the comma
 * that separates it from its neighbour.
 * @param  {Object} objectNode  ObjectExpression
 * @param  {Object} property  One of its properties
 * @return {{start: Number, end: Number, text: String}}
 */
const removeProperty = (objectNode, property) => {
	const { properties } = objectNode;
	const index = properties.indexOf(property);
	if (index < properties.length - 1) {
		return { start: property.start, end: properties[index + 1].start, text: '' };
	}
	return index > 0
		? { start: properties[index - 1].end, end: property.end, text: '' }
		: { start: property.start, end: property.end, text: '' };
};

/**
 * Drops the global `urlArgs` bust from the built main.js, so each file keeps
 * its own key (see `cacheManifest`), and keys `templates` to its content hash.
 * @param  {String} source  Built (minified) main.js
 * @param  {Object} keys
 * @param  {String} keys.templatesHash
 * @return {String}  Rewritten main.js
 */
export const injectRequireConfig = (source, { templatesHash }) => {
	const config = findBootConfig(source);
	const urlArgs = findProperty(config, 'urlArgs');
	const paths = findProperty(config, 'paths');
	const templates = paths && paths.value.type === 'ObjectExpression' && findProperty(paths.value, 'templates');

	if (!templates || templates.value.type !== 'Literal' || typeof templates.value.value !== 'string') {
		throw new Error('Expected a string `templates` entry in the main.js require.config paths');
	}

	return applyEdits(source, [
		...(urlArgs ? [removeProperty(config, urlArgs)] : []),
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
 * A content hash of every file under `dir`, path and bytes, in a stable order.
 * Any change (a renamed file included) gives a new hash; an identical tree
 * gives the same one.
 * @param  {String} dir
 * @param  {Function} [ignore]  Relative path -> true to leave the file out
 * @return {String}  10 hex characters
 */
export const hashTree = (dir, ignore = () => false) => {
	const hash = createHash('sha256');
	listFiles(dir)
		.filter(file => !ignore(file))
		.sort()
		.forEach(file => {
			const content = readFileSync(join(dir, file));
			hash.update(`${file}\0${content.length}\0`);
			hash.update(content);
		});
	return hash.digest('hex').slice(0, HASH_LENGTH);
};

/**
 * What `moveBuiltFilesToDist` leaves out of dist (gulp/tasks/clean-move.js).
 * @param  {String} file  Path relative to the App's folder
 * @return {Boolean}
 */
const isUnshippedAppFile = file => file.startsWith('tests/') || file.endsWith('.scss');

/**
 * The string entries of main.js's `require.config` `paths`.
 * @param  {String} source  main.js
 * @return {Object}  Module ID (prefix) -> path without `.js`
 */
const readRequirePaths = source => {
	const paths = findProperty(findBootConfig(source), 'paths');
	return (paths && paths.value.type === 'ObjectExpression' ? paths.value.properties : [])
		.filter(property => property.type === 'Property' && property.value.type === 'Literal' && typeof property.value.value === 'string')
		.reduce((acc, property) => Object.assign(acc, { [keyName(property)]: property.value.value }), {});
};

/**
 * The file RequireJS fetches for `moduleId`: the longest `paths` entry that is
 * the ID or one of its `/` prefixes replaces that prefix, then `.js` is added.
 * @param  {Object} paths
 * @param  {String} moduleId
 * @return {String}  Path relative to the build root
 */
const resolveModuleFile = (paths, moduleId) => {
	const prefix = Object.keys(paths)
		.filter(key => moduleId === key || moduleId.startsWith(`${key}/`))
		.sort((a, b) => b.length - a.length)[0];
	return `${prefix ? paths[prefix] + moduleId.slice(prefix.length) : moduleId}.js`;
};

/**
 * The cache keys `build-prod` writes into build-config.json, read by the
 * loader (src/js/lib/monster.apps.js).
 * @param  {String} dir  Build tree, with the built js/main.js
 * @param  {Object} options
 * @param  {String[]} options.apps  Every App built
 * @param  {String[]} options.chunks  Module IDs RequireJS fetches on their
 *                                    own, after boot
 * @return {{apps: Object, requirePaths: Object}}  `apps`: App name -> hash of
 *         its shipped files. `requirePaths`: module ID -> `<file>.js?v=<hash>`,
 *         ready for `require.config({ paths })`.
 */
export const cacheManifest = (dir, { apps, chunks }) => {
	const paths = readRequirePaths(readFileSync(join(dir, 'js/main.js'), 'utf8'));
	return {
		apps: apps.reduce((acc, app) => Object.assign(acc, {
			[app]: hashTree(join(dir, 'apps', app), isUnshippedAppFile)
		}), {}),
		requirePaths: chunks.reduce((acc, moduleId) => {
			const file = resolveModuleFile(paths, moduleId);
			if (!existsSync(join(dir, file))) {
				throw new Error(`Lazy chunk ${moduleId} should be at ${file}, which the build doesn't have`);
			}
			return Object.assign(acc, {
				[moduleId]: `${file}?v=${hashContent(readFileSync(join(dir, file)))}`
			});
		}, {})
	};
};
