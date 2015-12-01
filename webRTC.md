# webRTCとは
webRTCとは「Web Real-Time Communications」の略語であり、ブラウザ間でリアルタイムなコミュニケーションを可能にする技術仕様の総称である。
現在Googleによってオープンソース化され、IETFがプロトコルを、W3CがAPIの標準化を進めている。
公式サイトは[こちら](http://www.webrtc.org/)

webRTCを使うと以下の事が可能となる。
   * ブラウザでのビデオ･音声チャット
   * ブラウザでのテキストチャット
   * ブラウザでのMOゲームなど

特に目新しい技術ではないが、プラグインなど余計なモジュールを使わずブラウザのみで実現可能となるのがこれまでと違う点だ。
ブラウザでのリアルタイムコミュニケーションと聞くと、webSocketを思い浮かべる方も少なくないだろうが、この二つには大きな違いがある。
webSocketがサーバを介してデータをやり取りするのに対して、webRTCはブローカーサーバを必要とするものの、P2P通信を利用して端末間でデータをやり取りすることができる。
また、webSocketが通信にTCPプロトコルを用いるのに対してwebRTCではUDPプロトコルを利用する。これによって通信速度の向上も見込める。

# 仕様
webRTCには大きく二つの仕様がある。

   * Media Capture and Streams
   * WebRTC 1.0: Real-time Communication Between Browsers

まずMedia Capture and Streamsだが、これはローカルPCのカメラ/マイクからストリームデータを取得する仕様であり、getUserMediaを利用することでストリームデータをやり取りすることが可能となる。

もう一方はP2P通信のための仕様が定義されており、DataChannelを使用する事でP2Pでのデータ通信が可能となる。ただし、こちらはまだブラウザへの実装が進んでおらず現在はChromeとFirefoxのみ利用可能となっている。

### ブラウザ対応状況 (2014.1現在)
MediaStream and getUserMedia

   * Chrome desktop 18.0.1008+; Chrome for Android 29+
   * Opera, Opera Mobile 12
   * Firefox 17+

RTCPeerConnection

   * Chrome desktop 20+ (now 'flagless', i.e. no need to set about:flags); Chrome for Android 29+ (flagless)
   * Firefox 22+ (on by default)

RTCDataChannel

   * Experimental version in Chrome 25, more stable (and with Firefox interoperability) in Chrome 26+; Chrome for Android 29+
   * Firefox 22+ (on by default)

# NAT越え
P2P通信を考える上において知っておかなければならない「NAT越え」について軽く触れておきたい。まずNATとは、LAN内で使用する端末のプライベートIPアドレスと、それに対応するインターネット上のグローバルIPアドレスを１対１で相互変換する技術のことを言う。通常ルーターなどがこの役割を担うが、インターネット側からNAT配下の特定の端末にアクセスしたいとき、どの端末なのか識別できないという問題がでてくる。これを解決する技術が「NAT越え」である。P2P通信のように端末間で直接やり取りする場合は、このNAT越えをクリアしなければ通信経路が確立できないのである。
このNAT越えを実現する仕組みの一つにIETFが開発したICE(Interactive Connectivity Establishment)というものがある。
これはSTUNやTURNを含む多くのプロトコルを使いそれを実現している。

### STUN
STUNサーバというグローバルIPアドレスを持つサーバを用い、NAT配下の端末がSTUNサーバと通信することで自分のWAN側のIPアドレスとポート番号のペアをSTANサーバに記録させておく。これによって別ネットワーク間の端末同士がSTUNサーバに記録された各々のWAN側のIPアドレス情報をたよりに、通信可能にする仕組みのことである。これはRFC3489で定義されている。

### 使用可能なSTUNサーバリスト

https://code.google.com/p/natvpn/source/browse/trunk/stun_server_list

以上のことを踏まえて、webRTCによるP2P通信の具体的な実装方法を見ていこう。
端末間通信開始までのフロー
端末間のP2P通信接続までのフローと、具体的な実装方法は大まかに以下のようになる。

登場するのはcaller(送信元)とcallee(送信先)端末だ。DataConnectionオブジェクトは
送信元のほうで1つ作っておけば送信先では作らなくてもよい。

##### 1. caller(送信元)がSTUNサーバにアクセスして接続先情報を要求する。
```
var config = {
    "iceServers":[
        {"url":"stun:stun.example.org"}
    ]
};
 
//RTCPeerConnectionオブジェクトを生成
//
var pc =newRTCPeerConnection(config,, { optional: [ { RtpDataChannels: true } ]});
 
//RTCDataChannelオブジェクトを生成
var dc = pc.createDataChannel('ラベル名',{reliable:false});
```

##### 2. callerがオファー（通信依頼）を作成し、アプリケーションサーバへ送信する。
```
//create offer
pc.createOffer(function(description){
    pc.setLocalDescription(description);
    //send offer to broker server by XHR
    send(JSON.stringify({
        "sdp": description
    }));
});
```

##### 3. callee(送信先)がアプリケーションサーバからオファーを受信する。
```
//受信したオファー（sdp）
var sdp =newRTCSessionDescription(sdp);
pc.setRemoteDescription(sdp,function(){
    if(pc.remoteDescription.type =="offer") {
        //アンサーを作成
    }
});
 
//callee側でもRTCPeerConnectionオブジェクトを生成する。
//caller側でRTCDataChannelオブジェクトが生成されたタイミングで
//pc.ondatachannelが呼ばれるのでこの中でDataChannelを受け取ることができる。
var pc =newRTCPeerConnection(config,, { optional: [ { RtpDataChannels: true } ]});
pc.ondatachannel = function(e) {
   　var dc = e.channel;
};
```

##### 4. calleeがSTUNサーバから接続先情報を取得する。
```
pc.onicecandidate = function(e) {
    var candidate = e.candidate;
    if(candidate) {
       //アプリケーションサーバへ通知
    };
}
```
##### 5. calleeがアンサー（通信許可）を作成し、アプリケーションサーバへ送信する。
```
//create answer
pc.createAnswer(function(description){
    pc.setLocalDescription(description);
    //send answer to broker server by WS
    send(JSON.stringify({
        "sdp": description
    }));
});
```

##### 6. callerがアプリケーションサーバからアンサーを受信する。
```
//受信したアンサー（sdp）
var sdp =newRTCSessionDescription(sdp)
pc.setRemoteDescription(sdp,function(){
    if(pc.remoteDescription.type =="answer") {
        //do something
    }
})
```

##### 7. callerがデータを送信
```
dc.send(data);
```

##### 8. calleeがデータを受信
```
dc.on('data', function(data) {
    console.log(data);
});
```

http://dev.w3.org/2011/webrtc/editor/webrtc.html