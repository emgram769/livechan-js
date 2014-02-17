#!/bin/bash
# Builds and installs third-party client-side Javascript.

pushd $(dirname "$0") > /dev/null
PATH=$PWD/node_modules/.bin:$PATH

# retrieve scripts
npm install
bower install

# for fetching source information
function bower_data {
    sed -n "s/.*\"$1\": \"\(.*\)\".*/\1/p" bower_components/$2/.bower.json
}
function source_line {
    echo "// @source: $(bower_data _source $1)#$(bower_data _target $1)" | sed 's/\S*:\/\/github\.com\/\(\S*\)\.git#\(\S*\)/https:\/\/github.com\/\1\/tree\/\2/'
}

# install jQuery
(source_line jQuery; cat bower_components/jQuery/dist/jquery.js) > public/js/jquery.js

# install html5shiv
(source_line html5shiv; cat bower_components/html5shiv/dist/html5shiv.js) > public/js/html5shiv.min.js

# install highlight.js
mkdir -p public/plugins/code_highlight/css
python bower_components/highlight/tools/build.py -n
(
    source_line highlight
    echo "/*! build options: tools/build.py -n */"
    echo "/*!"
    cat bower_components/highlight/LICENSE
    echo "*/"
    cat bower_components/highlight/build/highlight.pack.js
) > public/plugins/code_highlight/highlight.js
cp bower_components/highlight/src/styles/* public/plugins/code_highlight/css

# install socket.io-stream client-side script
(
    echo "// @source: https://github.com/nkzawa/socket.io-stream/tree/$(sed -n 's/.*"version": "\(.*\)".*/\1/p' node_modules/socket.io-stream/package.json)"
    cat node_modules/socket.io-stream/socket.io-stream.js
) > public/js/socket.io-stream.min.js

# check installation
echo Installed:
ls -l public/js/jquery.* public/js/html5shiv.min.js public/plugins/code_highlight/highlight.js public/js/socket.io-stream.min.js

# minify scripts
for x in public/js/jquery.js public/plugins/code_highlight/highlight.js
do
    pushd $(dirname $x) > /dev/null
    y=$(basename $x)
    uglifyjs $y -c hoist_funs=false,loops=false,unused=false -m --comments '/^\!|@preserve|@license|@cc_on|@source|copyright/i' --source-map ${y/.js/.min.map} > ${y/.js/.min.js}
    popd > /dev/null
    echo "Minified $x: $(cat $x | wc -c) -> $(cat ${x/.js/.min.js} | wc -c)"
done

popd > /dev/null

