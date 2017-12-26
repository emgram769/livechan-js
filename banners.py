#!/usr/bin/python
import os

names = [f for f in os.listdir('public/images/banners/') if f.endswith('png') or f.endswith('jpg')]

data = open('public/js/main.js').read()
newdata = data.split('// set up banners')[0]
newdata += "\n// set up banners\n"
newdata += "var banners = " + repr(names) + ';'
newdata += "\n// end of banners\n"
newdata += data.split('// end of banners')[1]
open('public/js/main.js', 'w').write(newdata)

