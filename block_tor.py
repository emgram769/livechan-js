#!/usr/bin/python
import requests
import pymongo
db = pymongo.MongoClient().livechan_db
col = db.user_dbs
ips = set(i.strip() for i in requests.get("https://check.torproject.org/cgi-bin/TorBulkExitList.py?ip=31.148.96.156&port=443").text.splitlines() if not i.startswith('#'))
for i in ips:
    col.delete_many({'ip':i})
    col.insert_one({'ip': i, 'banned_rooms':['int']})


