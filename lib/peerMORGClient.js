var inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
}

var CustomEventDispatcher = function CustomEventDispatcher() {
  this.eventHash = {};
}

CustomEventDispatcher.prototype.addListener = function(type, handler) {
  if (!this.eventHash[type]) {
    this.eventHash[type] = handler;
  }
  return this;
};

CustomEventDispatcher.prototype.on = CustomEventDispatcher.prototype.addListener;

CustomEventDispatcher.prototype.removeListener = function(type, handler) {
  if (!this.eventHash[type]) return this;

  var _handler = this.eventHash[type];
  if (_handler && _handler === handler){
    delete this.eventHash[type];
  }
};

CustomEventDispatcher.prototype.off = CustomEventDispatcher.prototype.removeListener;

CustomEventDispatcher.prototype.dispatch = function(type) {
  var handler = this.eventHash[type];
  if (!handler) return;

  if (typeof handler === 'function') {
    handler.call(this, arguments[1]);
  }
};

/**
 * make token code and return
 */
var getRandomToken = function () {
    return Math.random().toString(36).substr(2);
}

/**
 * peerMOGClient constructor
 */
var PeerMORGClient = function(option) {
    
    //singleton
    if (!(this instanceof PeerMORGClient)) {
        return new PeerMORGClient();
    }
    
    CustomEventDispatcher.call(this);
    
    var self = this;
    
    this.connected = false;
    
    //peerConnection map
    this.pcList = {};
    
    //dataChannel map
    this.dcList = {};
    
    this.name = option.name;
    
    if(option && option.host) {
        this.host = option.host;
        this.port = option.port;
    }else{
        this.host = "localhost";
        this.port = "9000";
    }
    
    this.nearId = this._makeUUID();
    
    console.log('myid '+this.nearId);
    
    this.socket = new Socket(this.host,this.port,this.nearId,this.name);
    this.socket.on('message', function(data) {
        self._receivedJsonHandler(data);
    });
    this.socket.on('error', function(error) {
        throw new Error("socket error");
    });
    this.socket.on('close', function() {
        throw new Error("socket is closed");
    });

    this.socket.connect();
}

inherits(PeerMORGClient, CustomEventDispatcher);

PeerMORGClient.prototype._receivedJsonHandler = function(data) {
    switch (data.type) {
        case 'OPEN':
            this.dispatch('open', data.roomInfoList);
            break;
        case 'ROOM_CREATED':
            this.dispatch('created', data.roomId);
            break;
        case 'JOIN':
            console.log(data.id+" is join");
            this.dispatch('join', {roomId: data.roomId,id: data.id, name: data.name});
            break;
        case 'COUNTDOWN':
            this.dispatch('countdown', data.remainTime);
            break;
        case 'TIMEOUT':
            this.dispatch('timeout', data.roomId);
            break;
        case 'START':
            this.dispatch('start',data.member);
            break;
        case 'GOAL':
            this.dispatch('goal',data.id);
            break;
        case 'ERROR':
            //error 
            break;
        case 'OFFER':
            console.log('offer from '+data.id);
            this._neighborJoin(data);
            break;
        case 'ANSWER':
            console.log('answer from '+data.id);
            this._handleSDP(data.id,data.sdp, data.type);
            break;
        case 'CANDIDATE':
            console.log("receive candidate");
            this._handleCandidate(data.id,data.sdp);
            break;
        case 'LEAVE':
            this._handleLeave(data.farId);
            break;
        default:
            break;
    }
}

/**
 * create new room.
 */
PeerMORGClient.prototype.create = function(name) {
    this.socket.send({type: 'NEW', id: this.nearId, name: name});
}

/**
 * create RTCPeerConnection and connect neighbors.
 */
PeerMORGClient.prototype.join = function(idList,roomId) {
    for(var i=0,len = idList.length;i<len;i++) {
        console.log("connect id "+idList[i]);
        this._setUpConnection(idList[i]);
    }
    
    if(roomId) {
        this.socket.send({type: 'JOIN', id: this.nearId, name: this.name, roomId: roomId});
    }
}

/**
 * send data to neighbors by p2p
 */
PeerMORGClient.prototype.sendData = function(neighbors,data) {
    for(var i=0,len = neighbors.length;i<len;i++) {
        this.dcList[neighbors[i]].send(data);
    }
}

PeerMORGClient.prototype.finishGame = function(id,roomId) {
    this.socket.send({type: 'FINISH', id: id, roomId: roomId});
}

PeerMORGClient.prototype._neighborJoin = function(data) {
    var farId = data.id;
    var pc = this._createPeerConnection(farId);
    var self = this;
    
    pc.ondatachannel = function(e) {
        self.dc = e.channel;
        self._setDataChannel(self.dc,farId);
    };
    
    this._setUpIce(pc,farId);
    this._handleSDP(farId,data.sdp, data.type);
}

PeerMORGClient.prototype._setUpConnection = function(farId) {
    var pc = this._createPeerConnection(farId);
    
    console.log("create DataChanncel object");
    var dc = pc.createDataChannel('dc_'+farId,{reliable: false});  
    this._setDataChannel(dc,farId);
    
    this._setUpIce(pc,farId);
    this._createOffer(pc,farId);
}

PeerMORGClient.prototype._createPeerConnection = function(farId) {
    console.log('create RTCPeerConnection '+farId);
    if(!this.pcList[farId]) {
        var config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302' }]};
        var pc = this.pcList[farId] = new webkitRTCPeerConnection(config, { optional: [ { RtpDataChannels: true } ]});
        return pc;
    }else{
        throw new Error("PeerConnection is already exist.");
        return null;
    }
}

PeerMORGClient.prototype._setUpIce = function(pc,farId) {    
    var self = this;
    pc.onicecandidate = function(e) {
        var _candidate = e.candidate;
        if (_candidate) {
          console.log('Received ICE candidates.'+farId);
          self.socket.send({
            type: 'CANDIDATE',
            sdp: _candidate,
            farId: farId,
            id: self.nearId
          });
        }
    };
    pc.oniceconnectionstatechange = function() {
        if (!!self.pc && self.pc.iceConnectionState === 'disconnected') {
          throw new Error("iceConnectionState is disconnected");
          self.close();
        }
    };
    pc.onicechange = function() {
        if (!!self.pc && self.pc.iceConnectionState === 'disconnected') {
          throw new Error("iceConnectionState is disconnected");
          self.close();
        }
    };
    pc.onnegotiationneeded = function() {
        //do something?
    }; 
}

PeerMORGClient.prototype._handleSDP = function(farId,sdp,type) {
    sdp = new RTCSessionDescription(sdp);
    var self = this;
    this.pcList[farId].setRemoteDescription(sdp, function() {
        console.log('Set remoteDescription: ' + type);
        if (type === 'OFFER') {
            self._createAnswer(farId);
        }
    }, function(err) {
        throw new Error("Failed to setRemoteDescription");
    });
};

PeerMORGClient.prototype._handleCandidate = function(farId,sdp) {
    if(!this.pcList[farId]) {
        this._setUpConnection(farId);
    }
    var candidate = new RTCIceCandidate(sdp);
    this.pcList[farId].addIceCandidate(candidate);
    console.log('Added ICE candidate.'+farId);  
};

PeerMORGClient.prototype._handleLeave = function() {
    this.close();
};
    
PeerMORGClient.prototype._createOffer = function(pc,farId) {
    var self = this;
    pc.createOffer(function(offer) {
    console.log('Created offer to '+farId);
        
    offer.sdp = self._higherBandwidthSDP(offer.sdp);
    
    pc.setLocalDescription(offer, function() {
        console.log('Set localDescription to offer');
        self.socket.send({
            type: 'OFFER',
            sdp: offer,
            id: self.nearId,
            farId: farId
        });
    }, function(err) {
        self.dispatch('error', err);
        throw new Error("Failed to setLocalDescription");
    });
    }, function(err) {
        self.dispatch('error', err);
        throw new Error("Failed to createOffer");
    });
};

PeerMORGClient.prototype._createAnswer = function(farId) {
    var self = this;
    var pc = this.pcList[farId];
    
    pc.createAnswer(function(answer) {
    console.log('Created answer to '+farId);
    answer.sdp = self._higherBandwidthSDP(answer.sdp);
    pc.setLocalDescription(answer, function() {
        console.log('Set localDescription to answer.');
        self.socket.send({
            type: 'ANSWER',
            sdp: answer,
            id: self.nearId,
            farId: farId
        });
    }, function(err) {
        self.dispatch('error', err);
        throw new Error("Failed to setLocalDescription");
    });
    }, function(err) {
        self.dispatch('error', err);
        throw new Error("Failed to createAnswer");
    });
};

PeerMORGClient.prototype._setDataChannel = function(dc,farId) { 
    var self = this;
    this.dcList[farId] = new DataChannel(dc);
    this.dcList[farId].on('open', function(data) {
        console.log('dataChannel is open '+farId);
    });
    this.dcList[farId].on('data', function(data) {
        self.dispatch('data', data);
    });
    this.dcList[farId].on('error', function() {
        throw new Error("dataChannel connection error");
    });
}

/**
 * get my id
 */
PeerMORGClient.prototype.getMyId = function() {
    if(this.nearId) {
        return this.nearId;
    }else{
        return null;
    }
}

/**
 * kill connection
 */
PeerMORGClient.prototype.disconnect = function() {
    if (!this.disconnected) {
        if (this.socket) {
            this.socket.close();
        }
        this.disconnected = true;
    }
}

PeerMORGClient.prototype._makeUUID = function() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }   
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
}

PeerMORGClient.prototype._higherBandwidthSDP = function(sdp) {
    var version = navigator.appVersion.match(/Chrome\/(.*?) /);
      if (version) {
        version = parseInt(version[1].split('.').shift());
        if (version < 31) {
          var parts = sdp.split('b=AS:30');
          var replace = 'b=AS:1638400'; // 100 Mbps
          if (parts.length > 1) {
            return parts[0] + replace + parts[1];
          }
        }
      }
    return sdp;
}

/**
 * DataChannel constructor - RTCDataChannel object wrapper
 */
var DataChannel = function(dc) {
    console.log("created DataChannel ");
    
    CustomEventDispatcher.call(this);
    
    this.dc = dc;
    this.isOpen = false;
    
    var me = this;
    this.dc.onopen = function() {
        me.isOpen = true;
        me.dispatch('open');
    };
    
    this.dc.onmessage = function(e) {
      var self = this;
      var data = e.data;
      me.dispatch('data',data);
    };
    
    this.dc.onclose = function(e) {
        throw new Error("DataChannel closed");
        self.close();
    };
    
};
    
inherits(DataChannel, CustomEventDispatcher);

DataChannel.prototype._cleanup = function() {
    if(this.dc) {
        this.dc.close();
        this.dc = null;
    }
    this.isOpen = false;
    this.dispatch('close');
};

DataChannel.prototype.close = function() {
    if (!this.isOpen) {
        return;
    }
    this._cleanup();
};

DataChannel.prototype.send = function(data) {
    if (!this.isOpen) {
        this.dispatch('error', new Error('Connection no longer open.'));
    }
    var self = this;

    try {
        self.dc.send(data);
    } catch(e) {
        setTimeout(function() {
          // Try again.
          self.dc.send(data);
        }, 100);
    }
    
};

DataChannel.prototype.isOpen = function() {
    return this.isOpen;
};

/**
 * Socket class constructor
 */   
var Socket = function(host,port,id,name) {
  if (!(this instanceof Socket)) return new Socket(host,port,id);
  CustomEventDispatcher.call(this);

  this.id = id;
  var token = getRandomToken();
    
  this.disconnected = false;
  this.wsUrl = 'ws://' + host + ':' + port + '/peer?id='+id+'&name='+name+'&token='+token;
};

inherits(Socket, CustomEventDispatcher);

Socket.prototype.connect = function() {
  var self = this;

  if (!!this._socket) {
    return;
  }

  this.ws = new WebSocket(this.wsUrl);

    this.ws.onmessage = function(e) {
        var data;
        try {
            data = JSON.parse(e.data);
        }catch(e){
            throw new Error("Invalid server message");
            return;
        }
        self.dispatch('message', data);
    };

  // socket is open.
  this.ws.onopen = function() {
      console.log('Socket open');
  };
};

Socket.prototype.send = function(data) {
    if (this.disconnected) {
        return;
    }
    
    if (!data.type) {
        this.dispatch('error', 'Invalid message');
        return;
    }
    
    var message = JSON.stringify(data);
    if (this._wsOpen()) {
        this.ws.send(message);
    }
};

Socket.prototype.close = function() {
    if (!this.disconnected && this._wsOpen()) {
        this.ws.close();
        this.disconnected = true;
    }
};

Socket.prototype._wsOpen = function() {
    return this.ws;
};