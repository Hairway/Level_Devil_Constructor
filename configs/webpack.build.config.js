const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { execFileSync } = require('child_process');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const ZipPlugin = require('zip-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

//----------------------------------

const opts = {encoding: 'utf8', flag: 'r'};

const scriptPlatformStandard = '<script>' + fs.readFileSync( path.resolve(__dirname, '../src/utils/platforms/standard/Platform.mjs'), opts) + '</script>';

const playableFolderName = path.basename( path.resolve(__dirname, "../") );

//----------------------------------

const { Compilation, sources } = require('webpack');

class InjectAssetsIntoBundlePlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap('InjectAssetsIntoBundlePlugin', (compilation) => {

            compilation.hooks.processAssets.tap(
                {
                    name: 'InjectAssetsIntoBundlePlugin',
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
                },
                (assets) => {

                    const assetsPath = path.resolve(__dirname, '../src/assets/Assets.js');

                    if (!fs.existsSync(assetsPath)) {
                        console.log('Assets.js not found');
                        return;
                    }

                    const assetsContent = fs.readFileSync(assetsPath, 'utf8');

                    const entry = compilation.entrypoints.get('main');

                    if (!entry) {
                        console.log('Entrypoint "main" not found');
                        return;
                    }

                    const files = entry.getFiles();

                    const jsFile = files.find(f => f.endsWith('.js'));

                    if (!jsFile) {
                        console.log('JS file not found in entrypoint');
                        return;
                    }

                    const originalSource = compilation.getAsset(jsFile).source.source();

                   const newSource = `${originalSource}\n${assetsContent}`;

                    compilation.updateAsset(
                        jsFile,
                        new sources.RawSource(newSource)
                    );

                    console.log('Assets injected into:', jsFile);
                }
            );
        });
    }
}

//----------------------------------

class RunAssetPackerPlugin {
	apply(compiler) {
		compiler.hooks.beforeRun.tap('RunAssetPackerPlugin', () => {
			execFileSync(
				process.execPath,
				[path.resolve(__dirname, '../src/utils/assets/AssetPacker.mjs')],
				{
					stdio: 'inherit',
					shell: false
				}
			);
		});

		compiler.hooks.watchRun.tap('RunAssetPackerPlugin', () => {
			execFileSync(
				process.execPath,
				[path.resolve(__dirname, '../src/utils/assets/AssetPacker.mjs')],
				{
					stdio: 'inherit',
					shell: false
				}
			);
		});
	}
}

//----------------------------------

module.exports = {
    mode	: 'production',
    stats	: 'minimal',

    entry	: path.resolve(__dirname, '../src/Main.mjs'),
	
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: 'asset/inline'
			}
		],
	},
	
	performance: {
		hints				: 'warning',
		maxEntrypointSize	: 5000000,
		maxAssetSize		: 5000000
	},

    output: {
        path		: path.resolve(__dirname, '../build'),
        clean		: true,
        filename	: 'Main.js',
		publicPath	: '',
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
        new RunAssetPackerPlugin(),
		new HtmlWebpackPlugin({
            filename			: 'index.html',
            template			: path.resolve(__dirname, '../index.html'),
            scriptPlatform		: scriptPlatformStandard,
            inject				: "body",
            minify				: false,
			templateParameters	: {
				isDev: false
			}
        }),
		new InjectAssetsIntoBundlePlugin(),
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: 1
		}),
		new HtmlInlineScriptPlugin(),	
		new ZipPlugin({
			filename			: playableFolderName+'.zip'
		}),
    ]
}
