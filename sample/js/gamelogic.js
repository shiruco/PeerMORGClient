var windowWidth = 800;
var windowHeight = 480;

var container, stats;
var camera, scene, projector, renderer;
var mesh;
var p;
var mycanvas;
var mySpeed;
var myId;
var carMap = {};
var carNameMap = {};
var keydown={w:false,s:false,a:false,d:false};

//ラップ
var RAP = 1;

//車体の色
var CAR_COLOR = ['#ff0000','#0000CC','#FFFF00','#990099'];
                 
//初期座標
var CAR_INIT_POS = [{x:12877,z:-2086},{x:13211,z:-2311},{x:12917,z:-2646},{x:13136,z:-2877}];
                 
//逆走監視
var reverseWatcher = 0;

var goalWatcher = 0;

var isStarted = false;

init();

function init() {
    
    container = document.getElementById('container');
    mycanvas = document.getElementById('mycanvas');
    mySpeed = document.getElementById('mySpeed');
    myRad = document.getElementById('myRad');
    
    camera = new THREE.PerspectiveCamera( 50, windowWidth / windowHeight, 1, 10000 );
    
    scene = new THREE.Scene();
    
    var light = new THREE.DirectionalLight( 0xefefff, 2 );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add( light );
    
    var light = new THREE.DirectionalLight( 0xffefef, 2 );
    light.position.set( -1, -1, -1 ).normalize();
    scene.add( light );
    
    var gg = new THREE.PlaneGeometry( 62000, 62000 );
    var gm = new THREE.MeshPhongMaterial( { color: 0x006633} );
    ground = new THREE.Mesh( gg, gm );
    ground.position.y = -1;
    ground.rotation.x = - Math.PI / 2;
    scene.add( ground );
    
    var gt = THREE.ImageUtils.loadTexture( "./images/course.png" );
    gg = new THREE.PlaneGeometry( 32000, 32000 );
    gm = new THREE.MeshPhongMaterial( { color: 0xffffff, map: gt } );
    ground = new THREE.Mesh( gg, gm );
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add( ground );
    
    renderer = new THREE.WebGLRenderer({ canvas: mycanvas } );
    renderer.sortObjects = false;
    renderer.setSize( windowWidth, windowHeight );
    
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.display = 'none';
    container.appendChild( stats.domElement );
    
    //window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
}

function onWindowResize() {
    camera.aspect = windowWidth / windowHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( windowWidth, windowHeight );
}

function onKeyDown ( event ) {
    switch( event.keyCode ) {
        case 38: /*up*/
        case 87: /*W*/ 	keydown.w = true; break;
        case 40: /*down*/
        case 83: /*S*/ 	 keydown.s = true; break;
        case 37: /*left*/
        case 65: /*A*/   keydown.a = true; break;
        case 39: /*right*/
        case 68: /*D*/    keydown.d = true; break;
    }
};

function onKeyUp ( event ) {
    switch( event.keyCode ) {
        case 38: /*up*/
        case 87: /*W*/ 	keydown.w = false; break;
        case 40: /*down*/
        case 83: /*S*/ 	 keydown.s = false; break;
        case 37: /*left*/
        case 65: /*A*/   keydown.a = false; break;
        case 39: /*right*/
        case 68: /*D*/    keydown.d = false; break;
    }
};

function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}

var carRad=0,carSp=0,carMaxSp=40;
var duration = 500;
var keyframes = 15, interpolation = duration / keyframes;
var lastKeyframe = 0, currentKeyframe = 0;
var gatagotoCnt = 0;
var me;//mesh object
var myname;//mesh object

function startInit() {
    
    //配置
    for(var i=0,len = raceMember.length;i<len;i++) {
        var c = CAR_COLOR[i];
        var pos = CAR_INIT_POS[i];
        geometry = new THREE.CubeGeometry(100, 50, 100);
        material = new THREE.MeshLambertMaterial({color: c});
        mesh = new THREE.Mesh( geometry,material);
        mesh.position.x = pos.x;
        mesh.position.y = 50;
        mesh.position.z = pos.z;
        carMap[raceMember[i].id] = mesh;
        
        //自分
        if(myId === raceMember[i].id) me = mesh;
        
        scene.add( mesh );
        
        var shape = new THREE.TextGeometry(raceMember[i].name, {
            size:12,
            height:1,
            material: 0,
            extrudeMaterial: 1,
            curveSegments: 4,
            font: 'helvetiker'
        });
        var wrapper = new THREE.MeshBasicMaterial({color: 0x000000});
        var name = new THREE.Mesh(shape, wrapper);
        name.position.x = pos.x+20;
        name.position.y = 120;
        name.position.z = pos.z;
        name.rotation.x = 0;
        name.rotation.y = 3.1;
        carNameMap[raceMember[i].id] = name;
        
        if(myId === raceMember[i].id) myname = name;
        
        scene.add(name);
    }
    
    var cnt = 3;
    
    var tId = setInterval(function(){
        
        if(cnt+1 <= 3) {
            document.getElementById('start'+Number(cnt+1)).style.display = 'none';
        }
        
        if(cnt <= -1) {
            clearInterval(tId);
            return;
        }
        
        document.getElementById('start'+cnt).style.display = 'block';
        
        cnt = cnt - 1;
        
        if(cnt > -2 && cnt < 0){
            isStarted = true;
        }else if(cnt < -1) {
            clearInterval(tId);
        }
        
    },1100);
    
}

var draw = function(targetPos) {
    var car = carMap[targetPos.id];
    var name = carNameMap[targetPos.id];
    car.rotation.y = targetPos.rad;
    car.position.x = targetPos.x;
    car.position.z = targetPos.z;
    //name.rotation.y = targetPos.rad;
    name.position.x = targetPos.x;
    name.position.z = targetPos.z;
}

function render() {
  
    if ( mesh) {
        
        //コース外処理
        var posX = Math.floor(me.position.x/62.5 + 256);
        var posY = Math.floor(me.position.z/62.5 + 256);
        var posData = groundData[((posX-1)*512) + posY];

        if(posData === 0) {
            carMaxSp=20;
            if(carSp>0) carSp-=0.1;
            if(keydown.w){
                if(me.position.y == 50) {
                    gatagotoCnt++;
                    
                    if(gatagotoCnt > 3){
                        me.position.y = 52;
                        gatagotoCnt = 0;
                    }
                    
                }else{
                    gatagotoCnt++;
                    if(gatagotoCnt > 3){
                        me.position.y = 50;
                        gatagotoCnt = 0;
                    }
                }
            }
            goalWatcher = 0;
            
        }else if(posData === 3){
        
            //Aエリア	
            if(goalWatcher == 1)
            {
                console.log("順走");	
                if(reverseWatcher == 0)
                {
                    console.log("一周した！");
                    checkMemberRapStatus();
                }
                else
                {
                    reverseWatcher = reverseWatcher + 1;
                }
            }
            
            goalWatcher = 2;
        
        }else if(posData === 2){
        
            //Bエリア
            if(goalWatcher == 2)
            {
                console.log("逆走");
                reverseWatcher = reverseWatcher - 1;
            }
            goalWatcher = 1;
        
        }else{
            carMaxSp=40;
            goalWatcher = 0;
        }

        if(keydown.a && isStarted && !isFinished){
            carRad+=0.01;
            if(carMaxSp<carSp)carSp=carMaxSp;
        }else if(keydown.d && isStarted && !isFinished){
            carRad-=0.01;
            if(carMaxSp<carSp)carSp=carMaxSp;
        }else if(keydown.w){
            carSp+=0.2;
            if(carMaxSp<carSp)carSp=carMaxSp;
        }else if(keydown.s && isStarted && !isFinished){
            carSp-=0.2;
            if(carSp<0)carSp=0;
        }else{
            if(carSp>0)carSp-=0.7;  
            if(carSp<0)carSp=0;
        }

        if(isStarted && !isFinished && (carSp>0 || (keydown.a || keydown.d))){
            me.rotation.y=carRad;
            me.position.x+=Math.sin(carRad)*carSp;
            me.position.z+=Math.cos(carRad)*carSp;
            myname.rotation.y = carRad+3.1;
            myname.position.x+=Math.sin(carRad)*carSp;
            myname.position.z+=Math.cos(carRad)*carSp;
            
            if(peer) { peer.sendData(raceMemberIdList,JSON.stringify({id: myId, rad: carRad, x : me.position.x,z : me.position.z})); }
        }
        
        //myname.rotation.y = 3;
        
        if(!camera.position.x) {
            camera.position.x = 0;
        }
        if(!camera.position.z) {
            camera.position.z = 0;
        }
        
        mySpeed.innerHTML = Math.round(carSp*100)/100;
        //myRad.innerHTML = carRad;
        
        //プレゼントを回転
        //p.rotation.y += 0.01;
        
        camera.position.y = 200;
        camera.position.x = camera.position.x - (camera.position.x-me.position.x + Math.sin(carRad)*330)*0.075;//小さくするほど離れる
        camera.position.z = camera.position.z - (camera.position.z-me.position.z + Math.cos(carRad)*330)*0.075;
        
        camera.lookAt( {x:me.position.x,y:100,z:me.position.z} );
    }
    
    renderer.render( scene, camera );
}

var checkMemberRapStatus = function(){
    
    memberRapMap[myId] =  memberRapMap[myId] + 1;
    
    console.log("rap "+ memberRapMap[myId]);
    
    if(memberRapMap[myId] > RAP){
        //goal
        peer.finishGame(myId,joinedRoomId);
    }
}

var roomMemberMap = {};
var raceMember;
var raceMemberIdList = [];
var memberRapMap = {};
var peer;
var roomInfo;
var joinedRoomId;
var isFinished = false;

var startScene = document.getElementById("startScene");
var titleWrapper = document.getElementById("titleWrapper");
var inputWrapper = document.getElementById("inputWrapper");
var connectBtn = document.getElementById("connectBtn");
var myName = document.getElementById("myName");
var roomListWrapper = document.getElementById("roomListWrapper");
var roomListContainer = document.getElementById("roomListContainer");
var newGameBtn = document.getElementById("newGameBtn");
var waitWrapper = document.getElementById("waitWrapper");
var joinMemberList = document.getElementById("joinMemberList");
var mySpeedMeter = document.getElementById("mySpeedMeter");
var mySpeed = document.getElementById("mySpeed");

var before;
var after;
var joinBtns = [];

connectBtn.addEventListener("click",function(e){
    
    if(!formCheck(myName.value)){
        alert("please use half-width alphanumeric");   
        return;
    }
    //connectBtn.removeEventListener("click",arguments.callee,false);
    
    inputWrapper.style.display = 'none';
    peer = new PeerMORGClient({name: myName.value});
    peer.on('open',function(data){
        
        roomInfo = data;
        roomListContainer.innerHTML = '';
        
        var index = 0;
        var isRoomExist = false;
        
        //show room list
        for(var i=0;i<data.length;i++) {
            
            var room = data[i];
            if(!isRoomExist && room && room.member.length == 1 && room.member[0].id == peer.getMyId()) {
                joinedRoomId = room.roomId;
                joinMemberList.innerHTML = '';
                waitWrapper.style.display = 'block';
                break;
            }
            
            if(room.remainTime <= 0 || room.isStarted || room.isTimeout || room.isFinished) continue;
            
            index = index + 1;
            roomListWrapper.style.display = 'block';
            
            isRoomExist = true;
            var html = '';
            html += '<div class="roomContainer mt10">';
            html += '<p class="raceName">RACE '+index+'</p>';
            html += '<p class="roomRemainTime"><span class="fcYellow" id="roomRemainSec_'+room.roomId+'"></span>sec</p>';
            html += '<p class="roomMember" id="roomMemberList_'+room.roomId+'"></p>';
            html += '<input type="button" id="joinBtn_'+room.roomId+'" value="JOIN" class="joinBtn" data-room-id="'+room.roomId+'">';
            html += '<p id="joinTxt_'+room.roomId+'" class="joinTxt" style="display:none;">joined</p>';
            html += '<p id="closeTxt_'+room.roomId+'" class="closeTxt" style="display:none;">closed</p>';
            html += '</div>';
            
            roomListContainer.innerHTML += html;
            
            roomMemberMap[room.roomId] = [];
            var member = room.member;
            
            var el = document.getElementById('roomMemberList_'+room.roomId);
            el.innerHTML = '';
            for(var j=0;j<member.length;j++) {
                roomMemberMap[room.roomId].push(member[j].id);
                el.innerHTML += ' '+ member[j].name;
            }
        }
    
        setJoinBtnEvents();
    });
    peer.on('created',function(roomId){
        joinedRoomId = roomId;
    });
    peer.on('join',function(data){
        
        console.log("join room "+data.roomId+" id "+data.id+" name "+data.name);
        if(joinedRoomId === data.roomId) {
            
            if(!roomMemberMap[data.roomId]){roomMemberMap[data.roomId]=[];}
            roomMemberMap[data.roomId].push(data.id);
            joinMemberList.innerHTML += '<p><span class="fcRed">'+data.name+'</span> joined!</p>';
        }
        
        updateRoomInfo(data.roomId,data.id,data.name);
    });
    peer.on('countdown',function(data){
        
        if(data === 0) {
            waitWrapper.style.display = 'none';
            remainSec.innerHTML = '';
        }else{
            remainSec.innerHTML = data;
        }
    });
    peer.on('start',function(member){
        console.log("start");
        myId = peer.getMyId();
        raceMember = member;
        
        //data送信用にidだけの配列をつくる
        for(var i=0,len=member.length;i<len;i++){
            if(myId != member[i].id) raceMemberIdList.push(member[i].id);
            
            //rap
            memberRapMap[member[i].id] = 0;
        }
        clearInterval(roonListCntChk);
        startScene.remove();
        canvasWrapper.style.display = 'block';
        //stats.domElement.style.display = 'block';
        animate();
        startInit();
    });
    peer.on('timeout',function(data){
        
        console.log("timeout");
        roomListWrapper.style.display = 'none';
        inputWrapper.style.display = 'block';
    });
    peer.on('data',function(data){
        data = JSON.parse(data);
       // after = new Date().getTime();
        //console.log(after-data.time);
        draw(data);
    });
    peer.on('goal',function(id){
        
        console.log("goal "+id);
        
        if(peer.getMyId() === id){
            document.getElementById("win").style.display = 'block';
        }else{
            document.getElementById("lose").style.display = 'block';
        }
        
        setTimeout(function(){
            isFinished = true;
        },4500);
    });
},false);

newGameBtn.addEventListener("click",function(e){
    
    peer.create(myName.value);
    roomListWrapper.style.display = 'none';
    joinMemberList.innerHTML = '';
    waitWrapper.style.display = 'block';
    
},false);

var setJoinBtnEvents = function() {
    
    if(roomInfo){
        for(var i=0,len = roomInfo.length;i<len;i++){
            var id = roomInfo[i].roomId;

            var btn = document.getElementById("joinBtn_"+id);
            if(!btn) continue;
            joinBtns.push(btn);
            btn.addEventListener("click",function(e){
                btn.removeEventListener("click",arguments.callee,false);
                var selectedRoomId = e.target.dataset.roomId;
                var el = document.getElementById("roomMemberList_"+selectedRoomId);
                el.innerHTML += ' '+myName.value;
                
                joinedRoomId = selectedRoomId;
                peer.join(roomMemberMap[selectedRoomId],selectedRoomId,myName.value);
                
                removeBtn();
                
                var txt = document.getElementById("joinTxt_"+selectedRoomId);
                txt.style.display = 'block';
                
            },false);
        }
    }
}

var removeBtn = function(){
    for(var i=0,len = joinBtns.length;i<len;i++){
        joinBtns[i].style.display = 'none';
    }
    newGameBtn.style.display = 'none';
}

var updateRoomInfo = function(roomId,id,name){
    
    if(!joinedRoomId) {
        joinedRoomId = roomId;   
    }
    
    if(id != peer.getMyId()) {
        if(!roomMemberMap[roomId]) roomMemberMap[roomId] = [];
        roomMemberMap[roomId].push(id);
    }
    
}

var roonListCntChk = setInterval(function(){

    if(roomInfo){
        for(var i=0,len = roomInfo.length;i<len;i++){
            var t = roomInfo[i].remainTime = roomInfo[i].remainTime -1;
            var id = roomInfo[i].roomId;
            var el = document.getElementById("roomRemainSec_"+id);
            if(!el) continue;
            
            if(t <= 0){
                el.innerHTML = 0;
                if(joinedRoomId) return;
                document.getElementById("joinBtn_"+id).style.display = 'none';
                var closetxt = document.getElementById("closeTxt_"+id);
                closetxt.style.display = 'block';
            }else{
                el.innerHTML = t;
            }
        }
    }

},1000);



var formCheck = function(str){
    if((str.replace(/\s+/g, "")) === '') return false;
    if(str.match( /[^A-Za-z\s.-]+/ )){
        return false;
    }
    return true;
}