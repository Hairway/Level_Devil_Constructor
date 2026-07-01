const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");

//----------------------------------

const opts = {encoding: 'utf8', flag: 'r'};

const scriptPlatformStandard = '<script>' + fs.readFileSync( path.resolve(__dirname, '../src/utils/platforms/standard/Platform.mjs'), opts) + '</script>';

//----------------------------------

const assetsPath = path.resolve(__dirname, '../src/assets/Assets.js');

if(!fs.existsSync( assetsPath )){
	console.log("File is missing: " + assetsPath);
	
    try{
        execSync('node src/utils/assets/AssetPacker.mjs', { stdio: 'inherit' });
    }catch(error){}
}

//----------------------------------

module.exports = {
    mode	: 'development',
    stats	: 'minimal',
	
    devServer: {
		open: true,
		hot: true,
		
		host: 'localhost',
		//host: '192.168.1.*',
		port: 8080, 
		allowedHosts: 'all',		
		client: {
			webSocketURL: 'ws://localhost:8080/ws',
		},
		static: {
			directory: path.resolve(__dirname, '../'),
		},
		watchFiles: {
			paths: ['*.html', 'src/**/*.mjs'],
			options: {
				ignored: "/node_modules/"
			}
		}
    },
	
    entry	: path.resolve(__dirname, '../src/Main.mjs'),
	
    output: {
        path		: path.resolve(__dirname, '../build'),
        clean		: true,
        filename	: 'Main.js',
    },
	
	module: {		
		rules: [
			{
				test: /\.wasm$/,
				type: 'asset/inline'
			},
		],
	},
	  
	experiments: {
		asyncWebAssembly: true,
	},
	
	resolve: {
		extensions	: ['.js', '.wasm'],
		fallback	: {
			fs: false,
		},
	},
  
	optimization: {
		minimize	: true,
		minimizer	: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					format: {
					  comments: false,
					},
				},
			}),
		],
    },
	
    plugins: [       
		new HtmlWebpackPlugin({
            filename			: 'index.html',
            template			: path.resolve(__dirname, '../index.html'),
            scriptPlatform		: scriptPlatformStandard,
            inject				: "body",
            minify				: false,
			templateParameters	: {
				isDev: true
			}
        })
    ]
	
	
}