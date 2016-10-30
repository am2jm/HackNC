var container, stats;

var camera, scene, renderer;

var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var xlabsUpdateEnabled = false;

var pointLight = null;

var STATE_NO_FACE = "no-face";
var STATE_INIT_HEAD = "init-head";
var STATE_HEAD_CONTROL = "head-control";

var state = STATE_NO_FACE;
var stateTimer = new Timer();

var resetTimer = new Timer();
resetTimer.setDuration( 2500 ); // when person absent 2.5 second, only then reset head origin

var progress = 0;

function resetCamera() {
  return {
    distance: 20,
    azmimuth: 0,
    elevation: 45,

    azmimuthRate: 0, // degrees per second
    elevationRate: 0, // degrees per second
  }
}

var xlCamera = resetCamera();


function rad(deg) {
  return deg*Math.PI/180;
}

function deg(rad) {
  return rad*180/Math.PI;
}

function init() {

  // Animate loading text  
  (function loadingAnimation() {
    setTimeout( loadingAnimation, 500 );
    var loadingElement = document.getElementById("loading-text");
    loadingElement.innerHTML = progress + "% complete";
  })();


  container = document.createElement( 'div' );
  document.body.appendChild( container );
    
    
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.z = xlCamera.distance;

  var onProgress = function ( xhr ) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      progress = Math.round(percentComplete, 2);//Math.floor( percentComplete );
      console.log(  progress+ '% completed' );
    }
  };

  var onError = function ( xhr ) {
  };

//
    var start = document.getElementById("start-button");
    start.onclick = function() {
      resetHeadOrigin();
      xlabsUpdateEnabled = true;
      document.getElementById("fullscreen").style.display = "none";
    } 
    start.style.display = "inline";


  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

//  renderer.setSize( window.innerWidth, window.innerHeight );

}


function onDocumentMouseMove( event ) {

  mouseX = ( event.clientX - windowHalfX );
  mouseY = ( event.clientY - windowHalfY );

  xlCamera.azmimuth = mouseX / 5;
  xlCamera.elevation = mouseY / 5;

  if( xlCamera.elevation < 0 ) xlCamera.elevation = 0;
  if( xlCamera.elevation > 90 ) xlCamera.elevation = 90;

}

var lastUpdate = null;


function update() {

  if( !xlabsUpdateEnabled ) {
    return;
  }

  if( Errors.hasNoFace() ) {
    if( resetTimer.hasElapsed() ) {
      state = STATE_NO_FACE;
      xlCamera.azmimuthRate = 10;
      xlCamera.elevationRate = 0;
      xlCamera.elevation = 45;
      // console.log( "state: STATE_NO_FACE" );
    }
  }
  else { // has face
    resetTimer.reset();

    if( state == STATE_NO_FACE ) {
      // A face just came into view.
      stateTimer.setDuration( 6000 );
      stateTimer.reset();
      state = STATE_INIT_HEAD;
      xlCamera.azmimuthRate = 0;
      xlCamera.elevationRate = 0;
      // console.log( "state: STATE_INIT_HEAD" );
    }
    else if( state == STATE_INIT_HEAD ) {
      if( stateTimer.hasElapsed() ) {
        state = STATE_HEAD_CONTROL;
      // console.log( "state: STATE_HEAD_CONTROL" );
      }
    }
  }
  
  updateCameraPosition();
}

function updateCameraPosition() {

  if( lastUpdate === null ) {
    lastUpdate = Date.now();
  }

  var diffSec = (Date.now() - lastUpdate) / 1000.0;
  lastUpdate = Date.now();
   console.log( "lastUpdate: " + lastUpdate );
  // console.log( "xlCamera.azmimuthRate * diffSec: " + xlCamera.azmimuthRate * diffSec );

  xlCamera.azmimuth += xlCamera.azmimuthRate * diffSec;

  if( xlCamera.azmimuthRate == 0 ) {
    xlCamera.elevation += xlCamera.elevationRate * diffSec;
    if( xlCamera.elevation < 10 ) xlCamera.elevation = 10;
    if( xlCamera.elevation > 90 ) xlCamera.elevation = 90;
  }


  // console.log( "xlCamera.azmimuth: " + xlCamera.azmimuth );

  var y = xlCamera.distance * Math.sin( rad(xlCamera.elevation) );
  d = xlCamera.distance * Math.cos( rad(xlCamera.elevation) );
  var x = d * Math.cos( rad(xlCamera.azmimuth) );
  var z = d * Math.sin( rad(xlCamera.azmimuth) );
 
  // camera.position.x += (x - camera.position.x) * 0.1
  // camera.position.y += (y - camera.position.y) * 0.1
  // camera.position.z += (z - camera.position.z) * 0.1
  camera.position.x = x
  camera.position.y = y
  camera.position.z = z

  camera.lookAt( scene.position );

}

function esri() {
    require([
      "esri/Map",
      "esri/layers/CSVLayer",
      "esri/views/MapView",
      "esri/views/SceneView",
      "esri/layers/Layer",
      "esri/renderers/SimpleRenderer",
      "esri/symbols/SimpleMarkerSymbol",
      "esri/config",
      "dojo/dom-construct",
      "esri/core/urlUtils",
      "esri/views/ui/UI",
      "esri/widgets/NavigationToggle",

      "esri/widgets/Search",
      "esri/layers/FeatureLayer",

      "dojo/domReady!"
    ], function(
      Map,
      CSVLayer,
      MapView,
      SceneView, 
      Layer, 
      SimpleRenderer,
      SimpleMarkerSymbol,
      esriConfig,
      domConstruct,
      urlUtils,
      UI,
      NavigationToggle,
      Search,
      FeatureLayer) {

      var map = new Map({
        basemap: "satellite",
        ground: "world-elevation"
      });

      var url2 = "heritage-sites.csv";
       
      
      var template2 = {
        title: "UNESCO World Heritage Site",
        content: "<a href='#' onclick='window.open(\"https://www.google.com/search?q={name_en}\");return false;' <b>{name_en}</b></a>, {date_inscribed} {short_description_en}"
      };
      
      var layer2 = new CSVLayer({
        url: url2,
        copyright: "UNESCO World Heritage Sites",
        popupTemplate: template2
      });

      layer2.renderer = new SimpleRenderer({
          symbol: new SimpleMarkerSymbol({
            size: "23px",
            color: [2, 69, 200, 0.5],
            outline: {
              width: 0.5,
              color: "white"
            }
          })
        });
        
      var tempFeat = {
        title: "World Cities",
        content: "I am {id} at {name} with population {pop}"
      };

      var featureLayer = new FeatureLayer({
          url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/ArcGIS/rest/services/WorldCities/FeatureServer/0",
          popupTemplate: tempFeat,
          copyright: "Services.ArcGis"
      });

      featureLayer.renderer = new SimpleRenderer({
        symbol: new SimpleMarkerSymbol({
          size: "23px",
          color: [200, 0, 200, 0.5],
          outline: {
            width: 0.5,
            color: "white"
          }
        })
      });

      console.log(featureLayer.fields);

      map.add(featureLayer);
      map.add(layer2);
      
      var logo = domConstruct.create("img", {
        src: "ram.png",
        height: "100px",
        id: "logo",
        title: "logo"
      });
      
      

      var view = new SceneView({
        container: "viewDiv",
        center: [138, 35],
        zoom: 4,
        map: map
      });
      
      var navigationToggle = new NavigationToggle({
        view: view
      });
      
      function layerH(){
        layer2.visible = true;
        featureLayer.visible = false;

      }
      function layerC(){
        featureLayer.visible = true;
        layer2.visible = false;
      }
      function layerA(){
        featureLayer.visible = true;
        layer2.visible = true;
      }
      
       var button = document.createElement("button");
      var t = document.createTextNode("Heritage");   
      button.appendChild(t);                               
      document.body.appendChild(button);
      button.style.backgroundColor="white";
      button.style.color="#2E3439";
      button.style.border="0px";
      button.style.fontSize="15px";
      button.style.padding="5px";
      button.style.fontFamily="Calibri";
      button.onclick = layerH;

      var button2 = document.createElement("button");
      var t2 = document.createTextNode("Cities");      
      button2.appendChild(t2);                     
      document.body.appendChild(button2);
      button2.style.backgroundColor="white";
      button2.style.color="#2E3439";
      button2.style.border="0px";
      button2.style.fontSize="15px";
      button2.style.padding="5px";
      button2.style.fontFamily="Calibri";
      button2.onclick = layerC;
      
      var button3 = document.createElement("button");
      var t3 = document.createTextNode("All");      
      button3.appendChild(t3);                     
      document.body.appendChild(button3);
      button3.style.backgroundColor="white";
      button3.style.color="#2E3439";
      button3.style.border="0px";
      button3.style.fontSize="15px";
      button3.style.padding="5px";
      button3.style.fontFamily="Calibri";
      button3.onclick = layerA;
      
      var searchWidget = new Search({
        view: view
      });
      searchWidget.startup();

      view.ui.add(logo, "bottom-right");
      view.ui.add(searchWidget, "top-right");
      view.ui.add(button3, "bottom-left");
      view.ui.add(button, "bottom-left");
      view.ui.add(button2, "bottom-left");
       

    });
}

function onXLabsReady() {
  console.log( "onXLabsReady" );
  window.onbeforeunload = function() {
      xLabs.setConfig( "system.mode", "off" );
  }

  xLabs.setConfig( "system.mode", "head" );
  xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );

    xLabs.setConfig( "calibration.clear", "1" ); // this also clears the memory buffer
    xLabs.setConfig( "system.mode", "learning" );
    xLabs.setConfig( "browser.canvas.paintLearning", "0" );
    
  init();
  esri();
}


function findMedian(data, extract) {
  
  if( typeof extract === 'undefined' ) {
    extract = function(v) { return v; }
  }

  // extract the .values field and sort the resulting array
  var m = data.map(extract).sort(function(a, b) {
      return a - b;
  });

  var middle = Math.floor((m.length - 1) / 2); // NB: operator precedence
  if (m.length % 2) {
      return m[middle];
  } else {
      return (m[middle] + m[middle + 1]) / 2.0;
  }
}

var headOriginQueue = {x:[], y:[]};
var headOriginLength = 10;

function resetHeadOrigin() {
   xlCamera = resetCamera();
  Head.reset();
  headOriginQueue = {x:[], y:[]};
}

function onXLabsUpdate() {

  if( !xlabsUpdateEnabled ) {
    return;
  }

  Errors.update();

  var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
  var y = parseFloat( xLabs.getConfig( "state.head.y" ) );

  if( Head.xHeadOrigin === null ) {
    headOriginQueue.x.push( x );
    headOriginQueue.y.push( y );
    console.log( headOriginQueue.x.length );
    if( headOriginQueue.x.length >= headOriginLength ) {

       console.log( headOriginQueue.x );
       console.log( headOriginQueue.y );

      Head.xHeadOrigin = findMedian( headOriginQueue.x )
      Head.yHeadOrigin = findMedian( headOriginQueue.y )

      headOriginQueue = {x:[], y:[]};
      console.log( "head origin set at: " + Head.xHeadOrigin + ", " + Head.yHeadOrigin );
    }
  }

  if( Head.xHeadOrigin !== null ) {
    Head.update();
    var head = Head.get();

    var X_THRESH = 40;
    var X_GAIN = 1;
    var AZIMUTH_MAX_RATE = 30;

    var Y_THRESH = 40;
    var Y_GAIN = 1;
    var ELEVATION_MAX_RATE = 30;

    // Azimuth
    var dx = 0;
    

    if( head.x > X_THRESH ) {
      dx = head.x - X_THRESH;
    }
    else if( head.x < -X_THRESH ) {
      dx = head.x + X_THRESH;
    }

    var azmimuthRate = -dx * X_GAIN;

    if( azmimuthRate > AZIMUTH_MAX_RATE ) {
      azmimuthRate = AZIMUTH_MAX_RATE
    }
    else if( azmimuthRate < -AZIMUTH_MAX_RATE ) {
      azmimuthRate = -AZIMUTH_MAX_RATE
    }

    xlCamera.azmimuthRate = azmimuthRate;


    // Elevation
    var dy = 0;
    if( head.y > Y_THRESH ) {
      dy = head.y - Y_THRESH;
    }
    else if( head.y < -Y_THRESH ) {
      dy = head.y + Y_THRESH;
    }

    var elevationRate = -dy * Y_GAIN;

    if( elevationRate > ELEVATION_MAX_RATE ) {
      elevationRate = ELEVATION_MAX_RATE
    }
    else if( elevationRate < -ELEVATION_MAX_RATE ) {
      elevationRate = -ELEVATION_MAX_RATE
    }

    xlCamera.elevationRate = elevationRate;

    var e = document.getElementById( "headCircle" );
    var c = 80;
    e.setAttribute( "cx", c + dx );
    e.setAttribute( "cy", c + dy );

    // console.log( "azmimuthRate: " + azmimuthRate );
  }

}

xLabs.setup( onXLabsReady, onXLabsUpdate, null, "myToken" );

