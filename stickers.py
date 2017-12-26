#!/usr/bin/python
import os

names = [os.path.splitext(f)[0] for f in os.listdir('public/images/stickers/') if f.endswith('png')]

data = open('public/js/stickers.js').read()
newdata = "var stickers = " + repr(names) + ';'
newdata += "\n// end of stickers\n"
newdata += data.split('// end of stickers')[1]
open('public/js/stickers.js', 'w').write(newdata)

