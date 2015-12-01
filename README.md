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

# usage
```
<script src="./js/lib/peerMORGClient.js"></script>
PeerMORGClientオブジェクトを生成

peer = new PeerMORGClient();
ゲームへの参加

peer.join(params);
データ送信(P2P)

peer.sendData(json)
イベントをリッスン

//アプリケーションサーバとの接続成功時
peer.on('open',function(data){
});

//他ユーザーのレース参加時
peer.on('join',function(data){
});

//レース開始までの秒数取得時
peer.on('countdown',function(data){
});

//レーススタート時
peer.on('start',function(data){
});

//データ取得時(P2P)
peer.on('data',function(data){
});

//タイムアウト時
peer.on('timeout',function(data){
});

//エラー時
peer.on('error',function(data){
});
```

chromeのwebRTC Developperツールを利用すれば、オファー/アンサーの流れとcandidateの詳細を確認できる。
chrome://webrtc-internals