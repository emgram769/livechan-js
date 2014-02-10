LiveChan
====


LiveChan is a live IRC like image board written in node.js.

Please donate bitcoin for server costs!
1Eeq6AzfxtpV4KJnTGKDCcPCJy7oDRCdQr

Installation
====

Requirements:
- [git](http://git-scm.com/)
- [node.js](http://nodejs.org/)
- [NPM](https://npmjs.org/)
- [MongoDB](http://www.mongodb.org/)
- [ImageMagick](http://imagemagick.org/script/index.php)
- cairo and other [canvas dependencies](https://github.com/LearnBoost/node-canvas/wiki/_pages) (needed for the [captcha](https://npmjs.org/package/captcha) module)
- [FFmpeg](https://ffmpeg.org/) (if audio/video support desired)

The commands below are based on a Debian installation, other distros / operating systems will vary.

1) Install git:
> sudo apt-get install git

2) Install node.js and NPM:
> sudo apt-get install nodejs npm

If your binary is named "nodejs" rather than "node", you may need to create a symlink to make certain installation scripts work:
> sudo ln -s /usr/bin/nodejs /usr/local/bin/node

3) Install MongoDB:
> sudo apt-get install mongodb

4) Install ImageMagick:
> sudo apt-get install imagemagick

5) Install the dependencies of the canvas module:
> sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++

6) Install FFmpeg. See instructions at [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html).

Add the sources from [http://www.deb-multimedia.org/](http://www.deb-multimedia.org/) to your /etc/apt/sources.list and do:
> sudo apt-get update
> sudo apt-get install deb-multimedia-keyring
> sudo apt-get update
> sudo apt-get install ffmpeg

Alternately you can download a static build from [http://ffmpeg.gusari.org/static/](http://ffmpeg.gusari.org/static/) and copy the extracted binaries to /usr/local/bin:
> sudo cp ffmpeg ffprobe /usr/local/bin

Note that many distributions come with Libav in place of FFmpeg. FFmpeg is recommended. Using Libav instead should be possible, but will require appropriate changes to [format-image.js](https://github.com/emgram769/live4chan/blob/master/lib/utils/format-image.js) and [generate-thumbnail.js](https://github.com/emgram769/live4chan/blob/master/lib/utils/generate-thumbnail.js) in lib/utils.

If you do not want audio/video support, you should edit your [config.js](https://github.com/emgram769/live4chan/blob/master/config.js) so that video_formats and audio_formats are both empty arrays.

7) Clone the git repo
> git clone https://github.com/emgram769/live4chan.git

8) Install the dependencies with npm install
> cd live4chan; npm install

9) Restore the changes to the captcha module which were overwritten by npm install:
> git checkout node_modules/captcha/captcha.js

10) Make sure the public/tmp/uploads and public/tmp/thumb folders are writable
> chmod 777 public/tmp/uploads public/tmp/thumb

11) Run LiveChan
> node lib/index.js

Nginx proxy config
====
Requires nginx 1.3+:

```nginx
# the IP(s) on which your node server is running. I chose port 8083.
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
}
```

Relevant links
====
Live instance: http://livechan.net

Contribute suggestions: https://code.stypi.com/emgram/LiveChan

If you'd like to contribute code simply send a pull request.
