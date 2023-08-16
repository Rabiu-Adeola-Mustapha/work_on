#!/bin/bash

TIMESTAMP=`date +%Y%m%d-%H%M%S`
BACKUPNAME="dump-$TIMESTAMP"

docker exec mongo mongodump --uri="mongodb://api:paSs!!2827@localhost:27017/admin" --gzip --archive=/data/mongo-dump/$BACKUPNAME.tar.gz


find /home/admin/docker/data/mongo-dump/* -mtime +20 -exec rm -f {} \;
