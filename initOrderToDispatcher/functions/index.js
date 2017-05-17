const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

//Now we're going to create a function that listens to when a 'Notifications' node changes and send a notificcation
//to all devices subscribed to a topic


exports.sendInitOrder = functions.database.ref('/order/{uid}')
.onWrite(event => {

	// existing orders
      if (event.data.previous.exists()) {
        var oneorder = event.data.val();

        if(oneorder.state == 'processing') {
            //--------------send notifi to driver when dispatcher assigns an order
            var payloadToDriver = {
                    data:{
                        address: oneorder.drop_address,
                        paym:oneorder.payment_method
                    }
                };
            var ref = event.data.ref.child("driverUID");
            ref.once("value")
              .then(function(snapshot) {
                var driveruid = snapshot.val();
                //console.log(driveruid);
                var refDriverToken = admin.database().ref("driver/"+driveruid + "/nofToken");
                refDriverToken.once("value").then(function(snapshotForToken) {
                    //console.log("snapshotForToken"+driveruid);
                    var tokenDriver = snapshotForToken.val();
                    //console.log("hello tok"+driveruid);
                    admin.messaging().sendToDevice(tokenDriver, payloadToDriver)
                                            .then(function(response){
                                                console.log("Successfully sent message to driver [delivering]: ", response);
                                            })
                                            .catch(function(error){
                                                console.log("Error sending message: driver ", error);
                                            });

                });
        
            });
            //------end--------send notifi to driver when dispatcher assigns an order


        } else  if (oneorder.state == 'delivering') { 
            //send to customer ---delivering
            var payloadToCustomer = {
                    data:{
                        orderstate: "d",
                        content: oneorder.order_detail
                    }
                };
            admin.messaging().sendToDevice(oneorder.notification_user_token, payloadToCustomer)
                                            .then(function(response){
                                                console.log("Successfully sent message to cust [delivering]: ", response);
                                            })
                                            .catch(function(error){
                                                console.log("Error sending message: ", error);
                                            });
            //---------end-------- send to customer ---delivering



        } else if (oneorder.state == 'finished') {
            //send to customer ---finished
            var payloadToCustomer = {
                data:{
                        orderstate: "f",
                        content: oneorder.order_detail
                    }
            };
            admin.messaging().sendToDevice(oneorder.notification_user_token, payloadToCustomer)
                                            .then(function(response){
                                                console.log("Successfully sent message to cust [finished]: ", response);
                                            })
                                            .catch(function(error){
                                                console.log("Error sending message: ", error);
                                            });
        }
            //-----end ---------send to customer ---finished

/*            //sned to dispatcher-----finished
            var ref = admin.database().ref("dispatch_token");
            payloadToDispat_finished = {
                data:{
                        orderstate: "f",
                        content: oneorder.order_detail
                    }
            };
            ref.once("value")
              .then(function(snapshot) {
                snapshot.forEach(function(data) {
                    admin.messaging().sendToDevice(data.key, payloadToDispat_finished)
                                        .then(function(response){
                                            console.log("Successfully sent message: ", response);
                                        })
                                        .catch(function(error){
                                            console.log("Error sending message: ", error);
                                        })
                });
                } 
                //---------end------- sned to dispatcher-----finished
*/
        return;
      }

    //This will be the notification model that we push to firebase
    var oneorder = event.data.val();
    var clientemail;

    //eamil detemined by type
    if(oneorder.orderType == 'customer') {
        clientemail = oneorder.dropoff_email;
    } else {
        clientemail = oneorder.rest_email;
    }

    var payload = {
        data:{
            ema: clientemail,
            token: oneorder.notification_user_token,
            content: oneorder.order_detail
        }
    };

    var ref = admin.database().ref("dispatch_token");
    ref.once("value")
      .then(function(snapshot) {
        snapshot.forEach(function(data) {
            admin.messaging().sendToDevice(data.key, payload)
                                .then(function(response){
                                    console.log("Successfully sent message: ", response);
                                })
                                .catch(function(error){
                                    console.log("Error sending message: ", error);
                                })
        });
        /*var disToken = snapshot.val();
        
        admin.messaging().sendToDevice(disToken, payload)
        .then(function(response){
            console.log("Successfully sent message: ", response);
        })
        .catch(function(error){
            console.log("Error sending message: ", error);
        })*/
      });

    //The topic variable can be anything from a username, to a uid
    //I find this approach much better than using the refresh token
    //as you can subscribe to someone's phone number, username, or some other unique identifier
    //to communicate between

    //Now let's move onto the code, but before that, let's push this to firebase

})
