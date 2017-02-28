# Management UI

This repository contains the frontend of the Pricewars-Simulation. It allows access to all important settings of all components. 

It allows:
* Registration of new merchants
* Changing of settings for existing merchants
* Registration of new consumers
* Changing of settings for existing consumers
* Adding, removing or updating products the producer offers
* Displaying the current offers in the marketplace
* Displaying statistics about the current and past marketsituation
* Displaying price updates and sales for each merchant and product

The meta repository containing general information can be found [here](https://github.com/hpi-epic/masterproject-pricewars)

## Application Overview

| Repo | Branch 	| Deployment to  	| Status | Description |
|--- |---	|---	|---  |---   |
| [UI](https://github.com/hpi-epic/pricewars-mgmt-ui) | master  	|  [vm-mpws2016hp1-02.eaalab.hpi.uni-potsdam.de](http://vm-mpws2016hp1-02.eaalab.hpi.uni-potsdam.de) 	| [ ![Codeship Status for hpi-epic/pricewars-mgmt-ui](https://app.codeship.com/projects/d91a8460-88c2-0134-a385-7213830b2f8c/status?branch=master)](https://app.codeship.com/projects/184009) | Stable |
| [Consumer](https://github.com/hpi-epic/pricewars-consumer) | master  	|  [vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de](http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de) | [ ![Codeship Status for hpi-epic/pricewars-consumer](https://app.codeship.com/projects/96f32950-7824-0134-c83e-5251019101b9/status?branch=master)](https://app.codeship.com/projects/180119) | Stable |
| [Producer](https://github.com/hpi-epic/pricewars-producer) | master  	|  [vm-mpws2016hp1-03eaalab.hpi.uni-potsdam.de](http://vm-mpws2016hp1-03.eaalab.hpi.uni-potsdam.de) | [ ![Codeship Status for hpi-epic/pricewars-producer](https://app.codeship.com/projects/0328e450-88c6-0134-e3d6-7213830b2f8c/status?branch=master)](https://app.codeship.com/projects/184016) | Stable |
| [Marketplace](https://github.com/hpi-epic/pricewars-marketplace) | master  	|  [vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de/marketplace](http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de/marketplace/offers) 	| [ ![Codeship Status for hpi-epic/pricewars-marketplace](https://app.codeship.com/projects/e9d9b3e0-88c5-0134-6167-4a60797e4d29/status?branch=master)](https://app.codeship.com/projects/184015) | Stable |
| [Merchant](https://github.com/hpi-epic/pricewars-merchant) | master  	|  [vm-mpws2016hp1-06.eaalab.hpi.uni-potsdam.de/](http://vm-mpws2016hp1-06.eaalab.hpi.uni-potsdam.de/) 	| [ ![Codeship Status for hpi-epic/pricewars-merchant](https://app.codeship.com/projects/a7d3be30-88c5-0134-ea9c-5ad89f4798f3/status?branch=master)](https://app.codeship.com/projects/184013) | Stable |
| [Kafka RESTful API](https://github.com/hpi-epic/pricewars-kafka-rest) | master  	|  [vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de](http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de) 	| [ [ ![Codeship Status for hpi-epic/pricewars-kafka-rest](https://app.codeship.com/projects/f59aa150-92f0-0134-8718-4a1d78af514c/status?branch=master)](https://app.codeship.com/projects/186252) | Stable |


## Requirements

This User Interface is build on the [HOMER template](https://wrapbootstrap.com/theme/homer-responsive-admin-theme-WB055J451) which requires  angularJS 1.5.5.

## Folder Structure

```
|-- asset
|   |-- fonts
|   |-- icons
|   |-- images
|   |-- js
|   |   `-- modules
|   |-- scripts
|   |-- styles
|   |-- templates
|   `-- vendor
|-- config
|   `-- deploy
`-- tmp
```

## Design Choices

### Socket.io
For the communication with the [kafka-reverse-proxy](https://github.com/hpi-epic/pricewars-kafka-reverse-proxy) that offers the data for all charts of the UI, we chose [socket.io](http://socket.io/). Socket.io enables us to constantly stream new data so we do not have to do manual http-requests for updates every x seconds from the frontend. Instead we just listen to new messages coming in via socket and display them immediately.

In the current setup of the frontend, the connection (and disconncetion) to the reverse-proxy via socket happens in each controller, that listens for certain socket messages, separately. The reason for that is that the reverse-proxy offers historic data for all statistics but this historic data is only sent to a client on a new connect. That means that if we want to receive historic data for any chart displayed and managed with the current controller, we currently have to trigger a new connect. Furthermore, to obtain the url to connect to via socket (ie the url of the reverse-proxy), we are using another factory called endpoints, that asynchronously reads the endpoints from a .json-file. So in every controller that is supposed to connect to the reverse-proxy, make sure to include the endpoints-factory and add the following code:

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
