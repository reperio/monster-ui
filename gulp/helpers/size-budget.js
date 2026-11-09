/**
 * The size budget check behind the `build-prod` CI job.
 *
 * Compares a `gulp size-report --json` report to `size-budget.json`:
 *   - the Initial Load trio (each file and the total) fails when over budget;
 *   - an App bundle over its per-App cap only warns;
 *   - anything 20 KB gzip or more under its budget is flagged "lower it".
 * See the `size-budget` section of docs/building.md for the ratchet rule.
 */

const KB = 1024;

const METRICS = ['raw', 'gzip'];

/** The Initial Load trio: the three bundles the budget covers. */
export const INITIAL_LOAD_FILES = ['js/main.js', 'js/templates.js', 'css/style.css'];

// A budget this far above the measured gzip size should be ratcheted down.
const LOWER_IT_GZIP = 20 * KB;

const STATUS = {
	over: { initialLoad: '❌ over budget', app: '⚠️ over cap' },
	lowerIt: '⬇️ lower it',
	ok: '✅'
};

const fromKB = ({ rawKB, gzipKB }) => ({ raw: rawKB * KB, gzip: gzipKB * KB });

const kb = bytes => `${(bytes / KB).toFixed(1)} KB`;

const breaches = ({ name, measured, budget }) => METRICS
	.filter(metric => measured[metric] > budget[metric])
	.map(metric => `${name} is ${kb(measured[metric])} ${metric}, over its ${kb(budget[metric])} ${metric} budget`);

const hasSlack = ({ measured, budget }) => budget.gzip - measured.gzip >= LOWER_IT_GZIP;

const lowerItMessage = ({ name, measured, budget }) => `${name} is ${kb(budget.gzip - measured.gzip)} gzip under its ${kb(budget.gzip)} gzip budget: lower it`;

const status = entry => breaches(entry).length
	? STATUS.over[entry.scope]
	: hasSlack(entry) ? STATUS.lowerIt : STATUS.ok;

const toSummary = entries => [
	'### Size budget',
	'',
	'| | raw | raw budget | gzip | gzip budget | |',
	'| --- | ---: | ---: | ---: | ---: | --- |',
	...entries.map(entry => `| ${entry.label} | ${kb(entry.measured.raw)} | ${kb(entry.budget.raw)} | ${kb(entry.measured.gzip)} | ${kb(entry.budget.gzip)} | ${status(entry)} |`),
	'',
	'Budgets live in `size-budget.json`. A trio entry over budget fails the build; an App bundle over its cap only warns. See docs/building.md for when to lower or raise them.',
	''
].join('\n');

/**
 * Compares a `gulp size-report --json` report to `size-budget.json`.
 * @param  {Object} report  `{ initialLoad: { files, total }, apps }`, sizes in bytes
 * @param  {Object} budget  `{ initialLoad: { <file>, total }, apps }`, sizes in KB
 * @return {{ failures: String[], warnings: String[], lowerIt: String[], summary: String }}
 *         `failures` should fail the build; the rest are informational.
 */
export const checkBudget = (report, budget) => {
	const budgeted = budget.initialLoad || {};
	const unbudgeted = INITIAL_LOAD_FILES.concat('total')
		.filter(name => !budgeted[name])
		.map(name => `${name} has no budget in size-budget.json`);
	if (unbudgeted.length) {
		return { failures: unbudgeted, warnings: [], lowerIt: [], summary: '' };
	}
	const trio = INITIAL_LOAD_FILES.map(name => ({
		scope: 'initialLoad',
		name,
		label: `\`${name}\``,
		measured: report.initialLoad.files[name],
		budget: fromKB(budgeted[name])
	})).concat({
		scope: 'initialLoad',
		name: 'Initial Load trio total',
		label: '**Initial Load trio total**',
		measured: report.initialLoad.total,
		budget: fromKB(budgeted.total)
	});
	const caps = budget.apps || {};
	const measuredApps = report.apps || {};
	const apps = Object.keys(caps)
		.filter(name => measuredApps[name])
		.sort()
		.map(name => ({
			scope: 'app',
			name: `${name} (App bundle)`,
			label: `${name} (App bundle)`,
			measured: measuredApps[name],
			budget: fromKB(caps[name])
		}));
	const entries = trio.concat(apps);
	return {
		failures: [].concat(...trio.map(breaches)),
		warnings: [].concat(...apps.map(breaches)),
		lowerIt: entries.filter(hasSlack).map(lowerItMessage),
		summary: toSummary(entries)
	};
};
