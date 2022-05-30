'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        environment: {
            arrowFunction: false
        }
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'babel-loader',
                }]
            }
        ]
    }
};

module.exports = config;
