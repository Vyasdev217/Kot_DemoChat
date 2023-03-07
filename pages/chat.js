function mobOrPC() {
    if (navigator.userAgent.match(/Android/i) 
        || navigator.userAgent.match(/webOS/i) 
        || navigator.userAgent.match(/iPhone/i) 
        || navigator.userAgent.match(/iPad/i) 
        || navigator.userAgent.match(/iPod/i) 
        || navigator.userAgent.match(/BlackBerry/i) 
        || navigator.userAgent.match(/Windows Phone/i)) { 
        document.getElementById("body").style.marginTop="0";
        document.getElementById("body").style.marginLeft="0";
        document.getElementById("body").style.marginRight="0"; 
        document.getElementById("body").style.marginBottom="0"; 

    }
    else { 
        document.getElementById("body").style.marginTop="0";
        document.getElementById("body").style.marginLeft="10%";
        document.getElementById("body").style.marginRight="10%"; 
        document.getElementById("body").style.marginBottom="50px"; 
    }
} 

mobOrPC();

var testing = {
    port: ":8080"
};
const DOMAIN=window.location.hostname+testing.port;
var autoScroll = true;

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for(let i = 0; i <ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
    return "";
}

// websocket to communicate with server
const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const socketURL = socketProtocol + '//' + DOMAIN+'/service/chat'
var chat = new WebSocket(socketURL);
chat.onopen = function() {
    var auth_request={
        "id":"id",
        "timestamp":new Date(),
        "type":"auth_request",
        "data":
        {
            "recipients":null,
            "message":getCookie("sessionKey")
        }
    };
    chat.send(JSON.stringify(auth_request));
};
chat.onmessage = function(e) {
    var e = JSON.parse(e.data);
    var data=e.data;
    if(e.type=="auth_response"){
        if(e.data.success){
            var my_id = data.user_id;
        }
        else{
            // redirect to login page
            document.location.replace(window.location.protocol+"//"+DOMAIN+"/auth");
        }
    }
    else if(e.type=="message_server"){
        if (data.sender.user_id==undefined){
        addMessage(data.sender.name,data.message,data.sender.user_id==my_id);

        }
        else{
            addMessage(data.sender.name+"("+data.sender.user_id+")",data.message,data.sender.user_id==my_id);
        }
    }
    else if(e.type=="user_list"){
        var members_list = document.getElementById('members_list');
        members_list.innerHTML="";
        for(var i=0;i<data.user_count;i++){
            var member=document.createElement('div');
            member.className="member";
            var memberName=document.createElement('span');
            memberName.className="member_name";
            memberName.innerHTML=data.users[i].name;
            member.insertAdjacentElement("beforeend",memberName);
            var memberId=document.createElement('span');
            memberId.className="member_id";
            memberId.innerHTML=data.users[i].user_id;
            member.insertAdjacentElement("beforeend",memberId);
            if(data.users[i].registered){
                member.style.fontWeight="bold";
            }
            members_list.insertAdjacentElement("beforeend",member);
        }
        document.getElementById('chat_onlineCount').innerHTML=data.user_count+" online";
    }
};

function addMessage(name,message,isMyMessage){
    var chat_log = document.getElementById('chat_log');
    var bubble=document.createElement('div');
    bubble.className = "chat_message";
    var bubble_sender=document.createElement('span');
    bubble_sender.className="chat_message_sender";
    bubble_sender.innerHTML=name;
    bubble.insertAdjacentElement("beforeend",bubble_sender);
    bubble.insertAdjacentHTML("beforeend","<br>");
    var bubble_message=document.createElement('span');
    bubble_message.className="chat_message_message";
    bubble_message.innerText=message;
    bubble.insertAdjacentElement("beforeend",bubble_message);
    chat_log.insertAdjacentElement("beforeend",bubble);
    if(isMyMessage){
        document.getElementsByClassName("chat_message")[0].style.marginRight="10px";
        document.getElementsByClassName("chat_message")[0].style.marginLeft="auto";
    }
    if(autoScroll){
        chat_log.scrollBy(0, chat_log.scrollHeight);
    }
}

function send(){
    if(document.getElementById("message_input").value.length==0 || document.getElementById("message_input").value.length>1000){
        return;
    }
    var data = {
        "id":"ida",
        "timestamp":new Date(),
        "type":"message_client",
        "data":{
            "recipients":document.getElementById("recipients_input").value,
            "message":document.getElementById("message_input").value
        }
    };
    chat.send(JSON.stringify(data));
    document.getElementById("message_input").value = "";
    var chat_log = document.getElementById('chat_log');
    chat_log.scrollBy(0, chat_log.scrollHeight);
}

document.getElementById("message_input").addEventListener("keypress", function(event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        send();
    }
}); 

document.getElementById("message_input").onblur = function(){
    window.setTimeout(function(){
        document.getElementById("recipients_input").focus();
    }, 10);
}

document.getElementById('chat_log').onscroll = function(){
    if(this.scrollTop + this.clientHeight >= this.scrollHeight){
        autoScroll = true;
    }
    else{
        autoScroll = false;
    }
}

showSidePanel=function(){
    document.getElementById('side_panel').style.display="block";
    document.getElementById('side_panel').style.width="360px";
    document.getElementById('side_panel').style.opacity="1";
    document.getElementById('side_panel').style.zIndex="1";
    document.getElementById('side_panel').style.pointerEvents="auto";
    document.getElementById('side_panel').style.transition="width 0.5s, opacity 0.5s, z-index 0.5s, pointer-events 0.5s";
}

hideSidePanel=function(){
    document.getElementById('side_panel').style.width="0px";
    document.getElementById('side_panel').style.opacity="0";
    document.getElementById('side_panel').style.zIndex="-1";
    document.getElementById('side_panel').style.pointerEvents="none";
    document.getElementById('side_panel').style.transition="width 0.5s, opacity 0.5s, z-index 0.5s, pointer-events 0.5s";
}

leaveRoom=function(){document.location="/auth";}