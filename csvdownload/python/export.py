# Name:         export.py
# Author:       Heinrich Löwen
# Version:      1.0
# Description:  ...
# Set up environment:
#   - pip install boto3
#   - create credentials file ~/.aws/credentials:
#       [default]
#       aws_access_key_id = YOUR_ACCESS_KEY
#       aws_secret_access_key = YOUR_SECRET_KEY
#   - create config file ~/.aws/config:
#       [default]
#       region=us-east-1

import boto3
import time
import calendar
import simplejson
import json
import csv
import gzip
import os

# init Global variables
s3 = boto3.resource('s3')
# Data Bucket
bucket_name = 'argotraq-data'
key_delimiter = 'us-east-1:e65610fc-84a3-4ff4-9381-6a029f30ef14'
meta_delimiter = 'meta'
bucket_exists = False
# CSVGZ Bucket
new_bucket_name = 'argotraq-csv'
new_bucket_exists = False
# Check if Buckets exists
for entries in s3.buckets.all():
    if (entries.name == bucket_name):
        bucket_exists = True
        print "bucket exists",bucket_name
bucket = s3.Bucket(bucket_name)

for entries in s3.buckets.all():
    if (entries.name == new_bucket_name):
        new_bucket_exists = True
        print "bucket exists",new_bucket_name

#if not (new_bucket_exists):
    # create new bucket
    # s3.create_bucket(Bucket=new_bucket_name)
new_bucket = s3.Bucket(new_bucket_name)
# Existing CSV data
csvobject = {}
# Existing data
objects = {}

def timeToMillis(t):
    return calendar.timegm(t)*1000

def millisToTime(t):
    return time.gmtime(int(t)/1000)

def timeToDate(t):
    return time.strftime('%Y-%m-%d',t)

def dateToTime(t):
    return time.strptime(t,'%Y-%m-%d')

def timeToIsotime(t):
    return time.strftime('%Y-%m-%dT%H:%M:%SZ',t)

def isotimeToTime(t):
    return time.strptime(t,'%Y-%m-%dT%H:%M:%SZ')

def millisToDate(t):
    strunc = millisToTime(t)
    return timeToDate(strunc)

def dateToMillis(t):
    strunc = dateToTime(t)
    return timeToMillis(strunc)

def todayMillis():
    return dateToMillis(millisToDate(timeToMillis(time.gmtime())))

def checkExistingObjects():
    """TODO: Check existing objects and don't load and upload them again.

    """

def createNewObjects():
    """Load existing objects and save them into on dictionary.
    Distinguist between devices and days.
    Takes approx. 6minutes depending on network connection.
    
    """
    print "createNewObjects"
    before = timeToMillis(time.gmtime())
    # Iterate through bucket: create dictionaries for devices
    for obj in bucket.objects.filter(Prefix=key_delimiter+'/'+meta_delimiter):
        key = obj.key.split('/')
        timemillis = key[1].split('-')[0]
        deviceid = key[1].split('-')[1]
        if (timemillis == meta_delimiter):
            #print obj.key
            objects[deviceid] = {}
    print "meta created"
    
    # Iterate through bucket: create in devices arrays for each day
    for obj in bucket.objects.filter(Prefix=key_delimiter):
        key = obj.key.split('/')
        timemillis = key[1].split('-')[0]
        deviceid = key[1].split('-')[1]
        if not(timemillis == meta_delimiter):
            if (int(timemillis) < int(todayMillis())):
                day = millisToDate(int(timemillis))
                #print day
                if not day in objects[deviceid]:
                    objects[deviceid][day] = []
                    #print "new day", day
                    #print simplejson.loads(obj.get()['Body'].read())
    print "days created"
    
    # Iterate through bucket and dump data into dictionary > array
    for obj in bucket.objects.filter(Prefix=key_delimiter):
        key = obj.key.split('/')
        timemillis = key[1].split('-')[0]
        deviceid = key[1].split('-')[1]
        if not(timemillis == meta_delimiter):
            if (int(timemillis) < int(todayMillis())):
                day = millisToDate(int(timemillis))
                tmp = {}
                tmp['deviceid'] = deviceid
                tmp['timemillis'] = timemillis
                tmp.update(simplejson.loads(obj.get()['Body'].read()))
                objects[deviceid][day].append(tmp)
                #delete object
                #obj.delete()

    after = timeToMillis(time.gmtime())
    print (after-before)/1000

    print objects

def loadLocalObjects():
    """Function to use if objects dictionary was saved to local filesystem.
    Alter this function with createNewObjects().
    
    """
    objectsfile = open('s3objects.json')
    global objects
    objects = json.load(objectsfile)

def createCSVFiles():
    """Create single csv files from objects dictionary on filesystem.
    Open the file again and upload to s3.
    
    """
    for devkey in objects.keys():
        print devkey
        for daykey in objects[devkey].keys():
            csvfile = []
            csvfile.append(['maxZ','maxAcceleration','timeStamp','minZ','deviceid','lat','lng','timemillis','minAcceleration'])
            for entry in objects[devkey][daykey]:
                row = []
                for key,value in entry.iteritems():
                    row.append(value)
                csvfile.append(row)
            # save compressed files
            filename = devkey+'/'+str(dateToMillis(daykey))
            if not os.path.exists('csvs/'+devkey):
                os.makedirs('csvs/'+devkey)
            outcsvstring = ''
            for item in csvfile:
                outcsvstring += ','.join([str(x) for x in item])
                outcsvstring += '\n'
            zip_out = gzip.open('csvs/'+filename+'.csv.gz','wb')
            zip_out.write(outcsvstring)
            zip_out.close()
            # upload file to s3
            uploadfile = open('csvs/'+filename+".csv.gz",'r')
            s3.Bucket(new_bucket_name).put_object(Key=filename, Body=uploadfile)

def listUploadedFiles():
    for obj in new_bucket.objects.all():
        #print obj.get()['Body'].read()
        print obj.key

def deleteProcessedFiles():
    # TODO
    print 'delete processes files'
    
def main():
    #checkExistingObjects()
    #createNewObjects()
    loadLocalObjects()
    createCSVFiles()
    listUploadedFiles()
    
if __name__ == "__main__":
   main()
