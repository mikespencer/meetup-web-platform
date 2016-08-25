// Require modules
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const paths = {
	src: path.resolve(__dirname, 'src'),
	middleware: path.resolve(__dirname, 'src', 'middleware'),
};

// Webpack config
module.exports = {
	entry: {
		server: [path.resolve(paths.src, 'server')],
		'middleware/post': [path.resolve(paths.middleware, 'post')],
		'middleware/auth': [path.resolve(paths.middleware, 'auth')],
		'middleware/cache': [path.resolve(paths.middleware, 'cache')],
		'middleware/sync': [path.resolve(paths.middleware, 'sync')],
		'api-proxy': [path.resolve(paths.src, 'api-proxy')],
		'util/rxUtils': [path.resolve(paths.src, 'util', 'rxUtils')],
		'actions/authActionCreators': [path.resolve(paths.src, 'actions', 'authActionCreators')],
	},

	output: {
		libraryTarget: 'commonjs2',
		path: 'dist',
		filename: '[name].js',
	},

	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				include: [paths.src],
				loader: 'babel-loader',
			},

			{
				test: /\.json$/,
				include: [paths.src],
				loader: 'json'
			}
		]
	},

	target: 'node',

	externals: [nodeExternals()],

	resolve: {
		// module name extensions
		extensions: ['.js', '.jsx']
	}
};

