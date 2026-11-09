import { dirname, join } from 'upath';
import { appendFileSync, readFileSync } from 'fs';
import { src } from '../paths.js';
import { env } from '../helpers/helpers.js';
import { checkBudget } from '../helpers/size-budget.js';

/**
 * Checks a `gulp size-report --json` report against `size-budget.json`.
 *
 * Usage: `gulp size-report --silent --json size-report.json && gulp size-budget --report size-report.json [--budget <file>]`
 *
 * Fails when the Initial Load trio is over budget. Per-App cap breaches and
 * "lower it" hints are reported but never fail. Under GitHub Actions they
 * become annotations, and the measured-vs-budget table goes to the job
 * summary; elsewhere both are printed.
 */

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

const inActions = process.env.GITHUB_ACTIONS === 'true';

const annotate = (level, message) => {
	console.log(inActions ? `::${level} title=Size budget::${message}` : `${level}: ${message}`);
};

const sizeBudget = done => {
	if (typeof env.report !== 'string') {
		return done(new Error('Pass the size-report JSON: gulp size-budget --report <file>'));
	}
	const budgetFile = typeof env.budget === 'string'
		? env.budget
		: join(dirname(src), 'size-budget.json');
	const { failures, warnings, lowerIt, summary } = checkBudget(readJson(env.report), readJson(budgetFile));

	if (inActions && process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	} else {
		console.log(summary);
	}
	failures.forEach(message => annotate('error', message));
	warnings.forEach(message => annotate('warning', message));
	lowerIt.forEach(message => annotate('notice', message));

	done(failures.length
		? new Error(`Initial Load is over its size budget (${failures.length} breach${failures.length > 1 ? 'es' : ''})`)
		: undefined);
};

export default sizeBudget;
