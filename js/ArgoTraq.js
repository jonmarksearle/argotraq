// AWS variables start
var s3;
var s3Data;
var s3Bucket = 'argotraq-data';
var s3CSVBucket = 'argotraq-csv';

var cognitoIDList = ['us-east-1:0035d5b5-607e-483a-96b7-331a597b44c0',
                     'us-east-1:9d8c5740-8fe4-471a-b112-8cd29ec3c684',
                     'us-east-1:e65610fc-84a3-4ff4-9381-6a029f30ef14'];

var cognitoID = $('#cognitoIDPicker').val();

var amazonAccID = '940653267411'; //  AWS account ID
var identityPoolID = 'us-east-1:d2737579-aaee-49c1-95c7-d78c0dd164ff';
var roleArnAuth = 'arn:aws:iam::940653267411:role/Cognito_ArgoTraqAuth_Role';
var roleArnUnAuth = 'arn:aws:iam::940653267411:role/Cognito_ArgoTraqUnauth_Role';

// Map build and display variables..
var lat;
var lng;
var googleMap;
var oMapDetail;
var theMetaLoader = new MetaLoader();
var theMapAddresses = null;
var theMapAddressesTemp = null;
var callLogin = true;
var googleEmail;

// Leaflet variables
var geoJsonDevices = [];
var geoJsonTrajectories = [];
var geoJsonLayer;
var deviceIds = [];
//var hours24 = 86400000;
var displayedLastHours;
var displayedTimePoint = new Date();
var hoursToMillis = 3600000;
var initialRun = true;
var retrievingData = false;
// BBOX
var minLat;
var minLng;
var maxLat;
var maxLng;

//
// Setup Leaflet Map
//

/* Setup map view */
var map = L.map('map').setView([-37.813611, 144.963056], 10)


/* Add an Map tile layer. */
L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
	maxZoom: 25,
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
		'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
		'Imagery © <a href="http://mapbox.com">Mapbox</a>',
	id: 'examples.map-i875mjb7'
}).addTo(map);

function onEachFeature(feature, layer) {
	// does this feature have a property named popupContent?
	if (feature.properties && feature.properties.popupContent) {
		layer.bindPopup(feature.properties.popupContent);
	}
}

// var testline = {
// 	'type': 'Feature',
// 	'properties': {
// 		'deviceId': "123123123"
// 	},
// 	'geometry': {
// 		'type': 'LineString',
// 		'coordinates': [[145.1044412, -38.0301353, "asdf"], [145, -38, "asdf"]],
// 		'time': ["asdf", "asdf"]
// 	}
// }

// L.geoJson(testline).addTo(map);

//
// Google Authorise First Go Start
// use for unauthorising: https://www.google.com/accounts/b/0/IssuedAuthSubTokens
//

// Enter a client ID for a web application from the Google Developer Console.
// The provided clientId will only work if the sample is run directly from
// https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
// In your Developer Console project, add a JavaScript origin that corresponds to the domain
// where you will be running the script.
// See for more infos: https://developers.google.com/identity/sign-in/web/devconsole-project
// Google Developer Console > APIs & Auth > Credentials > Create new Client ID > Set project name 
// > Webapplication > add domains for JavaScript origin
var clientId = '172839613700-v19ncih23a5f5odibu9oeb2el0o68mrn.apps.googleusercontent.com';

// Enter the API key from the Google Develoepr Console - to handle any unauthenticated
// requests in the code.
// The provided key works for this sample only when run from
// https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
// To use in your own application, replace this API key with your own.
var apiKey = 'AIzaSyDaT6jJ8Ag4vySXO8OztG5V0Q9GWVRJhbA';

// To enter one or more authentication scopes, refer to the documentation for the API.
var scopes = 'https://www.googleapis.com/auth/plus.login';

// unnecessary to save googleToken and authResponse to var. Can be accessed through gapi.auth.getToken()
//var googleToken;
//var authResponse;


//
// config for Google Authorised login start..
//

function HandleGoogleLogin() {
	gapi.client.setApiKey(apiKey);
	window.setTimeout(checkAuth, 1);
}

function checkAuth() {
	gapi.auth.authorize({
		client_id: clientId,
		scope: scopes,
		immediate: true
	}, handleAuthResult);
}

function handleAuthResult(authResult) {
	//  alert("inside handle auth result");
	// unnecessary to save googleToken and authResponse to var. Can be accessed through gapi.auth.getToken()
	//googleToken = authResult.access_token;
	//authResponse = authResult;
	console.log(gapi.auth.getToken());

	var authorizeButton = document.getElementById('acrSignIn');

	if (authResult && !authResult.error) {
		console.log("google already authorized");
		authorizeButton.style.visibility = 'hidden';
		makeApiCall();
		HandleAmazonAuth();
	}
	else {
		console.log("google not jet authorized");
		authorizeButton.style.visibility = '';
		authorizeButton.onclick = handleAuthClick;
		// handle authorization direcly by calling handleAuthClick function
		var evnt = authorizeButton["onclick"];
		// Why is it true default?
		callLogin = true;
		evnt.call(authorizeButton);
	}
} // handleAuthResult

// Authorization
function handleAuthClick(event) {
	var authorizeButton = document.getElementById("acrSignIn");

	gapi.auth.authorize({
		client_id: clientId,
		scope: scopes,
		immediate: false
	}, handleAuthResult2);
	return false;
}

// Load the API and make an API call.  Display the results on the screen.
function makeApiCall() {
	gapi.client.load('plus', 'v1').then(function() {
		var request = gapi.client.plus.people.get({
			'userId': 'me'
		});

		request.execute(function(resp) {
			var heading = document.createElement('h4');
			var image = document.createElement('img');

			image.src = resp.image.url;
			heading.appendChild(image);
			heading.appendChild(document.createTextNode(resp.displayName));
			try {
				googleEmail = resp.emails[0].value;
			}
			catch (err) {
				googleEmail = "unknown";
			}
			document.getElementById('content').appendChild(heading);

			document.getElementById("divLoadingMsg").innerHTML = "Page State: User Logged In, Awaiting Selection.."
			var docEl;
			docEl = document.getElementById("msgSignIn");
			docEl.innerHTML = resp.displayName + " is now signed in...";
		});
	});
} // makeApiCall


function HandleGoogleLogin2() {
	console.log("anonymous");
	gapi.client.setApiKey(apiKey);
	window.setTimeout(checkAuth2, 1);
	console.log("call login 2..");
}

function checkAuth2() {
	gapi.auth.authorize({
		client_id: clientId,
		scope: scopes,
		immediate: true
	}, handleAuthResult2);
}

function handleAuthResult2(authResult) {
	console.log("unauth handle result");
	// unnecessary to save googleToken and authResponse to var. Can be accessed through gapi.auth.getToken()
	//googleToken = authResult.access_token;
	//console.log(gapi.auth.getToken().access_token);
	//authResponse = authResult;
	//console.log(gapi.auth.getToken());

	// no API call because not authorized. What to do?
	if (authResult && !authResult.error) {
		console.log("google authenticated already before");
		makeApiCall();
		HandleAmazonAuth();
	}
	else {
		console.log("google not authorized");
		HandleAmazonUnauth();
	}
}

function UnauthLogin() {
	console.log("unauth login");
	HandleAmazonUnauth();
	var heading = document.createElement('h4');

	heading.appendChild(document.createTextNode("Unauthenticated user"));

	document.getElementById('content').appendChild(heading);
	document.getElementById("acrSignIn").style.display = "none";
	document.getElementById("acrBypassSignIn").style.display = "none";
	document.getElementById("btnTrackingOn").disabled = false;
	document.getElementById("btnUploadLocate").disabled = false;
	googleEmail = "unknown";
	document.getElementById("divLoadingMsg").innerHTML = "Page State: Unauthenticated login, Awaiting Selection.."
	var docEl;
	docEl = document.getElementById("msgSignIn");
	docEl.innerHTML = "Unauthenticated user" + " has now signed in...";

} // UnauthLogin

//
// config for Amazon Authenticated login start..
//

function HandleAmazonAuth() {
	console.log("amazon auth");
	console.log(gapi.auth.getToken());

	var params = {
		IdentityPoolId: identityPoolID,
		Logins: {
			'accounts.google.com': gapi.auth.getToken().access_token
		}
	};

	// set the Amazon Cognito region
	AWS.config.region = 'us-east-1';
	// initialize the Credentials object with our parameters
	AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

	AWS.config.credentials.get(function(err) {
		if (err) {
			console.log(err);
		}
		else {
			console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
		}
	});

	// var cred = new AWS.CognitoIdentityCredentials({
	// 	IdentityPoolId: identityPoolID,
	// 	Logins: {
	// 		'accounts.google.com': gapi.auth.getToken().access_token
	// 	},
	// });

	// AWS.config.update({
	// 	region: 'us-east-1',
	// 	credentials: cred
	// });

	// AWS.config.credentials.get(function(err) {
	// 	if (!err)
	// 		console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
	// 	else
	// 		console.log(err);
	// });

	// s3 = new AWS.S3( /*options = {region: 'ap-southeast-2'}*/ );
	// console.log(s3);

	// console.log(s3);
} // HandleAmazonAuth

//
// config for Amazon Unauthenticated login start..
//

function HandleAmazonUnauth() {
	console.log("amazon unauth");

	var cred = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: identityPoolID,
	});

	AWS.config.update({
		region: 'us-east-1',
		credentials: cred
	});

	AWS.config.credentials.get(function(err) {
		if (!err)
			console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
		else
			console.log(err);
	});

	// AWS.config.apiVersions = {
	// 	s3: '2006-03-01',
	// 	// other service API versions
	// };

	HandleS3MetaData();
} // HandleAmazonUnauth

$('#timeslider').val(24);
updateSliderInput($('#timeslider').val());
$('#datepicker').val(getDateYMD(new Date()));
$('#datepicker').attr('min', getDateYMD(new Date(1)));
$('#datepicker').attr('max', getDateYMD(new Date()));
$('#timepicker').val(getTimeHM(new Date()));
updateDateTimeInput();

function HandleS3MetaData() {
	if (!initialRun) {
		console.log("not initial run: clean layers!")
		geoJsonLayer.clearLayers();
		deviceIds = [];
		geoJsonDevices = [];
		geoJsonTrajectories = [];
		console.log("display data with new properties");
	};

	initialRun = false;

	IndicateRetrevingData();

	s3 = new AWS.S3();
	console.log(s3);

	s3.listObjects({
		Bucket: 'argotraq-data',
		Prefix: cognitoID + '/meta'
	}, function(err, data) {
		if (err) console.log(err);
		else {
			console.log(data);
			showMetaObjects(data);
		}
	});

} // HandleS3MetaData

function showMetaObjects(data) {
	//var geoJsonDevices = [];
	var counterDevices = data.Contents.length;
	for (var i = 0; i < data.Contents.length; i++) {
		s3.getObject({
			Bucket: s3Bucket,
			Key: data.Contents[i].Key,
		}, function(err, data) {
			if (err) console.log(err);
			else {
				console.log(data);
				var geoEntry = {
					'type': 'Feature',
					'properties': {},
					'geometry': {
						'type': 'Point',
					}
				};
				var entry = Uint8ArrayToObject(data.Body);
				//console.log(entry);
				geoEntry.properties['LastModified'] = data.LastModified;
				geoEntry.properties['deviceId'] = entry.deviceId;
				geoEntry.properties['deviceModel'] = entry.deviceModel;
				geoEntry.geometry['coordinates'] = [entry.lastObject.lng, entry.lastObject.lat];
				geoEntry.properties['popupContent'] = '<p>' +
					'<b>deviceId: </b>' + entry.deviceId +
					'<br><b>LastModified: </b>' + data.LastModified +
					'<br><b>deviceModel: </b>' + entry.deviceModel +
					'<br><b>Longitude: </b>' + entry.lastObject.lng +
					'<br><b>Latitude</b>' + entry.lastObject.lat +
					'</p>';
				//console.log(geoEntry);
				geoJsonDevices.push(geoEntry);
				// count callbacks. Continue after last callback
				counterDevices = counterDevices - 1;
				if (counterDevices == 0) {
					//console.log(counterDevices);
					HandleS3Data();
				};
			};

		});
	}

} // showMetaObjects

function setBounds(devs) {
	minLat = 90;
	minLng = 180;
	maxLat = -90;
	maxLng = -180;
	//find minLat, maxLat, minLng, maxLng
	for (var i = 0; i < devs.length; i++) {
		lng = devs[i].geometry.coordinates[0];
		lat = devs[i].geometry.coordinates[1];
		if (lng <= minLng) minLng = lng;
		if (lng >= maxLng) maxLng = lng;
		if (lat <= minLat) minLat = lat;
		if (lat >= maxLat) maxLat = lat;
	}
	if (maxLng-minLng < 0.05) {
		maxLng += 0.025
		minLng -= 0.025
	}
	
	if (maxLat-minLat < 0.05) {
		maxLat += 0.025
		minLat -= 0.025
	}
	
	
	console.log("BBOX: " + minLng + " " + maxLng + " " + minLat + " " + maxLat);

	var southWest = new L.LatLng(maxLat, minLng),
		northEast = new L.LatLng(minLat, maxLng),
		bounds = new L.LatLngBounds(southWest, northEast);

	// 2/3
	//var mapWidth = document.getElementById('map').offsetWidth;
	//var mapHeight = document.getElementById('map').offsetHeight;
	//map.fitBounds(bounds, {padding: [mapHeight*(1/6), mapWidth*(1/6)]});

	map.fitBounds(bounds, {
		padding: [50, 50]
	});
} // setBounds

function HandleS3Data() {
	//show devices on Leaflet map
	console.log("show devices");
	console.log(geoJsonDevices);
	setBounds(geoJsonDevices);
	geoJsonLayer = L.geoJson(geoJsonDevices, {
		onEachFeature: onEachFeature
	}).addTo(map);

	//fill deviceIds-array with the deviceIds
	for (var i = 0; i < geoJsonDevices.length; i++) {
		deviceIds.push(geoJsonDevices[i].properties['deviceId']);
	}
	console.log(deviceIds);
	console.log(deviceIds.indexOf(geoJsonDevices[0].properties['deviceId']))

	//prepare the geoJson Object with the deviceIds
	for (var j = 0; j < deviceIds.length; j++) {
		var lineFeature = {
			'type': 'Feature',
			'properties': {
				'deviceId': deviceIds[j],
				'popupContent': '<p><b>deviceId: </b>' + deviceIds[j] + '</p>'
			},
			'geometry': {
				'type': 'LineString',
				'coordinates': []
			}
		}
		geoJsonTrajectories.push(lineFeature);
	}
	console.log(geoJsonTrajectories);
	console.log(getApproxHours());

	if (displayedTimePoint.getTime() >= (new Date().getTime() - (24 * hoursToMillis))) {
		s3.listObjects({
			Bucket: s3Bucket,
			Prefix: cognitoID + '/' + getApproxHours(),
		}, function(err, data) {
			if (err) console.log(err);
			else {
				console.log(data);
				showDataTrajectoriesFromJson(data);
			}
		});
	}
	else {
		console.log('longer than 24 hours ago: use csv data');
		s3.listObjects({
			Bucket: s3CSVBucket,
			Prefix: cognitoID,
		}, function(err, data) {
			if (err) console.log(err);
			else {
				console.log(data);
				showDataTrajectoriesFromCsv(data);
			}
		})

	}
} //HandleS3Data

function showDataTrajectoriesFromCsv(inData) {
	var counterDataObjects = inData.Contents.length;
	var pickerBeginTime = displayedTimePoint.getTime() - displayedLastHours;
	var pickerEndTime = displayedTimePoint.getTime();
	//console.log(new Date(pickerBeginTime).getTime(), new Date(pickerEndTime).getTime());
	var deviceIndices = []
	if (counterDataObjects != 0) {
		for (var i = 0; i < inData.Contents.length; i++) {
			var key = inData.Contents[i].Key;
			console.log(key);
			var timeMillis = parseInt(key.split('/')[2]);
			//console.log(timeMillis);
			var deviceId = key.split('/')[1];
			console.log(deviceId);
			
			var csvBeginTime = timeMillis;
			var csvEndTime = timeMillis + (24 * hoursToMillis) - 60000;
			//console.log(new Date(csvBeginTime), new Date(csvEndTime));
			//console.log((csvBeginTime >= pickerBeginTime && csvBeginTime <= pickerEndTime), (csvEndTime >= pickerBeginTime && csvEndTime <= pickerEndTime), (pickerBeginTime >= csvBeginTime && pickerBeginTime <= csvEndTime), (pickerEndTime >= csvBeginTime && pickerEndTime <= csvEndTime));
			if (
				(csvBeginTime >= pickerBeginTime && csvBeginTime <= pickerEndTime) ||
				(csvEndTime >= pickerBeginTime && csvEndTime <= pickerEndTime) ||
				(pickerBeginTime >= csvBeginTime && pickerBeginTime <= csvEndTime) ||
				(pickerEndTime >= csvBeginTime && pickerEndTime <= csvEndTime)
			) {
				//TODO verarbeite CSV dateien hier
				var deviceIndex;
				for (var j = 0; j < geoJsonTrajectories.length; j++) {
					console.log(geoJsonTrajectories[j]);
					if (geoJsonTrajectories[j].properties.deviceId == deviceId) deviceIndex = j;
				}
				deviceIndices[i] = deviceIndex;
				console.log(deviceIndex);
				
				s3.getObject({
					Bucket: s3CSVBucket,
					Key: inData.Contents[i].Key,
					ResponseCacheControl: i.toString(),
					ResponseContentEncoding: 'gzip',
				}, function(err, data) {
					if (err) console.log(err);
					else {
						console.log(data);
						var csv = data.Body.toString().split('\n');
						//console.log(csv);
						// FIXME: Ordinals are used which might become a problem if 
						// TODO:
						// pos_lat = find 'lat' in csv[0]
						// pos_lng = find 'lng' in csv[0]
						// pos_tim = find 'timeStamp' in csv[0]
						//
						for (var j = 1; j < csv.length; j++) {
							var csvRow = csv[j].split(',');
							if (csvRow != '') {
								//console.log(csvRow);
								//console.log(new Date(csvRow[8]).getTime());
								if (new Date(csvRow[8]).getTime() >= pickerBeginTime && new Date(csvRow[8]).getTime() < pickerEndTime) {
									console.log(deviceIndices[data.CacheControl]);
									geoJsonTrajectories[deviceIndices[data.CacheControl]].geometry.coordinates.push([csvRow[1], csvRow[0], csvRow[8]])
								}
							}
						}
						counterDataObjects -= 1;
						if (counterDataObjects == 0) {
							console.log(counterDataObjects);
							console.log('if move on');
							HandleS3DataVisualization();
						};
					}
				})
			}
			else {
				counterDataObjects -= 1;
				if (counterDataObjects == 0) {
					console.log(counterDataObjects);
					console.log('else move on');
					HandleS3DataVisualization();
				};
			}
		}
	} else {
		HandleS3DataVisualization();
	}
} // showDataTrajectoriesFromCsv

function showDataTrajectoriesFromJson(inData) {
	// save total geoJson object
	//FIXME: error, because entries of geoJsonObj are created in callback 
	//TODO: preconfigure geoJsonObj with meta object points and then delete if-else-block

	var counterDataObjects = inData.Contents.length;
	console.log(counterDataObjects);
	var deviceIndices = []
	if (counterDataObjects != 0) {
		for (var i = 0; i < inData.Contents.length; i++) {
			var key = inData.Contents[i].Key.split('/')[1];
			//console.log(key);
			var timeMillis = key.split("-")[0];
			var deviceId = key.split("-")[1];
			//console.log(deviceId);
			// refine selection of exactly last 24 hours
			if ((Number(timeMillis) > (displayedTimePoint.getTime() - displayedLastHours)) && (Number(timeMillis) <= displayedTimePoint.getTime())) {
				//if ((Number(timeMillis) > (new Date().getTime() - (24*hoursToMillis)))) {
				// save coordinates of the objects to existing linestring
				// linestring needs to be ordered by timeStamp
				console.log(key);
				var deviceIndex;
				for (var j = 0; j < geoJsonTrajectories.length; j++) {
					//console.log(geoJsonObj[j]);
					if (geoJsonTrajectories[j].properties.deviceId == deviceId) deviceIndex = j;
				}
				deviceIndices[i] = deviceIndex;
				s3.getObject({
					Bucket: s3Bucket,
					Key: inData.Contents[i].Key,
					ResponseCacheControl: i.toString(),
				}, function(err, data) {
					if (err) console.log(err);
					else {
						//console.log(data);
						var entry = Uint8ArrayToObject(data.Body);
						// save coordinates to appropriate device
						geoJsonTrajectories[deviceIndices[data.CacheControl]].geometry.coordinates.push([entry.lng, entry.lat, entry.timeStamp])
						counterDataObjects -= 1;
						if (counterDataObjects == 0) {
							console.log(counterDataObjects);
							HandleS3DataVisualization();
						};
					}
				});
			}
			else {
				counterDataObjects -= 1;
			}
		}
	}
	else {
		HandleS3DataVisualization();
	}
} //showDataTrajectories

function HandleS3DataVisualization() {
	console.log("data visualization");
	console.log(geoJsonTrajectories);

	//sort the lineStrings by date
	for (var k = 0; k < geoJsonTrajectories.length; k++) {
		geoJsonTrajectories[k].geometry['coordinates'].sort(function(a, b) {
			return new Date(a[2]).getTime() - new Date(b[2]).getTime()
		});
	}
	//L.geoJson(geoJsonTrajectories).addTo(map);
	geoJsonLayer.addData(geoJsonTrajectories);
	IndicateIndicateDataRetreved();
} //HandleS3DataVisualization

function getApproxHours() {
	var currentTime = (displayedTimePoint.getTime()).toString();
	var pastTime = (displayedTimePoint.getTime() - displayedLastHours).toString();
	var timestring = "";
	var digitcounter = 0;
	var allequal = true;
	var timelength = currentTime.length;
	while (allequal) {
		if (currentTime[13 - timelength] == pastTime[13 - timelength]) {
			timestring += currentTime[13 - timelength]
			timelength -= 1;
		}
		else {
			allequal = false;
		}
	}
	return timestring;
} //getApproxHours

function getApprox24Hours() {
	var currentTime = (new Date().getTime()).toString();
	var pastTime = (new Date().getTime() - (24 * hoursToMillis)).toString();
	var timestring = "";
	var digitcounter = 0;
	var allequal = true;
	var timelength = currentTime.length;
	while (allequal) {
		if (currentTime[13 - timelength] == pastTime[13 - timelength]) {
			timestring += currentTime[13 - timelength]
			timelength -= 1;
		}
		else {
			allequal = false;
		}
	}
	return timestring;
}

function Uint8ArrayToObject(arr) {
	return JSON.parse(String.fromCharCode.apply(null, arr))
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}

//
// Timeslider and Datepicker
//

function updateSliderInput(val) {
	console.log('timeslider: ' + val);
	displayedLastHours = val * hoursToMillis;
}

function updateDateTimeInput() {
	displayedTimePoint = new Date($('#datepicker').val() + ' ' + $('#timepicker').val());
	console.log(displayedTimePoint);
}

function updateCognitoIDPicker() {
	cognitoID = $('#cognitoIDPicker').val();
	console.log(cognitoID);
}

function IndicateRetrevingData() { // Indicate that data is now being retreived
	retrievingData = true;
	$('#updateButton').attr('disabled', 'disabled');
	$("#divLoadingMsg").html("Retreving data from cloud ...");
}

function IndicateIndicateDataRetreved() { // Indicate that data has now been retreived
	retrievingData = false;
	$('#updateButton').removeAttr('disabled');
	$("#divLoadingMsg").html("");
}

function getDateYMD(val) {
	var dd = val.getDate();
	var mm = val.getMonth() + 1; //January is 0!

	var yyyy = val.getFullYear();
	if (dd < 10) {
		dd = '0' + dd
	}
	if (mm < 10) {
		mm = '0' + mm
	}
	return yyyy + "-" + mm + "-" + dd;
}

function getTimeHM(val) {
	var hh = val.getHours();
	var mm = val.getMinutes();

	if (hh < 10) {
		hh = '0' + hh
	}
	if (mm < 10) {
		mm = '0' + mm
	}
	return hh + ":" + mm;
}

function getTimeMillis() {
	var currTime = new Date;
	var hh = currTime.getHours() * 60 * 60 * 1000;
	var mm = currTime.getMinutes() * 60 * 1000;
	var ss = currTime.getSeconds() * 1000;
	console.log(hh + " " + mm + " " + ss);
	return hh + mm + ss;
}


//
// Main module for map build and render..
//

function MetaLoader() {
	this.cogIDDone = false;
	this.lastFileMarker = '';
	this.getCogIDCallPtr = null;
	this.checkCogIDFinPtr = null;
	this.getMetaDataCallPtr = null;
	this.checkMetaDataFinPtr = false;
	this.mapRefreshPtr = null;
	this.uploadDataPtr = null;
	this.elPtr = 0;
	this.metaDataDone = false;
	this.cogIDArray = new Array();
	this.metaArray = new Array();
	this.metaDataKeyArray = new Array();
	this.metaDataKeyBoolArray = new Array();
}

MetaLoader.prototype.reset = function() {
	this.cogIDDone = false;
	this.lastFileMarker = '';
	this.getCogIDCallPtr = null;
	this.checkCogIDFinPtr = null;
	this.getMetaDataCallPtr = null;
	this.uploadDataPtr = null;
	this.checkMetaDataFinPtr = false;
	this.elPtr = 0;
	this.metaDataDone = false;
	this.cogIDArray.length = 0;
	this.metaArray.length = 0;
	this.metaDataKeyArray.length = 0;
	this.metaDataKeyBoolArray.length = 0;
}

function GetLocations() {
	theMapAddresses = new Array();

	document.getElementById("divLoadingMsg").innerHTML = "Loading/Refreshing All Location Devices ..";;

	theMetaLoader.reset();
	theMetaLoader.getCogIDCallPtr = setInterval(getCogIDFunc, 3000);
	theMetaLoader.checkCogIDFinPtr = setInterval(checkCogIDFinFunc, 1000);
	theMetaLoader.mapRefreshPtr = setInterval(funcRefresh, 60000);
}

var funcRefresh = function() {
	var docEl = document.getElementById("divLoadingMsg");
	docEl.innerHTML = "Page State: Loading/Refreshing All Location Devices ..";

	var docEl = document.getElementById("cogUsers").style.display = "none";
	docEl.length = 0;

	theMetaLoader.reset();
	theMetaLoader.getCogIDCallPtr = setInterval(getCogIDFunc, 3000);
	theMetaLoader.checkCogIDFinPtr = setInterval(checkCogIDFinFunc, 1000);
}

var getCogIDFunc = function() {

	s3.listObjects({
		Bucket: s3Bucket,
		Marker: theMetaLoader.lastFileMarker
	}, function(error, data) {
		if (error) {
			console.log(error); // an error occurred
			theMetaLoader.cogIDDone = true;
			return;
		}

		if (data.Contents.length == 0) {
			theMetaLoader.cogIDDone = true;
			return;
		}

		var endPos = data.Contents[0].Key.indexOf("/");
		var subStr;

		if (endPos >= 0) {
			subStr = data.Contents[0].Key.substr(0, endPos);
			if (theMetaLoader.cogIDArray.indexOf(subStr) < 0)
				theMetaLoader.cogIDArray.push(subStr);
		}

		theMetaLoader.lastFileMarker = subStr + "/~";
	});

}


var checkCogIDFinFunc = function() {

	if (theMetaLoader.cogIDDone) {
		clearInterval(theMetaLoader.getCogIDCallPtr);
		GetMetaFiles();
	}

}


function GetMetaFiles() {
	var docEl = document.getElementById("cogUserSel");
	docEl.style.display = "block";
	for (var i = 0; i < theMetaLoader.cogIDArray.length; i++)
		docEl[docEl.length] = new Option(theMetaLoader.cogIDArray[i].substr(0, 20) + "...");

	docEl = document.getElementById("divLoadingMsg");

	if (theMetaLoader.cogIDArray.length == 0) {
		docEl.innerHTML = "Page State: No cognito users found, no device tracking info to show..";
		return;
	}

	docEl.innerHTML = "Page State: Cognito users loaded, now loading tracking data..";
	document.getElementById("cogUsers").style.display = "block";
	document.getElementById("msgInfoList").innerHTML = "All Users (AWS cognito IDs):";

	for (var i = 0; i < theMetaLoader.cogIDArray.length; i++)
		theMetaLoader.metaDataKeyBoolArray.push(false);

	clearInterval(theMetaLoader.checkCogIDFinPtr);

	theMetaLoader.lastFileMarker = theMetaLoader.cogIDArray[0] + "/meta-";
	theMetaLoader.elPtr = 0;

	theMetaLoader.getMetaDataCallPtr = setInterval(getMetaDataFunc, 3000);
	theMetaLoader.checkMetaDataFinPtr = setInterval(checkMetaDataFinFunc, 1000);
}

var getMetaDataFunc = function() {
	var endPos = theMetaLoader.lastFileMarker.indexOf("/meta-");
	var metaKey;
	var metaIndex;

	if (endPos >= 0) {
		metaKey = theMetaLoader.lastFileMarker.substr(0, endPos);
		metaIndex = theMetaLoader.cogIDArray.indexOf(metaKey)

		if (metaIndex >= 0) {
			console.log("setting meta index el to true: " + metaIndex);
			theMetaLoader.metaDataKeyBoolArray[metaIndex] = true;
		}
	}

	s3.listObjects({
		Bucket: s3Bucket,
		Prefix: theMetaLoader.lastFileMarker
	}, function(error, data) {
		if (error) {
			console.log(error); // an error occurred
			theMetaLoader.metaDataDone = true;
			return;
		}

		for (var i = 0; i < data.Contents.length; i++)
			theMetaLoader.metaDataKeyArray.push(data.Contents[i].Key);

		var falseFound = false;

		for (var i = 0; i < theMetaLoader.metaDataKeyBoolArray.length; i++)
			if (theMetaLoader.metaDataKeyBoolArray[i] == false)
				falseFound = true;

		if (!falseFound) {
			theMetaLoader.metaDataDone = true;
			return;
		}

		theMetaLoader.elPtr++;
		theMetaLoader.lastFileMarker = theMetaLoader.cogIDArray[theMetaLoader.elPtr] + "/meta-";
	});

}

var checkMetaDataFinFunc = function() {
	if (theMetaLoader.metaDataDone) {
		clearInterval(theMetaLoader.getMetaDataCallPtr);
		LoadDeviceData();
	}
}

function LoadDeviceData() {
	clearInterval(theMetaLoader.checkMetaDataFinPtr);
	docEl = document.getElementById("divLoadingMsg");

	if (theMetaLoader.metaDataKeyArray.length == 0) {
		docEl.innerHTML = "Page State: No recent tracking device data found, no device tracking info to show..";
		return;
	}

	docEl.innerHTML = "Page State: Device tracking data loaded, now loading tracking map..";

	theMapAddresses = new Array();
	theMapAddressesTemp = new Array();

	for (var i = 0; i < theMetaLoader.metaDataKeyArray.length; i++)
		GetFile(theMetaLoader.metaDataKeyArray[i]);

}

function GetFile(fileKey) {
	s3.getObject({
		Bucket: s3Bucket,
		Key: fileKey
	}, function(error, data) {
		if (error) {
			alert(error); // an error occurred
			return;
		}

		//alert(data.Body); // request succeeded
		s3Data = JSON.parse(data.Body);
		console.log(s3Data);
		lat = s3Data["lat"];
		lng = s3Data["lng"];
		theMapAddressesTemp.push(s3Data);

		if (theMapAddressesTemp.length == theMetaLoader.metaDataKeyArray.length) {
			for (var i = 0; i < theMapAddressesTemp.length; i++)
				console.log("the map addresses[i] : " + theMapAddressesTemp[i]);

		}
	});

}
