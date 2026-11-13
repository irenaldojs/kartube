use axum::{
    Router,
    extract::{
        WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::{Html, IntoResponse},
    routing::get,
};
use kartube_server::{ConnectionGate, MAX_MESSAGE_BYTES, decode};
use serde_json::json;

async fn socket(mut socket: WebSocket) {
    let mut gate = ConnectionGate::default();
    while let Some(Ok(message)) = socket.recv().await {
        let reply = match message {
            Message::Text(text) => match decode(&text) {
                Ok(value) => match gate.accept(&value) {
                    Ok(()) => {
                        json!({"protocolVersion":1,"seq":value["seq"],"payload":{"type":if value["payload"]["type"] == "hello" {"welcome"} else {"input_ack"}}})
                    }
                    Err(code) => json!({"payload":{"type":"error","code":code}}),
                },
                Err(code) => json!({"payload":{"type":"error","code":code}}),
            },
            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) => continue,
            Message::Binary(_) => json!({"payload":{"type":"error","code":"text_required"}}),
        };
        if socket
            .send(Message::Text(reply.to_string().into()))
            .await
            .is_err()
        {
            break;
        }
    }
}
async fn upgrade(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.max_message_size(MAX_MESSAGE_BYTES)
        .max_frame_size(MAX_MESSAGE_BYTES)
        .on_upgrade(socket)
}
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { Html(include_str!("../spike.html")) }))
        .route("/ws", get(upgrade));
    // Local technical probe only. No public bind, lobby, gameplay or authentication.
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001")
        .await
        .expect("bind localhost:3001");
    println!("Kartube WebSocket spike: http://127.0.0.1:3001");
    axum::serve(listener, app).await.expect("serve spike");
}
