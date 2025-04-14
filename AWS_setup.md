*DynamoDB tables and their uses:*

Resources:
Stored all data deliverables (such as images and videos) except for geotiff files

Current contents:
ResourceId (String)
	
BookingId
	
ContentType
	
CreatedAt
	
FileName
	
IsImage
	
ResourceUrl
	
S3Path
	
Size
	
Type
	
UpdatedAt

ResourceId (String)
	
BookingId
	
ContentType
	
CreatedAt
	
FileName
	
IsImage
	
ResourceUrl
	
S3Path
	
Size
	
Type
	
UpdatedAt

file_1744549904256_9ee560f2
booking_1744201462869_417
image/jpeg
2025-04-13T13:11:44.256373
DJI_0245.JPG
true
https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/DJI_0245.JPG?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE34KUDEH6W%2F20250413%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250413T131144Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3J ...
booking_1744201462869_417/DJI_0245.JPG
3433033
file
2025-04-13T13:11:44.256373


GeoTiffChunks:
stores the chunked geotiff files as well as the corresponding geotiff which has been reassembled with information and link to the S3 bucket

Current contents:
bookingId (String)
	
chunkId (String)
	
chunkIndex
	
chunksUploaded
	
completedAt
	
errorMessage
	
failedAt
	
fileName
	
finalResourceId
	
isChunk
	
isManifest
	
key
	
lastUpdated
	
manifestKey
	
originalFileName
	
reassembledUrl
	
sessionId
	
status
	
totalChunks
	
uploadedAt

bookingId (String)
	
chunkId (String)
	
chunkIndex
	
chunksUploaded
	
completedAt
	
errorMessage
	
failedAt
	
fileName
	
finalResourceId
	
isChunk
	
isManifest
	
key
	
lastUpdated
	
manifestKey
	
originalFileName
	
reassembledUrl
	
sessionId
	
status
	
totalChunks
	
uploadedAt

booking_1744201462869_417
1744575743481_0
0
test-GeoTiff.tif.part0
true
false
booking_1744201462869_417/test-GeoTiff.tif.part0
test-GeoTiff.tif
1744575743481
4
1744575749
booking_1744201462869_417
1744575743481_1
1
test-GeoTiff.tif.part1
true
false
booking_1744201462869_417/test-GeoTiff.tif.part1
test-GeoTiff.tif
1744575743481
4
1744575751
booking_1744201462869_417
1744575743481_2
2
test-GeoTiff.tif.part2
true
false
booking_1744201462869_417/test-GeoTiff.tif.part2
test-GeoTiff.tif
1744575743481
4
1744575752
booking_1744201462869_417
1744575743481_3
3
test-GeoTiff.tif.part3
true
false
booking_1744201462869_417/test-GeoTiff.tif.part3
test-GeoTiff.tif
1744575743481
4
1744575754
booking_1744201462869_417
1744575743481_manifest
1744575757
No valid chunks found for session 1744575743481
1744575748
geotiff_1744575755_2845bcbf
https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744575755_2845bcbf_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE34L5LDZLX%2F20250413%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250413T202237Z&X-Amz-Expires=1209600&X-Amz- ...
completed
booking_1744201462869_417
1744575746321_0
0
test-GeoTiff_manifest.json
false
true
booking_1744201462869_417/test-GeoTiff_manifest.json
test-GeoTiff_manifest.json
1744575746321
1
1744575746
booking_1744201462869_417
1744575746321_manifest
0
f68ebab6-20ec-48bc-8099-e54f05ab938b
1744575746
booking_1744201462869_417/test-GeoTiff_manifest.json
test-GeoTiff_manifest.json
1744575746321
pending
1


Users:
user info

Bookings:
bookings info

Assets:
asset info

Companies:
list of all companies

*S3 bucket*

/pilotforce-resources/{BookingId}

current contents:
Name
	
Type
	
Last modified
	
Size
	
Storage class

Name
	
Type
	
Last modified
	
Size
	
Storage class

DJI_0245.JPG
JPG
April 13, 2025, 14:11:45 (UTC+01:00)
3.3 MB
Standard
test-GeoTiff_manifest.json
json
April 13, 2025, 21:22:27 (UTC+01:00)
747.0 B
Standard
test-GeoTiff.tif.part0
part0
April 13, 2025, 21:22:30 (UTC+01:00)
4.0 MB
Standard
test-GeoTiff.tif.part1
part1
April 13, 2025, 21:22:31 (UTC+01:00)
4.0 MB
Standard
test-GeoTiff.tif.part2
part2
April 13, 2025, 21:22:33 (UTC+01:00)
4.0 MB
Standard
test-GeoTiff.tif.part3
part3
April 13, 2025, 21:22:35 (UTC+01:00)
3.9 MB
Standard
reassembled_geotiff_1744575755_2845bcbf_test-GeoTiff.tif
tif
April 13, 2025, 21:22:37 (UTC+01:00)
15.9 MB
Standard