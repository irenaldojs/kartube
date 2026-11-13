use axum::{
    Router,
    extract::{
        WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::{Html, IntoResponse},
    routing::get,
};
use kartube_server::{ConnectionGate, MAX_MESSAGE_BYTES, decode, server_codec::ServerMessage};
use std::sync::atomic::{AtomicU64, Ordering};
static NEXT_CONNECTION: AtomicU64 = AtomicU64::new(1);
use serde_json::json;

async fn socket(mut socket: WebSocket) {
    let mut gate = ConnectionGate::default();
    let connection_id = format!(
        "connection-{}",
        NEXT_CONNECTION.fetch_add(1, Ordering::Relaxed)
    );
    let mut server_seq = 0_u64;
    while let Some(Ok(message)) = socket.recv().await {
        let reply = match message {
            Message::Text(text) => match decode(&text) {
                Ok(value) => match gate.accept(&value) {
                    Ok(()) => {
                        if value["payload"]["type"] == "hello" {
                            json!({"type":"welcome","connectionId":connection_id})
                        } else {
                            json!({"type":"input_ack","inputSeq":value["payload"]["input"]["seq"]})
                        }
                    }
                    Err(code) => json!({"type":"error","code":code}),
                },
                Err(code) => json!({"type":"error","code":code}),
            },
            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) => continue,
            Message::Binary(_) => json!({"type":"error","code":"text_required"}),
        };
        let envelope = json!({"protocolVersion":1,"eventId":format!("server-{server_seq}"),"seq":server_seq,"payload":reply});
        let Ok(message) = ServerMessage::new(envelope) else {
            break;
        };
        server_seq += 1;
        if socket
            .send(Message::Text(message.encode().into()))
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
