LiveChan
====


LiveChan is a live IRC like image board written in node.js.

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

Nginx proxy config
====
Requires nginx 1.3+:

```# the IP(s) on which your node server is running. I chose port 3000.
upstream app_livechan {
    server 127.0.0.1:8083;
}

# the nginx server instance
server {
    listen 0.0.0.0:80;
    server_name livechan.net;
    access_log /var/log/nginx/livechan.log;

    # pass the request to the node.js server with the correct headers and much more can be added, see nginx config options
    location / {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $http_host;
      proxy_set_header X-NginX-Proxy true;

      proxy_pass http://app_livechan/;
      proxy_redirect off;
    }
}```

Relevant links
====
Live instance: http://livechan.net

Contribute suggestions: https://code.stypi.com/emgram/LiveChan

If you'd like to contribute code simply send a pull request.
