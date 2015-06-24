// AWS variables start
var s3;
var s3Data;
var s3Bucket = 'argotraq-data';
var amazonAccID = '940653267411'; //  AWS account ID
//var cognitoIdentity = 'us-east-1:14cce2b7-a33b-4a73-ace5-403142a023d8';
var identityPoolID = 'us-east-1:0aa587c3-9e10-4e1b-8484-7e85f38ca62f';
var roleArnAuth = 'arn:aws:iam::940653267411:role/Cognito_HeinrichArgoTraqAuth_Role';
var roleArnUnAuth = 'arn:aws:iam::940653267411:role/Cognito_HeinrichArgoTraqUnauth_Role';

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

var googleToken;
var authResponse;


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
	// TODO ?
	googleToken = authResult.access_token;
	authResponse = authResult;

	var authorizeButton = document.getElementById('acrSignIn');

	if (authResult && !authResult.error) {
		console.log("google already authorized");
		authorizeButton.style.visibility = 'hidden';
		console.log(authorizeButton);
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
	googleToken = authResult.access_token;
	console.log(googleToken);
	authResponse = authResult;
	console.log(authResult);

	// no API call because not authorized. What to do?
	if (authResult && !authResult.error) {
		console.log("api call");
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
	console.log(googleToken);

	var cred = new AWS.CognitoIdentityCredentials({
		AccountId: amazonAccID,
		IdentityPoolId: identityPoolID,
		Logins: {
			'accounts.google.com': googleToken
		},
		RoleArn: roleArnAuth
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
	var cred;

	cred = new AWS.CognitoIdentityCredentials({
		AccountId: amazonAccID,
		RoleArn: roleArnUnAuth,
		IdentityPoolId: identityPoolID,
		//IdentityId: cognitoIdentity
	});

	AWS.config.update({
		region: 'us-east-1',
		credentials: cred
	});

	s3 = new AWS.S3( /*options = {region: 'ap-southeast-2'}*/ );
	console.log(s3);
} // HandleAmazonUnauth


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
