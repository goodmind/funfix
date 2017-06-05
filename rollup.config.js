/*
 * Copyright (c) 2017 by The Funcat Project Developers.
 * Some rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import babel from "rollup-plugin-babel"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"

const pkg = require("./package.json")
const { camelCase } = require("lodash")

const libraryName = "funcat"

export default {
  entry: `dist/${libraryName}.js`,
  targets: [
		{ dest: pkg.main, moduleName: camelCase(libraryName), format: "umd" },
		{ dest: pkg.module, format: "es" }
  ],
  sourceMap: true,
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  plugins: [
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
     // Allow node_modules resolution, so you can use 'external' to control
     // which external modules to include in the bundle
    resolve(),
    // Don't transpile node_modules. You may change this if you wanna transpile something in there
    babel({ exclude: "node_modules/**" })
  ]
}
