LiveChan
====


LiveChan is a live IRC like image board. 

It is written in Node.js and currently being hosted on Heroku.

Please donate bitcoin for server costs!
1Eeq6AzfxtpV4KJnTGKDCcPCJy7oDRCdQr

Installation
====

Requirements:
- git
- node.js
- NPM
- MongoDB
- GraphicsMagick

This commands below are based on a Ubuntu Server 12.04 installation, other distros will vary.

1) Install git
> sudo apt-get install git

2) Install node.js and NPM, a guide is available at https://www.digitalocean.com/community/articles/how-to-install-an-upstream-version-of-node-js-on-ubuntu-12-04

3) Install MongoDB, guides are at http://docs.mongodb.org/manual/installation/

4) Install GraphicsMagick or ImageMagick

> sudo apt-get install graphicsmagick

5) Clone the git repo

> git clone https://github.com/emgram769/live4chan.git

6) Install the dependencies with npm install

> cd live4chan; npm install

7) Make sure the public/tmp/uploads folder is writable

> mkdir public; mkdir public/tmp; mkdir public/tmp/uploads; chmod 777 public/tmp/uploads

8) Run LiveChan

> node web.js

Relevant links
====
Live instance: http://livechan.net

Contribute suggestions: https://code.stypi.com/emgram/LiveChan

If you'd like to contribute code simply send a pull request.
