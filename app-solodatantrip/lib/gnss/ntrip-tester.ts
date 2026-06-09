import "server-only";

import net from "net";
import type { NtripTestResult } from "@/lib/billing/types";

const RTCM_PREAMBLE = 0xd3;
const TIMEOUT_MS = 10_000;

export async function testNtripConnection(params: {
  host: string;
  port: number;
  username: string;
  password: string;
  mountpoint: string;
}): Promise<NtripTestResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let resolved = false;
    let bytesReceived = 0;
    let rtcmPackets = 0;
    let mountpointOk = false;

    const finish = (result: Partial<NtripTestResult> & { success: boolean }) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        latencyMs: Date.now() - startedAt,
        packetLoss: null,
        rtcmDetected: rtcmPackets > 0,
        mountpointOk,
        ...result,
      });
    };

    const socket = net.createConnection({ host: params.host, port: params.port }, () => {
      const auth = Buffer.from(`${params.username}:${params.password}`).toString("base64");
      const request =
        `GET /${params.mountpoint} HTTP/1.0\r\n` +
        `User-Agent: Datageo-NTRIP-Tester/1.0\r\n` +
        `Authorization: Basic ${auth}\r\n` +
        `Connection: close\r\n\r\n`;
      socket.write(request);
    });

    socket.setTimeout(TIMEOUT_MS);

    socket.on("data", (chunk: Buffer) => {
      bytesReceived += chunk.length;

      if (!mountpointOk && chunk.toString("utf8", 0, Math.min(200, chunk.length)).includes("200")) {
        mountpointOk = true;
      }

      for (let i = 0; i < chunk.length; i += 1) {
        if (chunk[i] === RTCM_PREAMBLE) rtcmPackets += 1;
      }

      if (rtcmPackets >= 1 && mountpointOk) {
        finish({ success: true });
      }
    });

    socket.on("timeout", () => {
      finish({
        success: mountpointOk,
        error: mountpointOk ? undefined : "Timeout — sem resposta RTCM.",
      });
    });

    socket.on("error", (err) => {
      finish({ success: false, error: err.message });
    });

    socket.on("close", () => {
      if (!resolved) {
        finish({
          success: mountpointOk && rtcmPackets > 0,
          error: bytesReceived === 0 ? "Conexão fechada sem dados." : undefined,
        });
      }
    });
  });
}
