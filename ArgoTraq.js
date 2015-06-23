
// AWS variables start
  var s3;
  var s3Data;
  var s3Bucket = 'argotraq-data';
  var amazonAccID = '940653267411'; //  AWS account ID
  var cognitoIdentity = 'us-east-1:14cce2b7-a33b-4a73-ace5-403142a023d8';

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
//

// Enter a client ID for a web application from the Google Developer Console.
// The provided clientId will only work if the sample is run directly from
// https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
// In your Developer Console project, add a JavaScript origin that corresponds to the domain
// where you will be running the script.
  var clientId = '878347286037-a2tmuru04ga3q67d09hb9f331psnt2kv.apps.googleusercontent.com';

// Enter the API key from the Google Develoepr Console - to handle any unauthenticated
// requests in the code.
// The provided key works for this sample only when run from
// https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
// To use in your own application, replace this API key with your own.
  var apiKey = 'AIzaSyBILK4VhHSqo0YHJPGKikbV_gZd6BZ5q90';

// To enter one or more authentication scopes, refer to the documentation for the API.
  var scopes = 'https://www.googleapis.com/auth/plus.login';

  var googleToken;
  var authResponse;


//
// config for Google Authorised login start..
//

	function HandleGoogleLogin()
	{
    	gapi.client.setApiKey(apiKey);
    	window.setTimeout(checkAuth,1);
	}

	function checkAuth()
	{
    	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
	}

	function handleAuthResult(authResult)
	{
	//  alert("inside handle auth result");
    	googleToken = authResult.access_token;
    	console.log(googleToken);
    	authResponse = authResult;

    	if (authResult && !authResult.error)
    	{
        	makeApiCall();
        	HandleAmazonUnauth();
    	}
    	else
    	{
			var authorizeButton = document.getElementById("authorize-button");
        	authorizeButton.onclick = handleAuthClick;
        	var evnt =  authorizeButton["onclick"];
        	callLogin = true;
        	evnt.call(authorizeButton);

    	}
	} // handleAuthResult


	function UnauthLogin()
	{
    	HandleAmazonUnauth();
		var heading = document.createElement('h4');

		heading.appendChild(document.createTextNode("Unauthenticated user"));

		document.getElementById('content').appendChild(heading);
		document.getElementById("acrSignIn").style.display="none";
		document.getElementById("acrBypassSignIn").style.display="none";
		document.getElementById("btnTrackingOn").disabled = false;
		document.getElementById("btnUploadLocate").disabled = false;
		googleEmail = "unknown";
		document.getElementById("divLoadingMsg").innerHTML = "Page State: Unauthenticated login, Awaiting Selection.."
		var docEl;
		docEl = document.getElementById("msgSignIn");
		docEl.innerHTML = "Unauthenticated user" + " has now signed in...";

	} // UnauthLogin

	function handleAuthClick(event)
	{
		var authorizeButton = document.getElementById("authorize-button");

    	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult2);
    	return false;
	}

	// Load the API and make an API call.  Display the results on the screen.
	function makeApiCall() 
	{
		gapi.client.load('plus', 'v1').then(function()
		{
			var request = gapi.client.plus.people.get({ 'userId': 'me' });

    		request.execute(function(resp)
	    	{
			var heading = document.createElement('h4');
			var image = document.createElement('img');

			image.src = resp.image.url;
			heading.appendChild(image);
			heading.appendChild(document.createTextNode(resp.displayName));
			try
			{
				googleEmail = resp.emails[0].value;
			}
			catch(err)
			{
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


	function HandleGoogleLogin2()
	{
    	gapi.client.setApiKey(apiKey);
    	window.setTimeout(checkAuth2,1);
    	console.log("call login 2..");
	}

	function checkAuth2()
	{
    	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult2);
	}

	function handleAuthResult2(authResult)
	{
    	googleToken = authResult.access_token;
    	console.log(googleToken);
    	authResponse = authResult;

    	if (authResult && !authResult.error)
    	{
        	makeApiCall();
    	}

	}

	function HandleAmazonAuth()
	{
		var cred = new AWS.CognitoIdentityCredentials(
				{
					AccountId: amazonAccID,
					IdentityPoolId: 'us-east-1:18f7c848-6636-4e24-a1c4-0d733a2253c8',
					RoleArn: 'arn:aws:iam::940653267411:role/Cognito_CliftonIdentityPoolAuth_Role',
					ProviderId: 'accounts.google.com',
					WebIdentityToken: googleToken
				});

		AWS.config.update(
				{
					region: 'us-east-1',
					credentials: cred
				});
	
		s3 = new AWS.S3(/*options = {region: 'ap-southeast-2'}*/);
		console.log(s3);
	
		AWS.config.credentials.get(function(err)
		{
			if (!err)
				console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
			else
				console.log(err);
		});
	
			console.log(s3);
	} // HandleAmazonAuth

	//
	// config for Amazon Unauthenticated login start..
	//

	function HandleAmazonUnauth()
	{
		var cred;

		cred = new AWS.CognitoIdentityCredentials(
			{
		   		AccountId: amazonAccID,
		   		RoleArn: 'arn:aws:iam::940653267411:role/Cognito_CliftonIdentityPoolUnauth_Role',
		   		IdentityPoolId: 'us-east-1:4efa6cf6-3df3-482e-b2be-9007d8cd9231',
		   		IdentityId: cognitoIdentity
			});

		AWS.config.update(
			{
		   		region: 'us-east-1',
		   		credentials: cred
			});

		s3 = new AWS.S3(/*options = {region: 'ap-southeast-2'}*/);
		console.log(s3);
	} // HandleAmazonUnauth


	//
	// Main module for map build and render..
	//

	function MetaLoader()
	{
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

	MetaLoader.prototype.reset = function()
	{
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

	function GetLocations()
	{
		theMapAddresses = new Array();

    	document.getElementById("divLoadingMsg").innerHTML = "Loading/Refreshing All Location Devices ..";;

    	theMetaLoader.reset();
    	theMetaLoader.getCogIDCallPtr  = setInterval(getCogIDFunc, 3000);
    	theMetaLoader.checkCogIDFinPtr = setInterval(checkCogIDFinFunc, 1000);
    	theMetaLoader.mapRefreshPtr    = setInterval(funcRefresh, 60000);
	}

	var funcRefresh = function ()
	{
    	var docEl = document.getElementById("divLoadingMsg");
    	docEl.innerHTML = "Page State: Loading/Refreshing All Location Devices ..";

    	var docEl = document.getElementById("cogUsers").style.display = "none";
    	docEl.length = 0;

    	theMetaLoader.reset();
    	theMetaLoader.getCogIDCallPtr = setInterval(getCogIDFunc, 3000);
    	theMetaLoader.checkCogIDFinPtr = setInterval(checkCogIDFinFunc, 1000);
	}

	var UploadPos = function()
	{
    	var posOptions = {timeout: 5000, enableHighAccuracy: false};
    	navigator.geolocation.getCurrentPosition(updateLocationData, errorOccured, posOptions);
	}

//
// Turn on S3 current location uploads..
//

   function StartPosLoad()
   {
      document.getElementById("btnUploadLocate").disabled = true;
      document.getElementById("btnTrackingOn").disabled = true;
      document.getElementById("btnUploadLocateOff").disabled = false;
      window["UploadPos"]();
      var docEl = document.getElementById("divLoadingMsg").innerHTML = "Page State: Current position data -> Amazon cloud data store, page refresh occurs every 60 seconds";

      theMetaLoader.reset();
      theMetaLoader.uploadDataPtr = setInterval(UploadPos, 60000);
   }



   // this callback is used to handle error when pull notifaction
   var errorOccured= function(err){

      alert("navigator error: " + err.code);

   }


   var updateLocationData= function(pos)
   {
      // update the data json info

      //$scope.data.success= true;
 //     $scope.errCode = 0;


      var data = {"lat":0,"lng":0,timeStamp:new Date()};

      data.lat = pos.coords.latitude;
      data.lng = pos.coords.longitude;
      data.timeStamp = new Date();
      var deviceID = "-browser-" + theCollector.myDeviceHash();
      metaInf = {deviceId:"",deviceModel:"",email:"",lastTracked:"",lastObject:{}};

      metaInf.lastTracked = data.timeStamp.valueOf();
      metaInf.lastObject = data;
      metaInf.deviceId = "browser-" + theCollector.myDeviceHash();
      metaInf.deviceModel = "web browser";
      metaInf.email=googleEmail;

 //     alert ("Collector device ID: " + theCollector.myDeviceHash());


      bucketParams = {
	          // bucket name
	          Bucket: s3Bucket,
	          // key of opject to put data in ( will be directory/filename on s3)
	          //,in this case store in a file whose name is device'sID

	          Key: cognitoIdentity+"/"+data.timeStamp.valueOf()+deviceID,

	          // full access for testing
	          ACL:'bucket-owner-full-control', // full access for testing

	          // Json version of data
	          Body:JSON.stringify(data)

      } ;


      s3.putObject(bucketParams,function(err,data2)
      {
            if (err)
            {
				console.log(err);
				return;
		    }
      });


     bucketParams.Key = cognitoIdentity+"/meta-"+deviceID;
     bucketParams.Body = JSON.stringify(metaInf)

      s3.putObject(bucketParams,function(err,data2)
      {
            if (err)
            {
				console.log(err);
				return;
		    }
      });

      theMapAddresses = new Array();


      var s3Data = {lastObject:{"lat":0,"lng":0,lastTracked:new Date()}};
      s3Data.lastObject.lat = data.lat;
      s3Data.lastObject.lng = data.lng;
      s3Data.lastObject.lastTracked = metaInf.lastTracked;
      theMapAddresses.push(s3Data);
      ShowMap("Page State: Current position data uploaded, auto-upload and screen refresh will occur every 60 seconds..");

       var docEl = document.getElementById("cogUserSel");

//	   docEl[docEl.length] = new Option("Lat Uploaded:" + data.lat);
//	   docEl[docEl.length] = new Option("Lng Uploaded:" + data.lng);
//	   docEl[docEl.length] = new Option("Upload Date/Time:" + data.timeStamp);

       document.getElementById("cogUsers").style.display = "block";

       docEl = document.getElementById("msgInfoList");
       docEl.innerHTML =
       "Current location Info->Cloud.." + "<br/>" + "lat: " + "<br/>" +data.lat + "<br/>" + "lng: "  + "<br/>" + data.lng + "<br/>";
       var aDate = new Date();
       var dateTimeStr = aDate.toLocaleDateString() + "  " + aDate.toLocaleTimeString();
       docEl.innerHTML = docEl.innerHTML + "Upload Date/Time: " + "<br/>" + dateTimeStr;

       document.getElementById("cogUserSel").style.display = "none";
  //    document.getElementById("msgInfoList").innerHTML = "Current location info->Cloud..";
   }


//
// Turn on S3 current location uploads..
//

   function StopPosLoad()
   {
      document.getElementById("btnUploadLocate").disabled = false;
      document.getElementById("btnTrackingOn").disabled = false;
      document.getElementById("btnUploadLocateOff").disabled = true;

      var docEl = document.getElementById("divLoadingMsg").innerHTML = "Page State: Current location cloud upload stopped, awaiting selection..";

       clearInterval(theMetaLoader.uploadDataPtr);
        document.getElementById("cogUsers").style.display = "none";
   }


   var getCogIDFunc = function()
   {

       s3.listObjects({Bucket: s3Bucket, Marker: theMetaLoader.lastFileMarker}, function(error, data)
       {
          if (error)
          {
              console.log(error); // an error occurred
              theMetaLoader.cogIDDone = true;
              return;
          }

	      if  (data.Contents.length == 0)
	      {
              theMetaLoader.cogIDDone = true;
	          return;
          }

          var endPos = data.Contents[0].Key.indexOf("/");
          var subStr;

		  if  (endPos >=0 )
		  {
			   subStr = data.Contents[0].Key.substr(0, endPos);
			   if (theMetaLoader.cogIDArray.indexOf(subStr) < 0)
			       theMetaLoader.cogIDArray.push(subStr);
	      }

          theMetaLoader.lastFileMarker = subStr + "/~";
        });

   }


   var checkCogIDFinFunc = function()
   {

	  if  (theMetaLoader.cogIDDone)
	  {
		  clearInterval(theMetaLoader.getCogIDCallPtr);
		  GetMetaFiles();
	  }

   }


   function GetMetaFiles()
   {
       var docEl = document.getElementById("cogUserSel");
       docEl.style.display = "block";
	   for (var i=0; i< theMetaLoader.cogIDArray.length; i++)
		   docEl[docEl.length] = new Option(theMetaLoader.cogIDArray[i].substr(0, 20) + "...");

       docEl = document.getElementById("divLoadingMsg");

       if  (theMetaLoader.cogIDArray.length == 0)
       {
		   docEl.innerHTML = "Page State: No cognito users found, no device tracking info to show..";
		   return;
       }

       docEl.innerHTML = "Page State: Cognito users loaded, now loading tracking data..";
       document.getElementById("cogUsers").style.display = "block";
       document.getElementById("msgInfoList").innerHTML = "All Users (AWS cognito IDs):";

       for (var i=0; i< theMetaLoader.cogIDArray.length; i++)
           theMetaLoader.metaDataKeyBoolArray.push(false);

	   clearInterval(theMetaLoader.checkCogIDFinPtr);

       theMetaLoader.lastFileMarker = theMetaLoader.cogIDArray[0] + "/meta-";
       theMetaLoader.elPtr = 0;

       theMetaLoader.getMetaDataCallPtr = setInterval(getMetaDataFunc, 3000);
       theMetaLoader.checkMetaDataFinPtr = setInterval(checkMetaDataFinFunc, 1000);
   }





   var getMetaDataFunc = function()
   {
       var endPos = theMetaLoader.lastFileMarker.indexOf("/meta-");
	   var metaKey;

	   if  (endPos >=0 )
	   {
			metaKey = theMetaLoader.lastFileMarker.substr(0, endPos);
			metaIndex = theMetaLoader.cogIDArray.indexOf(metaKey)

			if (metaIndex >= 0)
			{
				console.log("setting meta index el to true: " + metaIndex);
			    theMetaLoader.metaDataKeyBoolArray[metaIndex] = true;
		    }
       }

       s3.listObjects({Bucket: s3Bucket, Prefix: theMetaLoader.lastFileMarker}, function(error, data)
       {
          if (error)
          {
              console.log(error); // an error occurred
              theMetaLoader.metaDataDone = true;
              return;
          }

          for (var i=0; i < data.Contents.length; i++)
             theMetaLoader.metaDataKeyArray.push(data.Contents[i].Key);

          var falseFound = false;

		  for (var i=0; i < theMetaLoader.metaDataKeyBoolArray.length; i++)
              if  (theMetaLoader.metaDataKeyBoolArray[i] == false)
		  	      falseFound = true;

		  if  (!falseFound)
		  {
		      theMetaLoader.metaDataDone = true;
		      return;
		  }

		  theMetaLoader.elPtr++;
          theMetaLoader.lastFileMarker = theMetaLoader.cogIDArray[theMetaLoader.elPtr] + "/meta-";
      });

   }

   var checkMetaDataFinFunc = function()
   {
         if  (theMetaLoader.metaDataDone)
         {
			 clearInterval(theMetaLoader.getMetaDataCallPtr);
             LoadDeviceData();
	     }
   }

   function LoadDeviceData()
   {
	   clearInterval(theMetaLoader.checkMetaDataFinPtr);
       docEl = document.getElementById("divLoadingMsg");

       if  (theMetaLoader.metaDataKeyArray.length == 0)
       {
		   docEl.innerHTML = "Page State: No recent tracking device data found, no device tracking info to show..";
		   return;
       }

       docEl.innerHTML = "Page State: Device tracking data loaded, now loading tracking map..";

	   theMapAddresses = new Array();
	   theMapAddressesTemp = new Array();

       for (var i=0; i< theMetaLoader.metaDataKeyArray.length; i++)
           GetFile(theMetaLoader.metaDataKeyArray[i]);

   }



  function GetFile(fileKey)
   {
       s3.getObject({Bucket: s3Bucket, Key: fileKey}, function(error, data)
       {
           if (error)
           {
               alert(error); // an error occurred
               return;
           }

           //alert(data.Body); // request succeeded
           s3Data = JSON.parse(data.Body);
           console.log(s3Data);
           lat = s3Data["lat"];
           lng = s3Data["lng"];
           theMapAddressesTemp.push(s3Data);

           if  (theMapAddressesTemp.length == theMetaLoader.metaDataKeyArray.length)
           {
               for (var i = 0; i < theMapAddressesTemp.length; i++)
                   console.log("the map addresses[i] : " + theMapAddressesTemp[i]);

               CheckDeviceToShow();
	       }
       });

   }




   function CheckDeviceToShow()
   {
       var minDate = new Date();

       minDate.setDate(minDate.getDate() - 1);
       console.log("Minimum date: " + minDate.valueOf());

	   for (var i=0; i<theMapAddressesTemp.length; i++)
	   {
		   var s3Data = theMapAddressesTemp[i];
		   var lastTracked = s3Data["lastTracked"];
		   var latitude = s3Data.lastObject.lat

		   if  (lastTracked > minDate)
		       theMapAddresses.push(s3Data);

       }

       docEl = document.getElementById("divLoadingMsg");

       if  (theMapAddresses.length == 0)
       {
		   docEl.innerHTML = "Page State: No recent tracking device data found, no device tracking info to show..";
		   return;
       }

       ShowMap("Page State: Map loaded, auto-refresh will occur every 60 seconds..")
   }




   function ShowMap(pageStateMsg)
   {
       SetDisplayArea('none', 'block');
	   var domMapCanvass = document.getElementById("map");
	   var zoomVal = 12

       var infoWindow = new google.maps.InfoWindow({
                            content: ""
                          });
       oMapDetail = new MapDetail(domMapCanvass, zoomVal, infoWindow);


	   for (var i=0; i<theMapAddresses.length; i++)
	   {

	        googleMap = AddPointToMap(i);
	        oMapDetail.SetGoogleMap(googleMap);
	   }

       docEl = document.getElementById("divLoadingMsg");
       docEl.innerHTML = pageStateMsg;
   }




   function SetDisplayArea(msgVal, mapVal)
   {
       var msgArea = document.getElementById("divMsgArea");
       msgArea.style.display = msgVal;
       var domMapCanvass = document.getElementById("map");
       domMapCanvass.style.display = mapVal;
       return msgArea;
   }




   function AddPointToMap(i)
   {
       var googleMap = oMapDetail.GetGoogleMap();
       console.log("i value: " + i);
        var s3Data = theMapAddresses[i];
                    lat = s3Data.lastObject.lat;
             lng = s3Data.lastObject.lng;
       console.log("add point to map, lat: " + lat);
       console.log("add point to map, lng: " + lng);

       if  (googleMap == null)
       {
		   console.log("google map was null..");
           var myOptions =
           {
               zoom : oMapDetail.GetZoomVal(),
               center: new google.maps.LatLng(lat, lng)
           };

           googleMap = new google.maps.Map(oMapDetail.GetDomMapCanvass(), myOptions);
           oMapDetail.SetGoogleMap(googleMap);
       }


       var thePoint = new google.maps.LatLng(lat, lng);

       var marker = new google.maps.Marker({
			               position: thePoint,
                           map: googleMap,
 		                   title:  "Bendigo, Victoria"
                                     });

       oMapDetail.SetMarker(marker);
       console.log("adding marker to map");
       return googleMap;
    }




