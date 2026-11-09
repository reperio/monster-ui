import { Transform } from 'stream';

/**
 * Re-emits a gulp stream's files sorted by path. `gulp.src` emits files in the
 * order its globs happen to resolve, which changes between runs; put this
 * before `concat` so the same sources always build the same bytes, and so
 * the same `?v=` cache key (docs/deployment.md).
 * @return {Transform}
 */
export const sortByPath = () => {
	const files = [];
	return new Transform({
		objectMode: true,
		transform(file, encoding, callback) {
			files.push(file);
			callback();
		},
		flush(callback) {
			files
				.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
				.forEach(file => this.push(file));
			callback();
		}
	});
};
