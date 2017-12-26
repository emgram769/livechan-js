#!/usr/bin/python
import os
from tripcode import tripcode

scr = open('public/js/chat.js').read()

files = [l.rsplit('"',2)[1] for l in scr.splitlines() if l.startswith('flags_image_table')]

new_files = set(os.listdir('public/icons/tripflags'))-set(files)

new_code = ''

for f in new_files:
    trip = tripcode(f.split('.')[0])
    new_code += '// %s\n' % f.split('.')[0]
    new_code += 'flags_image_table["!%s"] = "%s";\n' % (trip, f)
    new_code += 'flags_hover_strings["!%s"] = "%s";\n' % (trip, f.split('.')[0])

print new_code

new_scr = scr.replace('//  Table of tripflags', '//  Table of tripflags\n%s' % new_code)

open('public/js/chat.js', 'w').write(new_scr)

