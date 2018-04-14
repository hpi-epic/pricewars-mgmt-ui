# Management UI

This repository contains the frontend of the Pricewars-Simulation. It allows access to all important settings of all components.

It allows:
* Registration of new merchants
* Changing of settings for existing merchants
* Registration of new consumers
* Changing of settings for existing consumers
* Adding, removing or updating products the producer offers
* Displaying the current offers in the marketplace
* Displaying statistics about the current and past market situation
* Displaying price updates and sales for each merchant and product

The meta repository containing general information can be found [here](https://github.com/hpi-epic/masterproject-pricewars)

## Application Overview

**Repositories**
* Management UI: [https://github.com/hpi-epic/pricewars-mgmt-ui](https://github.com/hpi-epic/pricewars-mgmt-ui)
* Consumer: [https://github.com/hpi-epic/pricewars-consumer](https://github.com/hpi-epic/pricewars-consumer)
* Producer: [https://github.com/hpi-epic/pricewars-producer](https://github.com/hpi-epic/pricewars-producer)
* Marketplace: [https://github.com/hpi-epic/pricewars-marketplace](https://github.com/hpi-epic/pricewars-marketplace)
* Merchant: [https://github.com/hpi-epic/pricewars-merchant](https://github.com/hpi-epic/pricewars-merchant)
* Kafka RESTful API: [https://github.com/hpi-epic/pricewars-kafka-rest](https://github.com/hpi-epic/pricewars-kafka-rest)

Please note, that we cannot make the repository for the management UI public (we use a free bootstrap template that we are not allowed to distribute). But you can ask us anytime for access and we will add you to the access list.
The management UI is not required but eases the first steps on the platform.

## Requirements

This User Interface is build on the [HOMER template](https://wrapbootstrap.com/theme/homer-responsive-admin-theme-WB055J451) which requires angularJS 1.5.5. For copyright purposes, it is necessary to purchase a separate license when using this dashboard for other reasons or projects.

## Installation

To run the frontend locally on your machine, start a webserver of your choice in the top-folder of the repository, eg a python server on port 8000 using Python 3.x by executing `python -m http.server 8000`. Then open `localhost:8000` in a browser to see the frontend running.  

## Configuration

For the currently unique components of the simulation - the marketplace, the producer, the consumer and the kafka-reverse-proxy - we use environment-varibales to set their URLS globally. This allows us to easily access and change them, for example when the user interface is run in our Docker-deployment.

For the deployment on the virtual machines of the EPIC chair, we use the URLs in `env.json`. For running the frontend in the docker-setup, we use `env.docker.json`. To change a single endpoint, just edit the files. To change the json-file used, change the filename in the `endpoints`-factory in `app.js`.

## Concept

Since the user interface is based on angular, the project is build accordingly. The main entrance point for the logic can be found in `app.js`, where we set the available routes and their respective controllers and html-files. The controllers are split up into javascript-files, named according to the route they belong to. 

### Socket.io
For the communication with the [kafka-reverse-proxy](https://github.com/hpi-epic/pricewars-kafka-reverse-proxy) that offers the data for all charts of the UI, we chose [socket.io](http://socket.io/). Socket.io enables us to constantly stream new data so we do not have to do manual http-requests for updating every x seconds the frontend. Instead we just listen to new messages coming in via socket and display them immediately.

In the current setup of the frontend, the connection (and disconnection) to the reverse-proxy via socket happens in each controller, that listens for certain socket messages, separately. The reason for that is that the reverse-proxy offers historic data for all statistics but this historic data is only sent to a client on a new connect. That means that if we want to receive historic data for any chart displayed and managed with the current controller, we currently have to trigger a new connect. Furthermore, to obtain the url to connect to via socket (ie the url of the reverse-proxy), we are using another factory called endpoints, that asynchronously reads the endpoints from a .json-file. So in every controller that is supposed to connect to the reverse-proxy, make sure to include the `endpoints`-factory and add the following code:

```javascript
 endpoints.getData().then(function(urls) {
    var socket = io.connect(urls.kafka_proxy, {query: 'id=mgmt-ui'}); // by calling this, we trigger the proxy to send us historic data

    $scope.$on('$locationChangeStart', function() {
      // executed whenever we change to another controller/location
      socket.disconnect();
    });
 }
```

To then listen to specific messages from the proxy to receive the historic data as well as live-data, simply add a `socket.on()` to the above code block, eg:
```javascript
  socket.on('nameOfTheMessage', function (data) {
       data = angular.fromJson(data);
       // handle the data, eg add it to a graph
   });
```

### Highcharts
We decided to use [Highcharts](http://www.highcharts.com/) for the charts displayed in the UI. We chose Highcharts because of its high flexibility and the great variety of charts and chart-options that fit our needs very well.

We refactored the frontend to offer an angular-factory for all (High)charts. This factory, called `charts`, can be found in `app.js`. All graphs and their settings are predefined here. Moreover, it offers methods to create pre-defined graphs, to add points to a graph and takes care of some custom settings we added such as custom symbols and tooltips or sorted legends.

To add a completely new graph, add an object to the `charts`-object with the following syntax:
```
nameOfGraph: {
  title: [String] (will be printed above the graph),
  html_id: [String] (the html-id of the div the graph will be rendered into - has to exist in the HTML-code),
  data: [] (currently not used but the intention was to store already drawn data into this array to be able to restore it when we come back to the graph at a later time),
  getOptions: [function returning a Highcharts-settings-object] (used to initialize the graph with the Highcharts-constructor that expects such an object),
  [additional functions, eg to add points to the graph that can then easily be called from the single controllers that receive the new data, for example:]
  updateGraphWithData: function(chart, data) {
    // we need a reference to the chart since highcharts works on the charts-object created through the Highcharts-constructor, which has to be called from the single controllers since the constructor also depends on a reference to an existing html-element (see below)
  }
}
```

Useful helper-methods that the `charts`-factory offers for updating graphs with data are
* `parseBulkData(data)`: Turns an array of unparsed JSON-objects (ie strings, which we receive whenever we receive historic data for example) into an array of parsed JSON-objects
* `addPointToLine(chart, point, lineID, opt lineName, opt stepEnabled, opt lineToUse`: Adds a given point (ie an object containing an x- and y-value) to the line with the given lineID or - if passed - to the lineToUse. If the line does not exist yet, it is created.

To create a chart from a controller, add the `charts`-factory to the controller and execute the following code:
```javascript
   var chart = Highcharts.chart(charts.[nameOfGraph].html_id, charts.[nameOfGraph].getOptions());
```

To add new datapoints to a chart, use the methods specified in the factory:
```javascript
   charts.[nameOfGraph].updateGraphWithData(chart, data);
```

#### Drawbacks
Using Highcharts turned out to also have some drawbacks. Highcarts is optimized for big amount of data points in a rather small number of lines but not for many lines in a single chart. However, in our use case, especially in the Price-graph, we do have to render many lines. In the default setup there are 16 different products, if we only have 5 active merchants this already results in 16 * 5 = 80 lines in the Price-graph. Unfortunately, this often leads to big lags when viewing the price graph, especially when it is initially rendered since then 100 historic data points are added while new data points from the live data might already be incoming.

Many thoughts and efforts where given to reduce the slow rendering as much as possible, e.g. by only redrawing the graph after every *x* new incoming data points (the exact values can be changed in the UI). Still the graph might tend to lag and cause freezes in the browser if there are many merchants active and the settings are set to a high load. To solve this problem, either a change of the library would be necessary or the design of the graphs and the streaming of the data has to be completely refactored. An alternative approach could be to use http-calls from the UI to the kafka proxy instead of using socket-messages. Using this, we could actively request the currently viewed data (and update it every *x* seconds) to avoid drawing unnecessary data that is not currently visible in the graph anyway.
