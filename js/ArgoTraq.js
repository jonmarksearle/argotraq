// AWS variables start
var s3;
var s3Data;
var s3Bucket = 'argotraq-data';
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

// 
var geoJsonDevices = [];
var geoJsonTrajectories = [];
var geoJsonLayer;
var deviceIds = [];
//var hours24 = 86400000;
var displayedLastHours;
var displayedTimePoint = new Date();
var hoursToMillis = 3600000;
var initialRun = false;
var retrievingData = false;

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

	var cred = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: identityPoolID,
		Logins: {
			'accounts.google.com': gapi.auth.getToken().access_token
		},
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

	s3 = new AWS.S3( /*options = {region: 'ap-southeast-2'}*/ );
	console.log(s3);

	console.log(s3);
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

function HandleS3MetaData() {
	initialRun = true;
	retrievingData = true;

	s3 = new AWS.S3();
	console.log(s3);
	if (!displayedLastHours) {
		console.log("set displayHours to default 24hours");
		displayedLastHours = hoursToMillis * 24 /*hours24*/ ;
	}
	s3.listObjects({
		Bucket: 'argotraq-data',
		Prefix: 'us-east-1:e65610fc-84a3-4ff4-9381-6a029f30ef14/meta'
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
				console.log(entry);
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
				console.log(geoEntry);
				geoJsonDevices.push(geoEntry);
				// count callbacks. Continue after last callback
				counterDevices = counterDevices - 1;
				if (counterDevices == 0) {
					console.log(counterDevices);
					HandleS3Data();
				};
			};

		});
	}

} // showMetaObjects

function HandleS3Data() {
	//show devices on Leaflet map
	geoJsonLayer = L.geoJson(geoJsonDevices, {
		onEachFeature: onEachFeature
	}).addTo(map);

	//fill deviceIds-array with the deviceIds
	for (var i = 0; i < geoJsonDevices.length; i++) {
		deviceIds.push(geoJsonDevices[i].properties['deviceId']);
	}
	console.log(deviceIds);
	console.log(deviceIds.indexOf(geoJsonDevices[1].properties['deviceId']))

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

	s3.listObjects({
		Bucket: s3Bucket,
		Prefix: 'us-east-1:e65610fc-84a3-4ff4-9381-6a029f30ef14/' + getApproxHours(),
	}, function(err, data) {
		if (err) console.log(err);
		else {
			console.log(data);
			showDataTrajectories(data);
		}
	});
}

function showDataTrajectories(inData) {
	// save total geoJson object
	//TODO: error, because entries of geoJsonObj are created in callback 
	//TODO: preconfigure geoJsonObj with meta object points and then delete if-else-block

	var counterDataObjects = inData.Contents.length;
	var deviceIndices = []
	for (var i = 0; i < inData.Contents.length; i++) {
		var key = inData.Contents[i].Key.split('/')[1];
		//console.log(key);
		var timeMillis = key.split("-")[0];
		var deviceId = key.split("-")[1];
		//console.log(deviceId);
		// refine selection of exactly last 24 hours
		if ((Number(timeMillis) > (displayedTimePoint.getTime() - displayedLastHours)) && (Number(timeMillis) <= displayedTimePoint.getTime())) {
			// save coordinates of the objects to existing linestring
			// linestring needs to be ordered by timeStamp
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
	retrievingData = false;
} //HandleS3DataVisualization

function getApproxHours() {
	var currentTime = (new Date().getTime()).toString();
	var pastTime = (new Date().getTime() - displayedLastHours).toString();
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
} //getApprox24hours

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
	displayedLastHours = val * hoursToMillis;
}

$('#datepicker').val(getDateYMD(new Date()));
$('#datepicker').attr('min', getDateYMD(new Date(1)));
$('#datepicker').attr('max', getDateYMD(new Date()));

function updateDateInput(val) {
	console.log("new Date:: " + val);
	var displayedTimePointMillis = new Date(val).getTime() + getTimeMillis();
	displayedTimePoint = new Date(displayedTimePointMillis);
	console.log(displayedTimePoint);
}

function adjustDateTime() {
	if (!initialRun) {
		window.alert("Please run 'Sign In via Google' or 'Go Anonymous' first.");
	}
	else if (retrievingData) {
		window.alert("Wait until previous data are retrieved.");
	}
	else {
		console.log("removeLayer");
		geoJsonLayer.clearLayers();
		deviceIds = [];
		geoJsonDevices = [];
		geoJsonTrajectories = [];
		console.log("display data with new properties");
		HandleS3MetaData();
	};
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
