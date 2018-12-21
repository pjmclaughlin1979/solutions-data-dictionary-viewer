import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import esriLoader from 'esri-loader';
import './Map.css';
import { Collapse, Button, Navbar, Icon, Alignment } from "@blueprintjs/core";
import { store } from './store/index';
import { connect } from 'react-redux';
import { mapStateToProps, mapDispatchToProps } from './StoreHelper';
import { requestHelper, FSurl } from './RemoteRequest';
import { Rnd } from 'react-rnd';

const options = {
  url: 'https://js.arcgis.com/4.9'
};

export default class MapApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      cardOptions: {
        x: 0,
        y: 0,
        height: "500px",
        width: "500px"
      },
      cardSize: {
        height: "440px",
        width: "490px"
      },
      disableDrag: false,
      dragIcon: "move"
    }
  }

  componentDidMount=() => {
    esriLoader.loadModules([
    'esri/Map',
    'esri/WebMap',
    'esri/views/MapView',
    'esri/layers/FeatureLayer'
    ], options)
      .then(([Map, WebMap, MapView, FeatureLayer]) => {
        var webmap = new WebMap({
          portalItem: { // autocasts as new PortalItem()
            id: "690f6848940c46c9be701e25aab3023f"
          }
        });

        //requestHelper.parseURL();
        requestHelper.url = FSurl;
        requestHelper.request().then((result) => {
          console.log(result);
          let layerList = [];
          if(typeof(result.layers) !== "undefined") {
            for(let i=0; i < result.layers.length; i++) {
              if(result.layers[i].hasOwnProperty("type")) {
                if(result.layers[i].type === "Feature Layer" && result.layers[i].name !== "Service Territory") {
                  let fl = new FeatureLayer(FSurl+ "/"+result.layers[i].id);
                  let template = {
                    title: "Map Filter",
                    content: "Filter dictionary by Feature"
                  };
                  fl.popupTemplate = template;
                  layerList.push(fl);
                }
              } else {
                let fl = new FeatureLayer(FSurl+ "/"+result.layers[i].id);
                let template = {
                  title: "Map Filter",
                  content: "Filter dictionary by Feature"
                };
                fl.popupTemplate = template;
                layerList.push(fl);
              }
            }
          }
          let map = new Map({
            basemap: 'gray-vector',
            layers: layerList
          });
          let view = new MapView({
            map: map,
            container: "mapContainer",
            center: [-88.153, 41.771],
            zoom: 16
          });
          console.log("here");
          view.on("click", (event) => {
            view.popup.clear();
            checkFeature({
              popup: view.popup,
              attempts: 1
            });
          })

          this.setState({
            map,
            view
          });

        });


        let checkFeature = (args) => {
          //need to put an attempt count since popup selected features is async, but
          //there is no event to hook into it to check when it is populated.
          //if 3 attempts, then end, there is no feature where user clicked.
          if(args.attempts <= 3) {
            if(args.popup.selectedFeature === null) {
              args.attempt++;
              setTimeout(() => {checkFeature(args)},500);
            } else {
              let firstFeature = args.popup.selectedFeature;
              if(firstFeature.attributes.hasOwnProperty("assetgroup")) {
                //UN services
                let typeList = firstFeature.layer.types;
                let title = "";
                typeList.forEach(type => {
                  if(type.id === firstFeature.attributes.assetgroup) {
                    title = type.name;
                  }
                });
                if(title !== "") {
                  this.createHandlers(title);
                } else {
                  this.createHandlers(firstFeature.layer.title);
                }
              } else {
                //regular service
                var title = "";
                if(firstFeature.layer.title.indexOf("-") > -1) {
                  //check if there are dashes, if so, see if before the dash is the pre-appended service name by comparing to URL
                  //if it is, remove and only use the tail.  If it not service name, then it's a legit dash.
                  var leftOfDash = (firstFeature.layer.title).substring(0, (firstFeature.layer.title.indexOf("-") -1));
                  if(FSurl.indexOf(leftOfDash) > -1) {
                    title = ((firstFeature.layer.title).substring((leftOfDash.length + 2))).trim();
                  } else {
                    title = firstFeature.layer.title;
                  }
                } else {
                  title = firstFeature.layer.title;
                }
                this.createHandlers(title);
              }
            }
          }
        };

      })
      .catch(err => {
        console.error(err);
      });

    //this.dragElement(document.getElementById("mapHolder"));
  }

  createHandlers = (data) => {
    //connect(mapStateToProps, mapDispatchToProps)(App);
    store.dispatch({type:'FILTER', payload:data});
  };

  render() {
    return (

      <Rnd
        default={this.state.cardOptions}
        className="card-holder"
        onResize={this.cardResize}
        enableUserSelectHack={false}
        disableDragging={this.state.disableDrag}
      >
        <Navbar className="card-nav-style">
          <Navbar.Group align={Alignment.Left}>
            <Navbar.Heading><span className="card-nav-header">{"Map"}</span></Navbar.Heading>
          </Navbar.Group>
          <Navbar.Group align={Alignment.RIGHT}>
            <Icon icon={this.state.dragIcon} onClick={this.stopDrag} />
            <Navbar.Divider />
            <Icon icon="delete" onClick={this.closeCard} />
          </Navbar.Group>
        </Navbar>

        <div id="mapContainer" style={this.state.cardSize} />

      </Rnd>
    );
  }

  closeCard =() => {
    // let subs = document.getElementById(this.props.title + "_subDetails").childNodes;
     //for (let i=0; i<subs.length; i++) {
     //  ReactDOM.unmountComponentAtNode(document.getElementById(subs[i].id));
     //}
     ReactDOM.unmountComponentAtNode(document.getElementById(this.props.id));
   }

   stopDrag =() => {
    if(this.state.disableDrag) {
      this.setState({disableDrag: false, dragIcon: "move"});
    } else {
      this.setState({disableDrag: true, dragIcon: "hand-up"});
    }
   }

   cardResize =(e, direction, ref, delta, position) => {
      let options = {
        width: ref.offsetWidth - 10,
        height: ref.offsetHeight -60
      }
      this.setState({cardSize: options});
  }

}
