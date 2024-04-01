import type * as Party from "partykit/server";
import "setimmediate";
import { KernelManager, ServerConnection } from "@jupyterlab/services";

export default class Server implements Party.Server {
  kernelManager: KernelManager;
  constructor(readonly room: Party.Room) {
    const serverSettings = ServerConnection.makeSettings({
      baseUrl: "http://127.0.0.1:8888",
      token: "test123",
    });
    const kernelManager = new KernelManager({
      serverSettings,
    });
    this.kernelManager = kernelManager;
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`
    );

    // let's send a message to the connection
    conn.send("hello from server");
  }

  async onMessage(message: string, sender: Party.Connection) {
    const kernel = await this.kernelManager.startNew();

    const future = kernel.requestExecute({
      code: message,
    });

    future.onIOPub = (msg) => {
      if (
        msg.header.msg_type === "execute_result" ||
        msg.header.msg_type === "stream" ||
        msg.header.msg_type === "display_data" ||
        msg.header.msg_type === "update_display_data" ||
        msg.header.msg_type === "error"
      ) {
        // console.log(msg);
        this.room.broadcast(JSON.stringify(msg));
      }
    };

    // let's log the message
    console.log(`connection ${sender.id} sent message: ${message}`);
    // as well as broadcast it to all the other connections in the room...
    this.room.broadcast(
      `${sender.id}: ${message}`,
      // ...except for the connection it came from
      [sender.id]
    );
  }
}

Server satisfies Party.Worker;
