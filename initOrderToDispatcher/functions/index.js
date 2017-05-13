const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

//Now we're going to create a function that listens to when a 'Notifications' node changes and send a notificcation
//to all devices subscribed to a topic

exports.sendInitOrder = functions.database.ref('/order/{uid}')
.onWrite(event => {

	// Only edit data when it is first created.
      if (event.data.previous.exists()) {
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
