# PeerMORGClient
javascript client library for MO games powered by WebRTC

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