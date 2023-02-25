var http = require('http');
const express = require("express");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const expressWs = require('express-ws');
const app       = express();
const server    = http.createServer(app);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
expressWs(app, server);// For websocket uisng express-ws

/*vvvv_UTILS_vvvv*/

function random_key() {
    //TODO: Generate a unique address
    return Math.random().toString(36).substring(2, 15);// + Math.random().toString(36).substring(2, 15);
}

function hasher(str) {
    return str;
}

/*^^^^_END_UTILS_^^^^*/



/*vvvv_AUTHENTICATION_vvvv*/

//const authenticator=require();//TODO: Import authentication service module

//Authentication pool
var auth_pool = {
    /**
     "sessionKey":{
        "name":"name",
        "id":"id",
     }
    */
};

function createUser(res,name,secret,redirect) {//Authenticate user
        var randkey=random_key();
        res.cookie("sessionKey",randkey);
        auth_pool[randkey]={"name":name,"trip":hasher(secret)};
        res.redirect(redirect);
}

app.post("/auth",(req,res) => {//Authentication handler
    if (req.body.name==undefined || req.body.name==null || req.body.name=="") {
        res.status(400).send("Invalid request");
        return;
    }
    var name=req.body.name;
    var secret=req.body.secret;
    var redirect='/chat';
    createUser(res,name,secret,redirect); 
});

app.get("/auth",(req,res) => {//Temporary authentication handler
    res.sendFile(__dirname+"/pages/login.html");
});
/*^^^^_END_AUTHENTICATION_^^^^*/



/*vvvv_SERVICE:CHAT_vvvv*/

/*
var auth_request=function (id,sessionKey,name) {// Template of authentication request from client
    return {
        "id":id,
        "timestamp":new Date(),
        "type":"auth_request",
        "data":{
            "sessionKey":sessionKey,
            "name":name,
        }
    }
}
*/

var auth_response=function (id,success,user_id,name) {// Template of authentication response from server
    return {
        "id":id,
        "timestamp":new Date(),
        "type":"auth_response",
        "data":{
            "success":success,
            "user":{
                "user_id":user_id,
                "name":name
            }
        }
    }
}

/*
var message_client=function (id,recipients,message) {// Template of sending message from client to server
    return {
        "id":id,
        "timestamp":new Date(),
        "type":"message_client",
        "data":{
            "recipients":recipients,
            "message":message
        }
    }
}
*/

var message_server=function (id,sender_user_id,sender_name,isBroadcast,message) {// Template of sending message from server client
    return {
        "id":id,
        "timestamp":new Date(),
        "type":"message_server",
        "data":{
            "sender":{
                "user_id":sender_user_id,
                "name":sender_name
            },
            "broadcast":isBroadcast,
            "message":message
        }
    }
}


function update_members() {//Update members of a room
    payload={
        "id":"id",
        "timestamp":new Date(),
        "type":"user_list",
        "data":{
            "user_count":Object.keys(aliveSockets_message).length,
            "users":{}
        }
    }
    let i=0;
    Object.keys(aliveSockets_message).forEach(socket_id => {
        payload.data.users[i]={
            "name":aliveSockets_message[socket_id].name,
            "user_id":aliveSockets_message[socket_id].user_id
        };
        i++;
    });
    payload=JSON.stringify(payload);
    Object.keys(aliveSockets_message).forEach(socket_id => {
        aliveSockets_message[socket_id].socket.send(payload);
    });
}


function forward_message(message,sender){//Forward message to recipients
    if(sender!="SYSTEM"){
        sender_user_id=aliveSockets_message[sender].user_id;
        sender_name=aliveSockets_message[sender].name;
    }
    else{
        sender_user_id="kotneko";
        sender_name="SERVER";
        message={
            "id":"id",
            "timestamp":new Date(),
            "type":"message_client",
            "data":{
                "recipients":null,
                "message":message
            }
        }
    }
    data=message.data;
    recipients=data.recipients;
    if(recipients==null || recipients.length==0 || recipients=="") {//Broadcast
        Object.keys(aliveSockets_message).forEach(socket_id => {
            let payload=JSON.stringify(message_server(message.id,sender_user_id,sender_name,true,data.message));
            aliveSockets_message[socket_id].socket.send(payload);
        });
    }
    else{
        Object.keys(aliveSockets_message).forEach(socket_id => {//Send to specific recipients
            if(data.recipients.includes(aliveSockets_message[socket_id].user_id)) {
                let payload=JSON.stringify(message_server(message.id,sender_user_id,sender_name,false,data.message));
                aliveSockets_message[socket_id].socket.send(payload);
            }
        });
    }
}

//Dictionary of sockets for message service
var aliveSockets_message={};

// Websocket using wxpress-ws
app.ws('/service/chat', (socket, req) => {//Message server
    //Assign a random address to the socket
    socket.socket_id=random_key();
    //Add the socket to the dictionary of sockets
    aliveSockets_message[socket.socket_id] = {"socket":socket,"user_id":"TMP_"+socket.socket_id,"authenticated":false,"name":null};
    console.log("New connection: "+aliveSockets_message[socket.socket_id].user_id);

    //Handle incoming data
    socket.on('message', function incoming(message) {
        console.log(aliveSockets_message[socket.socket_id].user_id+"[Incoming message] : "+message);
        message=JSON.parse(message);
        if(aliveSockets_message[socket.socket_id].authenticated) {
            if(message.type=="message_client") forward_message(message,socket.socket_id);
        }
        else {
            //Handle authentication
            if(message.type=="auth_request") {
                data=message.data;
                if(auth_pool[data.message]!=undefined) {//Check if the sessionKey is in auth_pool
                    aliveSockets_message[socket.socket_id].user_id=auth_pool[data.message].id;
                    aliveSockets_message[socket.socket_id].name=auth_pool[data.message].name;
                    aliveSockets_message[socket.socket_id].authenticated=true;
                    let payload=JSON.stringify(auth_response(message.id,true,aliveSockets_message[socket.socket_id].user_id,aliveSockets_message[socket.socket_id].name));
                    socket.send(payload);
                    console.log(aliveSockets_message[socket.socket_id].user_id+"[Auth success("+socket.socket_id+")]");
                    delete auth_pool[data.message];
                    update_members(aliveSockets_message[socket.socket_id].user_id,aliveSockets_message[socket.socket_id].name,true);
                    forward_message("User "+aliveSockets_message[socket.socket_id].name+" has joined the chat.","SYSTEM")
                }
                else {
                    let payload=JSON.stringify(auth_response(message.id,false,aliveSockets_message[socket.socket_id].user_id,aliveSockets_message[socket.socket_id].name));
                    socket.send(payload);
                    console.log(aliveSockets_message[socket.socket_id].user_id+"[Auth failure]");
                }
            }
            else{
                socket.close();
            }
        }           
    });
    socket.on('close', function close() {
        console.log(socket.socket_id+"[Connection terminated]");
        user_id=aliveSockets_message[socket.socket_id].user_id;
        user_name=aliveSockets_message[socket.socket_id].name;
        delete aliveSockets_message[socket.socket_id];
        update_members(user_id,user_name,false);
        if(user_name!=null){
            forward_message("User "+user_name+"("+user_id+") has left the chat.","SYSTEM");
        }
    });
});

app.get("/chat",(req,res) => {
    res.sendFile(__dirname+"/pages/chat.html");
});

/*^^^^_END_SERVICE:MESSAGE_^^^^*/

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/pages/home.html");
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, console.log('Server started on port ${PORT}'));