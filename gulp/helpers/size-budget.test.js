import assert from 'assert';
import { checkBudget } from './size-budget.js';

const KB = 1024;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const report = ({ main = [3000, 500], templates = [1000, 100], style = [800, 100], apps = {} } = {}) => {
	const file = ([rawKB, gzipKB]) => ({ raw: rawKB * KB, gzip: gzipKB * KB });
	const files = {
		'js/main.js': file(main),
		'js/templates.js': file(templates),
		'css/style.css': file(style)
	};
	return {
		initialLoad: {
			files,
			total: {
				raw: (main[0] + templates[0] + style[0]) * KB,
				gzip: (main[1] + templates[1] + style[1]) * KB
			}
		},
		apps: Object.keys(apps).reduce((acc, name) => Object.assign(acc, { [name]: file(apps[name]) }), {})
	};
};

const budget = ({ main = [3000, 500], templates = [1000, 100], style = [800, 100], total = [4800, 700], apps = {} } = {}) => {
	const entry = ([rawKB, gzipKB]) => ({ rawKB, gzipKB });
	return {
		initialLoad: {
			'js/main.js': entry(main),
			'js/templates.js': entry(templates),
			'css/style.css': entry(style),
			total: entry(total)
		},
		apps: Object.keys(apps).reduce((acc, name) => Object.assign(acc, { [name]: entry(apps[name]) }), {})
	};
};

test('a build exactly at budget passes', () => {
	const result = checkBudget(report(), budget());
	assert.deepStrictEqual(result.failures, []);
	assert.deepStrictEqual(result.warnings, []);
});

test('a trio file 1 byte over its gzip budget fails, naming the file', () => {
	const r = report();
	r.initialLoad.files['js/templates.js'].gzip += 1;
	const result = checkBudget(r, budget({ total: [4800, 701] }));
	assert.strictEqual(result.failures.length, 1);
	assert.match(result.failures[0], /js\/templates\.js/);
	assert.match(result.failures[0], /gzip/);
});

test('a trio file over its raw budget fails', () => {
	const result = checkBudget(report({ main: [3001, 500] }), budget({ total: [5000, 700] }));
	assert.strictEqual(result.failures.length, 1);
	assert.match(result.failures[0], /js\/main\.js/);
	assert.match(result.failures[0], /raw/);
});

test('the trio total over budget fails even when every file is within', () => {
	const result = checkBudget(report(), budget({ total: [4799, 700] }));
	assert.strictEqual(result.failures.length, 1);
	assert.match(result.failures[0], /total/);
});

test('a Lazy App over its cap only warns', () => {
	const result = checkBudget(
		report({ apps: { voip: [200, 41] } }),
		budget({ apps: { voip: [250, 40] } })
	);
	assert.deepStrictEqual(result.failures, []);
	assert.strictEqual(result.warnings.length, 1);
	assert.match(result.warnings[0], /voip/);
});

test('a capped App with no emitted bundle, or a bundle with no cap, is not checked', () => {
	const result = checkBudget(
		report({ apps: { webhooks: [999, 999] } }),
		budget({ apps: { voip: [1, 1] } })
	);
	assert.deepStrictEqual(result.failures, []);
	assert.deepStrictEqual(result.warnings, []);
});

test('a file 20 KB gzip or more under budget is flagged to lower, without failing', () => {
	const result = checkBudget(report({ templates: [1000, 80] }), budget());
	assert.deepStrictEqual(result.failures, []);
	assert.deepStrictEqual(result.warnings, []);
	assert.strictEqual(result.lowerIt.length, 2);
	assert.match(result.lowerIt[0], /js\/templates\.js/);
	assert.match(result.lowerIt[1], /total/);
});

test('a file 19 KB gzip under budget is not flagged', () => {
	const result = checkBudget(report({ templates: [1000, 81] }), budget({ total: [4800, 681] }));
	assert.deepStrictEqual(result.lowerIt, []);
});

test('a Lazy App well under its cap is flagged to lower too', () => {
	const result = checkBudget(
		report({ apps: { voip: [200, 20] } }),
		budget({ apps: { voip: [250, 40] } })
	);
	assert.strictEqual(result.lowerIt.length, 1);
	assert.match(result.lowerIt[0], /voip/);
});

test('the summary has a measured-vs-budget row per checked entry, with its status', () => {
	const { summary } = checkBudget(
		report({ main: [3000, 501], templates: [1000, 80], apps: { voip: [260, 40] } }),
		budget({ total: [4800, 700], apps: { voip: [250, 40], callflows: [100, 10] } })
	);
	const lines = summary.split('\n');
	assert.ok(lines.includes('| `js/main.js` | 3000.0 KB | 3000.0 KB | 501.0 KB | 500.0 KB | ❌ over budget |'), summary);
	assert.ok(lines.includes('| `js/templates.js` | 1000.0 KB | 1000.0 KB | 80.0 KB | 100.0 KB | ⬇️ lower it |'), summary);
	assert.ok(lines.includes('| `css/style.css` | 800.0 KB | 800.0 KB | 100.0 KB | 100.0 KB | ✅ |'), summary);
	assert.ok(lines.includes('| **Initial Load total** | 4800.0 KB | 4800.0 KB | 681.0 KB | 700.0 KB | ✅ |'), summary);
	assert.ok(lines.includes('| voip (Lazy App) | 260.0 KB | 250.0 KB | 40.0 KB | 40.0 KB | ⚠️ over cap |'), summary);
	assert.ok(!/callflows/.test(summary), summary);
});

test('a budget with no entry for a trio file fails, naming the file', () => {
	const b = budget();
	delete b.initialLoad['css/style.css'];
	const result = checkBudget(report(), b);
	assert.strictEqual(result.failures.length, 1);
	assert.match(result.failures[0], /css\/style\.css.*no budget/);
});

let failed = 0;
tests.forEach(({ name, fn }) => {
	try {
		fn();
		console.log(`ok - ${name}`);
	} catch (error) {
		failed += 1;
		console.log(`not ok - ${name}\n${error.stack}`);
	}
});
if (failed) {
	process.exitCode = 1;
}
